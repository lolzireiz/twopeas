import { store } from './store.js';
import { APP_VERSION, WHATS_NEW } from './config.js';
import { toast, sheet, lsGet, lsSet, esc, dayKey } from './util.js';
import { applyColors, hydratePhotos, refreshPresence } from './ui.js';
import { myTurnGames, ensureDailyQuestion, dqStatus, turnOf, GAME_NAMES } from './logic.js';
import { TAPS, MOODS } from './content.js';
import { needsOnboarding, onboarding } from './views/onboarding.js';
import { refreshPush } from './push.js';
import { bus } from './bus.js';
import { startUpdater } from './updater.js';
import { startBackupNudge } from './backup.js';
import { showDownScreen, connectionTrouble, outageHeadsUp } from './status.js';
import * as home from './views/home.js';
import * as play from './views/play.js';
import * as us from './views/us.js';
import * as notes from './views/notes.js';
import * as petView from './views/petview.js';
import * as settings from './views/settings.js';
import * as extras from './views/extras.js';
import * as snapView from './views/snap.js';
import { STICKERS, earned } from './stickers.js';
import { confetti } from './util.js';

const ROUTES = [
  ['home', home.home, 'home'],
  ['dq', home.dq, 'home'],
  ['dq/history', home.dqHistory, 'home'],
  ['snap', snapView.snap, 'home'],
  ['play', play.list, 'play'],
  ['game/:id', play.game, 'play'],
  ['us', us.hub, 'us'],
  ['memories', us.memories, 'us'],
  ['countdowns', us.countdowns, 'us'],
  ['dates', us.dates, 'us'],
  ['lists', us.lists, 'us'],
  ['list/:id', us.list, 'us'],
  ['challenge', us.challenge, 'us'],
  ['stickers', extras.stickers, 'us'],
  ['lovejar', extras.lovejar, 'us'],
  ['notes', notes.notes, 'notes'],
  ['letters', notes.letters, 'notes'],
  ['letter/:id', notes.letter, 'notes'],
  ['draw', notes.boards, 'notes'],
  ['board/:id', notes.board, 'notes'],
  ['pet', petView.view, 'pet'],
  ['settings', settings.view, 'home'],
];

const TABS = [
  ['home', '🏡', 'Home'],
  ['play', '🎲', 'Play'],
  ['us', '💞', 'Us'],
  ['notes', '💌', 'Notes'],
  ['pet', '🐾', 'Pet'],
];

const $app = document.getElementById('app');
let current = null;
let lastPath = null;

function parse() {
  const raw = (location.hash || '#/home').replace(/^#\/?/, '') || 'home';
  const [path, query] = raw.split('?');
  const q = Object.fromEntries(new URLSearchParams(query || ''));
  for (const [pattern, fn, tab] of ROUTES) {
    const pp = pattern.split('/');
    const parts = path.split('/');
    if (pp.length !== parts.length) continue;
    const params = { ...q };
    let ok = true;
    pp.forEach((p, i) => {
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(parts[i]);
      else if (p !== parts[i]) ok = false;
    });
    if (ok) return { path: raw, fn, tab, params };
  }
  return { path: 'home', fn: home.home, tab: 'home', params: {} };
}

function badges() {
  const unreadNotes = store.all('note', (n) => n.data.to === store.me && !n.data.readAt).length;
  const today = dayKey();
  const letters = store.all('letter', (l) => l.data.to === store.me && !l.data.openedAt && (!l.data.unlock || l.data.unlock <= today)).length;
  const games = myTurnGames().length;
  const dq = store.get(`dq-${today}`) && !dqStatus().mine ? 1 : 0;
  const b = { home: dq, play: games, notes: unreadNotes + letters, us: 0, pet: 0 };
  try {
    const total = b.home + b.play + b.notes;
    if ('setAppBadge' in navigator) total ? navigator.setAppBadge(total) : navigator.clearAppBadge();
  } catch { /* not supported */ }
  return b;
}

function tabbar(active) {
  const b = badges();
  return `<div class="tabbar"><nav>${TABS.map(([id, ic, label]) =>
    `<a href="#/${id}" class="${active === id ? 'on' : ''}"><span class="ti">${ic}</span>${label}${b[id] ? `<span class="badge">${b[id]}</span>` : ''}</a>`).join('')}</nav></div>`;
}

function demoBar() {
  if (store.mode !== 'demo') return '';
  return `<div class="demo-bar">Demo · you're ${esc(store.mine.name || 'You')}<button data-demo-switch>Be ${esc(store.theirs.name || 'them')} ⇄</button></div>`;
}

// Remember what's typed in inputs so a live update doesn't wipe it.
function captureInputs() {
  const vals = {};
  const ae = document.activeElement;
  let focus = null;
  for (const el of $app.querySelectorAll('input, textarea')) {
    const key = el.dataset.input || el.name || el.id;
    if (!key || ['file', 'checkbox', 'radio'].includes(el.type)) continue;
    vals[key] = el.value;
    if (el === ae) focus = { key, start: el.selectionStart, end: el.selectionEnd };
  }
  return { vals, focus };
}
function restoreInputs({ vals, focus }) {
  for (const el of $app.querySelectorAll('input, textarea')) {
    const key = el.dataset.input || el.name || el.id;
    if (!key || !(key in vals) || ['file', 'checkbox', 'radio'].includes(el.type)) continue;
    if (!el.value && vals[key]) el.value = vals[key];
    if (focus && focus.key === key) {
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(focus.start, focus.end); } catch { /* date inputs */ }
    }
  }
}

