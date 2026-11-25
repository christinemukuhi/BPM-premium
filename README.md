# Bible Puzzle Maker (full edition)

An installable web app (PWA) that makes printable Bible puzzles with sticker art and answer keys, from **any passage in the whole Bible** or from 30 ready-made story themes. Works offline once installed.

**What is in this edition**
- The whole World English Bible: all 66 books, with a book / chapter / verse picker
- Everything in the free version: 30 story themes, 5 puzzle types (word search, crossword, word scramble, verse scramble, fill in the blanks), 3 age levels, answer key, US Letter or A4, color or black-and-white stickers
- In "Any passage" mode:
  - **Verse scramble and fill in the blanks** start at the verse you choose and read on from there (the number of verses follows the age level, or the "Passage length" setting)
  - **Word search, word scramble and crossword** use words taken from the verses you choose (up to 15 verses). Crossword clues are the verse text with the answer blanked out
  - Stickers are picked automatically from the words in the passage

Not included yet: "My own text" and custom word lists.

## Run it on your computer
```
npm install
npm test        # checks the puzzle engine, 30 themes, all 1,189 Bible chapters and the sticker files
npm run dev     # local dev server
npm run build   # production build into dist/
```

## Publish on GitHub Pages
Make a **new repository** for this edition (for example `bible-puzzle-maker-full`) so your free app keeps working. Then:
1. Upload this project and push it to the `main` branch.
2. In the repository, go to Settings, then Pages, and set Source to **GitHub Actions**.
3. Every push now tests, builds and publishes the app at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`. The workflow sets the base path from the repository name for you.

## About the Bible text
- `src/data/bible.json` is the app's copy of the World English Bible (public domain), cleaned up for puzzles: `[added words]` brackets removed and straight quotes turned into curly quotes. The wording is unchanged, so "Yahweh" is kept.
- Five verses are empty in this text because the WEB leaves them out (Luke 17:36, Acts 8:37, 15:34, 24:7, Romans 16:25). They are skipped in the pickers and puzzles.
- The Bible loads the first time someone chooses "Any passage" (about 1.2 MB compressed) and is saved for offline use.
- To rebuild it from a fresh `web.json`: `node scripts/build-bible.mjs path/to/web.json`

## Where things live
- `src/engine.js`: puzzle engine, no page code
- `src/bible.js`: whole-Bible helpers (text cleanup, verse lookup, builds a passage into puzzle input)
- `src/app.js`: the interface, worksheet layout and printing
- `src/config.js`: your landing page link and promo text (the in-app banner is empty in this edition)
- `src/data/themes.json`, `clues.json`: the 30 story themes and their fallback clues
- `src/data/bible.json`: the whole Bible
- `scripts/`: tests and the Bible build script

## Before you share it widely
- Confirm the license for the sticker artwork you ship, especially for a paid edition.
