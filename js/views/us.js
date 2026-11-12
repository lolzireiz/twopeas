import { store } from '../store.js';
import { DATE_IDEAS, DATE_CATS } from '../content.js';
import {
  countdowns as upcoming, daysTogether, weeklyChallenge, award, totals, dqStreak, checkinStreak, scoreboard, today,
} from '../logic.js';
import { header, meName, themName, nameOf, photoImg, empty, whoClass } from '../ui.js';
import { bus } from '../bus.js';
import { STICKERS, earned } from '../stickers.js';
import { dqaId } from '../logic.js';
import {
  esc, dayKey, fmtDay, fmtTime, sheet, toast, confetti, compressImage, timeAgo, monthName, parseDay, pick, confirmSheet, weekKey, addDays,
} from '../util.js';

const myName = () => store.mine.name || 'Your person';

// ---------------- Hub ----------------
export function hub() {
  const mems = store.all('memory');
  const cds = upcoming();
  const ch = weeklyChallenge();
  const bucket = store.all('bucket');
  const t = totals();
  const n = daysTogether();
  const sb = scoreboard();
  const answered = store.all('dqa', (a) => a.by === store.me).length;
  const jarN = store.all('appr', (a) => a.data.to === store.me).length;
  const since = parseDay(weekKey()).getTime();
  const inWk = (kind, f) => store.all(kind, (i) => i.at >= since && (!f || f(i))).length;
  const wk = {
    q: store.all('dq', (q) => q.at >= since && store.get(dqaId(q.data.date, store.me)) && store.get(dqaId(q.data.date, store.partnerId))).length,
    games: store.all('game', (g) => (g.upd || g.at) >= since && (g.data.winner || g.data.done)).length,
    sweet: inWk('note') + inWk('tap') + inWk('appr') + inWk('letter'),
    mems: inWk('memory'),
    pts: store.all('pts', (p) => p.at >= since).reduce((a, p) => a + (p.data.n || 0), 0),
  };
  const prev = store.all('pts', (p) => p.at >= since - 7 * 864e5 && p.at < since).reduce((a, p) => a + (p.data.n || 0), 0);
  wk.line = prev && wk.pts > prev ? `Already ahead of last week (${prev} points). Look at you two.` : prev ? `Last week you earned ${prev} points. ${prev - wk.pts} to beat it.` : '';
  return {
    html: `${header('Us')}
      <div class="tiles">
        <a class="tile" href="#/memories"><span class="e">📸</span><b>Memories</b><span>${mems.length ? `${mems.length} saved` : 'Start your timeline'}</span></a>
        <a class="tile" href="#/countdowns"><span class="e">⏳</span><b>Countdowns</b><span>${cds[0] ? `${esc(cds[0].title)} in ${cds[0].days}d` : 'Add your next big day'}</span></a>
        <a class="tile" href="#/dates"><span class="e">🎡</span><b>Dates</b><span>${bucket.filter((b) => !b.data.done).length} on the bucket list</span></a>
        <a class="tile" href="#/lists"><span class="e">📝</span><b>Lists</b><span>Watch, eat, gift ideas</span></a>
        <a class="tile" href="#/lovejar"><span class="e">🫙</span><b>Love jar</b><span>${jarN ? `${jarN} thing${jarN === 1 ? '' : 's'} ${themName()} loves about you` : 'Little things you love about each other'}</span></a>
        <a class="tile" href="#/stickers"><span class="e">🌟</span><b>Sticker book</b><span>${earned().size} of ${STICKERS.length} collected</span></a>
        <a class="tile wide" href="#/challenge"><div class="row gap"><span class="e">🏆</span><div class="grow"><b>This week's challenge</b><br><span>${esc(ch.text)}</span></div><span class="pill ${ch.both ? 'gold' : ''}">${ch.both ? 'Done!' : `${(ch.doneMe ? 1 : 0) + (ch.doneThem ? 1 : 0)}/2`}</span></div></a>
      </div>
      <div class="section-title">This week together</div>
      <div class="card"><div class="week-chips">
        <span class="chip">💭 ${wk.q} question${wk.q === 1 ? '' : 's'}</span><span class="chip">🎲 ${wk.games} game${wk.games === 1 ? '' : 's'}</span>
        <span class="chip">💌 ${wk.sweet} sweet thing${wk.sweet === 1 ? "" : "s"}</span><span class="chip">📸 ${wk.mems} memor${wk.mems === 1 ? 'y' : 'ies'}</span><span class="chip">🪙 ${wk.pts} points</span>
      </div>${wk.line ? `<p class="small muted" style="margin-top:10px">${wk.line}</p>` : ''}</div>
      <div class="section-title">Your stats</div>
      <div class="card">
        <div class="grid2">
          <div><div class="bold" style="font-size:26px">${n ? n.toLocaleString() : '—'}</div><div class="small muted bold">days together</div></div>
          <div><div class="bold" style="font-size:26px">${t.earned.toLocaleString()}</div><div class="small muted bold">love points earned</div></div>
          <div><div class="bold" style="font-size:26px">🔥 ${dqStreak()}</div><div class="small muted bold">question streak</div></div>
          <div><div class="bold" style="font-size:26px">✅ ${checkinStreak()}</div><div class="small muted bold">days in a row together</div></div>
          <div><div class="bold" style="font-size:26px">${answered}</div><div class="small muted bold">questions answered</div></div>
          <div><div class="bold" style="font-size:26px">${sb.played}</div><div class="small muted bold">games finished</div></div>
        </div>
      </div>`,
  };
}