export function render() {
  applyColors();
  const route = parse();
  const samePage = route.path === lastPath;
  const kept = samePage ? captureInputs() : { vals: {}, focus: null };
  const scroll = samePage ? window.scrollY : 0;
  if (current?.cleanup) { try { current.cleanup(); } catch { /* ignore */ } }

  const onboard = needsOnboarding();
  let out;
  try {
    out = onboard ? onboarding() : route.fn(route.params);
  } catch (e) {
    console.error(e);
    out = { html: `<div class="view"><div class="card"><h2>Oops</h2><p class="muted">${esc(e.message)}</p><div class="sp"></div><a class="btn" href="#/home">Go home</a></div></div>` };
  }
  const tabs = !onboard && out.tabs !== false;
  document.body.classList.toggle('has-demo', store.mode === 'demo' && !onboard);
  $app.innerHTML = `${!onboard ? demoBar() : ''}${out.html.startsWith('<div class="welcome') ? out.html : `<div class="view ${tabs ? '' : 'no-tabs'}">${out.html}</div>`}${tabs ? tabbar(route.tab) : ''}`;
  current = { out, route };
  if (!onboard) store.setView(route.path);
  restoreInputs(kept);
  if (out.mount) {
    try { current.cleanup = out.mount($app); } catch (e) { console.error(e); }
  }
  hydratePhotos($app);
  window.scrollTo(0, scroll);
  lastPath = route.path;
  if (!onboard) newStickers();
}

// Celebrate stickers the first time this phone sees them earned.
let stickerT = 0;
function newStickers() {
  clearTimeout(stickerT);
  stickerT = setTimeout(() => {
    let have;
    try { have = earned(); } catch { return; }
    const seen = lsGet('twopeas-stickers');
    lsSet('twopeas-stickers', [...have]);
    if (!seen) return;
    const fresh = [...have].filter((id) => !seen.includes(id)).slice(0, 2);
    fresh.forEach((id, i) => {
      const st = STICKERS.find((x) => x.id === id);
      setTimeout(() => toast(`New sticker! ${st.e} <b>${st.name}</b>`, 3600), 500 + i * 900);
    });
    if (fresh.length) confetti(40);
  }, 700);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; render(); });
}

bus.rerender = () => schedule();

// ---------- Events ----------
async function run(fn, ...args) {
  if (!fn) return;
  try {
    const r = await fn(...args);
    if (r === true) schedule();
  } catch (e) {
    console.error(e);
    toast(esc(e.message || 'Something went wrong'));
  }
}

