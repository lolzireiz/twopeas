// Shared habits: little daily goals. Checking them off makes the pet happy.
import { store } from '../store.js';
import {
  HABIT_IDEAS, DAY_LETTERS, habitsOf, dueOn, doneOn, hbId, progress, streakOf, scheduled, bothCrushedIt,
} from '../habits-logic.js';
import { award } from '../logic.js';
import { header, meName, themName, empty } from '../ui.js';
import {
  esc, sheet, toast, confetti, dayKey, addDays, floatHearts, confirmSheet,
} from '../util.js';
import { bus } from '../bus.js';

const petName = () => store.couple.pet?.name || 'Your pet';

function ring(p, color) {
  const pct = p.due ? p.done / p.due : 0;
  const c = 2 * Math.PI * 26;
  return `<svg viewBox="0 0 64 64" class="hb-ring"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--soft)" stroke-width="8"/>
    <circle cx="32" cy="32" r="26" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle" font-size="15" font-weight="900" fill="var(--ink)">${p.due ? `${p.done}/${p.due}` : '–'}</text></svg>`;
}

function weekStrip(who) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const k = addDays(dayKey(), -i);
    const p = progress(who, k);
    out.push(`<span class="hb-day ${p.all ? 'full' : p.done ? 'part' : ''} ${i === 0 ? 'today' : ''}" title="${k}"></span>`);
  }
  return `<div class="hb-week">${out.join('')}</div>`;
}

