import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Turns a Date object into a simple text key like "2026-07-02".
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0'); // month is 0-based, so +1
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Today's date as that same kind of key.
function todayKey() {
  return dateKey(new Date());
}

// Counts how many days in a row (ending today) this habit was completed.
// If today isn't done yet, we start counting from yesterday, so your streak
// doesn't look "broken" until you actually miss a full day.
function currentStreak(dates) {
  if (!dates || dates.length === 0) return 0;
  const done = new Set(dates); // fast "was this date completed?" lookups

  const cursor = new Date();
  if (!done.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1); // today not done → start from yesterday
  }

  let streak = 0;
  while (done.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1); // step back one day and keep counting
  }
  return streak;
}

// A yes/no confirmation that works on BOTH the web app and the phone app.
// (On web, react-native's Alert does nothing, so we use the browser's confirm.)
function confirmDelete(habit, onConfirm) {
  const message = `Remove "${habit}"?`;
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Delete habit', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

// A simple message popup that works on both web and phone.
function notify(message) {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('Heads up', message);
  }
}

export default function App() {
  // The list of habit names.
  const [habits, setHabits] = useState(['Read', 'Workout', 'Drink water']);

  // For each habit, the list of dates it was completed on.
  // e.g. { Read: ['2026-07-01', '2026-07-02'] }
  const [completions, setCompletions] = useState({});

  // What the user typed into the "add a habit" box.
  const [newHabit, setNewHabit] = useState('');

  // Have we finished loading saved data yet? Guards against overwriting
  // saved data with our empty defaults on the very first render.
  const [loaded, setLoaded] = useState(false);

  // --- LOAD saved data once, when the app first opens ---
  useEffect(() => {
    async function load() {
      try {
        const savedHabits = await AsyncStorage.getItem('habits');
        const savedCompletions = await AsyncStorage.getItem('completions');
        if (savedHabits !== null) setHabits(JSON.parse(savedHabits));
        if (savedCompletions !== null) setCompletions(JSON.parse(savedCompletions));
      } catch (e) {
        console.log('Could not load saved data', e);
      }
      setLoaded(true);
    }
    load();
  }, []); // the empty [] means "run this only once"

  // --- SAVE automatically whenever habits or completions change ---
  useEffect(() => {
    if (!loaded) return; // don't save until after we've loaded
    AsyncStorage.setItem('habits', JSON.stringify(habits));
    AsyncStorage.setItem('completions', JSON.stringify(completions));
  }, [habits, completions, loaded]);

  // Tap a card: add or remove today's date for that habit.
  function toggleHabit(habit) {
    const today = todayKey();
    setCompletions((previous) => {
      const dates = previous[habit] || [];
      const isDoneToday = dates.includes(today);
      const nextDates = isDoneToday
        ? dates.filter((d) => d !== today) // uncheck: remove today
        : [...dates, today];               // check: add today
      return { ...previous, [habit]: nextDates };
    });
  }

  // Add button: put the typed habit onto the list, then clear the box.
  function addHabit() {
    const name = newHabit.trim();
    if (name === '') return;
    if (habits.includes(name)) {
      notify(`"${name}" is already on your list.`);
      return;
    }
    setHabits((previous) => [...previous, name]);
    setNewHabit('');
  }

  // Actually remove a habit from the list.
  function deleteHabit(habit) {
    setHabits((previous) => previous.filter((h) => h !== habit));
  }

  const today = todayKey();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Habits</Text>

      {/* Row with a text box + Add button */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a habit…"
          value={newHabit}
          onChangeText={setNewHabit}
          onSubmitEditing={addHabit}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addHabit}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {/* One tappable card per habit */}
      {habits.map((habit) => {
        const dates = completions[habit] || [];
        const isDone = dates.includes(today);
        const streak = currentStreak(dates);

        return (
          <Pressable
            key={habit}
            onPress={() => toggleHabit(habit)}
            onLongPress={() => confirmDelete(habit, () => deleteHabit(habit))}
            delayLongPress={400}
            style={[styles.card, isDone && styles.cardDone]}
          >
            {/* Left side: habit name, with a streak line underneath it */}
            <View style={styles.cardLeft}>
              <Text style={[styles.cardText, isDone && styles.cardTextDone]}>
                {habit}
              </Text>
              {streak > 0 && (
                <Text style={styles.streak}>
                  🔥 {streak} day{streak === 1 ? '' : 's'}
                </Text>
              )}
            </View>

            {/* Right side: the check circle */}
            <Text style={styles.check}>{isDone ? '✅' : '⭕️'}</Text>
          </Pressable>
        );
      })}

      {habits.length > 0 && (
        <Text style={styles.hint}>Tap to check off · Hold to delete</Text>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f2f2f7',
    paddingHorizontal: 20,
    paddingTop: 70,
    userSelect: 'none', // don't let the browser select text on long-press (web)
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1c1c1e',
  },
  addRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDone: {
    backgroundColor: '#e7f8ec',
  },
  cardLeft: {
    flex: 1, // take the space to the left of the check mark
  },
  cardText: {
    fontSize: 18,
    color: '#1c1c1e',
  },
  streak: {
    fontSize: 13,
    color: '#ff9500',
    marginTop: 4,
    fontWeight: '600',
  },
  cardTextDone: {
    color: '#34a853',
    textDecorationLine: 'line-through',
  },
  check: {
    fontSize: 20,
  },
  hint: {
    textAlign: 'center',
    color: '#8e8e93',
    fontSize: 13,
    marginTop: 8,
  },
});