$app.addEventListener('click', (e) => {
  if (e.target.closest('[data-demo-switch]')) {
    store.backend.switchUser();
    return;
  }
  const t = e.target.closest('[data-act]');
  if (!t || !current) return;
  e.preventDefault();
  run(current.out.actions?.[t.dataset.act], t.dataset, t, e);
});
$app.addEventListener('input', (e) => {
  const t = e.target.closest('[data-input]');
  if (!t || !current) return;
  run(current.out.inputs?.[t.dataset.input], t.value, t, e);
});
$app.addEventListener('change', (e) => {
  const t = e.target.closest('[data-change]');
  if (!t || !current) return;
  run(current.out.changes?.[t.dataset.change], t.type === 'checkbox' ? t.checked : (t.type === 'file' ? t.files : t.value), t, e);
});
$app.addEventListener('submit', async (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f || !current) return;
  e.preventDefault();
  const fn = current.out.forms?.[f.dataset.form];
  if (!fn) return;
  const data = Object.fromEntries(new FormData(f));
  try {
    const r = await fn(data, f);
    f.reset();
    if (r === true) schedule();
  } catch (err) {
    console.error(err);
    toast(esc(err.message || 'Something went wrong'));
  }
});

window.addEventListener('hashchange', () => render());

// Live updates from your partner.
store.on((change) => {
  if (change.remote && change.type === 'add') announce(change.item);
  if (change.type === 'switch') { schedule(); return; }
  if (change.type === 'presence') {
    refreshPresence();
    if (change.flipped && ['home', 'pet'].includes((current?.route?.path || '').split('?')[0])) schedule();
    current?.out?.onChange?.(change);
    return;
  }
  if (current?.out?.live === false && current.out.onChange) {
    let again = false;
    try { again = current.out.onChange(change) === true; } catch (e) { console.error(e); }
    if (again) schedule();
    return;
  }
  schedule();
});

function announce(it) {
  const who = esc(store.name(it.by));
  const d = it.data || {};
  const tap = TAPS.find((t) => t.id === d.type);
  const msg = {
    tap: d.to === store.me && tap ? `${tap.e} ${who} ${tap.push.replace(/ \S+$/, '')}` : null,
    note: d.to === store.me && !location.hash.startsWith('#/notes') ? `💌 ${d.audio ? 'Voice note' : d.photo ? 'Photo' : 'Message'} from ${who}` : null,
    letter: d.to === store.me ? `✉️ ${who} sent you a letter` : null,
    dqa: `💭 ${who} answered today's question`,
    memory: `📸 ${who} added a memory`,
    mood: `${MOODS.find((m) => m.id === d.mood)?.e || '💚'} ${who} checked in`,
    game: turnOf(it) === store.me ? `🎮 ${who} started ${GAME_NAMES[d.type]}` : null,
    appr: d.to === store.me ? `🫙 ${who} added to your love jar` : null,
    snap: `📷 ${who} sent today's snap`,
    visit: d.to === store.me ? `🐾 ${esc(store.couple.pet?.name || 'Your pet')} came to visit from ${who}` : null,
    board: `🎨 ${who} started a drawing`,
  }[it.kind];
  if (msg) toast(msg);
}

function whatsNew() {
  const seen = lsGet('twopeas-seen-version');
  lsSet('twopeas-seen-version', APP_VERSION);
  if (!seen || seen === APP_VERSION) return;
  const notesFor = WHATS_NEW.filter((w) => w.v > seen);
  if (!notesFor.length) return;
  sheet({
    title: `What's new in ${APP_VERSION}`,
    body: notesFor.map((w) => `<div class="card flat"><b>v${w.v}</b> <span class="muted small">${w.date}</span><ul>${w.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('') +
      '<button class="btn block" data-close>Got it</button>',
    onMount: (el, close) => { el.querySelector('[data-close]').onclick = close; },
  });
}

async function boot() {
  $app.innerHTML = '<div class="welcome"><div class="center muted bold">Loading…</div></div>';
  try {
    await store.init();
  } catch (e) {
    console.error(e);
    showDownScreen($app, e, store.backend.step);
    return;
  }
  if (store.state === 'ready' && store.couple.pet) ensureDailyQuestion().catch(() => {});
  render();
  whatsNew();
  refreshPush();
  startUpdater();
  startBackupNudge();
  outageHeadsUp();
  setInterval(outageHeadsUp, 5 * 60e3);
  window.__connTrouble = connectionTrouble;
  setInterval(() => { if (store.state === 'ready' && store.couple.pet) ensureDailyQuestion().catch(() => {}); }, 60_000);
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener?.('message', (e) => {
    if (e.data?.type === 'open' && e.data.url) location.hash = e.data.url.replace(/^.*#/, '#');
  });
}

boot();
