import { store } from '../store.js';
import { TAPS, MOODS, DECKS, PET_LINES } from '../content.js';
import { roomWithPet, logoSVG } from '../pet.js';
import {
  totals, stageOf, STAGE_NAMES, petState, petMoodText, daysTogether, countdowns, ensureDailyQuestion, dqStatus,
  dqId, dqaId, award, awardCapped, dqStreak, checkinStreak, myTurnGames, GAME_NAMES, GAME_EMOJI, weeklyChallenge, today,
} from '../logic.js';
import { header, meName, themName, nameOf, photoImg, empty, presencePill } from '../ui.js';
import { snapStatus } from './snap.js';
import { petSVG } from '../pet.js';
import { esc, timeAgo, fmtDay, sheet, toast, confetti, floatHearts, pick, lsGet, lsSet, isStandalone, dayKey } from '../util.js';
import { CONFIG } from '../config.js';
import { enablePush } from '../push.js';
import { feedRow, feedPet, petTap, afterFeed, playToy, sendVisit, openVisit } from '../feed.js';
import { snacks } from '../logic.js';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// The pet notices things and nudges you toward each other.
function petSays(st) {
  const them = themName();
  const m = store.all('mood', (x) => x.by === store.partnerId).pop();
  if (m && Date.now() - m.at < 12 * 36e5 && ['sad', 'stressed', 'tired'].includes(m.data.mood)) {
    const replied = store.all('tap', (t) => t.by === store.me && t.at > m.at).length || store.all('note', (n) => n.by === store.me && n.at > m.at).length;
    if (!replied) return { t: `${them} is feeling ${m.data.mood} today. Send a hug?`, btn: 'Send hug 🤗', act: 'tap', arg: 'hug' };
  }
  if (st.asleep) return { t: 'Zzz… see you both in the morning.' };
  if (store.presence.online) return { t: `Yay, you're both here! 💚 ${them} is on right now.`, btn: 'Send a hug', act: 'tap', arg: 'hug' };
  if (st.mood === 'sad') return { t: 'I missed you two! Do one little thing together?', btn: 'Daily question', href: '#/dq' };
  const s = dqStatus();
  if (s.q && !s.mine) return { t: s.theirs ? `${them} already answered today's question. Your turn!` : "Today's question is waiting for you!", btn: 'Answer', href: '#/dq' };
  const n = snacks();
  if (n > 0 && st.full < 1) return { t: `I'm hungry! You've got ${n} snack${n === 1 ? '' : 's'} for me.`, btn: 'Feed me', act: 'feed' };
  const g = myTurnGames()[0];
  if (g) return { t: `It's your turn in ${GAME_NAMES[g.data.type]}!`, btn: 'Play', href: `#/game/${g.id}` };
  const lastMem = store.all('memory').pop();
  const lastAppr = store.all('appr', (a) => a.by === store.me).pop();
  const idle = [
    !lastAppr || Date.now() - lastAppr.at > 20 * 36e5 ? { t: `What's one thing ${them} did lately that you loved? Put it in the love jar.`, btn: 'Love jar', href: '#/lovejar' } : null,
    !lastMem || Date.now() - lastMem.at > 10 * 864e5 ? { t: 'We should save a new memory soon. Got a photo?', btn: 'Memories', href: '#/memories' } : null,
    { t: `Leave ${them} a little note? I'll deliver it.`, btn: 'Write', href: '#/notes' },
    { t: `Bet you can't beat ${them} at Word Hunt.`, btn: 'Play', href: '#/play' },
  ].filter(Boolean);
  return idle[Math.floor(Date.now() / (4 * 36e5)) % idle.length];
}

