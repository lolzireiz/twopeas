// Two Peas Wrapped: the numbers behind your week, month and year.
import { store } from './store.js';
import { gameWinner, GAME_NAMES, GAME_EMOJI, totals, stageOf, STAGE_NAMES, daysTogether } from './logic.js';
import { TAPS, MOODS } from './content.js';
import { dayKey, addDays, parseDay, weekKey, monthName } from './util.js';
import { swipesOf } from './views/swipe.js';
import { DECKS } from './swipe-data.js';

const SKIP = new Set(['profile', 'couple', 'pts', 'dq', 'swipes', 'purchase']);

export function range(period, key) {
  if (period === 'week') { const s = parseDay(key); return [s.getTime(), parseDay(addDays(key, 7)).getTime()]; }
  if (period === 'month') { const [y, m] = key.split('-').map(Number); return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]; }
  const y = Number(key);
  return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()];
}

export function label(period, key) {
  if (period === 'week') {
    const s = parseDay(key); const e = parseDay(addDays(key, 6));
    const f = (d) => `${monthName(d.getMonth()).slice(0, 3)} ${d.getDate()}`;
    return `${f(s)} – ${f(e)}`;
  }
  if (period === 'month') { const [y, m] = key.split('-').map(Number); return `${monthName(m - 1)} ${y}`; }
  return key;
}

// Is this period over (so the Wrapped is "ready")?
export function isReady(period, key, now = Date.now()) {
  const [, end] = range(period, key);
  if (period === 'year') return now >= new Date(Number(key), 11, 31, 12).getTime(); // noon on New Year's Eve
  return now >= end;
}
export const currentKey = (period, d = new Date()) => (period === 'week' ? weekKey(d) : period === 'month' ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : String(d.getFullYear()));
export function prevKey(period, key) {
  if (period === 'week') return addDays(key, -7);
  if (period === 'month') { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 2, 1); return currentKey('month', d); }
  return String(Number(key) - 1);
}

const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || null;
const words = (t) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

