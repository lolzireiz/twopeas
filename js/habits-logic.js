// Shared habits: the data side (no screens here, so the pet logic can use it too).
import { store } from './store.js';
import { dayKey, addDays, parseDay } from './util.js';

export const HABIT_IDEAS = [
  ['🏋️', 'Gym / workout'], ['💧', 'Drink 8 glasses of water'], ['😴', 'In bed by 11'], ['📖', 'Read 10 pages'],
  ['🚶', 'Go for a walk'], ['🧴', 'Skincare routine'], ['🧘', 'Stretch or meditate'], ['📵', 'No phone in bed'],
  ['💊', 'Take vitamins'], ['🥦', 'Eat a vegetable'], ['📚', 'Study'], ['☎️', 'Call family'],
  ['🧹', 'Tidy for 10 minutes'], ['✍️', 'Journal'], ['🦷', 'Floss'], ['🍳', 'Cook at home'],
  ['🚭', 'No vaping'], ['☀️', 'Get some sunlight'], ['🎸', 'Practice an instrument'], ['💸', 'No spending day'],
];
export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const habits = () => store.all('habit', (h) => !h.data.archived);
// 'both' habits belong to each of you.
export const habitsOf = (who) => habits().filter((h) => h.data.owner === 'both' || h.data.owner === who);
const wd = (key) => (parseDay(key).getDay() + 6) % 7;
export const scheduled = (h, key) => !h.data.days || h.data.days.length === 0 || h.data.days.includes(wd(key));
export const dueOn = (who, key = dayKey()) => habitsOf(who).filter((h) => scheduled(h, key) && dayKey(new Date(h.at)) <= key);

export const hbId = (key, who) => `hb-${key}-${who}`;
export const doneOn = (who, key = dayKey()) => new Set(store.get(hbId(key, who))?.data?.done || []);

export function progress(who, key = dayKey()) {
  const due = dueOn(who, key);
  const done = doneOn(who, key);
  const n = due.filter((h) => done.has(h.id)).length;
  return { due: due.length, done: n, all: due.length > 0 && n === due.length };
}

export function streakOf(h, who) {
  let s = 0;
  let k = dayKey();
  if (!doneOn(who, k).has(h.id)) k = addDays(k, -1);
  for (let i = 0; i < 400; i++) {
    if (dayKey(new Date(h.at)) > k) break;
    if (scheduled(h, k)) {
      if (doneOn(who, k).has(h.id)) s++;
      else break;
    }
    k = addDays(k, -1);
  }
  return s;
}

export function bothCrushedIt(key = dayKey()) {
  const a = progress(store.me, key);
  const b = progress(store.partnerId, key);
  return a.all && b.all;
}
