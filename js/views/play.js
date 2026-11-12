import { store } from '../store.js';
import { WYR, WYR_CAT, WYR_CATS, DRAW_PROMPTS, WORDS, drawKind } from '../content.js';
import { GAME_NAMES, GAME_EMOJI, turnOf, scoreboard, award, wyrPicks, wyrGuesses, gameWinner } from '../logic.js';
import { hunt, newBoard } from './hunt.js';
import { header, meName, themName, nameOf, colorFor, empty } from '../ui.js';
import { esc, timeAgo, sheet, toast, confetti, pick, seededShuffle, uid } from '../util.js';
import { makeCanvas, paletteHTML, markPalette } from '../canvas.js';

const isDone = (g) => !!(g.data.winner || g.data.done);
const myName = () => store.mine.name || 'Your person';

// ---------------- Lobby ----------------
function wyrMatches(g) {
  const a = wyrPicks(g, store.me);
  const b = wyrPicks(g, store.partnerId);
  return a.filter((x, i) => x === b[i]).length;
}

function resultText(g) {
  const w = g.data.winner;
  if (g.data.type === 'wyr') {
    const w2 = gameWinner(g);
    return `Matched ${wyrMatches(g)}/${g.data.qs.length} · ${w2 === store.me ? 'You know them better 🏆' : w2 === store.partnerId ? `${themName()} knows you better` : 'Tied on guesses'}`;
  }
  if (g.data.type === 'draw') return w === 'team' ? `Guessed "${esc(g.data.prompt)}" 🎉` : `It was "${esc(g.data.prompt)}"`;
  if (w === 'draw') return "It's a tie";
  return w === store.me ? 'You won 🏆' : `${nameOf(w)} won`;
}

function statusText(g) {
  if (isDone(g)) return resultText(g);
  const t = turnOf(g);
  if (g.data.type === 'draw' && g.data.phase !== 'guessing') return t === store.me ? 'Your turn to draw' : `${themName()} is drawing`;
  return t === store.me ? 'Your turn' : `Waiting for ${themName()}`;
}

export function list() {
  const games = store.all('game').reverse();
  const active = games.filter((g) => !isDone(g));
  const mine = active.filter((g) => turnOf(g) === store.me);
  const theirs = active.filter((g) => turnOf(g) !== store.me);
  const done = games.filter(isDone).slice(0, 8);
  const sb = scoreboard();
  const row = (g) => `<a class="game-row" href="#/game/${g.id}"><div class="ic">${GAME_EMOJI[g.data.type]}</div>
    <div class="grow"><b>${GAME_NAMES[g.data.type]}</b><div class="small muted">${statusText(g)} · ${timeAgo(g.upd || g.at)}</div></div>
    ${turnOf(g) === store.me ? '<span class="dot"></span>' : ''}<span class="chev">›</span></a>`;
  return {
    html: `${header('Play')}
      <div class="card">
        <div class="score">
          <div><b style="color:var(--me)">${sb[store.me]}</b><span class="who">${meName()}</span></div>
          <div class="muted bold">wins</div>
          <div><b style="color:var(--them)">${sb[store.partnerId]}</b><span class="who">${themName()}</span></div>
        </div>
        <div class="score-sub">${sb.team ? `🤝 ${sb.team} drawing${sb.team === 1 ? '' : 's'} guessed together` : '🤝 Draw & Guess counts as team wins'}${sb.draws ? ` · ${sb.draws} tie${sb.draws === 1 ? '' : 's'}` : ''} · ${sb.played} played</div>
      </div>
      <div class="section-title">New game</div>
      <div class="new-games">${['hunt', 'wyr', 'draw', 'word', 'ttt', 'c4', 'dots'].map((t) => `<button class="new-game ${t === 'hunt' ? 'feature' : ''}" data-act="newGame" data-t="${t}"><span class="e">${GAME_EMOJI[t]}</span>${GAME_NAMES[t]}</button>`).join('')}</div>
      ${mine.length ? `<div class="section-title">Your turn</div><div class="card">${mine.map(row).join('')}</div>` : ''}
      ${theirs.length ? `<div class="section-title">Their turn</div><div class="card">${theirs.map(row).join('')}</div>` : ''}
      ${!active.length ? `<div class="sp"></div>${empty('🎲', 'No games going. Start one above!')}` : ''}
      ${done.length ? `<div class="section-title">Finished</div><div class="card">${done.map(row).join('')}</div>` : ''}`,
    actions: {
      newGame: async (d) => {
        const id = await createGame(d.t);
        if (id) location.hash = `#/game/${id}`;
      },
    },
  };
}