function petCard() {
  const c = store.couple;
  const t = totals();
  const st = petState();
  const stage = stageOf(t.level);
  const pet = c.pet || { species: 'raccoon', name: 'Pip' };
  const say = petSays(st);
  return `<div class="card pet-card">
    <div class="room-wrap pet-bob" data-act="petPet">
      ${roomWithPet(c.room, { species: pet.species, mood: store.presence.online && !st.asleep ? 'love' : st.face, stage, outfit: c.outfit || {} }, st.night)}
      <div class="bubble" id="petBubble"></div>
    </div>
    <div class="pet-info">
      <div class="row between">
        <div><h2 style="margin:0">${esc(pet.name)}</h2><div class="small muted bold">${petMoodText(esc(pet.name), st.mood, st.asleep)}</div></div>
        <span class="pill gold">Lv ${t.level} · ${STAGE_NAMES[stage]}</span>
      </div>
      <div class="level-bar"><i style="width:${Math.round(t.progress * 100)}%"></i></div>
      ${say ? `<div class="says"><div class="grow">${say.t}</div>${say.btn ? (say.href ? `<a class="btn small" href="${say.href}">${say.btn}</a>` : `<button class="btn small" data-act="${say.act}" data-t="${say.arg || ''}">${say.btn}</button>`) : ''}</div>` : ''}
      <div class="meters">
        <div class="meter">Fullness<div class="bar"><i style="width:${Math.round(st.full * 100)}%"></i></div></div>
        <div class="meter love">Love<div class="bar"><i style="width:${Math.round(st.love * 100)}%"></i></div></div>
      </div>
      ${feedRow()}
      <div class="pet-btns"><button class="btn small ghost" data-act="toy">🎾 Play</button><button class="btn small ghost" data-act="visit">💌 Send ${esc(pet.name)} to ${themName()}</button></div>
    </div>
  </div>`;
}

function waitingCard() {
  if (store.mode !== 'live' || store.partnerId) return '';
  return `<div class="card">
    <h2>Invite your person 💌</h2>
    <p class="muted small">Have her open Two Peas, make an account, tap "join", and enter this code:</p>
    <div class="sp"></div>
    <div class="code-big">${esc(store.pairCode || '')}</div>
    <div class="sp"></div>
    <button class="btn block" data-act="shareCode">Send the code</button>
  </div>`;
}

function pushCard() {
  if (store.mode !== 'live' || !CONFIG.VAPID_PUBLIC_KEY) return '';
  if (!isStandalone()) {
    return `<div class="card flat small"><b>Add Two Peas to your Home Screen</b><br><span class="muted">In Safari tap Share, then "Add to Home Screen". Notifications only work from the Home Screen app.</span></div>`;
  }
  if (!('Notification' in window) || Notification.permission !== 'default') return '';
  return `<div class="card"><div class="row gap"><div class="grow"><b>Turn on notifications</b><div class="small muted">So you know when ${themName()} sends you something.</div></div><button class="btn small" data-act="push">Turn on</button></div></div>`;
}

function gotTap() {
  const dismissed = lsGet('twopeas-tap-seen', '');
  const taps = store.all('tap', (t) => t.data.to === store.me && Date.now() - t.at < 6 * 36e5);
  const last = taps[taps.length - 1];
  if (!last || last.id === dismissed) return '';
  const tap = TAPS.find((x) => x.id === last.data.type) || TAPS[0];
  return `<div class="got-tap" data-id="${last.id}">
    <div class="e">${tap.e}</div>
    <div class="grow"><b>${nameOf(last.by)} ${esc(tap.push.replace(/ \S+$/, ''))}</b><div class="small muted">${timeAgo(last.at)}</div></div>
    <button class="btn small pink" data-act="tapBack" data-id="${last.id}" data-t="${tap.id === 'hug' ? 'hug' : 'think'}">${tap.id === 'hug' ? 'Hug back' : 'Send one back'}</button>
  </div>`;
}