// ---------------- Memories ----------------
export function memories() {
  const mems = store.all('memory').sort((a, b) => (b.data.date || '').localeCompare(a.data.date || '') || b.at - a.at);
  let html = '';
  let lastMonth = '';
  for (const m of mems) {
    const d = m.data.date ? parseDay(m.data.date) : new Date(m.at);
    const key = `${monthName(d.getMonth())} ${d.getFullYear()}`;
    if (key !== lastMonth) { html += `<div class="mem-month">${key}</div>`; lastMonth = key; }
    html += `<div class="mem ${m.data.milestone ? 'milestone' : ''}" data-act="openMem" data-id="${m.id}">
      ${photoImg(m.data.photo, '', m.data.caption)}
      <div class="mem-body">
        ${m.data.milestone ? '<span class="pill gold">⭐ Milestone</span><div class="sp" style="height:6px"></div>' : ''}
        <div class="cap">${esc(m.data.caption || '')}</div>
        <div class="small muted bold" style="margin-top:4px">${fmtDay(m.data.date, { year: true })}${m.data.place ? ` · 📍 ${esc(m.data.place)}` : ''} · <span class="pill ${whoClass(m.by)}">${nameOf(m.by)}</span></div>
      </div>
    </div>`;
  }
  return {
    html: `${header('Memories', { back: '#/us', right: '<button class="btn small" data-act="add">+ Add</button>' })}
      ${html || `<div class="card">${empty('📸', 'Your first memory goes here. A photo, a date, a line about it.')}<button class="btn block" data-act="add">Add a memory</button></div>`}`,
    actions: {
      add: () => memorySheet(),
      openMem: (d) => memoryDetail(store.get(d.id)),
    },
  };
}

