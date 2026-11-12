import { store } from '../store.js';
import { LETTER_LABELS } from '../content.js';
import { awardCapped, award, today } from '../logic.js';
import { header, meName, themName, nameOf, empty, notesSeg } from '../ui.js';
import { esc, timeAgo, fmtDay, sheet, toast, confetti, confirmSheet, lsGet, lsSet, floatHearts, dayKey } from '../util.js';
import { bus } from '../bus.js';
import { memorySheet } from './us.js';

const myName = () => store.mine.name || 'Your person';

const seg = (on) => notesSeg(on);
const go = (d) => { location.hash = d.h; };

export { notes } from './chat.js';
export { boards, board } from './draw.js';

// ---------------- Letters ----------------
export function letters() {
  const t = today();
  const got = store.all('letter', (l) => l.data.to === store.me).reverse();
  const sent = store.all('letter', (l) => l.by === store.me).reverse();
  const env = (l) => {
    const locked = l.data.unlock && l.data.unlock > t;
    const opened = !!l.data.openedAt;
    return `<div class="envelope ${opened ? '' : 'sealed'}" data-act="open" data-id="${l.id}">
      ${opened ? '' : `<div class="seal">${locked ? '🔒' : '💌'}</div>`}
      <div class="lbl">${esc(l.data.label)}</div>
      <div class="center small muted bold" style="margin-top:4px">from ${nameOf(l.by)} · ${locked ? `unlocks ${fmtDay(l.data.unlock, { year: true })}` : opened ? `opened ${timeAgo(l.data.openedAt)}` : 'sealed'}</div>
    </div>`;
  };
  return {
    html: `${header('Letters')}${seg('letters')}
      <button class="btn block" data-act="write">✍️ Write a letter</button>
      <div class="section-title">For you</div>
      ${got.map(env).join('') || `<div class="card">${empty('✉️', `No letters from ${themName()} yet.`)}</div>`}
      ${sent.length ? `<div class="section-title">You sent</div><div class="card">${sent.map((l) => `<a class="todo" href="#/letter/${l.id}"><div class="ic">${l.data.openedAt ? '💌' : '✉️'}</div><div class="tx"><b>${esc(l.data.label)}</b><span>${l.data.openedAt ? `Opened ${timeAgo(l.data.openedAt)}` : l.data.unlock && l.data.unlock > t ? `Unlocks ${fmtDay(l.data.unlock, { year: true })}` : 'Still sealed'}</span></div><span class="chev">›</span></a>`).join('')}</div>` : ''}`,
    actions: {
      go,
      write: () => writeLetter(),
      open: async (d) => {
        const l = store.get(d.id);
        if (l.data.unlock && l.data.unlock > t) { toast(`🔒 This one unlocks on ${fmtDay(l.data.unlock, { year: true })}`); return; }
        if (!l.data.openedAt) {
          if (!(await confirmSheet(esc(l.data.label), 'Only open it when the moment is right. Open it now?', 'Open it 💌', 'Save it'))) return;
          await store.update(l.id, { openedAt: Date.now() });
          store.notify('note', `${myName()} opened your letter 💌`, l.data.label, '#/letters');
          confetti(40);
        }
        location.hash = `#/letter/${l.id}`;
      },
    },
  };
}

function writeLetter() {
  let label = LETTER_LABELS[0];
  sheet({
    title: `A letter for ${themName()}`,
    tall: true,
    body: `<label class="field">Open when…</label>
      <div class="row wrap gap" data-labels>${LETTER_LABELS.map((l, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-l="${esc(l)}">${esc(l.replace(/^Open (when|on) /, ''))}</button>`).join('')}<button class="chip" data-l="">Custom</button></div>
      <input type="text" data-custom maxlength="60" placeholder="Open when…" class="hide" style="margin-top:10px">
      <div class="row between" style="margin:16px 0 6px"><div><b>Lock until a date</b><div class="small muted">They can't open it before then</div></div><label class="switch"><input type="checkbox" data-lock><span></span></label></div>
      <input type="date" data-date class="hide" min="${today()}">
      <label class="field">Your letter</label>
      <textarea data-body style="min-height:180px" maxlength="5000" placeholder="Dear ${themName()},"></textarea>
      <div class="sp"></div><button class="btn block" data-send>Seal and send 💌</button>`,
    onMount: (el, close) => {
      const custom = el.querySelector('[data-custom]');
      el.querySelectorAll('[data-l]').forEach((b) => {
        b.onclick = () => {
          label = b.dataset.l;
          el.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('on', x === b));
          custom.classList.toggle('hide', !!label);
          if (!label) custom.focus();
        };
      });
      const lock = el.querySelector('[data-lock]');
      const date = el.querySelector('[data-date]');
      lock.onchange = () => date.classList.toggle('hide', !lock.checked);
      el.querySelector('[data-send]').onclick = async () => {
        const body = el.querySelector('[data-body]').value.trim();
        const lbl = (label || custom.value.trim() || 'Open whenever');
        const unlock = lock.checked && date.value ? date.value : null;
        if (!body) { toast('Write something first 💌'); return; }
        close();
        await store.add('letter', { to: store.partnerId, label: lbl, body, unlock, openedAt: null });
        awardCapped(5, 'note');
        store.notify('note', `✉️ ${myName()} wrote you a letter`, unlock ? `It unlocks on ${fmtDay(unlock, { year: true })}` : lbl, '#/letters');
        toast('Sealed and sent 💌');
      };
    },
  });
}

export function letter({ id }) {
  const l = store.get(id);
  if (!l) return { html: `${header('Letter', { back: '#/letters' })}${empty('✉️', 'Letter not found')}` };
  const forMe = l.data.to === store.me;
  const locked = forMe && l.data.unlock && l.data.unlock > today();
  const sealed = forMe && !l.data.openedAt;
  return {
    html: `${header('Letter', { back: '#/letters' })}
      <div class="card">
        <div class="center"><div style="font-size:40px">💌</div><h2>${esc(l.data.label)}</h2><div class="small muted bold">from ${nameOf(l.by)} to ${nameOf(l.data.to)} · ${fmtDay(dayKey(new Date(l.at)), { year: true })}</div></div>
        <div class="sp2"></div>
        ${locked ? `<div class="locked">🔒 Unlocks on ${fmtDay(l.data.unlock, { year: true })}</div>`
    : sealed ? '<div class="locked">💌 Still sealed. Open it from Letters.</div>'
      : `<div class="letter-body">${esc(l.data.body)}</div>`}
      </div>
      ${l.by === store.me ? '<button class="btn ghost block" data-act="del">Delete letter</button>' : ''}`,
    actions: {
      del: async () => {
        if (await confirmSheet('Delete this letter?', 'It disappears for both of you.', 'Delete')) { await store.remove(id); location.hash = '#/letters'; }
      },
    },
  };
}

