// Word Hunt: same 4x4 board for both of you, 80 seconds each, highest score wins.
import { store } from '../store.js';
import { huntRes } from '../logic.js';
import { esc, lsGet, lsSet, toast, hash } from '../util.js';
import { bus } from '../bus.js';
import { themName, meName } from '../ui.js';

const DICE = ['AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS', 'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY', 'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW', 'EIOSST', 'ELRTTY', 'HIMNQU', 'HLNNRZ'];
const PTS = { 3: 100, 4: 400, 5: 800, 6: 1400, 7: 1800, 8: 2200 };
export const SECS = 80;
export const wordPts = (w) => PTS[Math.min(8, w.length)] || 0;

export function newBoard(seed) {
  let s = hash(String(seed)) || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const dice = DICE.slice();
  for (let i = dice.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [dice[i], dice[j]] = [dice[j], dice[i]]; }
  return dice.map((d) => { const c = d[Math.floor(rnd() * 6)].toLowerCase(); return c === 'q' ? 'qu' : c; });
}

let dict = null;
let loading = null;
export function loadDict() {
  if (dict) return Promise.resolve(dict);
  loading = loading || fetch('./data/words.txt').then((r) => { if (!r.ok) throw new Error('Could not load the word list'); return r.text(); })
    .then((t) => { dict = new Set(t.split('\n')); window.__huntDict = dict; return dict; })
    .catch((e) => { loading = null; throw e; });
  return loading;
}

const runKey = (g) => `twopeas-hunt-${g.id}-${store.me}`;
const adj = (a, b) => a !== b && Math.abs((a % 4) - (b % 4)) <= 1 && Math.abs((a >> 2) - (b >> 2)) <= 1;
const total = (words) => words.reduce((n, w) => n + wordPts(w), 0);

async function submit(g, words, helpers) {
  const score = total(words);
  await store.add('huntr', { words, score, game: g.id }, { id: `huntr-${g.id}-${store.me}`, once: true });
  try { localStorage.removeItem(runKey(g)); } catch { /* ignore */ }
  const theirs = huntRes(g, store.partnerId);
  if (theirs) {
    const winner = score > theirs.score ? store.me : theirs.score > score ? store.partnerId : 'draw';
    await store.update(g.id, { winner, done: true });
    await helpers.finish(store.get(g.id));
  } else {
    store.notify('game', `${store.mine.name || 'Your person'} finished Word Hunt 🔎`, 'Your turn! Same board, 80 seconds. Can you beat them?', `#/game/${g.id}`);
  }
  bus.rerender();
}

const wordList = (words, other) => words.slice().sort((a, b) => b.length - a.length || a.localeCompare(b))
  .map((w) => `<div class="hw ${other && other.includes(w) ? 'both' : ''}"><span>${esc(w)}</span><span>${wordPts(w)}</span></div>`).join('') || '<div class="small muted">No words</div>';