export function memorySheet(prefill = {}) {
  let file = null;
  sheet({
    title: 'New memory',
    tall: true,
    body: `<label class="photo-pick" id="pp"><span>📷 Add a photo</span><input type="file" accept="image/*"></label>
      <label class="field">What happened?</label>
      <textarea data-cap maxlength="300" placeholder="Our first time trying…">${esc(prefill.caption || '')}</textarea>
      <div class="grid2"><div><label class="field">When</label><input type="date" data-date value="${prefill.date || today()}"></div>
      <div><label class="field">Where (optional)</label><input type="text" data-place maxlength="60" placeholder="Boston"></div></div>
      <div class="row between" style="margin:16px 0"><div><b>Milestone</b><div class="small muted">First date, first trip, big moments</div></div><label class="switch"><input type="checkbox" data-ms><span></span></label></div>
      <button class="btn block" data-save>Save memory</button>`,
    onMount: (el, close) => {
      const inp = el.querySelector('input[type=file]');
      inp.onchange = () => {
        file = inp.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        el.querySelector('#pp span').outerHTML = `<img src="${url}" alt="">`;
      };
      el.querySelector('[data-save]').onclick = async (e) => {
        const caption = el.querySelector('[data-cap]').value.trim();
        if (!caption && !file) { toast('Add a photo or a few words'); return; }
        e.target.disabled = true;
        e.target.textContent = 'Saving…';
        try {
          let photo = null;
          if (file) {
            const demo = store.mode === 'demo';
            const { blob, dataUrl } = await compressImage(file, demo ? 720 : 1280, demo ? 0.6 : 0.78);
            photo = await store.uploadPhoto(blob, dataUrl);
          }
          await store.add('memory', {
            caption, photo, date: el.querySelector('[data-date]').value || today(),
            place: el.querySelector('[data-place]').value.trim(), milestone: el.querySelector('[data-ms]').checked,
          });
          award(10, 'memory');
          store.notify('memory', `${myName()} added a memory 📸`, caption, '#/memories');
          close();
          toast('Saved to your timeline 📸');
        } catch (err) {
          e.target.disabled = false;
          e.target.textContent = 'Save memory';
          toast(`Couldn't save: ${esc(err.message)}`);
        }
      };
    },
  });
}

function memoryDetail(m) {
  if (!m) return;
  sheet({
    tall: true,
    body: `${m.data.photo ? `<div style="border-radius:18px;overflow:hidden;margin-bottom:12px">${photoImg(m.data.photo)}</div>` : ''}
      ${m.data.milestone ? '<span class="pill gold">⭐ Milestone</span>' : ''}
      <p style="font-size:18px;font-weight:700;margin:8px 0">${esc(m.data.caption)}</p>
      <p class="small muted bold">${fmtDay(m.data.date, { year: true })}${m.data.place ? ` · 📍 ${esc(m.data.place)}` : ''} · added by ${nameOf(m.by)}</p>
      <div class="sp2"></div>
      <div class="row gap"><button class="btn ghost grow" data-ms>${m.data.milestone ? 'Unmark milestone' : '⭐ Milestone'}</button><button class="btn ghost grow" data-del>Delete</button></div>`,
    onMount: (el, close) => {
      import('../ui.js').then(({ hydratePhotos }) => hydratePhotos(el));
      el.querySelector('[data-ms]').onclick = () => { store.update(m.id, { milestone: !m.data.milestone }); close(); };
      el.querySelector('[data-del]').onclick = async () => {
        close();
        if (await confirmSheet('Delete this memory?', 'This removes it for both of you.', 'Delete')) store.remove(m.id);
      };
    },
  });
}

// ---------------- Countdowns ----------------
export function countdowns() {
  const list = upcoming();
  const n = daysTogether();
  const start = store.couple.startDate;
  return {
    html: `${header('Countdowns', { back: '#/us', right: '<button class="btn small" data-act="add">+ Add</button>' })}
      <div class="card center">
        ${n ? `<div style="font-size:52px;font-weight:900;color:var(--pea-dark);line-height:1">${n.toLocaleString()}</div><div class="bold muted">days together since ${fmtDay(start, { year: true })}</div>`
    : '<b>When did you get together?</b><div class="small muted">Set it to start your days-together counter.</div>'}
        <div class="sp"></div>
        <input type="date" data-change="start" value="${start || ''}" max="${today()}" style="max-width:220px;margin:0 auto">
      </div>
      <div class="card">${list.map((c) => `<div class="cd" ${c.item ? `data-act="cd" data-id="${c.id}"` : ''}>
          <div class="num"><b>${c.days}</b><span>${c.days === 1 ? 'day' : 'days'}</span></div>
          <div class="grow"><b>${c.emoji} ${esc(c.title)}</b><div class="small muted">${c.days === 0 ? 'Today! 🎉' : fmtDay(c.when, { year: true })}${c.yearly ? ' · every year' : ''}${c.plan ? ' · planned date' : ''}</div></div>
        </div>`).join('') || empty('⏳', 'Add a trip, a date night, a birthday…')}</div>`,
    actions: {
      add: () => countdownSheet(),
      cd: async (d) => {
        if (await confirmSheet('Remove this countdown?', 'It disappears for both of you.', 'Remove')) store.remove(d.id);
      },
    },
    changes: {
      start: async (v) => { if (v) { await store.set('couple', 'couple', { startDate: v }); toast('Saved 💚'); return true; } },
    },
  };
}