function daysCard() {
  const n = daysTogether();
  const cds = countdowns();
  const next = cds[0];
  if (!n && !next) return '';
  return `<a class="card days" href="#/countdowns" style="text-decoration:none;color:inherit">
    ${n ? `<div><div class="big">${n.toLocaleString()}</div><div class="small bold muted">days together</div></div>` : ''}
    <div class="grow" style="${n ? 'border-left:2px solid var(--line);padding-left:14px' : ''}">
      ${next ? `<div class="small muted bold">Next up</div><b>${next.emoji} ${esc(next.title)}</b><div class="small muted">${next.days === 0 ? 'Today!' : next.days === 1 ? 'Tomorrow' : `in ${next.days} days`}</div>`
    : '<div class="small muted bold">No countdowns yet</div><b>Add your next date or trip</b>'}
    </div>
    <span class="chev">›</span>
  </a>`;
}

function moodsCard() {
  const latest = (who) => { const m = store.all('mood', (x) => x.by === who); return m[m.length - 1]; };
  const box = (who, cls, name) => {
    const m = latest(who);
    const mood = m && MOODS.find((x) => x.id === m.data.mood);
    const fresh = m && Date.now() - m.at < 36 * 36e5;
    return `<div class="mood-box ${cls}">
      <div class="who">${name}</div>
      ${mood && fresh ? `<div class="e">${mood.e}</div><div class="small bold">${mood.l}${m.data.text ? ` · <span class="muted">${esc(m.data.text)}</span>` : ''}</div><div class="tiny muted">${timeAgo(m.at)}</div>`
    : `<div class="small muted bold" style="margin-top:8px">${cls === 'me' ? 'How are you feeling?' : 'No check-in yet today'}</div>`}
    </div>`;
  };
  return `<div class="card">
    <div class="card-head"><h2>Moods</h2><button class="btn small" data-act="checkin">Check in</button></div>
    <div class="moods">${box(store.me, 'me', meName())}${box(store.partnerId, 'them', themName())}</div>
  </div>`;
}

function tapsCard() {
  return `<div class="card">
    <h2>Send a little something</h2>
    <div class="taps">${TAPS.map((t) => `<button class="tap" data-act="tap" data-t="${t.id}"><span class="e">${t.e}</span>${t.l}</button>`).join('')}</div>
  </div>`;
}