async function createGame(type, opts = {}) {
  const me = store.me;
  const them = store.partnerId;
  if (!them) { toast('Your person needs to join first!'); return null; }
  let data;
  if (type === 'ttt') data = { type, players: [me, them], turn: me, board: Array(9).fill(''), winner: null };
  if (type === 'c4') data = { type, players: [me, them], turn: me, board: Array(42).fill(''), last: -1, winner: null };
  if (type === 'dots') data = { type, players: [me, them], turn: me, lines: {}, boxes: {}, winner: null };
  if (type === 'hunt') data = { type, board: newBoard(uid()), done: false, winner: null };
  if (type === 'wyr') {
    const cat = opts.cat || await askWyrCat();
    if (!cat) return null;
    data = { type, qs: pickWyr(cat), cat, done: false };
  }
  if (type === 'draw') {
    data = { type, drawer: me, guesser: them, choices: seededShuffle(DRAW_PROMPTS, uid()).slice(0, 3), prompt: null, phase: 'pick', strokes: [], guesses: [], turn: me, winner: null };
  }
  if (type === 'word') {
    const word = opts.word || await askWord();
    if (!word) return null;
    data = { type, setter: me, guesser: them, word, guesses: [], turn: them, winner: null };
  }
  const g = await store.add('game', data);
  if (type === 'wyr') store.notify('game', `${myName()} started Would you rather ${WYR_CATS[data.cat]?.e || '🤔'}`, `${WYR_CATS[data.cat]?.name || 'Our own questions'}: pick yours, then guess theirs`, `#/game/${g.id}`);
  if (type === 'word') store.notify('game', `${myName()} picked a secret word 🔤`, 'You get 6 tries to guess it', `#/game/${g.id}`);
  return g.id;
}

// ---- Would you rather: categories, your own questions, no repeats ----
export function wyrQ(q) {
  if (typeof q === 'number') return WYR[q] || ['?', '?'];
  const it = store.get(String(q).slice(2));
  return it ? [it.data.a, it.data.b] : ['(deleted question)', '(deleted question)'];
}

function pickWyr(cat) {
  const customs = store.all('customwyr').map((c) => `c:${c.id}`);
  let pool = cat === 'ours' ? customs : WYR.map((_, i) => i).filter((i) => cat === 'mix' || WYR_CAT[i] === cat);
  if (cat === 'mix') pool = pool.concat(customs);
  const used = new Set(store.all('game', (g) => g.data.type === 'wyr').flatMap((g) => g.data.qs));
  const fresh = seededShuffle(pool.filter((q) => !used.has(q)), uid());
  const old = seededShuffle(pool.filter((q) => used.has(q)), uid());
  return fresh.concat(old).slice(0, 10);
}

