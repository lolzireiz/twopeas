// Derived state: points, wallet, pet mood, streaks, daily question, weekly challenge.
import { store } from './store.js';
import { QUESTIONS, CHALLENGES, SHOP } from './content.js';
import { dayKey, addDays, weekKey, hash, seededShuffle, daysBetween, parseDay } from './util.js';

export const today = () => dayKey();

// ---------- Points ----------
// Each award is its own item, so both phones can add points at once without clashing.
// Pass an id to make an award happen only once (e.g. "both answered today").
export async function award(n, why, id) {
  if (id) return store.add('pts', { n, why }, { id: `pts-${id}`, once: true });
  return store.add('pts', { n, why });
}

const CAPPED = ['tap', 'note', 'mood'];
export async function awardCapped(n, why) {
  const t = today();
  const mineToday = store.all('pts', (p) => p.by === store.me && CAPPED.includes(p.data.why) && dayKey(new Date(p.at)) === t);
  if (mineToday.length >= 5) return null;
  return award(n, why);
}

export function totals() {
  let earned = 0;
  for (const p of store.all('pts')) earned += p.data.n || 0;
  let spent = 0;
  for (const p of store.all('purchase')) spent += p.data.cost || 0;
  const level = Math.floor(Math.sqrt(earned / 25)) + 1;
  const thisLvl = 25 * (level - 1) ** 2;
  const nextLvl = 25 * level ** 2;
  return { earned, spent, wallet: earned - spent, level, progress: (earned - thisLvl) / (nextLvl - thisLvl), nextLvl };
}

export const stageOf = (level) => (level >= 20 ? 'grown' : level >= 10 ? 'teen' : level >= 5 ? 'kid' : 'baby');
export const STAGE_NAMES = { baby: 'Baby', kid: 'Little one', teen: 'Teen', grown: 'Grown-up' };

// ---------- Pet ----------
const NOT_ACTIVITY = new Set(['profile', 'couple', 'dq']);
export function lastActivity() {
  // A brand-new pet starts out happy: count from when you set it up.
  let last = store.get('couple')?.at || 0;
  for (const it of store.items.values()) {
    if (NOT_ACTIVITY.has(it.kind)) continue;
    const t = Math.max(it.at, it.upd || 0);
    if (t > last) last = t;
  }
  return last;
}

export const FOODS = ['🍓', '🥕', '🍪', '🧀', '🍎', '🫛', '🍩', '🍉'];

// Snacks: every 10 love points earns one. Feeding uses them up.
export function snacks() {
  return Math.max(0, Math.floor(totals().earned / 10) - store.all('feed').length);
}

export function petState() {
  const now = Date.now();
  const last = lastActivity();
  const hrs = last ? (now - last) / 36e5 : 999;
  const dayAgo = now - 864e5;
  const feeds24 = store.all('feed', (f) => f.at > dayAgo).length;
  let acts24 = 0;
  for (const it of store.items.values()) {
    if (it.at > dayAgo && ['tap', 'note', 'pet', 'mood', 'game', 'stroke', 'dqa', 'letter', 'memory', 'appr', 'feed'].includes(it.kind)) acts24++;
  }
  let full = Math.min(1, feeds24 / 5);
  let love = Math.min(1, acts24 / 10);
  let mood = 'happy';
  if (hrs > 72) mood = 'sad';
  else if (hrs > 24) mood = 'sleepy';
  else if (full >= 0.8 && love >= 0.6) mood = 'love';
  if (hrs > 24) { full = Math.min(full, 0.15); love = Math.min(love, 0.15); }
  const h = new Date().getHours();
  const night = h >= 22 || h < 7;
  const asleep = night && mood !== 'sad';
  return { mood, face: asleep ? 'sleepy' : mood, full, love, hrs, night, asleep };
}

export function petMoodText(name, mood, asleep) {
  if (asleep) return `${name} is fast asleep. Sweet dreams 😴`;
  return {
    love: `${name} is head over heels for you two`,
    happy: `${name} is happy and cozy`,
    sleepy: `${name} is getting sleepy. Do something together!`,
    sad: `${name} misses you both. One activity will cheer them up`,
  }[mood];
}

// ---------- Days together, countdowns ----------
export function daysTogether() {
  const s = store.couple.startDate;
  if (!s) return null;
  return daysBetween(s, today()) + 1;
}

export function nextOccurrence(dateKey, yearly) {
  const t = today();
  if (!yearly) return dateKey;
  const d = parseDay(dateKey);
  const now = parseDay(t);
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (dayKey(next) < t) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
  return dayKey(next);
}

export function countdowns() {
  const t = today();
  const list = store.all('countdown').map((c) => {
    const when = nextOccurrence(c.data.date, c.data.yearly);
    return { id: c.id, title: c.data.title, emoji: c.data.emoji || '🎉', when, days: daysBetween(t, when), yearly: c.data.yearly, item: c };
  });
  const s = store.couple.startDate;
  if (s) {
    const when = nextOccurrence(s, true);
    const years = parseDay(when).getFullYear() - parseDay(s).getFullYear();
    if (years > 0) list.push({ id: 'anniv', title: `Anniversary #${years}`, emoji: '💚', when, days: daysBetween(t, when), auto: true });
  }
  for (const p of store.all('plan', (x) => !x.data.done)) {
    const when = (p.data.when || '').slice(0, 10);
    if (when && when >= t) list.push({ id: p.id, title: p.data.title, emoji: '📅', when, days: daysBetween(t, when), plan: true });
  }
  return list.filter((c) => c.days >= 0).sort((a, b) => a.days - b.days);
}