let todayOpen = false;
function todayCard() {
  const rows = [];
  const s = dqStatus();
  const sn = snapStatus();
  const snapText = !sn.mine ? (sn.theirs ? `${themName()} sent theirs. Send yours to see it!` : 'Send one photo today') : !sn.theirs ? `Waiting for ${themName()}'s snap…` : 'Both in! Tap to see 📸';
  rows.push({ p: !sn.mine ? (sn.theirs ? 1 : 3) : sn.theirs ? 8 : 9, h: `<a class="todo" href="#/snap"><div class="ic">📷</div><div class="tx"><b>Daily snap</b><span>${snapText}</span></div>${!sn.mine ? '<span class="dot"></span>' : ''}<span class="chev">›</span></a>` });
  const dqText = !s.q ? 'Loading today\'s question…'
    : !s.mine ? (s.theirs ? `${themName()} answered. Your turn!` : 'Answer to unlock each other\'s answers')
      : !s.theirs ? `Waiting for ${themName()}…` : 'Both answered. See what you said!';
  rows.push({ p: !s.mine ? (s.theirs ? 1 : 2) : s.theirs ? 7 : 9, h: `<a class="todo" href="#/dq"><div class="ic">💭</div><div class="tx"><b>Daily question</b><span>${dqText}</span></div>${!s.mine && s.q ? '<span class="dot"></span>' : ''}<span class="chev">›</span></a>` });
  for (const g of myTurnGames().slice(0, 3)) {
    rows.push({ p: 2, h: `<a class="todo" href="#/game/${g.id}"><div class="ic">${GAME_EMOJI[g.data.type]}</div><div class="tx"><b>Your turn</b><span>${GAME_NAMES[g.data.type]} with ${themName()}</span></div><span class="dot"></span><span class="chev">›</span></a>` });
  }
  const unread = store.all('note', (n) => n.data.to === store.me && !n.data.readAt);
  if (unread.length) {
    const l = unread[unread.length - 1].data;
    rows.push({ p: 0, h: `<a class="todo" href="#/notes"><div class="ic">💌</div><div class="tx"><b>${unread.length} new message${unread.length > 1 ? 's' : ''}</b><span>${l.audio ? '🎙️ Voice note' : l.photo && !l.text ? '📷 Photo' : esc(l.text)}</span></div><span class="dot"></span><span class="chev">›</span></a>` });
  }
  const t = today();
  const letters = store.all('letter', (l) => l.data.to === store.me && !l.data.openedAt);
  const ready = letters.filter((l) => !l.data.unlock || l.data.unlock <= t);
  if (ready.length) rows.push({ p: 1, h: `<a class="todo" href="#/letters"><div class="ic">✉️</div><div class="tx"><b>${ready.length} sealed letter${ready.length > 1 ? 's' : ''}</b><span>${esc(ready[0].data.label)}</span></div><span class="chev">›</span></a>` });
  const ch = weeklyChallenge();
  rows.push({ p: ch.both ? 10 : ch.doneThem && !ch.doneMe ? 3 : 6, h: `<a class="todo" href="#/challenge"><div class="ic">🏆</div><div class="tx"><b>This week's challenge</b><span>${ch.both ? 'Done together! 🎉' : esc(ch.text)}</span></div><span class="chev">›</span></a>` });
  const md = t.slice(5);
  const otd = store.all('memory', (m) => m.data.date && m.data.date.slice(5) === md && m.data.date.slice(0, 4) < t.slice(0, 4));
  if (otd.length) {
    const m = otd[0];
    const yrs = Number(t.slice(0, 4)) - Number(m.data.date.slice(0, 4));
    rows.push({ p: 4, h: `<a class="todo" href="#/memories"><div class="ic">📸</div><div class="tx"><b>On this day, ${yrs} year${yrs > 1 ? 's' : ''} ago</b><span>${esc(m.data.caption || 'A memory')}</span></div><span class="chev">›</span></a>` });
  }
  rows.sort((a, b) => a.p - b.p);
  const shown = todayOpen ? rows : rows.slice(0, 3);
  const streak = Math.max(dqStreak(), checkinStreak());
  return `<div class="card">
    <div class="card-head"><h2>Today</h2>${streak ? `<span class="pill gold">🔥 ${streak} day streak</span>` : ''}</div>
    ${shown.map((r) => r.h).join('')}
    ${rows.length > 3 ? `<button class="more-btn" data-act="todayMore">${todayOpen ? 'Show less' : `Show ${rows.length - 3} more`}</button>` : ''}
  </div>`;
}

// Moods and days together in one small card.
function usCard() {
  const latest = (who) => { const m = store.all('mood', (x) => x.by === who); return m[m.length - 1]; };
  const chip = (who, cls, name) => {
    const m = latest(who);
    const mood = m && MOODS.find((x) => x.id === m.data.mood);
    const fresh = m && Date.now() - m.at < 36 * 36e5;
    return `<div class="mood-chip ${cls}"><span class="e" style="${mood && fresh ? '' : 'opacity:.35'}">${mood && fresh ? mood.e : '😶'}</span><div class="grow"><b>${name}</b><span>${mood && fresh ? `${mood.l}${m.data.text ? ` · ${esc(m.data.text)}` : ''}` : 'No check-in yet'}</span></div></div>`;
  };
  const n = daysTogether();
  const next = countdowns()[0];
  return `<div class="card">
    <div class="card-head"><h2>How you're doing</h2><button class="btn small" data-act="checkin">Check in</button></div>
    ${chip(store.me, 'me', meName())}${chip(store.partnerId, 'them', themName())}
    ${n || next ? `<a class="days-line" href="#/countdowns">${n ? `<b>${n.toLocaleString()}</b> days together` : ''}${n && next ? ' · ' : ''}${next ? `${next.emoji} ${esc(next.title)} ${next.days === 0 ? 'today!' : `in ${next.days}d`}` : ''}<span class="chev">›</span></a>` : ''}
  </div>`;
}