export function view() {
  const t = dayKey();
  const mine = dueOn(store.me, t);
  const theirs = dueOn(store.partnerId, t);
  const dMe = doneOn(store.me, t);
  const dThem = doneOn(store.partnerId, t);
  const pMe = progress(store.me, t);
  const pThem = progress(store.partnerId, t);
  const cheers = new Set(store.all('cheer', (c) => c.data.date === t && c.by === store.me).map((c) => c.data.habit));
  const gotCheers = store.all('cheer', (c) => c.data.date === t && c.data.to === store.me);
  const all = habitsOf(store.me);
  const notToday = all.filter((h) => !scheduled(h, t));
  const crushed = bothCrushedIt(t);

  const myRow = (h) => {
    const done = dMe.has(h.id);
    const s = streakOf(h, store.me);
    const cheered = gotCheers.filter((c) => c.data.habit === h.id).length;
    return `<div class="hb-row ${done ? 'done' : ''}">
      <button class="hb-check" data-act="toggle" data-id="${h.id}" aria-label="Done">${done ? '✓' : ''}</button>
      <span class="hb-e">${h.data.e}</span>
      <div class="txt"><b>${esc(h.data.title)}</b><div class="tiny muted">${h.data.owner === 'both' ? '👫 Both of you · ' : ''}${s ? `🔥 ${s} day${s === 1 ? '' : 's'}` : 'Start a streak'}${cheered ? ` · 👏 from ${themName()}` : ''}</div></div>
      <button class="x-btn" data-act="edit" data-id="${h.id}" aria-label="Edit">⋯</button>
    </div>`;
  };
  const theirRow = (h) => {
    const done = dThem.has(h.id);
    const s = streakOf(h, store.partnerId);
    return `<div class="hb-row ${done ? 'done' : ''}">
      <span class="hb-check them ${done ? 'on' : ''}">${done ? '✓' : ''}</span>
      <span class="hb-e">${h.data.e}</span>
      <div class="txt"><b>${esc(h.data.title)}</b><div class="tiny muted">${s ? `🔥 ${s} day${s === 1 ? '' : 's'}` : done ? 'Done today' : 'Not yet'}</div></div>
      <button class="hb-cheer ${cheers.has(h.id) ? 'on' : ''}" data-act="cheer" data-id="${h.id}" ${cheers.has(h.id) ? 'disabled' : ''}>${cheers.has(h.id) ? '👏 Sent' : '👏'}</button>
    </div>`;
  };

  return {
    html: `${header('Habits', { back: '#/us', sub: `Check them off together. ${esc(petName())} loves it.`, right: '<button class="icon-btn" data-act="add" aria-label="Add habit">＋</button>' })}
      <div class="card hb-top ${crushed ? 'crushed' : ''}">
        <div class="hb-person">${ring(pMe, 'var(--me)')}<b>${meName()}</b>${weekStrip(store.me)}</div>
        <div class="hb-mid">${crushed ? `🎉<div class="tiny bold">You both did it!</div>` : '💪'}</div>
        <div class="hb-person">${ring(pThem, 'var(--them)')}<b>${themName()}</b>${weekStrip(store.partnerId)}</div>
      </div>
      ${crushed ? `<p class="small center bold" style="margin:-4px 0 12px">${esc(petName())} is so proud of you two today 🥹</p>` : ''}

      <div class="section-title">Your habits today</div>
      <div class="card">${mine.map(myRow).join('') || empty('🌱', all.length ? 'Nothing scheduled for today. Enjoy the rest!' : 'Add a habit or two to get started.')}
        ${!all.length ? '<div class="sp"></div><button class="btn block" data-act="add">+ Add a habit</button>' : ''}</div>
      ${notToday.length ? `<p class="tiny muted" style="margin:-6px 4px 12px">Not today: ${notToday.map((h) => `${h.data.e} ${esc(h.data.title)}`).join(', ')}</p>` : ''}

      <div class="section-title">${themName()}'s habits today</div>
      <div class="card">${theirs.map(theirRow).join('') || empty('🌿', `${themName()} hasn't added any habits for today.`)}</div>
      <p class="tiny muted center">Each check-in gives 2 points. Both finish everything for a 10 point bonus.</p>`,
    actions: {
      add: () => editSheet(null),
      edit: (x) => editSheet(store.get(x.id)),
      toggle: async (x, el) => {
        const cur = doneOn(store.me, t);
        const on = !cur.has(x.id);
        if (on) cur.add(x.id); else cur.delete(x.id);
        await store.set(hbId(t, store.me), 'hbday', { date: t, done: [...cur] });
        if (on) {
          const r = el.getBoundingClientRect();
          floatHearts(r.left + r.width / 2, r.top, 4);
          await award(2, 'habit', `hb-${t}-${store.me}-${x.id}`);
          const p = progress(store.me, t);
          if (p.all) {
            confetti(50);
            const h = store.get(x.id);
            if (bothCrushedIt(t)) {
              await award(10, 'habit', `hb-both-${t}`);
              store.notify('special', '🎉 You both finished your habits today', `${petName()} is beaming`, '#/habits');
            } else store.notify('special', `${store.mine.name || 'Your person'} finished all their habits today 💪`, h ? `Last one: ${h.data.title}` : 'Your turn!', '#/habits');
          }
        }
        return true;
      },
      cheer: async (x, el) => {
        const h = store.get(x.id);
        await store.add('cheer', { to: store.partnerId, habit: x.id, date: t }, { id: `cheer-${t}-${x.id}-${store.me}`, once: true });
        const r = el.getBoundingClientRect();
        floatHearts(r.left + r.width / 2, r.top, 3);
        store.notify('tap', `👏 ${store.mine.name || 'Your person'} is cheering you on`, h ? `${h.data.e} ${h.data.title}` : '', '#/habits');
        return true;
      },
    },
  };
}

function editSheet(h) {
  const d = h?.data || { e: '✨', title: '', owner: store.me, days: [] };
  const days = new Set(d.days || []);
  sheet({
    title: h ? 'Edit habit' : 'New habit',
    tall: !h,
    body: `${!h ? `<div class="hb-ideas">${HABIT_IDEAS.map(([e, t]) => `<button class="opt" data-idea="${esc(t)}" data-ie="${e}">${e} ${esc(t)}</button>`).join('')}</div>` : ''}
      <div class="row gap"><div style="width:76px"><label class="field">Emoji</label><input type="text" data-e maxlength="4" value="${esc(d.e)}"></div>
      <div class="grow"><label class="field">Habit</label><input type="text" data-t maxlength="40" value="${esc(d.title)}" placeholder="Drink water"></div></div>
      <label class="field">Whose?</label>
      <div class="seg" style="margin:0"><button class="${d.owner !== 'both' ? 'on' : ''}" data-own="me">Just me</button><button class="${d.owner === 'both' ? 'on' : ''}" data-own="both">Both of us</button></div>
      <label class="field">Which days?</label>
      <div class="hb-days">${DAY_LETTERS.map((l, i) => `<button class="${days.size === 0 || days.has(i) ? 'on' : ''}" data-day="${i}">${l}</button>`).join('')}</div>
      <div class="sp2"></div><button class="btn block" data-save>${h ? 'Save' : 'Add habit'}</button>
      ${h ? '<div class="sp"></div><button class="btn ghost block" data-del>Delete habit</button>' : ''}`,
    onMount: (el, close) => {
      let owner = d.owner === 'both' ? 'both' : 'me';
      const sel = new Set(days.size ? days : [0, 1, 2, 3, 4, 5, 6]);
      el.querySelectorAll('[data-idea]').forEach((b) => { b.onclick = () => { el.querySelector('[data-t]').value = b.dataset.idea; el.querySelector('[data-e]').value = b.dataset.ie; }; });
      el.querySelectorAll('[data-own]').forEach((b) => { b.onclick = () => { owner = b.dataset.own; el.querySelectorAll('[data-own]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      el.querySelectorAll('[data-day]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.day); if (sel.has(i)) sel.delete(i); else sel.add(i); b.classList.toggle('on', sel.has(i)); }; });
      el.querySelector('[data-save]').onclick = async () => {
        const title = el.querySelector('[data-t]').value.trim();
        if (!title) { toast('Name your habit'); return; }
        if (!sel.size) { toast('Pick at least one day'); return; }
        const data = { title, e: el.querySelector('[data-e]').value.trim() || '✨', owner: owner === 'both' ? 'both' : (h?.data.owner && h.data.owner !== 'both' ? h.data.owner : store.me), days: sel.size === 7 ? [] : [...sel].sort() };
        close();
        if (h) await store.update(h.id, data);
        else {
          await store.add('habit', data);
          if (owner === 'both') store.notify('special', `${store.mine.name || 'Your person'} started a habit for you both`, `${data.e} ${title}`, '#/habits');
        }
        bus.rerender();
      };
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        close();
        if (await confirmSheet('Delete this habit?', 'Its streak goes away too.', 'Delete')) { await store.update(h.id, { archived: true }); bus.rerender(); }
      });
    },
  });
}