function askWyrCat() {
  return new Promise((resolve) => {
    let done = false;
    const customs = store.all('customwyr');
    const used = new Set(store.all('game', (g) => g.data.type === 'wyr').flatMap((g) => g.data.qs));
    const left = (cat) => WYR.filter((_, i) => (cat === 'mix' || WYR_CAT[i] === cat) && !used.has(i)).length;
    const cats = Object.entries(WYR_CATS).map(([k, c]) => `<button class="idea" data-c="${k}"><span class="e">${c.e}</span><span class="grow"><b>${c.name}</b><span>${left(k)} new questions</span></span></button>`).join('');
    sheet({
      title: 'Would you rather…',
      tall: true,
      body: `<div class="idea-list">${cats}
        ${customs.length >= 3 ? `<button class="idea" data-c="ours"><span class="e">✍️</span><span class="grow"><b>Our own questions</b><span>${customs.length} written by you two</span></span></button>` : ''}</div>
        <div class="sp"></div><button class="btn ghost block" data-add>✍️ Write your own questions</button>`,
      onMount: (el, close) => {
        el.querySelectorAll('[data-c]').forEach((b) => { b.onclick = () => { done = true; close(); resolve(b.dataset.c); }; });
        el.querySelector('[data-add]').onclick = () => { done = true; close(); resolve(null); setTimeout(addWyrSheet, 300); };
      },
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

function addWyrSheet() {
  sheet({
    title: 'Write your own',
    body: `<p class="small muted center">They show up in "Mix of everything" and in your own category (once you have 3).</p>
      <label class="field">Would you rather…</label><input type="text" data-a maxlength="80" placeholder="Live in a castle">
      <div class="wyr-or" style="margin:8px 0">or</div>
      <input type="text" data-b maxlength="80" placeholder="Live on a boat">
      <div class="sp"></div><button class="btn block" data-save>Add question</button>
      <div class="sp"></div><div class="small muted center">${store.all('customwyr').length} added so far</div>`,
    onMount: (el, close) => {
      el.querySelector('[data-save]').onclick = async () => {
        const a = el.querySelector('[data-a]').value.trim();
        const b = el.querySelector('[data-b]').value.trim();
        if (!a || !b) { toast('Fill in both sides'); return; }
        await store.add('customwyr', { a, b });
        el.querySelector('[data-a]').value = '';
        el.querySelector('[data-b]').value = '';
        el.querySelector('[data-a]').focus();
        el.querySelector('.small.muted.center:last-child').textContent = `${store.all('customwyr').length} added so far`;
        toast('Added! Write another or close');
      };
    },
  });
}

function askWord() {
  return new Promise((resolve) => {
    let done = false;
    sheet({
      title: 'Pick a secret 5-letter word',
      body: `<p class="small muted center">${themName()} gets 6 tries to guess it.</p><div class="sp"></div>
        <input type="text" maxlength="5" autocapitalize="none" autocomplete="off" placeholder="hello" data-w style="text-align:center;font-size:24px;font-weight:900;letter-spacing:6px;text-transform:uppercase">
        <div class="sp"></div>
        <div class="row gap"><button class="btn ghost grow" data-rand>🎲 Random</button><button class="btn grow" data-go>Start</button></div>`,
      onMount: (el, close) => {
        const inp = el.querySelector('[data-w]');
        el.querySelector('[data-rand]').onclick = () => { inp.value = pick(WORDS); };
        el.querySelector('[data-go]').onclick = () => {
          const w = inp.value.trim().toLowerCase();
          if (!/^[a-z]{5}$/.test(w)) { toast('It needs to be exactly 5 letters'); return; }
          done = true;
          close();
          resolve(w);
        };
      },
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

async function commit(g, data) {
  await store.update(g.id, data);
  const ng = store.get(g.id);
  if (isDone(ng)) await finish(ng);
  else if (turnOf(ng) === store.partnerId) {
    store.notify('game', `Your turn in ${GAME_NAMES[ng.data.type]} ${GAME_EMOJI[ng.data.type]}`, `${myName()} made a move`, `#/game/${g.id}`);
  }
}

async function finish(g) {
  const w = g.data.winner;
  await award(15, 'game', `game-${g.id}`);
  if (w && store.profile(w).name) await award(5, 'gamewin', `gamewin-${g.id}`);
  const name = GAME_NAMES[g.data.type];
  let msg = `${name} is over. Rematch?`;
  if (w === store.me) msg = `${myName()} won ${name}. Rematch? 😏`;
  else if (w === store.partnerId) msg = `You won ${name}! 🏆`;
  else if (w === 'draw') msg = `${name} ended in a tie`;
  else if (w === 'team') msg = `You guessed it! "${g.data.prompt}" 🎉`;
  else if (g.data.type === 'wyr') msg = `You matched ${wyrMatches(g)} of 10 in Would you rather`;
  if (w === store.me || w === 'team' || g.data.type === 'wyr') confetti();
  store.notify('game', msg, '', `#/game/${g.id}`);
}

function banner(g) {
  if (isDone(g)) {
    return `<div class="turn-banner mine">${resultText(g)}</div>`;
  }
  const t = turnOf(g);
  return `<div class="turn-banner ${t === store.me ? 'mine' : ''}">${t === store.me ? 'Your turn!' : `Waiting for ${themName()}…`}</div>`;
}

const rematchBtn = (g) => (isDone(g) ? `<div class="sp"></div><button class="btn block" data-act="rematch">Rematch</button>` : '');

async function rematch(g) {
  let id;
  if (g.data.type === 'wyr') id = await createGame('wyr', { cat: g.data.cat || 'mix' });
  else if (g.data.type === 'word') id = await createGame('word');
  else id = await createGame(g.data.type);
  if (id) location.hash = `#/game/${id}`;
}

// ---------------- Game screen ----------------
export function game({ id }) {
  const g = store.get(id);
  if (!g) return { html: `${header('Game', { back: '#/play' })}${empty('🤷', 'This game is gone.')}` };
  const fn = { ttt, c4, dots, word, wyr, draw, hunt: (x) => hunt(x, { finish, banner, rematchBtn }) }[g.data.type];
  const out = fn(g);
  out.html = `${header(`${GAME_EMOJI[g.data.type]} ${GAME_NAMES[g.data.type]}`, { back: '#/play', sub: `with ${themName()}` })}${out.html}`;
  out.actions = { ...out.actions, rematch: () => rematch(g) };
  return out;
}

// Tic-tac-toe
const L3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function tttCheck(b) {
  for (const l of L3) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who: b[l[0]], line: l };
  if (b.every(Boolean)) return { who: 'draw', line: [] };
  return null;
}
function ttt(g) {
  const d = g.data;
  const sym = (who) => (who === d.players[0] ? '✕' : '◯');
  return {
    html: `${banner(g)}
      <div class="ttt">${d.board.map((c, i) => `<button data-act="cell" data-i="${i}" class="${(d.line || []).includes(i) ? 'win' : ''}" style="color:${c ? colorFor(c).hex : ''}">${c ? sym(c) : ''}</button>`).join('')}</div>
      <p class="center small muted" style="margin-top:12px">You are <b style="color:var(--me)">${sym(store.me)}</b></p>
      ${rematchBtn(g)}`,
    actions: {
      cell: async (x) => {
        const i = Number(x.i);
        if (turnOf(g) !== store.me || d.board[i]) return;
        const board = d.board.slice();
        board[i] = store.me;
        const w = tttCheck(board);
        await commit(g, { ...d, board, turn: store.partnerId, winner: w?.who || null, line: w?.line || null });
      },
    },
  };
}

// Connect Four (6 rows x 7 columns, row 0 at the top)
function c4Check(b, idx) {
  const who = b[idx];
  const r0 = Math.floor(idx / 7);
  const c0 = idx % 7;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [idx];
    for (const s of [1, -1]) {
      let r = r0 + dr * s;
      let c = c0 + dc * s;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && b[r * 7 + c] === who) { cells.push(r * 7 + c); r += dr * s; c += dc * s; }
    }
    if (cells.length >= 4) return { who, line: cells };
  }
  if (b.every(Boolean)) return { who: 'draw', line: [] };
  return null;
}
function c4(g) {
  const d = g.data;
  return {
    html: `${banner(g)}
      <div class="c4">${d.board.map((c, i) => `<button data-act="drop" data-c="${i % 7}" class="${i === d.last ? 'last' : ''} ${(d.line || []).includes(i) ? 'win' : ''}" style="${c ? `background:${colorFor(c).hex}` : ''}"></button>`).join('')}</div>
      <p class="center small muted" style="margin-top:12px">Tap a column to drop your <b style="color:var(--me)">●</b>. Four in a row wins.</p>
      ${rematchBtn(g)}`,
    actions: {
      drop: async (x) => {
        if (turnOf(g) !== store.me) return;
        const col = Number(x.c);
        const board = d.board.slice();
        let idx = -1;
        for (let r = 5; r >= 0; r--) if (!board[r * 7 + col]) { idx = r * 7 + col; break; }
        if (idx < 0) return;
        board[idx] = store.me;
        const w = c4Check(board, idx);
        await commit(g, { ...d, board, last: idx, turn: store.partnerId, winner: w?.who || null, line: w?.line || null });
      },
    },
  };
}

// Dots & Boxes (4 x 4 boxes)
const N = 4;
const SP = 70;
const M = 25;
function boxDone(lines, r, c) {
  return lines[`h-${r}-${c}`] && lines[`h-${r + 1}-${c}`] && lines[`v-${r}-${c}`] && lines[`v-${r}-${c + 1}`];
}
function dots(g) {
  const d = g.data;
  const size = M * 2 + SP * N;
  const count = (who) => Object.values(d.boxes).filter((x) => x === who).length;
  let svg = `<svg viewBox="0 0 ${size} ${size}">`;
  for (const [k, who] of Object.entries(d.boxes)) {
    const [r, c] = k.split('-').map(Number);
    svg += `<rect x="${M + c * SP + 4}" y="${M + r * SP + 4}" width="${SP - 8}" height="${SP - 8}" rx="10" fill="${colorFor(who).soft}"/>
      <text x="${M + c * SP + SP / 2}" y="${M + r * SP + SP / 2 + 9}" text-anchor="middle" font-size="26" font-weight="900" fill="${colorFor(who).hex}">${esc((store.name(who) || '?')[0].toUpperCase())}</text>`;
  }
  const line = (k, x1, y1, x2, y2) => {
    const who = d.lines[k];
    return `<g data-act="line" data-k="${k}" style="cursor:pointer">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="26"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${who ? colorFor(who).hex : '#efe5da'}" stroke-width="${who ? 7 : 4}" stroke-linecap="round" ${who ? '' : 'stroke-dasharray="2 9"'}/></g>`;
  };
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) svg += line(`h-${r}-${c}`, M + c * SP, M + r * SP, M + (c + 1) * SP, M + r * SP);
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) svg += line(`v-${r}-${c}`, M + c * SP, M + r * SP, M + c * SP, M + (r + 1) * SP);
  for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) svg += `<circle cx="${M + c * SP}" cy="${M + r * SP}" r="6" fill="#3d3833"/>`;
  svg += '</svg>';
  return {
    html: `${banner(g)}
      <div class="card"><div class="score"><div><b style="color:var(--me)">${count(store.me)}</b><span class="who">${meName()}</span></div><div><b style="color:var(--them)">${count(store.partnerId)}</b><span class="who">${themName()}</span></div></div></div>
      <div class="dots-board">${svg}</div>
      <p class="center small muted" style="margin-top:12px">Draw a line. Close a box to claim it and go again.</p>
      ${rematchBtn(g)}`,
    actions: {
      line: async (x) => {
        if (turnOf(g) !== store.me || d.lines[x.k]) return;
        const lines = { ...d.lines, [x.k]: store.me };
        const boxes = { ...d.boxes };
        const [t, a, b] = x.k.split('-');
        const r = Number(a);
        const c = Number(b);
        const cand = t === 'h' ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
        let scored = false;
        for (const [br, bc] of cand) {
          if (br < 0 || bc < 0 || br >= N || bc >= N) continue;
          if (!boxes[`${br}-${bc}`] && boxDone(lines, br, bc)) { boxes[`${br}-${bc}`] = store.me; scored = true; }
        }
        let winner = null;
        if (Object.keys(boxes).length === N * N) {
          const m = Object.values(boxes).filter((v) => v === store.me).length;
          const o = N * N - m;
          winner = m > o ? store.me : o > m ? store.partnerId : 'draw';
        }
        await commit(g, { ...d, lines, boxes, turn: scored ? store.me : store.partnerId, winner });
      },
    },
  };
}

// Word guess
let wordInput = '';
function scoreWord(guess, word) {
  const res = Array(5).fill('x');
  const left = {};
  for (let i = 0; i < 5; i++) { if (guess[i] === word[i]) res[i] = 'g'; else left[word[i]] = (left[word[i]] || 0) + 1; }
  for (let i = 0; i < 5; i++) if (res[i] !== 'g' && left[guess[i]] > 0) { res[i] = 'y'; left[guess[i]]--; }
  return res;
}
function word(g) {
  const d = g.data;
  const guesser = d.guesser === store.me;
  const done = isDone(g);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const gs = d.guesses[i];
    if (gs) {
      const sc = scoreWord(gs, d.word);
      rows.push(`<div class="word-row">${[...gs].map((ch, j) => `<span class="${sc[j]}">${ch}</span>`).join('')}</div>`);
    } else if (i === d.guesses.length && guesser && !done) {
      rows.push(`<div class="word-row">${Array.from({ length: 5 }, (_, j) => `<span style="box-shadow:inset 0 0 0 2px var(--me)">${wordInput[j] || ''}</span>`).join('')}</div>`);
    } else rows.push(`<div class="word-row">${'<span></span>'.repeat(5)}</div>`);
  }
  const best = {};
  for (const gs of d.guesses) {
    const sc = scoreWord(gs, d.word);
    const rank = { x: 1, y: 2, g: 3 };
    [...gs].forEach((ch, j) => { if (!best[ch] || rank[sc[j]] > rank[best[ch]]) best[ch] = sc[j]; });
  }
  const kb = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  const keyboard = guesser && !done ? `<div class="kb">
    ${kb.map((row, ri) => `<div class="kb-row">${ri === 2 ? '<button class="wide" data-act="key" data-k="enter">Enter</button>' : ''}${[...row].map((k) => `<button class="${best[k] || ''}" data-act="key" data-k="${k}">${k}</button>`).join('')}${ri === 2 ? '<button class="wide" data-act="key" data-k="del">⌫</button>' : ''}</div>`).join('')}
  </div>` : '';
  const info = done ? `<p class="center bold" style="margin-top:12px">The word was <span class="pill gold" style="font-size:15px">${esc(d.word.toUpperCase())}</span></p>`
    : guesser ? `<p class="center small muted" style="margin:10px 0 0">${themName()} picked this word. ${6 - d.guesses.length} tries left.</p>`
      : `<p class="center small muted" style="margin:10px 0 0">Your word: <b>${esc(d.word.toUpperCase())}</b> · ${themName()} has ${6 - d.guesses.length} tries left.</p>`;
  return {
    html: `${banner(g)}<div class="word-grid">${rows.join('')}</div>${info}${keyboard}${rematchBtn(g)}`,
    actions: {
      key: async (x) => {
        if (!guesser || done) return;
        if (x.k === 'del') { wordInput = wordInput.slice(0, -1); return true; }
        if (x.k === 'enter') {
          if (wordInput.length !== 5) { toast('Five letters, please'); return; }
          const gs = wordInput;
          wordInput = '';
          const guesses = [...d.guesses, gs];
          const winner = gs === d.word ? d.guesser : guesses.length >= 6 ? d.setter : null;
          await commit(g, { ...d, guesses, winner });
          return true;
        }
        if (wordInput.length < 5) { wordInput += x.k; return true; }
      },
    },
  };
}

// Would you rather: pick yours, then guess theirs
function wyr(g) {
  const d = g.data;
  const mine = wyrPicks(g, store.me);
  const myG = wyrGuesses(g, store.me);
  const theirs = wyrPicks(g, store.partnerId);
  const theirG = wyrGuesses(g, store.partnerId);
  const total = d.qs.length;
  const save = (picks, guesses) => store.set(`wyra-${g.id}-${store.me}`, 'wyra', { picks, guesses, game: g.id });
  let html;
  if (myG.length < total) {
    const guessing = mine.length > myG.length;
    const q = wyrQ(d.qs[myG.length]);
    html = `<div class="wyr-q">Question ${myG.length + 1} of ${total} · ${themName()} is on ${Math.min(total, theirG.length + 1)}/${total}</div>
      <div class="turn-banner ${guessing ? '' : 'mine'}">${guessing ? `🔮 Now guess: what will <b>${themName()}</b> pick?` : 'Would <b>you</b> rather…'}</div>
      <div class="wyr-opts">
        <button class="wyr-opt" data-act="${guessing ? 'guess' : 'pick'}" data-p="0" style="${guessing ? 'background:var(--them-soft)' : ''}">${esc(q[0])}</button>
        <div class="wyr-or">or</div>
        <button class="wyr-opt" data-act="${guessing ? 'guess' : 'pick'}" data-p="1" style="${guessing ? 'background:var(--them-soft)' : ''}">${esc(q[1])}</button>
      </div>
      ${guessing ? `<p class="center small muted" style="margin-top:12px">You picked: ${esc(q[mine[myG.length]])}</p>` : ''}`;
  } else if (theirG.length < total) {
    html = `<div class="turn-banner">You're done! Waiting for ${themName()} (${theirG.length}/${total})</div>
      <div class="card">${d.qs.map((qi, i) => `<div class="wyr-res"><div><b>${esc(wyrQ(qi)[mine[i]])}</b><div class="guess-tag">You think ${themName()} picks: ${esc(wyrQ(qi)[myG[i]])}</div></div><span class="pill me">you</span></div>`).join('')}</div>`;
  } else {
    const m = wyrMatches(g);
    const iKnow = myG.filter((x, i) => x === theirs[i]).length;
    const theyKnow = theirG.filter((x, i) => x === mine[i]).length;
    html = `<div class="card center"><div style="font-size:44px">${m >= 8 ? '💞' : m >= 5 ? '💚' : '🙈'}</div><h2>You matched ${m} of ${total}</h2>
      <p class="small muted">${m >= 8 ? 'Basically the same person.' : m >= 5 ? 'Great minds!' : 'Opposites attract, right?'}</p></div>
      <div class="card"><h3 class="center" style="margin-bottom:10px">🔮 Who knows who better?</h3><div class="score">
        <div><b style="color:var(--me)">${iKnow}/${total}</b><span class="who">${meName()} guessed right</span></div>
        <div><b style="color:var(--them)">${theyKnow}/${total}</b><span class="who">${themName()} guessed right</span></div></div></div>
      <div class="card">${d.qs.map((qi, i) => {
        const same = mine[i] === theirs[i];
        return `<div class="wyr-res"><div><b>${esc(wyrQ(qi)[mine[i]])}</b>${same ? '' : `<div class="small muted">${themName()}: ${esc(wyrQ(qi)[theirs[i]])}</div>`}
          <div class="guess-tag">${myG[i] === theirs[i] ? '✓ You called it' : `✗ You guessed ${esc(wyrQ(qi)[myG[i]])}`}</div></div><span>${same ? '💚' : '↔️'}</span></div>`;
      }).join('')}</div>${rematchBtn(g)}`;
  }
  return {
    html,
    actions: {
      pick: async (x) => {
        if (mine.length > myG.length || mine.length >= total) return;
        await save([...mine, Number(x.p)], myG);
        return true;
      },
      guess: async (x) => {
        if (mine.length <= myG.length) return;
        const guesses = [...myG, Number(x.p)];
        await save(mine, guesses);
        if (guesses.length === total) {
          if (theirG.length >= total) {
            await store.update(g.id, { done: true });
            await finish(store.get(g.id));
          } else {
            store.notify('game', `${myName()} finished Would you rather`, 'Your turn! Pick yours and guess theirs', `#/game/${g.id}`);
          }
        }
        return true;
      },
    },
  };
}

// Draw & guess
const drafts = {};
let pen = { color: '#3d3833', size: 10 };
const norm = (s) => s.toLowerCase().replace(/^(a|an|the)\s+/, '').replace(/[^a-z]/g, '');
function close(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function draw(g) {
  const d = g.data;
  const drawer = d.drawer === store.me;
  const done = isDone(g);

  if (!done && d.phase === 'pick') {
    if (!drawer) return { html: `<div class="turn-banner">${themName()} is picking something to draw…</div>${empty('🎨', "You'll get a notification when it's ready to guess.")}` };
    return {
      html: `<div class="turn-banner mine">Pick something to draw</div>
        <div class="stack">${d.choices.map((c) => `<button class="wyr-opt" style="width:100%" data-act="choose" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <p class="center small muted" style="margin-top:12px">${themName()} gets 5 guesses, with letter hints, after watching you draw it.</p>`,
      actions: { choose: async (x) => { await store.update(g.id, { prompt: x.c, phase: 'drawing' }); return true; } },
    };
  }

  if (!done && d.phase === 'drawing') {
    if (!drawer) return { html: `<div class="turn-banner">${themName()} is drawing… 🎨</div>${empty('✏️', "No peeking! You'll get a notification when it's your turn to guess.")}` };
    const strokes = (drafts[g.id] = drafts[g.id] || []);
    let ctl;
    return {
      live: false,
      html: `<div class="turn-banner mine">Draw: <b>${esc(d.prompt)}</b></div>
        <div class="canvas-wrap" id="cv"></div>
        ${paletteHTML(pen.color, pen.size)}
        <input type="text" data-input="clue" maxlength="40" placeholder="Optional clue for ${themName()} (no giving it away!)" style="margin-bottom:10px">
        <div class="row gap"><button class="btn ghost grow" data-act="undo">Undo</button><button class="btn grow" data-act="send">Send to ${themName()}</button></div>`,
      mount: (root) => {
        ctl = makeCanvas(root.querySelector('#cv'), { strokes: () => strokes, color: pen.color, size: pen.size, onStroke: (s) => strokes.push(s) });
        return () => ctl.destroy();
      },
      actions: {
        color: (x, el) => { pen.color = x.c; ctl.setColor(x.c); markPalette(document, el); },
        eraser: (x, el) => { ctl.setErase(); markPalette(document, el); },
        size: (x, el) => { pen.size = Number(x.s); ctl.setSize(pen.size); markPalette(document, el); },
        undo: () => { strokes.pop(); ctl.redraw(); },
        send: async () => {
          if (!strokes.length) { toast('Draw something first!'); return; }
          const clue = (document.querySelector('[data-input="clue"]')?.value || '').trim();
          if (clue && norm(clue).includes(norm(d.prompt))) { toast("That clue gives it away! Try something sneakier 😏"); return; }
          await store.update(g.id, { strokes: strokes.slice(), phase: 'guessing', turn: d.guesser, clue, revealed: [] });
          delete drafts[g.id];
          store.notify('game', `${myName()} drew something for you 🎨`, 'Watch it and take a guess', `#/game/${g.id}`);
          return true;
        },
      },
      onChange: () => false,
    };
  }

  // Guessing or finished
  let ctl;
  const MAX = 5;
  const left = MAX - d.guesses.length;
  const revealed = new Set(d.revealed || []);
  const letters = [...d.prompt];
  const hidden = letters.map((ch, i) => (ch !== ' ' && !revealed.has(i) ? i : -1)).filter((i) => i >= 0);
  const blanks = letters.map((ch, i) => (ch === ' ' ? '<span class="gap"></span>' : `<span class="${revealed.has(i) || done || drawer ? 'got' : ''}">${revealed.has(i) || done || drawer ? esc(ch) : ''}</span>`)).join('');
  const words = d.prompt.split(' ');
  const hintBox = `<div class="hint-box">
      <div class="row gap wrap" style="justify-content:center"><span class="pill">🏷️ ${drawKind(d.prompt)}</span><span class="pill">${words.length > 1 ? `${words.length} words, ` : ''}${d.prompt.replace(/ /g, '').length} letters</span></div>
      ${d.clue ? `<div class="clue">💬 ${drawer ? 'Your clue' : `${themName()}'s clue`}: <b>${esc(d.clue)}</b></div>` : ''}
      <div class="blanks">${blanks}</div>
    </div>`;
  const guessList = d.guesses.length ? `<div class="guess-chips">${d.guesses.map((x) => `<span class="${close(norm(x), norm(d.prompt)) || norm(x).includes(norm(d.prompt)) ? 'ok' : nearly(x, d.prompt) ? 'warm' : ''}">${esc(x)}</span>`).join('')}</div>` : '';
  const guessForm = !done && !drawer ? `
    <form data-form="guess" class="add-row"><input type="text" name="guess" placeholder="What is it?" autocomplete="off" autocapitalize="none" required><button class="btn">Guess</button></form>
    <div class="row between" style="margin-top:8px"><span class="small muted bold">${left} guess${left === 1 ? '' : 'es'} left · a wrong guess reveals a letter</span>
    ${hidden.length > 1 ? '<button class="link" data-act="hint">💡 Reveal a letter</button>' : ''}</div>` : '';
  const top = done ? `<div class="turn-banner mine">${d.winner === 'team' ? `${drawer ? themName() : 'You'} guessed it: <b>${esc(d.prompt)}</b> 🎉 ${'⭐'.repeat(Math.max(1, 3 - Math.floor(((d.revealed || []).length + d.guesses.length - 1) / 2)))}` : `It was <b>${esc(d.prompt)}</b>`}</div>`
    : drawer ? `<div class="turn-banner">${themName()} is guessing your <b>${esc(d.prompt)}</b>…</div>` : '<div class="turn-banner mine">What did they draw?</div>';
  return {
    live: false,
    html: `${top}
      ${hintBox}
      <div class="canvas-wrap" id="cv"></div>
      <div class="row between" style="margin:10px 0"><button class="link" data-act="replay">▶︎ Replay</button><button class="link" data-act="full">Show whole drawing</button></div>
      ${guessList}
      ${guessForm}
      ${done ? `<div class="sp"></div><button class="btn block" data-act="again">Play again (${drawer ? themName() : 'you'} draw${drawer ? 's' : ''})</button>` : ''}`,
    mount: (root) => {
      ctl = makeCanvas(root.querySelector('#cv'), { strokes: () => d.strokes, readOnly: true });
      if (!done && !drawer && !d.guesses.length) setTimeout(() => ctl.replay(d.strokes), 300);
      return () => ctl.destroy();
    },
    onChange: (ch) => ch.item?.id === g.id || ch.type === 'reload',
    actions: {
      replay: () => ctl.replay(d.strokes, 4000),
      full: () => ctl.redraw(),
      hint: async () => {
        if (hidden.length <= 1) return;
        const i = hidden[Math.floor(Math.random() * hidden.length)];
        await store.update(g.id, { revealed: [...revealed, i] });
        return true;
      },
      again: async () => {
        const id = await createDrawGame(drawer ? store.partnerId : store.me);
        if (id) location.hash = `#/game/${id}`;
      },
    },
    forms: {
      guess: async (f) => {
        const gs = (f.guess || '').trim();
        if (!gs) return;
        const guesses = [...d.guesses, gs];
        const right = close(norm(gs), norm(d.prompt)) || norm(gs).includes(norm(d.prompt));
        const winner = right ? 'team' : guesses.length >= MAX ? 'none' : null;
        let rev = [...revealed];
        if (!right && hidden.length > 1) rev = [...rev, hidden[Math.floor(Math.random() * hidden.length)]];
        await commit(g, { ...d, guesses, revealed: rev, winner, turn: winner ? null : d.guesser });
        if (!right) toast(guesses.length >= MAX ? `It was "${esc(d.prompt)}"!` : nearly(gs, d.prompt) ? '🔥 So close! Here\'s another letter' : 'Nope! Here\'s a letter to help');
        return true;
      },
    },
  };
}

// "Warm" guesses: off by a couple of letters, or sharing a word.
function nearly(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x) return false;
  if (y.includes(x) && x.length >= 3) return true;
  if (b.split(' ').some((w) => w.length >= 3 && a.toLowerCase().includes(w))) return true;
  const dp = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return dp[x.length][y.length] <= 2;
}

async function createDrawGame(drawer) {
  const guesser = drawer === store.me ? store.partnerId : store.me;
  const g = await store.add('game', {
    type: 'draw', drawer, guesser, choices: seededShuffle(DRAW_PROMPTS, uid()).slice(0, 3), prompt: null, phase: 'pick', strokes: [], guesses: [], turn: drawer, winner: null,
  });
  if (drawer !== store.me) store.notify('game', `${myName()} wants you to draw next 🎨`, 'Pick something to draw', `#/game/${g.id}`);
  return g.id;
}

// Exposed for tests
export const _test = { tttCheck, c4Check, scoreWord, close, norm };