function visitCard() {
  const v = store.all('visit', (x) => x.data.to === store.me && !x.data.readAt).pop();
  if (!v) return '';
  const pet = store.couple.pet || { species: 'raccoon', name: 'Your pet' };
  return `<div class="card visit-card" data-act="openVisit" data-id="${v.id}">
    <div class="visit-pet">${petSVG({ species: pet.species, mood: 'love', outfit: store.couple.outfit || {} })}<span class="visit-env">💌</span></div>
    <div class="grow"><b>${esc(pet.name)} came to visit!</b><div class="small muted">With a message from ${nameOf(v.by)}</div></div>
    <button class="btn small pink">Read</button>
  </div>`;
}

export function home() {
  ensureDailyQuestion().catch(() => {});
  return {
    html: `${header(`<span class="row gap">${logoSVG(34)}Two Peas</span>`, { sub: `${greeting()}, ${meName()} ${presencePill()}`, right: '<a class="icon-btn" href="#/settings" aria-label="Settings">⚙️</a>' })}
      ${waitingCard()}
      ${visitCard()}
      ${gotTap()}
      ${petCard()}
      ${pushCard()}
      ${todayCard()}
      ${tapsCard()}
      ${usCard()}`,
    mount: (root) => {
      afterFeed(root);
      const card = root.querySelector('.got-tap');
      if (card && lsGet('twopeas-tap-burst') !== card.dataset.id) {
        lsSet('twopeas-tap-burst', card.dataset.id);
        const r = card.getBoundingClientRect();
        setTimeout(() => floatHearts(r.left + r.width / 2, r.top + 20, 8), 300);
      }
    },
    actions: {
      petPet: (d, el, e) => {
        petTap(el, e);
        const mine = store.all('pet', (p) => p.by === store.me);
        const last = mine[mine.length - 1];
        if (!last || Date.now() - last.at > 10 * 60e3) setTimeout(() => store.add('pet', {}), 2400);
      },
      feed: (d, el) => feedPet(el),
      toy: (d, el) => playToy(el),
      visit: () => sendVisit(),
      openVisit: (d) => openVisit(store.get(d.id)),
      todayMore: () => { todayOpen = !todayOpen; return true; },
      tap: (d, el) => sendTap(d.t, el),
      tapBack: (d, el) => { lsSet('twopeas-tap-seen', d.id); sendTap(d.t, el); return true; },
      checkin: () => moodSheet(),
      shareCode: async () => {
        const text = `Join me on Two Peas 🌱 Open ${location.origin}${location.pathname}, make an account, tap Join, and enter ${store.pairCode}`;
        try { await navigator.share({ text }); } catch { await navigator.clipboard?.writeText(text); toast('Copied the invite!'); }
      },
      push: async () => { await enablePush(); return true; },
    },
  };
}

// Taps are sweet, not spam: the same one once every 3 minutes, any tap every 20 seconds.
const TAP_SAME = 3 * 60e3;
const TAP_ANY = 20e3;
export async function sendTap(type, el) {
  const tap = TAPS.find((t) => t.id === type);
  if (!tap) return;
  const mine = store.all('tap', (t) => t.by === store.me);
  const last = mine[mine.length - 1];
  const lastSame = mine.filter((t) => t.data.type === type).pop();
  if (lastSame && Date.now() - lastSame.at < TAP_SAME) {
    const m = Math.ceil((TAP_SAME - (Date.now() - lastSame.at)) / 60e3);
    toast(`${tap.e} Already sent! ${themName()} got it 💚 You can send another in ${m} min`);
    return;
  }
  if (last && Date.now() - last.at < TAP_ANY) { toast(`Easy, tiger 😄 ${themName()} just got one from you`); return; }
  const r = el?.getBoundingClientRect?.();
  if (r) floatHearts(r.left + r.width / 2, r.top, 5);
  await store.add('tap', { type, to: store.partnerId });
  awardCapped(5, 'tap');
  store.notify('tap', `${store.mine.name || 'Your person'} ${tap.push}`, '', '#/home');
  toast(`Sent ${tap.e} to ${themName()}`);
}

