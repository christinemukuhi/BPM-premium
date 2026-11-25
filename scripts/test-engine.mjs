import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rng, verseScramble, cloze, wordsearch, letters, extractWords, pickStickers, passage, refLabel, words, makeClues, crossword } from '../src/engine.js';

const D = JSON.parse(fs.readFileSync(new URL('../src/data/themes.json', import.meta.url)));
const CLUES = JSON.parse(fs.readFileSync(new URL('../src/data/clues.json', import.meta.url)));
const files = new Set(fs.readdirSync(new URL('../src/stickers/', import.meta.url)).map((f) => f.replace('.webp', '')));

assert.equal(D.themes.length, 30);
for (const th of D.themes) {
  assert.ok(th.verses.length > 0, th.id + ' has verses');
  assert.ok(th.vocab.length >= 6, th.id + ' has vocab');
  assert.ok(th.stk.length >= 4 && th.stk.every((s) => files.has(s)), th.id + ' stickers exist');
  for (const lv of ['easy', 'medium', 'hard']) {
    const r = rng(th.id.length * 7 + lv.length);
    const ps = passage(th, 0, '3', 50);
    assert.ok(ps.vs.length >= 1 && ps.ref);
    const s = verseScramble(ps.vs, lv, r);
    s.items.forEach((it) => assert.ok(it.words.join(' ').split(' ').length === words(it.answer).length));
    const c = cloze(ps.vs, lv, r);
    const blanks = c.verses.flatMap((v) => v.parts.filter((p) => p.blank !== undefined || p.n));
    assert.ok(blanks.length >= 1 && c.bank.length >= blanks.length);
    assert.ok(wordsearch(th.vocab, lv, r).words.length >= 4, th.id + ' word search ' + lv);
    assert.ok(letters(th.vocab, lv, r).items.length >= 5);
  }
}
const john = 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.';
const ex = extractWords(john);
assert.ok(ex.length >= 4 && ex.includes('ETERNAL') && !ex.includes('THAT'));
assert.ok(pickStickers('Jonah and the great fish on a ship').includes('fish2'));
assert.equal(refLabel([{ r: 'John 3:16' }, { r: 'John 3:18' }]), 'John 3:16–18');
// ---- crossword: every run of 2+ letters in the grid must be exactly a placed word ----
function hasGap(g) {
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
    if (g[r][c]) continue;
    if ((g[r][c - 1] && g[r][c + 1]) || (g[r - 1]?.[c] && g[r + 1]?.[c])) return true;
  }
  return false;
}
function checkCrossword(cw, label) {
  assert.ok(!hasGap(cw.grid), label + ' has an empty square between two letters');
  const runs = [];
  const R = cw.grid.length, C = cw.grid[0].length;
  for (let r = 0; r < R; r++) { let cur = ''; for (let c = 0; c <= C; c++) { const ch = c < C && cw.grid[r][c] ? cw.grid[r][c].ch : null; if (ch) cur += ch; else { if (cur.length > 1) runs.push(cur); cur = ''; } } }
  for (let c = 0; c < C; c++) { let cur = ''; for (let r = 0; r <= R; r++) { const ch = r < R && cw.grid[r][c] ? cw.grid[r][c].ch : null; if (ch) cur += ch; else { if (cur.length > 1) runs.push(cur); cur = ''; } } }
  const entries = [...cw.across, ...cw.down].map((e) => e.word);
  assert.deepEqual([...runs].sort(), [...entries].sort(), label + ' grid runs match entries');
  for (const e of [...cw.across, ...cw.down]) assert.ok((e.clue.includes('_____') || CLUES[e.word]) && e.n > 0, label + ' clue');
}
const stats = { easy: [], medium: [], hard: [] };
let skippedThemes = 0;
for (const th of D.themes) for (const lv of ['easy', 'medium', 'hard']) {
  const { entries, skipped } = makeClues(th.vocab, th.verses, lv, CLUES);
  const cw = crossword(entries, lv, rng(th.id.length + lv.length * 13));
  assert.equal(skipped.length, 0, th.id + ' every vocab word has a clue');
  assert.ok(![...cw.across, ...cw.down].some((e) => e.clue.toUpperCase().split(/[^A-Z]+/).includes(e.word)), th.id + ' clue does not contain its answer');
  if (cw.words.length < 4) { skippedThemes++; console.log('  thin crossword:', th.id, lv, cw.words.length, 'of', th.vocab.length, 'skipped', skipped.join(',')); continue; }
  checkCrossword(cw, th.id + ' ' + lv);
  assert.ok(cw.words.length <= { easy: 6, medium: 8, hard: 9 }[lv]);
  assert.ok(cw.grid.length <= { easy: 10, medium: 12, hard: 14 }[lv] && cw.grid[0].length <= { easy: 10, medium: 12, hard: 14 }[lv], th.id + ' crossword grid stays small enough to print');
  stats[lv].push(cw.words.length);
}
for (const k in stats) console.log('crossword', k, 'words placed min/avg/max', Math.min(...stats[k]), (stats[k].reduce((a, b) => a + b, 0) / stats[k].length).toFixed(1), Math.max(...stats[k]), 'themes ok', stats[k].length);
assert.equal(skippedThemes, 0, 'every theme should make a crossword at every level');
// custom text path
const jon = [{ r: '', t: 'God told Jonah to go to Nineveh.' }, { r: '', t: 'Jonah ran away on a ship.' }, { r: '', t: 'A great fish swallowed Jonah.' }];
const jc = crossword(makeClues(['JONAH', 'NINEVEH', 'SHIP', 'FISH', 'SWALLOWED', 'GREAT'], jon, 'medium').entries, 'medium', rng(5));
checkCrossword(jc, 'jonah');
// ---- icons: every file the manifest and index.html point to must exist at the right size ----
const png = (f) => { const b = fs.readFileSync(new URL('../public/' + f, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
for (const [f, w] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32], ['favicon-16.png', 16]]) {
  assert.deepEqual(png(f), [w, w], f + ' should be ' + w + 'x' + w);
}
assert.ok(fs.existsSync(new URL('../public/favicon.ico', import.meta.url)), 'favicon.ico exists');
const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const ref of page.match(/href="[^"#]+\.(png|ico)"/g) || []) assert.ok(fs.existsSync(new URL('../public/' + ref.slice(6, -1), import.meta.url)), ref + ' is missing from public/');
console.log('engine + data OK:', D.themes.length, 'themes,', files.size, 'stickers');

// ================= Whole Bible =================
import { tidy, bibleSource, flatVerses, verseNums, MAX_RANGE, OT_COUNT } from '../src/bible.js';
const BIBLE = JSON.parse(fs.readFileSync(new URL('../src/data/bible.json', import.meta.url)));
assert.equal(BIBLE.books.length, 66);
assert.equal(BIBLE.books.reduce((n, b) => n + b.ch.reduce((m, c) => m + c.length, 0), 0), 31103, 'verse count');
assert.equal(BIBLE.books[OT_COUNT - 1].n, 'Malachi'); assert.equal(BIBLE.books[OT_COUNT].n, 'Matthew');
assert.equal(BIBLE.books[42].ch[2][15], 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.');
assert.ok(BIBLE.books[0].ch[0][0].startsWith('In the beginning God created'));
assert.ok(JSON.stringify(BIBLE).includes('Yahweh'), 'Yahweh kept as in the World English Bible');
assert.equal(tidy("God's Spirit said, \"Let [there] be 'light.'\""), 'God’s Spirit said, “Let there be ‘light.’”');
const EMPTY = ['Luke 17:36', 'Acts 8:37', 'Acts 15:34', 'Acts 24:7', 'Romans 16:25'];
let empties = [];
for (const b of BIBLE.books) b.ch.forEach((c, ci) => c.forEach((t, vi) => { if (!t) empties.push(`${b.n} ${ci + 1}:${vi + 1}`); else assert.ok(!/['"\[\]]/.test(t) && t.trim() === t, b.n + ' verse text is clean'); }));
assert.deepEqual(empties, EMPTY, 'only the five verses the WEB leaves out are empty');
// every chapter of the Bible, as a word puzzle (first MAX_RANGE verses) and as a verse puzzle
let thin = 0, chapters = 0;
BIBLE.books.forEach((b, bi) => b.ch.forEach((vs, ci) => {
  chapters++;
  const nums = verseNums(b, ci + 1), to = nums[Math.min(nums.length, MAX_RANGE) - 1];
  const { th, ref } = bibleSource(BIBLE, bi, ci + 1, nums[0], to, false);
  assert.ok(ref.startsWith(b.n + ' ' + (ci + 1) + ':' + nums[0]), 'ref ' + ref);
  assert.ok(th.verses.every((v) => v.t), 'no blank verses in ' + ref);
  assert.equal(th.stk.length, 5); assert.ok(th.stk.every((s) => files.has(s)), 'stickers exist for ' + ref);
  for (const lv of ['easy', 'medium', 'hard']) {
    const r = rng(bi * 1000 + ci * 3 + lv.length);
    if (nums.length < 6) continue;                                           // tiny chapters (e.g. Psalm 117) cannot fill a word puzzle
    const ws = wordsearch(th.vocab, lv, r), ls = letters(th.vocab, lv, r);
    assert.ok(ws.words.length >= 4 && ls.items.length >= 4, ref + ' word puzzles ' + lv);
    const { entries } = makeClues(th.vocab, th.verses, lv);
    entries.forEach((e) => assert.ok(!e.clue.toUpperCase().split(/[^A-Z]+/).includes(e.word), ref + ' clue leaks answer'));
    if (lv !== 'medium' && (bi * 7 + ci) % 6 !== 0) continue;           // crosswords are slow to build: every chapter at medium, every 6th at the other levels
    const cw = crossword(entries, lv, r);
    if (cw.words.length < 4) { thin++; continue; }
    checkCrossword(cw, ref + ' ' + lv);
  }
  const vs2 = bibleSource(BIBLE, bi, ci + 1, 1, 1, true);
  const ps = passage(vs2.th, vs2.start, 'auto', 45);
  assert.ok(ps.vs.length >= 1 && ps.ref.startsWith(b.n + ' ' + (ci + 1) + ':1'));
  const lv = 'medium', r = rng(ci + bi);
  const sc = verseScramble(ps.vs, lv, r), cz = cloze(ps.vs, lv, r);
  assert.ok(sc.items.length >= 1 && cz.bank.length >= 1);
}));
console.log('whole Bible OK:', chapters, 'chapters tested; thin crosswords (fine, shows a message):', thin);
// reading on across a chapter and a book edge
const g50 = bibleSource(BIBLE, 0, 50, 25, 25, true);
const edge = passage(g50.th, g50.start, '8', 50);
assert.ok(edge.vs.length >= 1 && edge.ref.startsWith('Genesis 50:25'));
const john3 = bibleSource(BIBLE, 42, 3, 16, 16, false);
assert.ok(john3.th.vocab.length >= 4 && john3.ref === 'John 3:16');
// multi-word book names
const sos = BIBLE.books.findIndex((b) => b.n === 'Song of Solomon');
const sb = bibleSource(BIBLE, sos, 2, 1, 1, true);
const sp = passage(sb.th, sb.start, '3', 50);
assert.equal(sp.ref, 'Song of Solomon 2:1–3');

// gaps: Acts 8:36 reads on to 8:38; the empty verse never appears
const a = bibleSource(BIBLE, 43, 8, 36, 38, false);
assert.deepEqual(a.th.verses.map((v) => v.r), ['Acts 8:36', 'Acts 8:38']);
assert.ok(!verseNums(BIBLE.books[43], 8).includes(37));