function countdownSheet() {
  const emojis = ['🎉', '✈️', '🎂', '💍', '🏖️', '🎄', '🎟️', '🏡', '💚'];
  let emoji = '🎉';
  sheet({
    title: 'New countdown',
    body: `<label class="field">What's coming up?</label><input type="text" data-t maxlength="40" placeholder="Beach trip">
      <label class="field">Date</label><input type="date" data-d min="${today()}">
      <label class="field">Icon</label><div class="row wrap gap" data-em>${emojis.map((e) => `<button class="chip ${e === emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
      <div class="row between" style="margin:16px 0"><div><b>Repeats every year</b><div class="small muted">Birthdays and anniversaries</div></div><label class="switch"><input type="checkbox" data-y><span></span></label></div>
      <button class="btn block" data-save>Add countdown</button>`,
    onMount: (el, close) => {
      el.querySelectorAll('[data-e]').forEach((b) => { b.onclick = () => { emoji = b.dataset.e; el.querySelectorAll('[data-e]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      el.querySelector('[data-save]').onclick = async () => {
        const title = el.querySelector('[data-t]').value.trim();
        const date = el.querySelector('[data-d]').value;
        if (!title || !date) { toast('Add a name and a date'); return; }
        close();
        await store.add('countdown', { title, date, emoji, yearly: el.querySelector('[data-y]').checked });
        store.notify('special', `${myName()} added a countdown ${emoji}`, `${title} on ${fmtDay(date)}`, '#/countdowns');
      };
    },
  });
}

// ---------------- Dates ----------------
let datesTab = 'spin';
let spinFilter = 'any';
let spinResult = null;
export function dates() {
  const tabs = [['spin', '🎡 Spin'], ['jar', '🫙 Jar'], ['bucket', '✨ Bucket'], ['plans', '📅 Plans']];
  let body = '';
  if (datesTab === 'spin') {
    body = `<div class="row wrap gap" style="margin-bottom:12px">${[['any', 'Anything'], ...Object.entries(DATE_CATS)].map(([k, l]) => `<button class="chip ${spinFilter === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="spinner" id="spin">${spinResult ? esc(spinResult) : 'Tap spin for a date idea'}</div>
      <div class="sp"></div>
      <button class="btn block" data-act="spin">🎲 Spin</button>
      ${spinResult ? `<div class="sp"></div><div class="row gap"><button class="btn ghost grow" data-act="planIt">📅 Plan it</button><button class="btn ghost grow" data-act="bucketIt">✨ Bucket list</button></div>` : ''}
      <p class="small muted center" style="margin-top:12px">Ideas from your jar are mixed in too.</p>`;
  } else if (datesTab === 'jar') {
    const jar = store.all('jar').reverse();
    body = `<div class="card"><p class="small muted">Drop in date ideas whenever you think of them. They show up in the spinner.</p>
      <form data-form="jar" class="add-row"><input type="text" name="text" placeholder="Go to that ramen place" maxlength="100" autocomplete="off" required><button class="btn">Add</button></form></div>
      <div class="card">${jar.map((j) => `<div class="list-row"><span>🫙</span><div class="txt">${esc(j.data.text)}<div class="tiny muted">${nameOf(j.by)}</div></div><button class="link" data-act="planJar" data-id="${j.id}">Plan</button><button class="x-btn" data-act="del" data-id="${j.id}">×</button></div>`).join('') || empty('🫙', 'The jar is empty.')}</div>`;
  } else if (datesTab === 'bucket') {
    const items = store.all('bucket');
    const open = items.filter((b) => !b.data.done);
    const done = items.filter((b) => b.data.done);
    body = `<div class="card"><form data-form="bucket" class="add-row" style="margin:0"><input type="text" name="text" placeholder="See the northern lights" maxlength="100" autocomplete="off" required><button class="btn">Add</button></form></div>
      <div class="card">${open.map((b) => bucketRow(b)).join('') || empty('✨', 'Dream big. Add things to do together someday.')}</div>
      ${done.length ? `<div class="section-title">Done together (${done.length})</div><div class="card">${done.map((b) => bucketRow(b)).join('')}</div>` : ''}`;
  } else {
    const plans = store.all('plan').sort((a, b) => (a.data.when || '').localeCompare(b.data.when || ''));
    const nd = new Date();
    const now = `${dayKey(nd)}T${String(nd.getHours()).padStart(2, '0')}:${String(nd.getMinutes()).padStart(2, '0')}`;
    const up = plans.filter((p) => !p.data.done);
    const past = plans.filter((p) => p.data.done).reverse();
    body = `<button class="btn block" data-act="newPlan">+ Plan a date</button><div class="sp"></div>
      <div class="card">${up.map((p) => planRow(p, now)).join('') || empty('📅', 'Nothing planned yet.')}</div>
      ${past.length ? `<div class="section-title">Past dates</div><div class="card">${past.map((p) => planRow(p, now)).join('')}</div>` : ''}`;
  }
  return {
    html: `${header('Dates', { back: '#/us' })}
      <div class="seg">${tabs.map(([k, l]) => `<button class="${datesTab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
      ${body}`,
    actions: {
      tab: (d) => { datesTab = d.t; return true; },
      filter: (d) => { spinFilter = d.f; spinResult = null; return true; },
      spin: (d, el) => spin(el),
      planIt: () => planSheet(spinResult),
      bucketIt: async () => { await store.add('bucket', { text: spinResult, done: false }); toast('Added to your bucket list ✨'); },
      planJar: (d) => planSheet(store.get(d.id)?.data.text),
      del: (d) => store.remove(d.id),
      check: async (d) => {
        const b = store.get(d.id);
        const done = !b.data.done;
        await store.update(d.id, { done, doneAt: done ? Date.now() : null });
        if (done) {
          await award(30, 'bucket', `bucket-${d.id}`);
          confetti();
          store.notify('special', `Bucket list: ${b.data.text} ✅`, 'Checked off together! Add a memory?', '#/memories');
          askMemory(b.data.text);
        }
      },
      planDone: async (d) => {
        const p = store.get(d.id);
        await store.update(d.id, { done: true });
        await award(30, 'plan', `plan-${d.id}`);
        confetti();
        askMemory(p.data.title);
      },
      newPlan: () => planSheet(''),
    },
    forms: {
      jar: async (f) => { await store.add('jar', { text: f.text.trim() }); return true; },
      bucket: async (f) => { await store.add('bucket', { text: f.text.trim(), done: false }); return true; },
    },
  };
}

const bucketRow = (b) => `<div class="list-row ${b.data.done ? 'done' : ''}"><button class="check ${b.data.done ? 'on' : ''}" data-act="check" data-id="${b.id}">${b.data.done ? '✓' : ''}</button><div class="txt">${esc(b.data.text)}</div><button class="x-btn" data-act="del" data-id="${b.id}">×</button></div>`;
const planRow = (p, now) => `<div class="list-row ${p.data.done ? 'done' : ''}"><span style="font-size:22px">📅</span><div class="txt"><b>${esc(p.data.title)}</b><div class="small muted">${p.data.when ? `${fmtDay(p.data.when.slice(0, 10))} · ${fmtTime(p.data.when)}` : 'Someday'} · ${nameOf(p.by)}</div></div>
  ${!p.data.done && (!p.data.when || p.data.when <= now) ? `<button class="btn small" data-act="planDone" data-id="${p.id}">Done</button>` : ''}<button class="x-btn" data-act="del" data-id="${p.id}">×</button></div>`;

function spin(btn) {
  const pool = DATE_IDEAS.filter((i) => spinFilter === 'any' || i.cats.includes(spinFilter)).map((i) => i.text)
    .concat(store.all('jar').map((j) => j.data.text));
  if (!pool.length) return;
  const box = document.getElementById('spin');
  btn.disabled = true;
  box.classList.add('spinning');
  let n = 0;
  const final = pick(pool);
  const tick = () => {
    n++;
    box.textContent = n < 14 ? pick(pool) : final;
    if (n < 14) setTimeout(tick, 50 + n * 12);
    else { box.classList.remove('spinning'); spinResult = final; setTimeout(() => bus.rerender(), 400); }
  };
  tick();
}

function planSheet(title = '') {
  sheet({
    title: 'Plan a date',
    body: `<label class="field">What are you doing?</label><input type="text" data-t maxlength="80" value="${esc(title || '')}" placeholder="Dinner at…">
      <label class="field">When</label><input type="datetime-local" data-w>
      <div class="sp2"></div><button class="btn block" data-save>Plan it</button>`,
    onMount: (el, close) => {
      el.querySelector('[data-save]').onclick = async () => {
        const t = el.querySelector('[data-t]').value.trim();
        const w = el.querySelector('[data-w]').value;
        if (!t) { toast('Give it a name'); return; }
        close();
        await store.add('plan', { title: t, when: w || null, done: false });
        store.notify('special', `${myName()} planned a date 📅`, `${t}${w ? ` · ${fmtDay(w.slice(0, 10))} at ${fmtTime(w)}` : ''}`, '#/dates');
        toast('Planned! 📅');
        datesTab = 'plans';
        bus.rerender();
      };
    },
  });
}

async function askMemory(caption) {
  if (await confirmSheet('Save it as a memory?', 'Add a photo so you never forget it.', 'Add memory', 'Not now')) memorySheet({ caption });
}

// ---------------- Lists ----------------
const BUILT_IN = [
  { id: 'watch', name: 'Watchlist', emoji: '🍿' },
  { id: 'eat', name: 'Places to eat', emoji: '🍜' },
];
function allLists() {
  return [...BUILT_IN, ...store.all('list').map((l) => ({ id: l.id, name: l.data.name, emoji: l.data.emoji || '📝', custom: true }))];
}
export function lists() {
  const count = (id) => store.all('li', (i) => i.data.list === id && !i.data.done).length;
  const giftCount = store.all('li', (i) => i.data.list === 'gifts' && !i.data.done).length;
  return {
    html: `${header('Lists', { back: '#/us', right: '<button class="btn small" data-act="newList">+ New</button>' })}
      <div class="card">${allLists().map((l) => `<a class="todo" href="#/list/${l.id}"><div class="ic">${l.emoji}</div><div class="tx"><b>${esc(l.name)}</b><span>${count(l.id)} to do</span></div><span class="chev">›</span></a>`).join('')}</div>
      <div class="card"><a class="todo" href="#/list/gifts"><div class="ic">🎁</div><div class="tx"><b>Gift ideas for ${themName()}</b><span>🤫 Only you can see this · ${giftCount} idea${giftCount === 1 ? '' : 's'}</span></div><span class="chev">›</span></a></div>`,
    actions: {
      newList: () => sheet({
        title: 'New list',
        body: `<label class="field">Name</label><input type="text" data-n maxlength="30" placeholder="Books to read">
          <label class="field">Emoji</label><input type="text" data-e maxlength="4" placeholder="📚">
          <div class="sp2"></div><button class="btn block" data-save>Create list</button>`,
        onMount: (el, close) => {
          el.querySelector('[data-save]').onclick = async () => {
            const name = el.querySelector('[data-n]').value.trim();
            if (!name) return;
            close();
            const l = await store.add('list', { name, emoji: el.querySelector('[data-e]').value.trim() || '📝' });
            location.hash = `#/list/${l.id}`;
          };
        },
      }),
    },
  };
}