function moodSheet() {
  let chosen = null;
  sheet({
    title: 'How are you feeling?',
    body: `<div class="grid3">${MOODS.map((m) => `<button class="tap" style="width:auto" data-m="${m.id}"><span class="e">${m.e}</span>${m.l}</button>`).join('')}</div>
      <label class="field">Anything to add? (optional)</label>
      <input type="text" maxlength="80" placeholder="Long day, but thinking of you" data-mtext>
      <div class="sp"></div>
      <button class="btn block" data-save disabled>Share with ${themName()}</button>`,
    onMount: (el, close) => {
      el.querySelectorAll('[data-m]').forEach((b) => {
        b.onclick = () => {
          chosen = b.dataset.m;
          el.querySelectorAll('[data-m]').forEach((x) => { x.style.boxShadow = x === b ? '0 0 0 3px var(--me)' : ''; });
          el.querySelector('[data-save]').disabled = false;
        };
      });
      el.querySelector('[data-save]').onclick = async () => {
        const m = MOODS.find((x) => x.id === chosen);
        const text = el.querySelector('[data-mtext]').value.trim();
        close();
        await store.add('mood', { mood: chosen, text });
        awardCapped(5, 'mood');
        store.notify('mood', `${store.mine.name || 'Your person'} is feeling ${m.l.toLowerCase()} ${m.e}`, text, '#/home');
      };
    },
  });
}

// ---------------- Daily question ----------------
export function dq() {
  const d = today();
  const s = dqStatus(d);
  if (!s.q) ensureDailyQuestion().catch(() => {});
  const deck = s.q && (DECKS[s.q.data.deck] || { name: 'Your question', emoji: '✍️' });
  const reactions = ['❤️', '😂', '🥹', '🔥'];
  const seenKey = 'twopeas-revealed';
  const firstReveal = s.both && !(lsGet(seenKey, []) || []).includes(d);
  if (firstReveal) { lsSet(seenKey, [...(lsGet(seenKey, []) || []), d].slice(-60)); setTimeout(() => confetti(), 150); }
  let body = '';
  if (!s.q) body = empty('💭', 'Picking today\'s question…');
  else {
    const ans = (it, cls, name) => {
      const react = cls === 'me' ? s.theirs?.data.react : s.mine?.data.react;
      return `<div class="answer ${cls} ${firstReveal ? 'reveal-anim' : ''}">
      <div class="who"><span>${name}</span>${react && s.both ? `<span>${esc(react)}</span>` : ''}</div>
      <p>${esc(it.data.text)}</p></div>`;
    };
    body = `<div class="card q-card">
      <div class="row between"><span class="pill">${deck.emoji} ${deck.name}${s.q.data.deck === 'custom' ? ` by ${nameOf(s.q.data.by)}` : ''}</span><span class="small muted bold">${fmtDay(d)}</span></div>
      <div class="q-text">${esc(s.q.data.text)}</div>
      ${!s.mine ? `
        <textarea data-input="dqAnswer" placeholder="Type your answer…" maxlength="1000"></textarea>
        <div class="sp"></div>
        <button class="btn block" data-act="answer">Lock in my answer</button>
        <p class="small muted center" style="margin-top:10px">${s.theirs ? `✅ ${themName()} already answered. Answer to see it!` : `🔒 ${themName()} can't see your answer until they answer too.`}</p>`
    : `${ans(s.mine, 'me', `${meName()} (you)`)}
        ${s.theirs ? `${ans(s.theirs, 'them', themName())}
          <div class="reacts">${reactions.map((r) => `<button data-act="react" data-r="${r}" class="${s.mine.data.react === r ? 'on' : ''}">${r}</button>`).join('')}</div>
          ${s.theirs.data.react ? `<p class="small muted" style="margin-top:8px">${themName()} reacted ${esc(s.theirs.data.react)} to your answer</p>` : ''}`
    : `<div class="locked">🔒 <span>Waiting for ${themName()}. You'll both see each other's answers once they answer.</span></div>
          <div class="sp"></div><button class="btn ghost block" data-act="nudge">Nudge ${themName()}</button>`}`}
    </div>`;
  }
  const streak = dqStreak();
  return {
    html: `${header('Daily question', { back: '#/home', right: '<a class="link" href="#/dq/history">History</a>' })}
      ${body}
      ${streak ? `<div class="card flat center"><b>🔥 ${streak} day${streak > 1 ? 's' : ''} in a row</b><div class="small muted">answering together</div></div>` : ''}
      <button class="btn ghost block" data-act="addQ">✍️ Add your own question</button>`,
    actions: {
      answer: async (dd, el) => {
        const ta = document.querySelector('[data-input="dqAnswer"]');
        const text = ta.value.trim();
        if (!text) { toast('Write something first 😊'); return; }
        ta.value = '';
        await store.add('dqa', { text, date: d }, { id: dqaId(d, store.me) });
        const other = store.get(dqaId(d, store.partnerId));
        if (other) {
          await award(20, 'dq', `dq-${d}`);
          store.notify('dq', `${store.mine.name} answered too 💭`, 'Open Two Peas to see each other\'s answers', '#/dq');
        } else {
          store.notify('dq', `${store.mine.name} answered today's question`, 'Your turn! Their answer unlocks when you answer.', '#/dq');
        }
        return true;
      },
      react: async (dd) => {
        const mine = store.get(dqaId(d, store.me));
        await store.update(mine.id, { react: mine.data.react === dd.r ? null : dd.r });
      },
      nudge: () => {
        const k = `twopeas-nudge-${d}`;
        if (lsGet(k)) { toast('Already nudged today 😉'); return; }
        lsSet(k, 1);
        store.notify('dq', `${store.mine.name} is waiting for your answer 👀`, s.q.data.text, '#/dq');
        toast(`Nudged ${themName()}`);
      },
      addQ: () => addQuestionSheet(),
    },
  };
}

