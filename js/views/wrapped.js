// Wrapped: tap-through stories for your week, month and year together.
import { store } from '../store.js';
import {
  compute, label, isReady, currentKey, prevKey, range, ARCHETYPES, HOURS, WEEKDAYS,
} from '../wrapped.js';
import { header, photoImg, hydratePhotos, meColor, themColor } from '../ui.js';
import {
  esc, confetti, lsGet, lsSet, toast, fmtDay, monthName,
} from '../util.js';

const seenKey = (p, k) => `twopeas-wrapped-${p}-${k}`;
export const wasSeen = (p, k) => !!lsGet(seenKey(p, k));

// The newest finished Wrapped you haven't opened yet (for the Home banner).
export function freshWrapped() {
  const now = new Date();
  const firstUse = Math.min(...[...store.items.values()].map((i) => i.at).filter(Boolean), Date.now());
  const cands = [];
  const y = String(now.getFullYear());
  if (isReady('year', y)) cands.push(['year', y]);
  const lastMonth = prevKey('month', currentKey('month'));
  cands.push(['month', lastMonth]);
  cands.push(['week', prevKey('week', currentKey('week'))]);
  for (const [p, k] of cands) {
    const [s, e] = range(p, k);
    if (e <= firstUse || !isReady(p, k)) continue;
    if (wasSeen(p, k)) continue;
    const st = compute(p, k);
    if (st.total < 3) continue;
    return { period: p, key: k, label: label(p, k) };
  }
  return null;
}

