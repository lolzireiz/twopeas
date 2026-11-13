// Peadle: one secret word a day, the same for both of you. Solve it, then compare.
import { store } from '../store.js';
import { award, today } from '../logic.js';
import { header, themName, meName } from '../ui.js';
import { esc, toast, confetti, addDays, daysBetween, fmtDay } from '../util.js';

const START = '2026-11-12';
let answers = null;
let valid = null;
let loading = null;
function load() {
  if (answers) return Promise.resolve();
  loading = loading || Promise.all([
    fetch('./data/peadle.txt').then((r) => r.text()),
    fetch('./data/words5.txt').then((r) => r.text()),
  ]).then(([a, v]) => {
    answers = a.split('\n').map((w) => w.trim()).filter(Boolean);
    valid = new Set(v.split('\n').map((w) => w.trim()).filter(Boolean));
    answers.forEach((w) => valid.add(w));
  }).catch(() => { loading = null; });
  return loading;
}

export const peadleNo = (d = today()) => daysBetween(START, d) + 1;
export function wordFor(d = today()) {
  if (!answers) return null;
  const n = ((daysBetween(START, d) % answers.length) + answers.length) % answers.length;
  return answers[n];
}
export const pdlId = (d, who) => `pdl-${d}-${who}`;
export const myPeadle = (d = today()) => store.get(pdlId(d, store.me))?.data || null;
export const theirPeadle = (d = today()) => store.get(pdlId(d, store.partnerId))?.data || null;

export function scoreWord(guess, word) {
  const res = Array(5).fill('x');
  const left = {};
  for (let i = 0; i < 5; i++) { if (guess[i] === word[i]) res[i] = 'g'; else left[word[i]] = (left[word[i]] || 0) + 1; }
  for (let i = 0; i < 5; i++) if (res[i] !== 'g' && left[guess[i]] > 0) { res[i] = 'y'; left[guess[i]]--; }
  return res;
}

const EMO = { g: '🟩', y: '🟨', x: '⬜' };
export function emojiGrid(p) {
  return (p.guesses || []).map((g) => scoreWord(g, p.word).map((c) => EMO[c]).join('')).join('\n');
}

function stats(who) {
  const all = store.all('peadle', (p) => p.by === who && p.data.done);
  const wins = all.filter((p) => p.data.won);
  const dist = [0, 0, 0, 0, 0, 0];
  wins.forEach((p) => { dist[p.data.guesses.length - 1]++; });
  let streak = 0;
  const has = (d) => store.get(pdlId(d, who))?.data?.won;
  let d = has(today()) ? today() : addDays(today(), -1);
  while (has(d)) { streak++; d = addDays(d, -1); }
  return { played: all.length, wins: wins.length, pct: all.length ? Math.round((wins.length / all.length) * 100) : 0, dist, streak };
}

function headToHead() {
  let me = 0; let them = 0; let ties = 0;
  for (const p of store.all('peadle', (x) => x.by === store.me && x.data.done)) {
    const o = theirPeadle(p.data.date);
    if (!o?.done) continue;
    const a = p.data.won ? p.data.guesses.length : 9;
    const b = o.won ? o.guesses.length : 9;
    if (a < b) me++; else if (b < a) them++; else ties++;
  }
  return { me, them, ties };
}

let input = '';
let shake = false;
let revealRow = -1;

function grid(p, word, { live = false, hide = false } = {}) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const gs = p?.guesses?.[i];
    if (gs) {
      const sc = scoreWord(gs, word);
      rows.push(`<div class="word-row ${i === revealRow ? 'rev' : ''}">${[...gs].map((ch, j) => `<span class="${sc[j]}" style="--i:${j}">${hide ? '' : ch}</span>`).join('')}</div>`);
    } else if (live && i === (p?.guesses?.length || 0)) {
      rows.push(`<div class="word-row ${shake ? 'shake' : ''}">${Array.from({ length: 5 }, (_, j) => `<span class="${input[j] ? 'typed' : ''}">${input[j] || ''}</span>`).join('')}</div>`);
    } else rows.push(`<div class="word-row">${'<span></span>'.repeat(5)}</div>`);
  }
  return `<div class="word-grid ${hide ? 'mini' : ''}">${rows.join('')}</div>`;
}