function addQuestionSheet() {
  sheet({
    title: 'Add your own question',
    body: `<p class="small muted center">It'll be asked to both of you on a future day.</p><div class="sp"></div>
      <textarea data-q maxlength="200" placeholder="What's your favorite thing about…"></textarea><div class="sp"></div>
      <button class="btn block" data-save>Add question</button>`,
    onMount: (el, close) => {
      el.querySelector('[data-save]').onclick = async () => {
        const text = el.querySelector('[data-q]').value.trim();
        if (!text) return;
        close();
        await store.add('customq', { text });
        toast('Added! It\'ll show up soon 💭');
      };
    },
  });
}

export function dqHistory() {
  const days = store.all('dq').reverse();
  const queued = store.all('customq').filter((c) => !store.all('dq').some((q) => q.data.qid === c.id));
  const rows = days.map((q) => {
    const d = q.data.date;
    const a = store.get(dqaId(d, store.me));
    const b = store.get(dqaId(d, store.partnerId));
    return `<div class="card">
      <div class="small muted bold">${fmtDay(d)}${d === today() ? ' · today' : ''}</div>
      <h3 style="margin:6px 0 4px">${esc(q.data.text)}</h3>
      ${a ? `<div class="answer me"><div class="who">${meName()}</div><p>${esc(a.data.text)}</p></div>` : '<div class="small muted">You didn\'t answer</div>'}
      ${b && a ? `<div class="answer them"><div class="who">${themName()}</div><p>${esc(b.data.text)}</p></div>` : b ? `<div class="locked small">🔒 ${themName()} answered. Answer to see it.</div>` : `<div class="small muted" style="margin-top:6px">${themName()} didn't answer</div>`}
    </div>`;
  });
  return {
    html: `${header('Question history', { back: '#/dq' })}
      ${queued.length ? `<div class="card flat small"><b>${queued.length} of your own question${queued.length > 1 ? 's' : ''}</b> waiting to be asked</div>` : ''}
      ${rows.join('') || empty('💭', 'Your answers will collect here.')}`,
  };
}