// ---------- Hub ----------
export function hub() {
  const now = new Date();
  const y = now.getFullYear();
  const weeks = [currentKey('week')];
  for (let i = 0; i < 4; i++) weeks.push(prevKey('week', weeks[weeks.length - 1]));
  const months = [currentKey('month')];
  for (let i = 0; i < 5; i++) months.push(prevKey('month', months[months.length - 1]));
  const firstUse = Math.min(...[...store.items.values()].map((i) => i.at).filter(Boolean), Date.now());
  const hasData = (p, k) => range(p, k)[1] > firstUse;
  const yearReady = isReady('year', String(y));
  const daysLeft = Math.ceil((new Date(y, 11, 31, 12) - now) / 864e5);

  const tile = (p, k, cls = '') => {
    const ready = isReady(p, k);
    const st = compute(p, k);
    return `<a class="wr-tile ${cls} ${ready && !wasSeen(p, k) ? 'fresh' : ''}" href="#/wrapped/${p}/${k}">
      <div class="grow"><b>${p === 'week' ? (k === currentKey('week') ? 'This week so far' : label(p, k)) : p === 'month' ? (k === currentKey('month') ? `${label(p, k).split(' ')[0]} so far` : label(p, k)) : ''}</b>
      <div class="tiny">${st.total} moment${st.total === 1 ? '' : 's'} · ${st.bothDays} day${st.bothDays === 1 ? '' : 's'} together</div></div>
      ${ready && !wasSeen(p, k) ? '<span class="wr-new">NEW</span>' : '<span class="chev">›</span>'}</a>`;
  };

  return {
    html: `${header('Wrapped', { back: '#/us', sub: 'Your story, in numbers' })}
      <a class="wr-year ${yearReady ? 'ready' : ''}" href="${yearReady ? `#/wrapped/year/${y}` : '#/wrapped'}" ${yearReady ? '' : 'data-act="locked"'}>
        <div class="wr-year-glow"></div>
        <div class="wr-year-in"><div class="tiny bold" style="opacity:.8">THE BIG ONE</div>
          <div class="wr-year-n">${y}</div><div class="bold">Two Peas Wrapped</div>
          <div class="small" style="margin-top:6px;opacity:.9">${yearReady ? 'Ready! Grab your person and tap to open 🎆' : `🔒 Unlocks on New Year's Eve · ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`}</div></div>
      </a>
      ${!yearReady ? `<p class="tiny muted center" style="margin:-4px 0 14px">Can't wait? <a class="link" href="#/wrapped/year/${y}?peek=1">Peek at the year so far</a></p>` : ''}
      ${y > 2026 || now.getMonth() === 0 ? `<a class="wr-tile" href="#/wrapped/year/${y - 1}"><div class="grow"><b>${y - 1} Wrapped</b><div class="tiny">Relive last year</div></div><span class="chev">›</span></a>` : ''}
      <div class="section-title">Monthly</div>
      ${months.filter((k) => hasData('month', k)).map((k) => tile('month', k, 'month')).join('')}
      <div class="section-title">Weekly</div>
      ${weeks.filter((k) => hasData('week', k)).map((k) => tile('week', k)).join('')}
      <p class="tiny muted center">A new weekly drops every Monday and a monthly on the 1st.</p>`,
    actions: { locked: () => toast(`Patience, peas 🔒 ${daysLeft} more day${daysLeft === 1 ? '' : 's'}`) },
  };
}

// ---------- Slides ----------
const G = {
  pink: 'linear-gradient(160deg,#ff8fb1,#ffb86b)',
  purple: 'linear-gradient(160deg,#6c5ce7,#c084fc)',
  green: 'linear-gradient(160deg,#16a34a,#86efac)',
  blue: 'linear-gradient(160deg,#2563eb,#7dd3fc)',
  sunset: 'linear-gradient(160deg,#f97316,#facc15)',
  night: 'linear-gradient(160deg,#0f0c29,#302b63 55%,#24243e)',
  berry: 'linear-gradient(160deg,#be185d,#f472b6)',
  teal: 'linear-gradient(160deg,#0f766e,#5eead4)',
  gold: 'linear-gradient(160deg,#b45309,#fde047)',
  ink: 'linear-gradient(160deg,#111827,#374151)',
  peas: 'linear-gradient(160deg,#3f8a2f,#a3e08f)',
  rainbow: 'linear-gradient(135deg,#f472b6,#a78bfa,#60a5fa,#34d399,#facc15)',
};
const n = (x) => `<b class="cu" data-n="${Math.round(x)}">0</b>`;
const S = (bg, html, o = {}) => ({ bg, html, ...o });
const plural = (x, a, b = `${a}s`) => (x === 1 ? a : b);

function splitBar(a, b) {
  const t = a + b || 1;
  return `<div class="wr-split"><i style="width:${(a / t) * 100}%;background:${meColor().hex}"></i><i style="width:${(b / t) * 100}%;background:${themColor().hex}"></i></div>
    <div class="wr-split-l"><span>${esc(cur.meName)} ${a}</span><span>${b} ${esc(cur.themName)}</span></div>`;
}

let cur = null;

function slidesFor(s) {
  cur = s;
  const P = s.period;
  const big = P === 'year';
  const out = [];
  const totalMsgs = s.msgs[s.me] + s.msgs[s.them];
  const totalTaps = s.taps[s.me] + s.taps[s.them];
  const meW = s.wins[s.me]; const themW = s.wins[s.them];
  const champ = meW > themW ? s.meName : themW > meW ? s.themName : null;
  const arch = ARCHETYPES[s.archetype];
  const petName = s.pet?.name || 'Your pet';

  // Intro
  if (big) {
    out.push(S(G.night, '<div class="wr-count"><span>3</span><span>2</span><span>1</span></div>', { dur: 3600, cls: 'dark' }));
    out.push(S(G.rainbow, `<div class="wr-kicker">TWO PEAS</div><div class="wr-mega">${esc(s.key)}</div><div class="wr-mega2">WRAPPED</div><p class="wr-p">${esc(s.meName)} & ${esc(s.themName)}, this was your year.</p>`, { confetti: 150 }));
  } else if (P === 'month') {
    out.push(S(G.purple, `<div class="wr-kicker">YOUR MONTHLY WRAPPED</div><div class="wr-mega" style="font-size:58px">${esc(s.label.split(' ')[0])}</div><p class="wr-p">${esc(s.meName)} 💚 ${esc(s.themName)}<br>Let's see what this month looked like.</p>`, { confetti: 60 }));
  } else {
    out.push(S(G.peas, `<div class="wr-kicker">YOUR WEEK IN PEAS</div><div class="wr-big">🫛</div><h2 class="wr-h">${esc(s.label)}</h2><p class="wr-p">Here's what you two got up to.</p>`));
  }

  // Together
  if (big && s.together) out.push(S(G.berry, `<div class="wr-kicker">TOGETHER FOR</div><div class="wr-num">${n(s.together)}</div><h2 class="wr-h">days</h2><p class="wr-p">And this year you filled the app with ${s.total.toLocaleString()} little moments.</p>`));
  else if (big) out.push(S(G.berry, `<div class="wr-kicker">THIS YEAR YOU HAD</div><div class="wr-num">${n(s.total)}</div><h2 class="wr-h">little moments together</h2>`));

  const dayTotal = P === 'week' ? 7 : Math.min(s.totalDays, s.spanDays);
  out.push(S(G.blue, `<div class="wr-kicker">YOU BOTH SHOWED UP</div><div class="wr-num">${n(s.bothDays)}</div><h2 class="wr-h">of ${dayTotal} days</h2>
    <p class="wr-p">${s.bothDays >= dayTotal * 0.8 ? 'Basically every day. Inseparable. 🥹' : s.bothDays >= dayTotal * 0.5 ? 'Most days! Love that for you.' : 'Every day you show up counts 💚'}</p>
    ${P === 'week' ? '' : s.busiest ? `<p class="wr-small">Your busiest day was ${fmtDay(s.busiest.day)} with ${s.busiest.n} moments.</p>` : ''}`));

  if (big && s.topMonth) out.push(S(G.sunset, `<div class="wr-kicker">YOUR BIGGEST MONTH</div><div class="wr-mega" style="font-size:54px">${esc(s.topMonth)}</div><p class="wr-p">That's when you two were at it the most.</p>`));

  // Talking
  if (totalMsgs || s.wordCount) {
    const pages = Math.max(1, Math.round(s.wordCount / 275));
    out.push(S(G.pink, `<div class="wr-kicker">YOU SENT EACH OTHER</div><div class="wr-num">${n(totalMsgs)}</div><h2 class="wr-h">${plural(totalMsgs, 'message')}</h2>${splitBar(s.msgs[s.me], s.msgs[s.them])}
      ${s.voice ? `<p class="wr-small">🎙️ Including ${s.voice} voice ${plural(s.voice, 'note')}${s.chatPhotos ? ` and ${s.chatPhotos} ${plural(s.chatPhotos, 'photo')}` : ''}</p>` : ''}
      ${s.wordCount > 150 ? `<p class="wr-small">That's ${s.wordCount.toLocaleString()} words. About ${pages} ${plural(pages, 'page')} of a book about you two. 📖</p>` : ''}`));
  }

  // Sweet
  if (totalTaps || s.letters[s.me] + s.letters[s.them] || s.jar[s.me] + s.jar[s.them]) {
    out.push(S(G.berry, `<div class="wr-kicker">SWEET STUFF</div>
      <div class="wr-grid">
        <div><b class="cu" data-n="${totalTaps}">0</b><span>taps</span></div>
        <div><b class="cu" data-n="${s.hugs}">0</b><span>hugs 🤗</span></div>
        <div><b class="cu" data-n="${s.letters[s.me] + s.letters[s.them]}">0</b><span>letters ✉️</span></div>
        <div><b class="cu" data-n="${s.jar[s.me] + s.jar[s.them]}">0</b><span>in the love jar</span></div>
      </div>
      ${s.topTap ? `<p class="wr-p">Your most-sent tap: <b>${s.topTap.e} ${esc(s.topTap.l)}</b> (${s.topTap.n}×)</p>` : ''}
      ${totalTaps ? `<p class="wr-small">${s.taps[s.me] > s.taps[s.them] ? esc(s.meName) : s.taps[s.them] > s.taps[s.me] ? esc(s.themName) : 'You both'} sent the most love taps.</p>` : ''}`));
  }

  // Questions
  if (s.dqBoth) out.push(S(G.teal, `<div class="wr-kicker">YOU ANSWERED</div><div class="wr-num">${n(s.dqBoth)}</div><h2 class="wr-h">daily ${plural(s.dqBoth, 'question')} together</h2>${s.dqStreak > 1 ? `<p class="wr-p">Longest streak: 🔥 ${s.dqStreak} days in a row</p>` : ''}<p class="wr-small">You know each other a little better than you did.</p>`));

  // Games
  if (s.finished || s.games) {
    out.push(S(G.purple, `<div class="wr-kicker">GAME TIME</div><div class="wr-num">${n(s.finished)}</div><h2 class="wr-h">${plural(s.finished, 'game')} finished</h2>
      <div class="wr-vs"><div><b class="cu" data-n="${meW}">0</b><span>${esc(s.meName)}</span></div><em>vs</em><div><b class="cu" data-n="${themW}">0</b><span>${esc(s.themName)}</span></div></div>
      ${champ ? `<p class="wr-p">${big ? '👑 Champion of the year' : '👑 Bragging rights go to'}: <b>${esc(champ)}</b></p>` : '<p class="wr-p">Dead even. Rematch? 😤</p>'}
      ${s.wins.team ? `<p class="wr-small">🤝 Plus ${s.wins.team} Draw & Guess ${plural(s.wins.team, 'win')} as a team</p>` : ''}
      ${s.topGame ? `<p class="wr-small">Most played: ${s.topGame.e} ${esc(s.topGame.name)}</p>` : ''}`, { confetti: champ && big ? 60 : 0 }));
  }

  // Peadle
  if (s.pdlMe.played || s.pdlThem.played) {
    const pw = s.pdlWins;
    const pc = pw[s.me] > pw[s.them] ? s.meName : pw[s.them] > pw[s.me] ? s.themName : null;
    out.push(S(G.green, `<div class="wr-kicker">PEADLE</div><div class="wr-big">🟩🟨🟩</div>
      <div class="wr-vs"><div><b>${s.pdlMe.won}</b><span>${esc(s.meName)} solved</span></div><em>·</em><div><b>${s.pdlThem.won}</b><span>${esc(s.themName)} solved</span></div></div>
      <p class="wr-p">${pc ? `${esc(pc)} won more days (${Math.max(pw[s.me], pw[s.them])}–${Math.min(pw[s.me], pw[s.them])}) 🏆` : pw[s.me] + pw[s.them] ? 'Dead even on head-to-heads 🤝' : 'Play the same day to go head to head!'}</p>
      ${s.pdlMe.best || s.pdlThem.best ? `<p class="wr-small">Best solve: ${Math.min(...[s.pdlMe.best, s.pdlThem.best].filter(Boolean))} ${plural(Math.min(...[s.pdlMe.best, s.pdlThem.best].filter(Boolean)), 'guess', 'guesses')}</p>` : ''}`));
  }

  // Snaps & memories
  if (s.photos.length || s.snaps || s.memories) {
    out.push(S(G.sunset, `<div class="wr-kicker">${s.snaps ? `${s.snaps} ${plural(s.snaps, 'SNAP')} · ` : ''}${s.memories} ${plural(s.memories, 'MEMORY', 'MEMORIES')}</div>
      ${s.photos.length ? `<div class="wr-collage n${Math.min(9, s.photos.length)}">${s.photos.map((p) => photoImg(p)).join('')}</div>` : '<div class="wr-big">📸</div>'}
      <p class="wr-p">${s.bothSnapDays ? `You swapped snaps on ${s.bothSnapDays} ${plural(s.bothSnapDays, 'day')}.` : 'Little pieces of your days.'}</p>
      ${s.drawings ? `<p class="wr-small">🎨 And ${s.drawings} ${plural(s.drawings, 'drawing')} together</p>` : ''}`));
  }

  // Habits
  if (s.habitsMe + s.habitsThem) out.push(S(G.peas, `<div class="wr-kicker">HABITS CHECKED OFF</div><div class="wr-num">${n(s.habitsMe + s.habitsThem)}</div>${splitBar(s.habitsMe, s.habitsThem)}<p class="wr-p">${esc(petName)} noticed. And is very proud. 💪</p>`));

  // Matches
  if (s.matches || s.swipes[s.me] + s.swipes[s.them]) {
    out.push(S(G.pink, `<div class="wr-kicker">SWIPE & MATCH</div><div class="wr-num">${n(s.matches)}</div><h2 class="wr-h">${plural(s.matches, 'match', 'matches')}</h2>
      <p class="wr-p">Out of ${(s.swipes[s.me] + s.swipes[s.them]).toLocaleString()} swipes, these are the things you both said yes to.</p>
      ${s.plansDone || s.bucketDone ? `<p class="wr-small">📅 ${s.plansDone} ${plural(s.plansDone, 'date')} done${s.bucketDone ? ` · ✨ ${s.bucketDone} bucket list ${plural(s.bucketDone, 'item')}` : ''}</p>` : ''}`));
  } else if (s.plansDone || s.bucketDone) {
    out.push(S(G.pink, `<div class="wr-kicker">OUT AND ABOUT</div><div class="wr-num">${n(s.plansDone)}</div><h2 class="wr-h">${plural(s.plansDone, 'date')} done</h2>${s.bucketDone ? `<p class="wr-p">✨ Plus ${s.bucketDone} bucket list ${plural(s.bucketDone, 'item')}</p>` : ''}`));
  }

  // When you're around
  if (P !== 'week' && s.total > 8) {
    const owl = s.nightShare > 0.25; const bird = s.morningShare > 0.3;
    out.push(S(G.night, `<div class="wr-kicker">YOUR PEAK HOUR</div><div class="wr-mega" style="font-size:64px">${HOURS(s.topHour)}</div>
      <p class="wr-p">${owl ? 'Certified night owls 🦉. Go to sleep, you two.' : bird ? 'Early birds 🐦. Good morning texts are your thing.' : 'Right in the middle of the day ☀️'}</p>
      <p class="wr-small">And ${WEEKDAYS[s.topWeekday]} was your day.</p>`, { cls: 'dark' }));
  }

  // Moods
  if (s.moodMe || s.moodThem) out.push(S(G.blue, `<div class="wr-kicker">THE VIBE</div><div class="wr-vs"><div><b style="font-size:64px">${s.moodMe?.e || '🫛'}</b><span>${esc(s.meName)} felt ${esc((s.moodMe?.l || 'great').toLowerCase())}</span></div><div><b style="font-size:64px">${s.moodThem?.e || '🫛'}</b><span>${esc(s.themName)} felt ${esc((s.moodThem?.l || 'great').toLowerCase())}</span></div></div><p class="wr-small">Your most common check-ins</p>`));

  // Pet (month and year)
  if (P !== 'week' && s.pet) out.push(S(G.gold, `<div class="wr-kicker">${esc(petName.toUpperCase())}</div><div class="wr-big">🐾</div><h2 class="wr-h">Level ${s.level} · ${esc(s.stage)}</h2><p class="wr-p">Fed ${s.feeds} ${plural(s.feeds, 'time')}${s.visits ? ` and sent on ${s.visits} ${plural(s.visits, 'visit')}` : ''}.</p>`));

  // Archetype
  if (P !== 'week') {
    out.push(S(G.ink, `<div class="wr-kicker">THIS ${P === 'year' ? 'YEAR' : 'MONTH'}, YOU TWO WERE</div><div class="wr-reveal"><div class="wr-big">${arch.e}</div><div class="wr-mega" style="font-size:40px;line-height:1.05">${arch.name}</div></div><p class="wr-p">${arch.line}</p>`, { confetti: big ? 100 : 40, cls: 'dark' }));
  }

  // Outro
  const next = P === 'year' ? `Here's to ${Number(s.key) + 1} 🥂` : P === 'month' ? 'See you next month 💚' : 'See you next Monday 💚';
  out.push(S(big ? G.rainbow : G.peas, `<div class="wr-kicker">${P === 'week' ? 'THIS WEEK' : 'IN TOTAL'}</div><div class="wr-num">+${n(s.pts)}</div><h2 class="wr-h">love points</h2>
    <p class="wr-p">${next}</p>`, { confetti: big ? 200 : 50, dur: 15000, share: `Share ${P === 'week' ? 'this week' : P === 'month' ? 'this month' : 'our year'} 📤` }));
  return out;
}

// ---------- Player ----------
export function story({ p, k, peek }) {
  const s = compute(p, k);
  const slides = slidesFor(s);
  return {
    tabs: false,
    live: false,
    onChange: () => false,
    html: `<div class="wr-player" id="wr">
      <div class="wr-bars">${slides.map(() => '<i><b></b></i>').join('')}</div>
      <a class="wr-x" href="#/wrapped" aria-label="Close">✕</a>
      ${peek ? '<div class="wr-peek">Sneak peek · not final</div>' : ''}
      <div class="wr-stage"></div>
      <div class="wr-tapl"></div><div class="wr-tapr"></div>
      <div class="wr-share-wrap"><button class="wr-share" data-wr-share></button><a class="wr-done" href="#/wrapped">Done</a></div>
    </div>`,
    mount: (root) => {
      document.body.classList.add('wr-open');
      lsSet(seenKey(p, k), Date.now());
      const box = root.querySelector('#wr');
      const stage = box.querySelector('.wr-stage');
      const bars = [...box.querySelectorAll('.wr-bars b')];
      let i = 0; let t0 = 0; let paused = false; let pausedAt = 0; let raf = 0; let dead = false;
      const durOf = (j) => slides[j].dur || (p === 'year' ? 7000 : 6000);
      const show = (j) => {
        i = Math.max(0, Math.min(slides.length - 1, j));
        const sl = slides[i];
        box.style.background = sl.bg;
        box.classList.toggle('dark', sl.cls === 'dark');
        stage.innerHTML = `<div class="wr-slide">${sl.html}</div>`;
        hydratePhotos(stage);
        bars.forEach((b, x) => { b.style.width = x < i ? '100%' : '0%'; });
        if (sl.confetti) setTimeout(() => confetti(sl.confetti), 250);
        stage.querySelectorAll('.cu').forEach((el) => countUp(el));
        box.classList.toggle('last', !!sl.share);
        if (sl.share) box.querySelector('[data-wr-share]').textContent = sl.share;
        t0 = performance.now();
      };
      const tick = (now) => {
        if (dead) return;
        if (!paused) {
          const f = (now - t0) / durOf(i);
          bars[i].style.width = `${Math.min(1, f) * 100}%`;
          if (f >= 1) { if (i < slides.length - 1) show(i + 1); }
        }
        raf = requestAnimationFrame(tick);
      };
      const tapL = box.querySelector('.wr-tapl'); const tapR = box.querySelector('.wr-tapr');
      let downAt = 0;
      const down = () => { downAt = performance.now(); paused = true; pausedAt = performance.now(); };
      const up = (dir) => () => {
        const held = performance.now() - downAt;
        t0 += performance.now() - pausedAt;
        paused = false;
        if (held < 250) show(i + dir);
      };
      [[tapL, -1], [tapR, 1]].forEach(([el, dir]) => {
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up(dir));
        el.addEventListener('pointercancel', () => { paused = false; });
      });
      box.querySelector('[data-wr-share]').addEventListener('click', () => share(s));
      show(0);
      raf = requestAnimationFrame(tick);
      return () => { dead = true; cancelAnimationFrame(raf); document.body.classList.remove('wr-open'); };
    },
  };
}

function countUp(el) {
  const target = Number(el.dataset.n) || 0;
  const t0 = performance.now();
  const d = Math.min(1600, 500 + target * 8);
  const step = (now) => {
    const f = Math.min(1, (now - t0) / d);
    const e = 1 - (1 - f) ** 3;
    el.textContent = Math.round(target * e).toLocaleString();
    if (f < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// A shareable image of your Wrapped.
async function share(s) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1080, 1920);
  if (s.period === 'year') { g.addColorStop(0, '#f472b6'); g.addColorStop(0.35, '#a78bfa'); g.addColorStop(0.7, '#60a5fa'); g.addColorStop(1, '#34d399'); } else { g.addColorStop(0, '#3f8a2f'); g.addColorStop(1, '#a3e08f'); }
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
  x.fillStyle = '#fff'; x.textAlign = 'center';
  const f = (w, sz) => `${w} ${sz}px ui-rounded, -apple-system, system-ui, sans-serif`;
  x.font = f(800, 46); x.fillText('TWO PEAS WRAPPED', 540, 190);
  x.font = f(900, s.period === 'year' ? 230 : 110); x.fillText(s.period === 'year' ? s.key : s.label, 540, s.period === 'year' ? 430 : 370);
  x.font = f(700, 54); x.fillText(`${s.meName} 💚 ${s.themName}`, 540, 540);
  const stats = [
    ['days together in the app', s.bothDays],
    ['messages', s.msgs[s.me] + s.msgs[s.them]],
    ['love taps', s.taps[s.me] + s.taps[s.them]],
    ['games finished', s.finished],
    ['questions answered together', s.dqBoth],
    ['matches', s.matches],
    ['habits checked off', s.habitsMe + s.habitsThem],
    ['love points', s.pts],
  ].filter(([, v]) => v > 0).slice(0, 6);
  stats.forEach(([l, v], j) => {
    const yy = 720 + j * 170;
    x.font = f(900, 96); x.fillText(Number(v).toLocaleString(), 540, yy);
    x.font = f(700, 40); x.fillText(l, 540, yy + 52);
  });
  const a = ARCHETYPES[s.archetype];
  x.font = f(900, 64); x.fillText(`${a.e} ${a.name}`, 540, 1800);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], `two-peas-wrapped-${s.key}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Two Peas Wrapped' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file); link.download = file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

export { monthName };