export function compute(period, key) {
  const [start, end] = range(period, key);
  const me = store.me;
  const them = store.partnerId;
  const inR = (t) => t >= start && t < end;
  const items = [...store.items.values()].filter((i) => store.visible(i) && inR(i.at));
  const by = (kind, who) => items.filter((i) => i.kind === kind && (!who || i.by === who));
  const per = (kind) => ({ [me]: by(kind, me).length, [them]: by(kind, them).length });

  // Days you both showed up
  const dayWho = {};
  const dayCount = {};
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  for (const i of items) {
    if (SKIP.has(i.kind)) continue;
    const d = dayKey(new Date(i.at));
    (dayWho[d] = dayWho[d] || new Set()).add(i.by);
    dayCount[d] = (dayCount[d] || 0) + 1;
    const dt = new Date(i.at);
    hours[dt.getHours()]++;
    weekdays[(dt.getDay() + 6) % 7]++;
  }
  const spanDays = Math.max(1, Math.round((Math.min(end, Date.now() + 864e5) - start) / 864e5));
  const totalDays = Math.round((end - start) / 864e5);
  const activeDays = Object.keys(dayWho).length;
  const bothDays = Object.values(dayWho).filter((s) => s.size >= 2).length;
  const busiest = top(dayCount);
  const nightActs = hours.slice(22).reduce((a, b) => a + b, 0) + hours.slice(0, 5).reduce((a, b) => a + b, 0);
  const morningActs = hours.slice(5, 10).reduce((a, b) => a + b, 0);
  const allActs = hours.reduce((a, b) => a + b, 0) || 1;
  const topHour = hours.indexOf(Math.max(...hours));
  const topWeekday = weekdays.indexOf(Math.max(...weekdays));

  // Talking
  const notes = by('note');
  const msgs = { [me]: notes.filter((n) => n.by === me).length, [them]: notes.filter((n) => n.by === them).length };
  const voice = notes.filter((n) => n.data.audio).length;
  const chatPhotos = notes.filter((n) => n.data.photo).length;
  const wordCount = notes.reduce((a, n) => a + words(n.data.text), 0) + by('letter').reduce((a, l) => a + words(l.data.body), 0);

  // Sweet stuff
  const taps = by('tap');
  const tapCounts = {};
  taps.forEach((t) => { tapCounts[t.data.type] = (tapCounts[t.data.type] || 0) + 1; });
  const topTap = top(tapCounts);
  const tapsBy = { [me]: taps.filter((t) => t.by === me).length, [them]: taps.filter((t) => t.by === them).length };
  const moods = (who) => { const c = {}; by('mood', who).forEach((m) => { c[m.data.mood] = (c[m.data.mood] || 0) + 1; }); return top(c); };

  // Questions
  const dqa = by('dqa');
  const dqDates = {};
  dqa.forEach((a) => { const d = a.id.split('-').slice(1, 4).join('-'); (dqDates[d] = dqDates[d] || new Set()).add(a.by); });
  const dqBoth = Object.values(dqDates).filter((s) => s.size >= 2).length;
  let bestStreak = 0; let cur = 0;
  for (let d = dayKey(new Date(start)); parseDay(d).getTime() < end; d = addDays(d, 1)) {
    if (dqDates[d]?.size >= 2) { cur++; bestStreak = Math.max(bestStreak, cur); } else cur = 0;
  }

  // Games
  const games = [...store.items.values()].filter((g) => g.kind === 'game' && store.visible(g) && inR(g.upd || g.at));
  const wins = { [me]: 0, [them]: 0, team: 0, draws: 0 };
  const gameTypes = {};
  let finished = 0;
  for (const g of games) {
    const w = gameWinner(g);
    gameTypes[g.data.type] = (gameTypes[g.data.type] || 0) + 1;
    if (!w) continue;
    finished++;
    if (w === 'team') wins.team++; else if (w === 'draw') wins.draws++; else if (wins[w] != null) wins[w]++;
  }
  const topGame = top(gameTypes);

  // Peadle
  const pdl = (who) => {
    const ps = items.filter((i) => i.kind === 'peadle' && i.by === who && i.data.done);
    const won = ps.filter((p) => p.data.won);
    return { played: ps.length, won: won.length, avg: won.length ? won.reduce((a, p) => a + p.data.guesses.length, 0) / won.length : 0, best: won.length ? Math.min(...won.map((p) => p.data.guesses.length)) : 0 };
  };
  const pMe = pdl(me); const pThem = pdl(them);
  let pdlWins = { [me]: 0, [them]: 0 };
  for (const p of items.filter((i) => i.kind === 'peadle' && i.by === me && i.data.done)) {
    const o = store.get(`pdl-${p.data.date}-${them}`)?.data;
    if (!o?.done) continue;
    const a = p.data.won ? p.data.guesses.length : 9; const b = o.won ? o.guesses.length : 9;
    if (a < b) pdlWins[me]++; else if (b < a) pdlWins[them]++;
  }

  // Swipes & matches
  let swipes = { [me]: 0, [them]: 0 };
  let matches = 0;
  const matchList = [];
  for (const deck of Object.keys(DECKS)) {
    const a = swipesOf(deck, me); const b = swipesOf(deck, them);
    for (const [k, t] of Object.entries(a.t)) if (inR(t)) swipes[me]++;
    for (const [k, t] of Object.entries(b.t)) if (inR(t)) swipes[them]++;
    for (const k of Object.keys(a.v)) {
      if ((a.v[k] === 1 || a.v[k] === 2) && (b.v[k] === 1 || b.v[k] === 2)) {
        const t = Math.max(a.t[k] || 0, b.t[k] || 0);
        if (inR(t)) { matches++; matchList.push(k); }
      }
    }
  }

  // Habits
  const hbAll = [...store.items.values()].filter((i) => i.kind === 'hbday' && (() => { const t = parseDay(i.data.date).getTime(); return inR(t); })());
  const habitsMe = hbAll.filter((h) => h.by === me).reduce((a, h) => a + (h.data.done?.length || 0), 0);
  const habitsThem = hbAll.filter((h) => h.by === them).reduce((a, h) => a + (h.data.done?.length || 0), 0);

  // Memories, snaps, photos
  const snaps = by('snap');
  const snapDays = new Set(snaps.map((s) => s.data.date));
  const bothSnapDays = [...snapDays].filter((d) => snaps.some((s) => s.data.date === d && s.by === me) && snaps.some((s) => s.data.date === d && s.by === them)).length;
  const photos = [...snaps.map((s) => s.data.photo), ...by('memory').map((m) => m.data.photo)].filter(Boolean);
  const plansDone = [...store.items.values()].filter((p) => p.kind === 'plan' && p.data.done && inR(p.upd || p.at)).length;
  const bucketDone = [...store.items.values()].filter((p) => p.kind === 'bucket' && p.data.doneAt && inR(p.data.doneAt)).length;

  // Points
  const pts = items.filter((i) => i.kind === 'pts').reduce((a, p) => a + (p.data.n || 0), 0);
  const t = totals();

  // Busiest month (for the year)
  const months = Array(12).fill(0);
  if (period === 'year') for (const i of items) if (!SKIP.has(i.kind)) months[new Date(i.at).getMonth()]++;
  const topMonth = months.indexOf(Math.max(...months));

  const s = {
    period, key, label: label(period, key), start, end, totalDays, spanDays,
    me, them, meName: store.name(me), themName: store.name(them),
    activeDays, bothDays, busiest: busiest ? { day: busiest[0], n: busiest[1] } : null,
    nightShare: nightActs / allActs, morningShare: morningActs / allActs, topHour, topWeekday,
    msgs, voice, chatPhotos, wordCount,
    letters: per('letter'), jar: per('appr'), taps: tapsBy, topTap: topTap ? { ...TAPS.find((x) => x.id === topTap[0]), n: topTap[1] } : null,
    hugs: tapCounts.hug || 0,
    moodMe: moods(me) ? MOODS.find((m) => m.id === moods(me)[0]) : null, moodThem: moods(them) ? MOODS.find((m) => m.id === moods(them)[0]) : null,
    dqBoth, dqStreak: bestStreak,
    games: games.length, finished, wins, topGame: topGame ? { name: GAME_NAMES[topGame[0]], e: GAME_EMOJI[topGame[0]], n: topGame[1] } : null,
    pdlMe: pMe, pdlThem: pThem, pdlWins,
    swipes, matches, matchList,
    habitsMe, habitsThem,
    snaps: snaps.length, bothSnapDays, photos: photos.slice(-9), memories: by('memory').length, drawings: by('board').length,
    plansDone, bucketDone, feeds: by('feed').length, visits: by('visit').length,
    pts, level: t.level, pet: store.couple.pet, stage: STAGE_NAMES[stageOf(t.level)], together: daysTogether(),
    topMonth: period === 'year' && Math.max(...months) > 0 ? monthName(topMonth) : null,
    total: items.filter((i) => !SKIP.has(i.kind)).length,
  };
  s.archetype = archetype(s);
  return s;
}

