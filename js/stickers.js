// Sticker book: little badges you collect for doing things together.
import { store } from './store.js';
import { totals, bestStreak, daysTogether, dqaId, wyrPicks, wyrGuesses, huntRes } from './logic.js';

export const STICKERS = [
  ['first-q', '💭', 'First answers', 'Both answer a daily question', (c) => c.bothQ >= 1],
  ['q-25', '📚', 'Open books', 'Answer 25 questions together', (c) => c.bothQ >= 25],
  ['streak-3', '🔥', 'Warming up', '3-day streak', (c) => c.streak >= 3],
  ['streak-7', '☄️', 'On fire', '7-day streak', (c) => c.streak >= 7],
  ['streak-30', '🌋', 'Unstoppable', '30-day streak', (c) => c.streak >= 30],
  ['mem-1', '📸', 'Say cheese', 'Save your first memory', (c) => c.mems >= 1],
  ['mem-10', '🎞️', 'Scrapbookers', 'Save 10 memories', (c) => c.mems >= 10],
  ['game-1', '🎲', 'Game on', 'Finish a game', (c) => c.games >= 1],
  ['game-25', '🕹️', 'Rivals', 'Finish 25 games', (c) => c.games >= 25],
  ['all-games', '🏅', 'Tried it all', 'Play every kind of game', (c) => c.types >= 7],
  ['twins', '👯', 'Twins', 'Match 8+ in Would you rather', (c) => c.wyrBest >= 8],
  ['mind', '🔮', 'Mind reader', 'Guess 8+ of their picks', (c) => c.guessBest >= 8],
  ['hunt', '🔎', 'Wordsmiths', 'Score 5,000+ in Word Hunt', (c) => c.huntBest >= 5000],
  ['artist', '🎨', 'Little artists', 'Save a drawing to Memories', (c) => c.drawings >= 1],
  ['letter', '✉️', 'Pen pals', 'Send a letter', (c) => c.letters >= 1],
  ['notes-25', '💌', 'Sweet talkers', 'Send 25 notes', (c) => c.notes >= 25],
  ['taps-50', '🤗', 'Always on my mind', 'Send 50 taps', (c) => c.taps >= 50],
  ['jar-10', '🫙', 'Full of love', 'Put 10 things in the love jar', (c) => c.appr >= 10],
  ['challenge-1', '🏆', 'Challenge accepted', 'Finish a weekly challenge', (c) => c.challenges >= 1],
  ['challenge-4', '🥇', 'Dream team', 'Finish 4 weekly challenges', (c) => c.challenges >= 4],
  ['bucket-1', '✨', 'Checked off', 'Do a bucket list item', (c) => c.bucket >= 1],
  ['date-1', '📅', 'Date night', 'Finish a planned date', (c) => c.plans >= 1],
  ['shop-1', '🛍️', 'Treat yourself', 'Buy something for your pet', (c) => c.buys >= 1],
  ['shop-8', '🛋️', 'Interior designers', 'Buy 8 things', (c) => c.buys >= 8],
  ['feed-25', '🍓', 'Well fed', 'Feed your pet 25 times', (c) => c.feeds >= 25],
  ['lvl-5', '🌱', 'Growing up', 'Reach level 5', (c) => c.level >= 5],
  ['lvl-10', '🌿', 'Big kid', 'Reach level 10', (c) => c.level >= 10],
  ['lvl-20', '🌳', 'All grown up', 'Reach level 20', (c) => c.level >= 20],
  ['days-100', '💯', '100 days', '100 days together', (c) => c.days >= 100],
  ['days-365', '🎂', 'One year', 'A whole year together', (c) => c.days >= 365],
].map(([id, e, name, hint, test]) => ({ id, e, name, hint, test }));

function ctx() {
  const n = (kind, f) => store.all(kind, f).length;
  const games = store.all('game');
  const done = games.filter((g) => g.data.winner || g.data.done);
  let wyrBest = 0; let guessBest = 0; let huntBest = 0;
  for (const g of done) {
    if (g.data.type === 'wyr') {
      const a = wyrPicks(g, store.me); const b = wyrPicks(g, store.partnerId);
      wyrBest = Math.max(wyrBest, a.filter((x, i) => x === b[i]).length);
      guessBest = Math.max(guessBest, wyrGuesses(g, store.me).filter((x, i) => x === b[i]).length, wyrGuesses(g, store.partnerId).filter((x, i) => x === a[i]).length);
    }
    if (g.data.type === 'hunt') huntBest = Math.max(huntBest, huntRes(g, store.me)?.score || 0, huntRes(g, store.partnerId)?.score || 0);
  }
  const why = (w) => n('pts', (p) => p.data.why === w);
  return {
    bothQ: store.all('dq').filter((q) => store.get(dqaId(q.data.date, store.me)) && store.get(dqaId(q.data.date, store.partnerId))).length,
    streak: bestStreak(), mems: n('memory'), games: done.length, types: new Set(games.map((g) => g.data.type)).size,
    wyrBest, guessBest, huntBest, drawings: why('drawing'), letters: n('letter'), notes: n('note'), taps: n('tap'), appr: n('appr'),
    challenges: why('challenge'), bucket: n('bucket', (b) => b.data.done), plans: n('plan', (p) => p.data.done),
    buys: n('purchase'), feeds: n('feed'), level: totals().level, days: daysTogether() || 0,
  };
}

export function earned() {
  const c = ctx();
  return new Set(STICKERS.filter((s) => s.test(c)).map((s) => s.id));
}
