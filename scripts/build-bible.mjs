// Turns web.json (World English Bible, 66 books) into the compact src/data/bible.json the app loads.
// Usage:  node scripts/build-bible.mjs path/to/web.json
import fs from 'node:fs';
import { tidy } from '../src/bible.js';

const src = process.argv[2] || 'web.json';
const j = JSON.parse(fs.readFileSync(src, 'utf8'));
const books = [];
for (const v of j.verses) {
  let b = books[v.book - 1];
  if (!b) b = books[v.book - 1] = { n: v.book_name, ch: [] };
  const ch = b.ch[v.chapter - 1] || (b.ch[v.chapter - 1] = []);
  if (v.verse !== ch.length + 1) throw new Error(`Verse numbering gap at ${v.book_name} ${v.chapter}:${v.verse}`);
  ch.push(tidy(v.text));
}
books.forEach((b, i) => { if (!b) throw new Error('Missing book ' + (i + 1)); b.ch.forEach((c, k) => { if (!c) throw new Error(`Missing chapter ${b.n} ${k + 1}`); }); });
fs.writeFileSync(new URL('../src/data/bible.json', import.meta.url), JSON.stringify({ v: 'World English Bible', books }));
console.log('books', books.length, 'verses', books.reduce((n, b) => n + b.ch.reduce((m, c) => m + c.length, 0), 0));
