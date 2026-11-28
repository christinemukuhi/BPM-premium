import './style.css';
import D from './data/themes.json';
import CLUES from './data/clues.json';
import { rng, shuffle, words, clean, verseScramble, cloze, wordsearch, letters, TARGET, refLabel, passage, makeClues, crossword, pickStickers } from './engine.js';
import { bibleSource, chapterCount, verseNums, MAX_RANGE } from './bible.js';
import { LANDING_URL, PROMO } from './config.js';

// Sticker images are real files, so the browser can cache them.
const urls = import.meta.glob('./stickers/*.webp', { eager: true, query: '?url', import: 'default' });
const STK = Object.fromEntries(Object.entries(urls).map(([p, u]) => [p.split('/').pop().replace('.webp', ''), u]));
const img = id => STK[id] ? `<img src="${STK[id]}" alt="">` : '';
const CP = {old_testament_stories:['#E8913A','#A5560F'],new_testament_stories:['#3B82C4','#1F5A93'],christian_character_and_values:['#43A66B','#23703F'],faith_and_spiritual_growth:['#9B5DC9','#6A2F97']};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- worksheet ---------- */
const NAMES={crossword:'Crossword',wordsearch:'Word Search',letters:'Word Scramble',scramble:'Verse Scramble',cloze:'Fill in the Blanks'};
function how(p){
  if(p.type==='crossword')return'Read each clue and write the answer in the grid.'+(p.counts?' The number in ( ) shows how many letters.':'')+(p.bank?' Use the word bank to help you.':'');
  if(p.type==='wordsearch')return'Find the hidden words. They can go across, down, and diagonally.';
  if(p.type==='letters'){const w=p.bible?'passage':'story';return p.first?`Unscramble the letters to spell a word from the ${w}. The first letter is already in place.`:`Unscramble the letters to spell a word from the ${w}.`}
  if(p.type==='scramble')return'Put the pieces in the right order to write the verse.';
  return'Use the word bank to fill in the missing words.'+(p.extra?' Some words in the bank are not needed.':'');
}
const NOTES={
  crossword:{easy:'Up to 6 words, short clues, letter counts and a word bank.',medium:'Up to 8 words, letter counts, no word bank.',hard:'Up to 9 words, longer clues, no letter counts, no word bank.'},
  wordsearch:{easy:'10×10 grid, 6 short words, across and down only.',medium:'12×12 grid, 9 words, diagonals added.',hard:'15×15 grid, up to 13 words, forwards, backwards and diagonal.'},
  letters:{easy:'6 short words with the first letter in place.',medium:'8 words, all letters scrambled.',hard:'10 words, longer ones included.'},
  scramble:{easy:'2 verses, each on its own, in 3-word phrases.',medium:'Up to 3 verses, each on its own, in 2-word pieces.',hard:'Up to 4 verses, each on its own, one word at a time.'},
  cloze:{easy:'2 verses, each on its own, few blanks, first letter given.',medium:'Up to 3 verses, each on its own, more blanks.',hard:'Up to 4 verses, each on its own, many blanks, extra words in the bank.'}
};
function body(p,key,lv){
  if(p.type==='scramble')return p.items.map((x,i)=>key?`<p class="verse vk"><b>${esc(x.ref)}</b> ${esc(x.answer)}</p>`:`<div class="vb"><div class="vref">${i+1}.${x.ref?' '+esc(x.ref):''}</div><div class="tiles">${x.words.map(w=>`<span class="tile">${esc(w)}</span>`).join('')}</div><div class="lines">${'<i></i>'.repeat(x.lines)}</div></div>`).join('');
  if(p.type==='cloze'){
    const vh=p.verses.map((v,i)=>{
      const tx=v.parts.map(x=>x.text!==undefined?esc(x.text):esc(x.pre)+(key?`<u class="filled">${esc(x.answer)}</u>`:`<span class="blank" style="min-width:${x.answer.length+2}ch"><sup>${x.n}</sup>${x.hint?`<b>${esc(x.answer[0])}</b>`:''}</span>`)+esc(x.suf)).join(' ');
      return key?`<p class="verse vk"><b>${esc(v.ref)}</b> ${tx}</p>`:`<div class="vb"><div class="vref">${i+1}.${v.ref?' '+esc(v.ref):''}</div><p class="verse">${tx}</p></div>`;
    }).join('');
    return vh+(key?'':`<ul class="bank">${p.bank.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`);
  }
  if(p.type==='crossword'){
    // The grid is drawn as a vector graphic: every square is exactly the same size and every line is straight and even, on screen and in a saved PDF.
    const cs={easy:1.75,medium:1.625,hard:1.5}[lv]||1.625,R=p.grid.length,C=p.grid[0].length,U=40;
    let rects='',txt='';
    p.grid.forEach((row,r)=>row.forEach((c,k)=>{
      if(!c)return;const x=1.5+k*U,y=1.5+r*U;
      rects+=`<rect x="${x}" y="${y}" width="${U}" height="${U}"/>`;
      if(c.n)txt+=`<text x="${x+3.5}" y="${y+16}" font-size="16" font-weight="700">${c.n}</text>`;
      if(key)txt+=`<text x="${x+U*0.58}" y="${y+U*0.6}" font-size="24" font-weight="800" text-anchor="middle" dominant-baseline="central">${esc(c.ch)}</text>`;
    }));
    const g=`<svg class="cwg" role="img" aria-label="Crossword grid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${C*U+3} ${R*U+3}" style="width:${((C*U+3)*cs/U).toFixed(3)}rem;height:${((R*U+3)*cs/U).toFixed(3)}rem"><g fill="#fff" stroke="#000" stroke-width="2.6" stroke-linejoin="miter">${rects}</g><g fill="#000" font-family="Trebuchet MS,Verdana,sans-serif">${txt}</g></svg>`;
    const li=e=>`<li value="${e.n}">${esc(e.clue)}${p.counts?` (${e.len})`:''}</li>`;
    const al=e=>`<li value="${e.n}"><b>${esc(e.word)}</b>${e.ref?` <small>(${esc(e.ref)})</small>`:''}</li>`;
    const bank=!key&&p.bank?`<ul class="bank">${p.bank.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:'';
    const clues=key?`<div class="clues"><div><h3>Across</h3><ol>${p.across.map(al).join('')}</ol></div><div><h3>Down</h3><ol>${p.down.map(al).join('')}</ol></div></div>`:`<div class="clues"><div><h3>Across</h3><ol>${p.across.map(li).join('')}</ol></div><div><h3>Down</h3><ol>${p.down.map(li).join('')}</ol></div></div>`;
    return g+bank+clues;
  }
  if(p.type==='letters')return`<div class="ls">${p.items.map((x,i)=>`<div><span>${i+1}.</span><span>${key?esc(x.a):esc(x.s)}</span>${key?'':'<i></i>'}</div>`).join('')}</div>`;
  const rows=p.grid.map((row,r)=>`<tr>${row.map((ch,c)=>`<td>${ch}</td>`).join('')}</tr>`).join('');
  // Answer key: one rounded "slot" (pill) per word, drawn over the grid, instead of colouring letter by letter
  const PILL=['#F2B632','#7FC8F8','#F59AA8','#9ADB8F','#C3A5EE','#FFA766'];
  const pills=key?`<svg class="wsk" viewBox="0 0 ${p.size} ${p.size}" preserveAspectRatio="none" aria-hidden="true">${p.slots.map((s,i)=>`<line x1="${s.c+.5}" y1="${s.r+.5}" x2="${s.c+s.dc*(s.w.length-1)+.5}" y2="${s.r+s.dr*(s.w.length-1)+.5}" stroke="${PILL[i%PILL.length]}" stroke-width=".78" stroke-linecap="round"/>`).join('')}</svg>`:'';
  return`<div class="wsg"><table class="grid">${rows}</table>${pills}</div>`+(key?'':`<ul class="wordlist">${p.words.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`);
}
// Promotion line printed on the worksheets (set in src/config.js)
function promoPrint(isKey){
  if(!PROMO.printUrlText||(isKey&&!PROMO.showOnAnswerKey))return '';
  return `<div class="promo-print">${PROMO.qrImage?`<img src="${esc(PROMO.qrImage)}" alt="">`:''}<span>${esc(PROMO.printText)} <b>${esc(PROMO.printUrlText)}</b></span></div>`;
}
function sheet(th,p,key,ref,lv){
  const mode=$('#stk').value,c=CP[th.cat]||CP.old_testament_stories,on=mode!=='none';
  return`<article class="sheet lv-${lv}${mode==='bw'?' bw':''}${p.type==='wordsearch'||p.type==='crossword'?' compact':''}" data-floor="${p.type==='wordsearch'?1:p.type==='crossword'?0.96:0.78}" style="--acc:${c[0]};--accd:${c[1]}"><div class="name-line"><span>Name</span><i></i><span>Date</span><i></i></div>
  <div class="band">${on?img(th.stk[0]):''}<h2>${esc(th.title)}</h2>${on?img(th.stk[1]):''}</div><p class="sub">${esc(NAMES[p.type])}${key?' – Answer Key':''}${ref?' · '+esc(ref):''}</p>
  ${key?'<div style="height:.3in"></div>':`<p class="how">${how(p)}</p>`}${body(p,key,lv)}
  <div class="strip">${on?th.stk.slice(2).map(img).join(''):''}</div>
  ${promoPrint(key)}
  <footer>Made with Bible Puzzle Maker${th.bible||p.type==='scramble'||p.type==='cloze'?' · World English Bible':''}</footer></article>`;
}

/* ---------- controls ---------- */
let seed=Date.now();
const cats=D.cats;
$('#theme').innerHTML=Object.keys(cats).map(c=>`<optgroup label="${esc(cats[c])}">${D.themes.map((t,i)=>t.cat===c?`<option value="${i}">${esc(t.title)}</option>`:'').join('')}</optgroup>`).join('');
function fillVerses(){
  const th=D.themes[$('#theme').value];
  $('#verse').innerHTML=th.verses.map((v,i)=>`<option value="${i}">${esc(v.r)} — ${esc(words(v.t).slice(0,6).join(' '))}…</option>`).join('');
  $('#verse').value='0';
}
/* ---------- whole Bible (loaded the first time it is needed) ---------- */
let BIBLE=null,bibleLoading=false;
const val=id=>Number($('#'+id).value);
function fillBooks(){
  $('#book').innerHTML=['Old Testament','New Testament'].map((g,k)=>`<optgroup label="${g}">${BIBLE.books.map((b,i)=>(i<39)===(k===0)?`<option value="${i}">${esc(b.n)}</option>`:'').join('')}</optgroup>`).join('');
  const jn=BIBLE.books.findIndex(b=>b.n==='Psalms');$('#book').value=String(jn);   // opens on Psalm 23
  fillChapters(23);
}
function fillChapters(want){
  const b=BIBLE.books[val('book')],n=chapterCount(b);
  $('#chap').innerHTML=Array.from({length:n},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
  $('#chap').value=String(want&&want<=n?want:1);
  fillFrom();
}
function fillFrom(){
  const b=BIBLE.books[val('book')],c=val('chap'),nums=verseNums(b,c);
  $('#vfrom').innerHTML=nums.map(v=>`<option value="${v}">${v} — ${esc(words(b.ch[c-1][v-1]).slice(0,5).join(' '))}…</option>`).join('');
  $('#vfrom').value=String(nums[0]);
  fillTo();
}
function fillTo(keep){
  const b=BIBLE.books[val('book')],c=val('chap'),f=val('vfrom'),nums=verseNums(b,c).filter(v=>v>=f).slice(0,MAX_RANGE);
  $('#vto').innerHTML=nums.map(v=>`<option value="${v}">${v}</option>`).join('');
  $('#vto').value=String(keep&&nums.includes(keep)?keep:nums[Math.min(nums.length-1,9)]);
}
function syncSource(){
  const bible=$('#src').value==='bible',type=$('#type').value,needV=type==='scramble'||type==='cloze';
  $('#themeWrap').hidden=bible;$('#bibleCtl').hidden=!bible;
  $('#verseWrap').hidden=bible||!needV;
  $('#lenWrap').hidden=!needV;
  $('#toWrap').hidden=needV;
  $('#fromLbl').textContent=needV?'Start at verse':'From verse';
  $('#srcNote').textContent=bible
    ?'Verses are World English Bible text. Word searches, scrambles and crosswords use words taken from your chosen passage (up to '+MAX_RANGE+' verses).'
    :'Verses are World English Bible text. Word searches and letter scrambles use each theme’s vocabulary list.';
}
async function loadBible(){
  if(BIBLE)return;
  BIBLE=(await import('./data/bible.json')).default;fillBooks();
}
async function ensureBible(){
  if(BIBLE||bibleLoading)return;
  bibleLoading=true;emptyMsg('Loading the Bible…');
  try{await loadBible()}
  catch(e){$('#src').value='themes'}
  bibleLoading=false;syncSource();render();
  if(!BIBLE)emptyMsg('The Bible could not be loaded. Check your connection and try again.');
}
// Shrinks a page's contents a little when a harder puzzle would not fit on one sheet
function fitSheets(){
  document.querySelectorAll('.sheet').forEach(function(s){
    var kids=[].slice.call(s.children);
    var set=function(z){kids.forEach(function(k){k.style.zoom=z})};
    var over=function(){return s.scrollHeight>s.clientHeight+1};
    var floor=parseFloat(s.getAttribute('data-floor'))||0.78;   // word search and crossword text must stay large
    set(1);
    if(!over())return;
    var st=s.querySelector('.strip');if(st)st.style.display='none';   // 1. drop the decorative sticker row
    var z=1;
    while(over()&&z>floor){z-=0.02;set(z)}                           // 2. then shrink a little, never below the floor
  });
}
/* ---------- render ---------- */
const emptyMsg=m=>{$('#preview').innerHTML=`<p class="empty">${m}</p>`};
// Reads every control into one plain object, so a puzzle can be saved and rebuilt later (the pack uses this)
function readCfg(){
  return{src:$('#src').value,theme:$('#theme').value,verse:$('#verse').value,book:$('#book').value,chap:$('#chap').value,vfrom:$('#vfrom').value,vto:$('#vto').value,type:$('#type').value,level:$('#level').value,len:$('#len').value,seed};
}
function setPaper(paper){
  document.documentElement.style.setProperty('--sheet-w',paper==='A4'?'210mm':'8.5in');
  document.documentElement.style.setProperty('--sheet-h',paper==='A4'?'297mm':'11in');
  let st=$('#pageStyle');if(!st){st=document.createElement('style');st.id='pageStyle';document.head.append(st)}
  st.textContent=`@page{size:${paper==='A4'?'A4':'letter'};margin:0}`;
}
// Builds one puzzle from a set of choices. Returns {th,p,ref,lv}, or {error}, or {wait} while the Bible is still loading.
function buildPuzzle(c){
  const type=c.type,lv=c.level,bible=c.src==='bible',needV=type==='scramble'||type==='cloze';
  let th,start=0,ref='';
  if(bible){
    if(!BIBLE)return{wait:true};
    ({th,start,ref}=bibleSource(BIBLE,Number(c.book),Number(c.chap),Number(c.vfrom),needV?Number(c.vfrom):Number(c.vto),needV));
  }else{th=D.themes[c.theme];start=Number(c.verse)}
  const r=rng(c.seed);let p;
  if(needV){
    let len=c.len;const auto=len==='auto';
    if(auto)len=String({easy:2,medium:3,hard:4}[lv]);
    const ps=passage(th,start,len,TARGET[type][lv]);
    if(auto){ // keep each page to a sensible size
      const cap=({scramble:{easy:30,medium:45,hard:60},cloze:{easy:45,medium:75,hard:120}})[type][lv];let tot=0;const keep=[];
      for(const v of ps.vs){const w=words(v.t).length;if(keep.length&&tot+w>cap)break;keep.push(v);tot+=w}
      ps.vs=keep;ps.ref=refLabel(keep);
    }
    ref=ps.ref;
    if(bible)th.stk=pickStickers(ps.text);
    p=type==='scramble'?verseScramble(ps.vs,lv,r):cloze(ps.vs,lv,r);
  }else if(type==='crossword'){
    p=crossword(makeClues(th.vocab,th.verses,lv,bible?{}:CLUES).entries,lv,r);
    if(p.words.length<4)return{error:bible?'Not enough different words for a crossword in this passage. Choose more verses or another age group.':'Not enough words for a crossword in this theme. Try another theme or age group.'};
  }else{
    p=type==='wordsearch'?wordsearch(th.vocab,lv,r):letters(th.vocab,lv,r);
    if((p.words||p.items).length<(bible?4:1))return{error:bible?'Not enough different words in this passage. Choose more verses.':'Not enough words for this puzzle. Try another theme.'};
  }
  p.bible=bible;
  return{th,p,ref,lv};
}
function render(){
  const c=readCfg();
  syncSource();
  $('#levelNote').textContent=NOTES[c.type][c.level];
  setPaper($('#paper').value);
  const res=buildPuzzle(c);
  if(res.wait){ensureBible();return}
  if(res.error)return emptyMsg(res.error);
  $('#pv').innerHTML=res.th.stk.map(img).join('');
  const hint=window.innerWidth<=900?'<p class="note">Tip: tap a page to zoom in or out.</p>':'';
  $('#preview').innerHTML=hint+sheet(res.th,res.p,false,res.ref,res.lv)+($('#key').checked?sheet(res.th,res.p,true,res.ref,res.lv):'');
  fitSheets();
}

/* ---------- pack: collect several puzzles, then print or save them as one PDF ---------- */
const PACK_KEY='bpm-pack-v1',PACK_MAX=60;
let pack=[];
try{pack=JSON.parse(localStorage.getItem(PACK_KEY)||'[]');if(!Array.isArray(pack))pack=[]}catch(e){pack=[]}
const savePack=()=>{try{localStorage.setItem(PACK_KEY,JSON.stringify(pack))}catch(e){}};
const packMsg=m=>{$('#packMsg').textContent=m;$('#packMsg').hidden=!m};
function renderPack(){
  $('#packCount').textContent=pack.length;
  $('#packEmpty').hidden=pack.length>0;
  $('#packList').innerHTML=pack.map((it,i)=>`<li><span class="pl">${esc(it.label)}</span><span class="pk"><button type="button" data-a="up" data-i="${i}" aria-label="Move up"${i?'':' disabled'}>↑</button><button type="button" data-a="down" data-i="${i}" aria-label="Move down"${i<pack.length-1?'':' disabled'}>↓</button><button type="button" data-a="del" data-i="${i}" aria-label="Remove from pack">✕</button></span></li>`).join('');
  $('#packPrint').disabled=$('#packClear').disabled=!pack.length;
}
$('#addPack').addEventListener('click',()=>{
  packMsg('');
  const c=readCfg(),res=buildPuzzle(c);
  if(res.wait||res.error)return packMsg('Choose a puzzle first.');
  if(pack.length>=PACK_MAX)return packMsg('Your pack is full ('+PACK_MAX+' puzzles). Print it or remove some.');
  const base=c.src==='bible'?res.ref:res.th.title+(res.ref?' · '+res.ref:'');
  pack.push({c,label:base+' · '+$('#type').selectedOptions[0].text+' · '+$('#level').selectedOptions[0].text});
  savePack();renderPack();
  const b=$('#addPack');b.textContent='Added ✓';setTimeout(()=>{b.textContent='Add to pack'},1200);
  $('#packBox').open=true;
});
$('#packList').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  const i=Number(b.dataset.i),a=b.dataset.a;
  if(a==='del')pack.splice(i,1);
  else if(a==='up'&&i>0)[pack[i-1],pack[i]]=[pack[i],pack[i-1]];
  else if(a==='down'&&i<pack.length-1)[pack[i+1],pack[i]]=[pack[i],pack[i+1]];
  savePack();renderPack();packMsg('');
});
$('#packClear').addEventListener('click',()=>{if(pack.length&&confirm('Remove all puzzles from your pack?')){pack=[];savePack();renderPack();packMsg('')}});
async function printPack(){
  packMsg('');
  if(!pack.length)return;
  if(pack.some(it=>it.c.src==='bible')&&!BIBLE){try{await loadBible()}catch(e){return packMsg('The Bible could not be loaded. Check your connection and try again.')}}
  setPaper($('#paper').value);
  const mode=$('#packKeys').value,pz=[],ks=[];let skipped=0;
  pack.forEach(it=>{
    let res;try{res=buildPuzzle(it.c)}catch(e){res=null}
    if(!res||res.error||res.wait){skipped++;return}
    const a=sheet(res.th,res.p,false,res.ref,res.lv),k=mode==='none'?'':sheet(res.th,res.p,true,res.ref,res.lv);
    if(mode==='each')pz.push(a+k);else{pz.push(a);if(k)ks.push(k)}
  });
  if(!pz.length)return packMsg('None of the puzzles in your pack could be built. Try removing them and adding them again.');
  $('#packOut').innerHTML=pz.join('')+ks.join('');
  fitSheets();
  if(skipped)packMsg(skipped+' puzzle'+(skipped>1?'s were':' was')+' skipped because it could not be built.');
  document.body.classList.add('printing-pack');
  window.print();
}
const endPackPrint=()=>{document.body.classList.remove('printing-pack');$('#packOut').innerHTML=''};
window.addEventListener('afterprint',endPackPrint);
$('#packPrint').addEventListener('click',printPack);
renderPack();if(pack.length)$('#packBox').open=true;   // reopen a saved pack
$('#theme').addEventListener('input',()=>{fillVerses();render()});
$('#src').addEventListener('input',()=>{if($('#src').value==='bible'&&!BIBLE){ensureBible()}else render()});
$('#book').addEventListener('input',()=>{fillChapters();render()});
$('#chap').addEventListener('input',()=>{fillFrom();render()});
$('#vfrom').addEventListener('input',()=>{fillTo(val('vto'));render()});
$('#vto').addEventListener('input',render);
['type','verse','len','level','paper','key','stk'].forEach(id=>$('#'+id).addEventListener('input',render));
// On phones the page preview is small: tap a page to zoom in or out
$('#preview').addEventListener('click',function(e){if(window.innerWidth<=900&&e.target.closest&&e.target.closest('.sheet'))this.classList.toggle('big')});
$('#again').addEventListener('click',()=>{seed=Date.now();render()});
$('#print').addEventListener('click',()=>{endPackPrint();window.print()});
$('#hdrStk').innerHTML=['lamb','dove','star'].map(img).join('');
// In-app banner for your paid editions: set LANDING_URL and PROMO in src/config.js
if(/^https?:\/\//.test(LANDING_URL)&&!LANDING_URL.includes('YOUR-')&&PROMO.appBannerText){
  const m=$('#more');
  m.innerHTML=`<span>${esc(PROMO.appBannerText)}</span> <a href="${esc(LANDING_URL)}" target="_blank" rel="noopener">${esc(PROMO.appBannerButton)}</a>`;
  m.hidden=false;
}
fillVerses();render();

// ----- install -----
let deferred;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#install').hidden = false; });
$('#install').addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#install').hidden = true; });
if (/iphone|ipad/i.test(navigator.userAgent) && !(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone)) $('#iosHint').hidden = false;
