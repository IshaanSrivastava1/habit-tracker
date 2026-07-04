// After `expo export`, this re-adds the bits Expo doesn't include on its own:
//  - the settings that make the site open full-screen from the home screen
//  - the home-screen icon link
//  - CSS that stops iOS from selecting text / showing the copy menu on a
//    long-press (so "hold to delete" works in the installed app)
//
// It's safe to run more than once (it won't add the block twice).

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'docs', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const marker = 'id="habit-tracker-head-extras"';
if (html.includes(marker)) {
  console.log('index.html already patched — nothing to do.');
  process.exit(0);
}

const extras = `
    <!-- Added by scripts/patch-web.js -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Habit Tracker" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#f2f2f7" />
    <link rel="apple-touch-icon" href="/habit-tracker/apple-touch-icon.png" />
    <style id="habit-tracker-head-extras">
      /* Stop the browser selecting text / showing the copy menu on long-press. */
      html, body, #root {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
      /* ...but still allow typing/selecting inside the text box. */
      input, textarea {
        -webkit-user-select: text;
        user-select: text;
      }
    </style>`;

html = html.replace('</title>', '</title>' + extras);
fs.writeFileSync(file, html);
console.log('Patched docs/index.html.');