function keyboard(p, word) {
  const best = {};
  const rank = { x: 1, y: 2, g: 3 };
  for (const gs of p?.guesses || []) {
    const sc = scoreWord(gs, word);
    [...gs].forEach((ch, j) => { if (!best[ch] || rank[sc[j]] > rank[best[ch]]) best[ch] = sc[j]; });
  }
  const kb = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  return `<div class="kb">${kb.map((row, ri) => `<div class="kb-row">${ri === 2 ? '<button class="wide" data-act="key" data-k="enter">Enter</button>' : ''}${[...row].map((k) => `<button class="${best[k] || ''}" data-act="key" data-k="${k}">${k}</button>`).join('')}${ri === 2 ? '<button class="wide" data-act="key" data-k="del">⌫</button>' : ''}</div>`).join('')}</div>`;
}

function distBars(s, hi) {
  const max = Math.max(1, ...s.dist);
  return s.dist.map((n, i) => `<div class="dist-row"><span>${i + 1}</span><i style="width:${Math.max(8, (n / max) * 100)}%" class="${hi === i + 1 ? 'hi' : ''}">${n}</i></div>`).join('');
}

export function view() {
  if (!answers) {
    load().then(() => { import('../bus.js').then(({ bus }) => bus.rerender()); });
    return { html: `${header('Peadle', { back: '#/play' })}<div class="card center"><div class="spinner">Shelling today's word… 🫛</div></div>` };
  }
  const d = today();
  const word = wordFor(d);
  const mine = myPeadle(d) || { date: d, word, guesses: [], done: false, won: false };
  const theirs = theirPeadle(d);
  const done = mine.done;
  const sMe = stats(store.me);
  const sThem = stats(store.partnerId);
  const h2h = headToHead();

  const theirLine = !theirs ? `${themName()} hasn't played yet`
    : !theirs.done ? `${themName()} is on guess ${theirs.guesses.length + 1}…`
      : theirs.won ? `${themName()} solved it in ${theirs.guesses.length} ${theirs.guesses.length <= 3 ? '🔥' : '✅'}` : `${themName()} got stumped today`;

  let body;
  if (!done) {
    body = `<div class="pdl-them">${theirLine}</div>
      ${grid(mine, word, { live: true })}
      ${keyboard(mine, word)}
      <p class="tiny muted center" style="margin-top:10px">Same word for both of you. 🟩 right spot, 🟨 wrong spot.</p>`;
  } else {
    const verdict = mine.won ? ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][mine.guesses.length - 1] : 'So close';
    let vs = '';
    if (theirs?.done) {
      const a = mine.won ? mine.guesses.length : 9;
      const b = theirs.won ? theirs.guesses.length : 9;
      vs = a < b ? `You beat ${themName()} today 🏆` : b < a ? `${themName()} got you today 😤` : 'Dead even today 🤝';
    }
    body = `<div class="card center">
        <div style="font-size:13px" class="bold muted">PEADLE #${peadleNo(d)}</div>
        <h2 style="font-size:24px;margin:4px 0">${verdict}${mine.won ? '!' : ''}</h2>
        <p class="small">The word was <span class="pill gold" style="font-size:15px">${esc(word.toUpperCase())}</span></p>
        ${vs ? `<p class="bold" style="margin-top:8px">${vs}</p>` : ''}
      </div>
      <div class="pdl-vs">
        <div><div class="bold small center" style="margin-bottom:6px;color:var(--me)">${meName()} · ${mine.won ? `${mine.guesses.length}/6` : 'X/6'}</div>${grid(mine, word)}</div>
        <div><div class="bold small center" style="margin-bottom:6px;color:var(--them)">${themName()} · ${theirs?.done ? (theirs.won ? `${theirs.guesses.length}/6` : 'X/6') : '…'}</div>${theirs?.done ? grid(theirs, word) : `<div class="pdl-wait">${theirs ? 'Still playing…' : 'Not played yet'}</div>`}</div>
      </div>
      <div class="sp"></div>
      <button class="btn ghost block" data-act="share">Copy my result</button>
      <p class="tiny muted center" style="margin-top:8px">A new word unlocks at midnight.</p>`;
  }

  return {
    html: `${header('Peadle', { back: '#/play', sub: `#${peadleNo(d)} · ${fmtDay(d)}` })}
      ${body}
      <div class="section-title">Head to head</div>
      <div class="card"><div class="score">
        <div><b style="color:var(--me)">${h2h.me}</b><span class="who">${meName()}</span></div>
        <div class="muted bold">days won</div>
        <div><b style="color:var(--them)">${h2h.them}</b><span class="who">${themName()}</span></div>
      </div>${h2h.ties ? `<div class="score-sub">${h2h.ties} tie${h2h.ties === 1 ? '' : 's'}</div>` : ''}</div>
      <div class="grid2" style="gap:12px">
        ${[[sMe, meName(), 'me'], [sThem, themName(), 'them']].map(([s, n, cls]) => `<div class="card" style="margin:0">
          <div class="bold small" style="color:var(--${cls})">${n}</div>
          <div class="pdl-stats"><div><b>${s.played}</b><span>played</span></div><div><b>${s.pct}%</b><span>wins</span></div><div><b>${s.streak}</b><span>streak</span></div></div>
          <div class="dist">${distBars(s, cls === 'me' && done && mine.won ? mine.guesses.length : 0)}</div></div>`).join('')}
      </div>`,
    mount: () => {
      const onKey = (e) => {
        if (done || e.metaKey || e.ctrlKey || e.target.closest?.('input, textarea')) return;
        if (e.key === 'Enter') press('enter');
        else if (e.key === 'Backspace') press('del');
        else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    },
    actions: {
      key: (x) => press(x.k),
      share: async () => {
        const text = `Two Peas · Peadle #${peadleNo(d)} ${mine.won ? mine.guesses.length : 'X'}/6\n${emojiGrid({ ...mine, word })}`;
        try { await navigator.clipboard.writeText(text); toast('Copied 🟩'); } catch { toast('Could not copy'); }
      },
    },
  };

  async function press(k) {
    revealRow = -1;
    if (done) return;
    if (k === 'del') { input = input.slice(0, -1); rerender(); return; }
    if (k === 'enter') {
      if (input.length !== 5) { nope('Five letters, please'); return; }
      if (!valid.has(input)) { nope('Not in the word list'); return; }
      const guesses = [...mine.guesses, input];
      const won = input === word;
      const over = won || guesses.length >= 6;
      input = '';
      revealRow = guesses.length - 1;
      const next = { date: d, word, guesses, done: over, won };
      await store.set(pdlId(d, store.me), 'peadle', next);
      if (over) finish(next);
      rerender();
      return;
    }
    if (input.length < 5) { input += k; rerender(); }
  }
  function nope(msg) {
    toast(msg);
    shake = true; rerender();
    setTimeout(() => { shake = false; }, 400);
  }
  async function finish(p) {
    const n = p.guesses.length;
    if (p.won) {
      await award(6 + (6 - n) * 2, 'peadle', `pdl-${d}-${store.me}`);
      setTimeout(() => confetti(n <= 3 ? 90 : 50), 900);
    } else await award(3, 'peadle', `pdl-${d}-${store.me}`);
    const o = theirPeadle(d);
    if (o?.done) await award(5, 'peadle', `pdl-both-${d}`);
    store.notify('game', p.won ? `${store.mine.name || 'Your person'} solved today's Peadle in ${n} 🟩` : `${store.mine.name || 'Your person'} got stumped by today's Peadle`,
      o?.done ? 'Come compare your grids' : 'Your turn. Can you beat it?', '#/peadle');
  }
}

function rerender() { import('../bus.js').then(({ bus }) => bus.rerender()); }

// For Home and Play: has today's been played?
export function peadleStatus() {
  const m = myPeadle();
  const t = theirPeadle();
  return { mineDone: !!m?.done, theirsDone: !!t?.done, theirWon: t?.won, theirN: t?.guesses?.length };
}
load();