const sum = (o) => Object.values(o).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

export const ARCHETYPES = {
  chatter: { name: 'The Chatterboxes', e: '💬', line: 'You never run out of things to say to each other.' },
  gamers: { name: 'The Rivals', e: '🎮', line: 'Competitive, loud and secretly proud of each other.' },
  sweet: { name: 'The Sweethearts', e: '💗', line: 'Hugs, letters and little love notes all the way down.' },
  adventure: { name: 'The Adventurers', e: '🗺️', line: 'Always planning the next thing to do together.' },
  healthy: { name: 'The Power Couple', e: '💪', line: 'Keeping each other on track, one habit at a time.' },
  creative: { name: 'The Artists', e: '🎨', line: 'Snaps, doodles and a camera roll full of you two.' },
  thinkers: { name: 'The Deep Divers', e: '💭', line: 'You actually get to know each other. Every single day.' },
};
function archetype(s) {
  const score = {
    chatter: (sum(s.msgs) + s.voice * 3) / 40,
    gamers: (s.finished * 3 + s.pdlMe.played + s.pdlThem.played) / 12,
    sweet: (sum(s.taps) + sum(s.letters) * 4 + sum(s.jar) * 3) / 20,
    adventure: (s.plansDone * 5 + s.bucketDone * 6 + s.matches * 1.5 + s.memories * 2) / 12,
    healthy: (s.habitsMe + s.habitsThem) / 25,
    creative: (s.snaps + s.drawings * 3) / 12,
    thinkers: (s.dqBoth * 2) / 8,
  };
  const best = top(score);
  return best && best[1] > 0 ? best[0] : 'sweet';
}

export const HOURS = (h) => (h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`);
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