export function list({ id }) {
  const gifts = id === 'gifts';
  const meta = gifts ? { name: `Gift ideas for ${store.theirs.name || 'them'}`, emoji: '🎁' } : allLists().find((l) => l.id === id);
  if (!meta) return { html: `${header('List', { back: '#/lists' })}${empty('🤷', 'List not found')}` };
  const items = store.all('li', (i) => i.data.list === id);
  const open = items.filter((i) => !i.data.done);
  const done = items.filter((i) => i.data.done);
  const row = (i) => `<div class="list-row ${i.data.done ? 'done' : ''}"><button class="check ${i.data.done ? 'on' : ''}" data-act="check" data-id="${i.id}">${i.data.done ? '✓' : ''}</button>
    <div class="txt">${esc(i.data.text)}${!gifts ? `<div class="tiny muted">${nameOf(i.by)}</div>` : ''}</div><button class="x-btn" data-act="del" data-id="${i.id}">×</button></div>`;
  const custom = store.get(id);
  return {
    html: `${header(`${meta.emoji} ${esc(meta.name)}`, { back: '#/lists', sub: gifts ? `🤫 ${themName()} can't see this list` : '' })}
      <div class="card"><form data-form="add" class="add-row" style="margin:0"><input type="text" name="text" placeholder="${gifts ? 'That candle she liked' : 'Add something'}" maxlength="120" autocomplete="off" required><button class="btn">Add</button></form></div>
      <div class="card">${open.map(row).join('') || empty(meta.emoji, 'Nothing here yet.')}</div>
      ${done.length ? `<div class="section-title">Done (${done.length})</div><div class="card">${done.map(row).join('')}</div>` : ''}
      ${custom ? '<button class="btn ghost block" data-act="delList">Delete this list</button>' : ''}`,
    actions: {
      check: (d) => { const it = store.get(d.id); store.update(d.id, { done: !it.data.done }); },
      del: (d) => store.remove(d.id),
      delList: async () => {
        if (!(await confirmSheet('Delete this list?', 'Everything on it goes too.', 'Delete'))) return;
        for (const i of items) store.remove(i.id);
        await store.remove(id);
        location.hash = '#/lists';
      },
    },
    forms: {
      add: async (f) => {
        await store.add('li', { list: id, text: f.text.trim(), done: false }, gifts ? { hiddenFrom: store.partnerId } : {});
        return true;
      },
    },
  };
}

// ---------------- Weekly challenge ----------------
export function challenge() {
  const ch = weeklyChallenge();
  const past = [];
  for (let i = 1; i <= 8; i++) {
    const wk = addDays(weekKey(), -7 * i);
    past.push(weeklyChallenge(wk));
  }
  const chip = (done, name, cls) => `<span class="pill ${done ? cls : ''}">${done ? '✓' : '○'} ${name}</span>`;
  return {
    html: `${header('Weekly challenge', { back: '#/us' })}
      <div class="card q-card center">
        <div class="small muted bold">Week of ${fmtDay(ch.wk)}</div>
        <div class="q-text">${esc(ch.text)}</div>
        <div class="row gap" style="justify-content:center">${chip(ch.doneMe, meName(), 'me')}${chip(ch.doneThem, themName(), 'them')}</div>
        <div class="sp2"></div>
        ${ch.both ? '<div class="bold">🎉 Done together! +50 love points</div>'
    : ch.doneMe ? `<p class="small muted">Waiting for ${themName()} to tap done too.</p>`
      : '<button class="btn block" data-act="done">We did it!</button>'}
      </div>
      <p class="small muted center">A new challenge every Monday. Both of you tap done to earn 50 points.</p>
      <div class="section-title">Past weeks</div>
      <div class="card">${past.map((p) => `<div class="list-row ${p.both ? 'done' : ''}"><span>${p.both ? '🏆' : '·'}</span><div class="txt" style="text-decoration:none"><b>${esc(p.text)}</b><div class="small muted">Week of ${fmtDay(p.wk)}</div></div></div>`).join('')}</div>`,
    actions: {
      done: async () => {
        await store.add('chdone', { wk: ch.wk }, { id: `ch-${ch.wk}-${store.me}` });
        if (store.get(`ch-${ch.wk}-${store.partnerId}`)) {
          await award(50, 'challenge', `ch-${ch.wk}`);
          confetti();
          store.notify('challenge', 'Weekly challenge complete! 🏆', '+50 love points for you both', '#/challenge');
        } else {
          store.notify('challenge', `${myName()} finished this week's challenge 🏆`, 'Tap done when you have too', '#/challenge');
        }
        return true;
      },
    },
  };
}