// ---------- Daily question ----------
export const dqId = (d = today()) => `dq-${d}`;
export const dqaId = (d, who) => `dqa-${d}-${who}`;

export async function ensureDailyQuestion(d = today()) {
  const existing = store.get(dqId(d));
  if (existing) return existing;
  const decks = store.couple.decks || ['fun', 'deep', 'us', 'flirty'];
  const used = new Set(store.all('dq').map((x) => x.data.qid));
  const customs = store.all('customq').filter((c) => !used.has(c.id));
  let q;
  if (customs.length) {
    const c = customs[0];
    q = { qid: c.id, text: c.data.text, deck: 'custom', by: c.by };
  } else {
    let pool = QUESTIONS.filter((x) => decks.includes(x.deck) && !used.has(x.id));
    if (!pool.length) pool = QUESTIONS.filter((x) => decks.includes(x.deck));
    if (!pool.length) pool = QUESTIONS;
    const pickQ = pool[hash(`${store.coupleId}:${d}`) % pool.length];
    q = { qid: pickQ.id, text: pickQ.text, deck: pickQ.deck };
  }
  return store.add('dq', { ...q, date: d }, { id: dqId(d), once: true });
}

export function dqStatus(d = today()) {
  const q = store.get(dqId(d));
  const mine = store.get(dqaId(d, store.me));
  const theirs = store.get(dqaId(d, store.partnerId));
  return { q, mine, theirs, both: !!(mine && theirs) };
}

export function dqStreak() {
  let d = today();
  const both = (k) => store.get(dqaId(k, store.me)) && store.get(dqaId(k, store.partnerId));
  if (!both(d)) d = addDays(d, -1);
  let n = 0;
  while (both(d)) { n++; d = addDays(d, -1); }
  return n;
}

// Days in a row that you both did something.
export function checkinStreak() {
  const days = { [store.me]: new Set(), [store.partnerId]: new Set() };
  for (const it of store.items.values()) {
    if (NOT_ACTIVITY.has(it.kind) || it.kind === 'pts') continue;
    if (days[it.by]) days[it.by].add(dayKey(new Date(it.at)));
  }
  const both = (k) => days[store.me].has(k) && days[store.partnerId]?.has(k);
  let d = today();
  if (!both(d)) d = addDays(d, -1);
  let n = 0;
  while (both(d)) { n++; d = addDays(d, -1); }
  return n;
}

export function bestStreak() {
  return Math.max(dqStreak(), checkinStreak(), store.couple.bestStreak || 0);
}

export function unlockedItems() {
  const best = bestStreak();
  return SHOP.filter((s) => s.unlock && best >= s.unlock.streak).map((s) => s.id);
}

// ---------- Weekly challenge ----------
export function weeklyChallenge(wk = weekKey()) {
  const idx = Math.floor(parseDay(wk).getTime() / (7 * 864e5));
  const order = seededShuffle(CHALLENGES.map((_, i) => i), store.coupleId || 'demo');
  const text = CHALLENGES[order[((idx % order.length) + order.length) % order.length]];
  const doneMe = store.get(`ch-${wk}-${store.me}`);
  const doneThem = store.get(`ch-${wk}-${store.partnerId}`);
  return { wk, text, doneMe, doneThem, both: !!(doneMe && doneThem) };
}

// ---------- Owned shop items ----------
export function owned() {
  const set = new Set(store.all('purchase').map((p) => p.data.item));
  for (const id of unlockedItems()) set.add(id);
  return set;
}

// ---------- Games ----------
export const GAME_NAMES = {
  wyr: 'Would you rather', hunt: 'Word Hunt', ttt: 'Tic-tac-toe', c4: 'Connect Four', dots: 'Dots & Boxes', word: 'Word Guess', draw: 'Draw & Guess',
};
export const GAME_EMOJI = { wyr: '🤔', hunt: '🔎', ttt: '⭕', c4: '🔴', dots: '🔲', word: '🔤', draw: '🎨' };

export function turnOf(g) {
  const d = g.data;
  if (d.winner || d.done) return null;
  if (d.type === 'wyr' || d.type === 'hunt') {
    const fin = d.type === 'wyr' ? wyrDone : huntDone;
    const me = fin(g, store.me);
    const them = fin(g, store.partnerId);
    if (!me) return store.me;
    if (!them) return store.partnerId;
    return null;
  }
  return d.turn;
}

export const wyrPicks = (g, who) => store.get(`wyra-${g.id}-${who}`)?.data.picks || [];
export const wyrGuesses = (g, who) => store.get(`wyra-${g.id}-${who}`)?.data.guesses || [];
export const wyrDone = (g, who) => wyrGuesses(g, who).length >= g.data.qs.length;
export const huntRes = (g, who) => store.get(`huntr-${g.id}-${who}`)?.data || null;
export const huntDone = (g, who) => !!huntRes(g, who);

export function myTurnGames() {
  return store.all('game').filter((g) => turnOf(g) === store.me);
}

export function scoreboard() {
  const s = { [store.me]: 0, [store.partnerId]: 0, draws: 0 };
  for (const g of store.all('game')) {
    const w = g.data.winner;
    if (!w) continue;
    if (w === 'draw') s.draws++;
    else if (s[w] != null) s[w]++;
  }
  return s;
}