export function hunt(g, helpers) {
  const d = g.data;
  const mine = huntRes(g, store.me);
  const theirs = huntRes(g, store.partnerId);

  if (mine && theirs) {
    return {
      html: `${helpers.banner(g)}
        <div class="card score"><div><b style="color:var(--me)">${mine.score.toLocaleString()}</b><span class="who">${meName()} · ${mine.words.length} words</span></div>
        <div><b style="color:var(--them)">${theirs.score.toLocaleString()}</b><span class="who">${themName()} · ${theirs.words.length} words</span></div></div>
        <div class="card"><div class="hunt-cols"><div><h3 style="margin-bottom:8px">${meName()}</h3>${wordList(mine.words, theirs.words)}</div><div><h3 style="margin-bottom:8px">${themName()}</h3>${wordList(theirs.words, mine.words)}</div></div>
        <p class="tiny muted center" style="margin-top:8px">Faded words were found by both of you.</p></div>
        ${helpers.rematchBtn(g)}`,
    };
  }
  if (mine) {
    return {
      html: `<div class="turn-banner">You scored <b>${mine.score.toLocaleString()}</b>. Waiting for ${themName()}…</div>
        <div class="card"><h3 style="margin-bottom:8px">Your ${mine.words.length} words</h3><div class="hunt-found">${mine.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div></div>`,
    };
  }

  const run = lsGet(runKey(g));
  if (!run) {
    return {
      html: `<div class="turn-banner mine">${theirs ? `${themName()} already played. Beat their score!` : 'You go first!'}</div>
        <div class="card center"><div style="font-size:54px">🔎</div><h2>Word Hunt</h2>
        <p class="muted">Drag across touching letters to spell words. You get <b>${SECS} seconds</b>. Longer words score way more. ${themName()} plays the exact same board.</p>
        <div class="sp"></div><p class="small muted">3 letters 100 · 4 letters 400 · 5 letters 800 · 6 letters 1,400</p>
        <div class="sp2"></div><button class="btn block" data-act="start">Start the clock</button></div>`,
      actions: {
        start: async (x, el) => {
          el.disabled = true;
          el.textContent = 'Loading words…';
          try { await loadDict(); } catch (e) { toast(esc(e.message)); el.disabled = false; el.textContent = 'Start the clock'; return; }
          lsSet(runKey(g), { start: Date.now(), words: [] });
          return true;
        },
      },
    };
  }

  const left = () => SECS - (Date.now() - run.start) / 1000;
  if (left() <= 0) {
    submit(g, run.words, helpers);
    return { html: '<div class="turn-banner">Time! Adding up your score…</div>' };
  }
  if (!dict) {
    loadDict().then(() => bus.rerender()).catch(() => {});
    return { html: '<div class="turn-banner">Loading…</div>' };
  }

  return {
    live: false,
    tabs: false,
    onChange: () => false,
    html: `<div class="hunt-top"><div class="hunt-time" id="ht">${Math.ceil(left())}</div><div class="center"><div class="tiny muted bold">SCORE</div><b id="hs" style="font-size:22px">${total(run.words).toLocaleString()}</b></div><div class="center"><div class="tiny muted bold">WORDS</div><b id="hn" style="font-size:22px">${run.words.length}</b></div></div>
      <div class="hunt-word" id="hw"></div>
      <div class="hunt-grid" id="hg">${d.board.map((c, i) => `<div class="ht" data-i="${i}">${c === 'qu' ? 'Qu' : c}</div>`).join('')}</div>
      <div class="hunt-found" id="hf">${run.words.map((w) => `<span>${esc(w)}</span>`).join('')}</div>`,
    mount: (root) => {
      const grid = root.querySelector('#hg');
      const tiles = [...grid.querySelectorAll('.ht')];
      const wEl = root.querySelector('#hw');
      const tEl = root.querySelector('#ht');
      let path = [];
      let down = false;
      let ended = false;
      const tileAt = (x, y) => {
        for (const t of tiles) {
          const r = t.getBoundingClientRect();
          if (Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width * 0.44) return Number(t.dataset.i);
        }
        return -1;
      };
      const word = () => path.map((i) => d.board[i]).join('');
      const paint = () => {
        tiles.forEach((t, i) => t.classList.toggle('sel', path.includes(i)));
        wEl.className = 'hunt-word';
        wEl.textContent = word();
      };
      const flash = (cls, text) => { wEl.className = `hunt-word ${cls}`; wEl.textContent = text; };
      const onDown = (e) => {
        if (ended) return;
        e.preventDefault();
        const i = tileAt(e.clientX, e.clientY);
        if (i < 0) return;
        down = true;
        path = [i];
        paint();
      };
      const onMove = (e) => {
        if (!down) return;
        e.preventDefault();
        const i = tileAt(e.clientX, e.clientY);
        if (i < 0) return;
        const last = path[path.length - 1];
        if (path.length > 1 && i === path[path.length - 2]) path.pop();
        else if (!path.includes(i) && adj(i, last)) path.push(i);
        else return;
        paint();
      };
      const onUp = () => {
        if (!down) return;
        down = false;
        const w = word();
        path = [];
        tiles.forEach((t) => t.classList.remove('sel'));
        if (w.length < 3) { wEl.textContent = ''; return; }
        if (run.words.includes(w)) { flash('dup', `${w} ✓`); return; }
        if (!dict.has(w)) { flash('bad', w); return; }
        run.words.push(w);
        lsSet(runKey(g), run);
        flash('ok', `${w} +${wordPts(w)}`);
        root.querySelector('#hs').textContent = total(run.words).toLocaleString();
        root.querySelector('#hn').textContent = run.words.length;
        root.querySelector('#hf').insertAdjacentHTML('afterbegin', `<span>${esc(w)}</span>`);
      };
      grid.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      grid.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      const timer = setInterval(() => {
        const l = left();
        tEl.textContent = Math.max(0, Math.ceil(l));
        tEl.classList.toggle('low', l <= 10);
        if (l <= 0 && !ended) {
          ended = true;
          clearInterval(timer);
          onUp();
          submit(g, run.words, helpers);
        }
      }, 200);
      return () => {
        clearInterval(timer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
    },
  };
}
