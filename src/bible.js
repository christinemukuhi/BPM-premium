// Whole-Bible helpers: no page code, so they can be tested in Node.
import { extractWords, pickStickers, refLabel } from './engine.js';

export const OT_COUNT = 39;      // books 1-39 are the Old Testament
export const MAX_RANGE = 15;     // most verses allowed in one word puzzle, so everything fits on a page

// Cleans one verse from web.json: removes [added words] brackets and turns straight quotes into curly ones
// (the same style the 30 story themes use). The words themselves are never changed ("Yahweh" stays).
export function tidy(raw) {
  const t = raw.replace(/\[([^\]]*)\]/g, '$1').replace(/\s+/g, ' ').trim();
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i], prev = out.slice(-1), next = t[i + 1] || '';
    if (ch === "'") {
      if (/[\p{L}\p{N}]/u.test(prev) && /\p{L}/u.test(next)) out += '’';          // God's
      else if (!prev || /[\s(“‘—]/.test(prev)) out += '‘';                          // opening quote
      else out += '’';                                                              // closing quote / fathers'
    } else if (ch === '"') out += (!prev || /[\s(‘—]/.test(prev)) ? '“' : '”';
    else out += ch;
  }
  return out;
}

export const chapterCount = (book) => book.ch.length;
export const verseCount = (book, c) => book.ch[c - 1].length;           // c is 1-based
// A few verses (Luke 17:36, Acts 8:37, 15:34, 24:7, Romans 16:25) are left out of the World English Bible and are empty.
// They are skipped everywhere, so a puzzle never has a blank verse.
export function flatVerses(book) {
  const out = [];
  book.ch.forEach((vs, ci) => vs.forEach((t, vi) => { if (t) out.push({ r: `${book.n} ${ci + 1}:${vi + 1}`, t, c: ci + 1, v: vi + 1 }); }));
  return out;
}
export const verseNums = (book, c) => book.ch[c - 1].map((t, i) => (t ? i + 1 : 0)).filter(Boolean);
// Position of the first real verse at or after chapter c, verse v (1-based) in the flat list.
export const verseIndex = (all, c, v) => all.findIndex((x) => x.c === c && x.v >= v);
const lastIndex = (all, c, v) => { let k = -1; all.forEach((x, i) => { if (x.c === c && x.v <= v) k = i; }); return k; };

// Builds the same kind of "theme" object the story themes use, from any passage.
// needV = verse scramble / fill in the blanks (they read on from the start verse); otherwise the chosen range supplies the words.
export function bibleSource(BIBLE, bi, c, from, to, needV) {
  const book = BIBLE.books[bi], all = flatVerses(book), start = verseIndex(all, c, from);
  const cat = bi < OT_COUNT ? 'old_testament_stories' : 'new_testament_stories';
  if (needV) return { th: { title: book.n, cat, verses: all, vocab: [], stk: [], bible: true }, start, ref: '' };
  const verses = all.slice(start, lastIndex(all, c, to) + 1);
  const text = verses.map((v) => v.t).join(' ');
  return { th: { title: book.n, cat, verses, vocab: extractWords(text), stk: pickStickers(text), bible: true }, start: 0, ref: refLabel(verses) };
}
