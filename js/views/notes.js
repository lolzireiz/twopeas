import { store } from '../store.js';
import { LETTER_LABELS } from '../content.js';
import { awardCapped, award, today } from '../logic.js';
import { header, meName, themName, nameOf, empty, meColor } from '../ui.js';
import { esc, timeAgo, fmtDay, sheet, toast, confetti, confirmSheet, lsGet, lsSet, floatHearts, dayKey } from '../util.js';
import { bus } from '../bus.js';
import { makeCanvas, paletteHTML, renderStrokes, CW, CH } from '../canvas.js';
import { memorySheet } from './us.js';

const myName = () => store.mine.name || 'Your person';

const seg = (on) => `<div class="seg">
  <button class="${on === 'notes' ? 'on' : ''}" data-act="go" data-h="#/notes">💌 Notes</button>
  <button class="${on === 'letters' ? 'on' : ''}" data-act="go" data-h="#/letters">✉️ Letters</button>
  <button class="${on === 'draw' ? 'on' : ''}" data-act="go" data-h="#/draw">🎨 Draw</button>
</div>`;
const go = (d) => { location.hash = d.h; };

// ---------------- Notes ----------------
export function notes() {
  const list = store.all('note');
  let lastDay = '';
  const items = list.map((n) => {
    const mine = n.by === store.me;
    const day = fmtDay(dayKey(new Date(n.at)));
    const sep = day !== lastDay ? `<div class="center tiny muted bold" style="margin:10px 0 4px">${day}</div>` : '';
    lastDay = day;
    return `${sep}<div class="note ${mine ? 'me' : 'them'}">${esc(n.data.text)}</div>
      <div class="note-time ${mine ? 'me' : ''}">${timeAgo(n.at)}${mine && n.data.readAt ? ' · read 💚' : ''}</div>`;
  });
  return {
    html: `${header('Notes')}${seg('notes')}
      <div class="card"><div class="notes" id="notes">${items.join('') || empty('💌', `Leave ${themName()} a little note. It pins to their home screen until they read it.`)}</div>
      <div class="compose"><textarea data-input="noteText" rows="1" placeholder="Write a note…" maxlength="500"></textarea><button class="btn" data-act="send" aria-label="Send">➤</button></div></div>`,
    mount: () => {
      const unread = store.all('note', (n) => n.data.to === store.me && !n.data.readAt);
      if (unread.length) setTimeout(() => unread.forEach((n) => store.update(n.id, { readAt: Date.now() })), 600);
      const ta = document.querySelector('[data-input="noteText"]');
      const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(140, ta.scrollHeight)}px`; };
      ta.addEventListener('input', grow);
    },
    actions: {
      go,
      send: async (d, el) => {
        const ta = document.querySelector('[data-input="noteText"]');
        const text = ta.value.trim();
        if (!text) return;
        ta.value = '';
        const r = el.getBoundingClientRect();
        floatHearts(r.left, r.top, 3);
        await store.add('note', { to: store.partnerId, text });
        awardCapped(5, 'note');
        store.notify('note', `💌 Note from ${myName()}`, text, '#/notes');
        return true;
      },
    },
  };
}

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

// ---------------- Draw together ----------------
export function boards() {
  const list = store.all('board').reverse();
  return {
    html: `${header('Draw')}${seg('draw')}
      <button class="btn block" data-act="newBoard">🎨 New drawing</button><div class="sp"></div>
      <div class="grid2">${list.map((b) => `<a class="board-thumb" href="#/board/${b.id}">${b.data.thumb ? `<img src="${b.data.thumb}" alt="" style="flex:1;min-height:0;object-fit:cover">` : '<div style="flex:1;display:grid;place-items:center;font-size:34px">🎨</div>'}<div>${esc(b.data.title)}</div></a>`).join('')}</div>
      ${list.length ? '' : `<div class="card">${empty('🎨', `A shared canvas. You both draw at the same time, in your own colors.`)}</div>`}`,
    actions: {
      go,
      newBoard: async () => {
        const n = store.all('board').length + 1;
        const b = await store.add('board', { title: `Doodle #${n}` });
        location.hash = `#/board/${b.id}`;
      },
    },
  };
}

let pen = null;
export function board({ id }) {
  const b = store.get(id);
  if (!b) return { html: `${header('Draw', { back: '#/draw' })}${empty('🎨', 'Drawing not found')}` };
  pen = pen || { color: meColor().hex, size: 10 };
  const strokes = () => store.all('stroke', (s) => s.data.board === id).map((s) => s.data.s);
  let ctl;
  let startCount = 0;
  return {
    live: false,
    html: `${header(esc(b.data.title), { back: '#/draw', right: '<button class="icon-btn" data-act="rename" aria-label="Rename">✏️</button>' })}
      <div class="canvas-wrap" id="cv"></div>
      ${paletteHTML(pen.color, pen.size)}
      <div class="row gap"><button class="btn ghost grow" data-act="undo">Undo</button><button class="btn ghost grow" data-act="clear">Clear</button><button class="btn grow" data-act="save">Save 📸</button></div>
      <p class="small muted center" style="margin-top:10px">${themName()} sees your strokes as you draw them.</p>`,
    mount: (root) => {
      ctl = makeCanvas(root.querySelector('#cv'), {
        strokes, color: pen.color, size: pen.size,
        onStroke: async (s) => {
          await store.add('stroke', { board: id, s });
          const k = `twopeas-drawn-${id}`;
          if (Date.now() - (lsGet(k, 0) || 0) > 30 * 60e3) {
            lsSet(k, Date.now());
            store.notify('memory', `${myName()} is drawing 🎨`, b.data.title, `#/board/${id}`);
          }
        },
      });
      store.loadStrokes(id).then(() => { startCount = strokes().length; ctl.redraw(); });
      return () => {
        ctl.destroy();
        if (strokes().length !== startCount) saveThumb(id, strokes());
      };
    },
    onChange: (ch) => {
      if (ch.type === 'reload') { ctl?.redraw(); return false; }
      if (ch.item?.kind === 'stroke' || ch.type === 'remove') { if (!ctl?.drawing) ctl?.redraw(); }
      if (ch.item?.id === id && ch.type === 'update' && ch.remote) return false;
      return false;
    },
    actions: {
      color: (x, el) => { pen.color = x.c; ctl.setColor(x.c); el.parentNode.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === el)); },
      size: (x, el) => { pen.size = Number(x.s); ctl.setSize(pen.size); el.parentNode.querySelectorAll('.size-btn').forEach((s) => s.classList.toggle('on', s === el)); },
      undo: () => {
        const mine = store.all('stroke', (s) => s.data.board === id && s.by === store.me);
        const last = mine[mine.length - 1];
        if (last) store.remove(last.id);
      },
      clear: async () => {
        if (!(await confirmSheet('Clear the whole drawing?', 'This wipes it for both of you.', 'Clear'))) return;
        for (const s of store.all('stroke', (x) => x.data.board === id)) store.remove(s.id);
      },
      rename: () => sheet({
        title: 'Rename drawing',
        body: `<input type="text" data-n maxlength="40" value="${esc(b.data.title)}"><div class="sp"></div><button class="btn block" data-save>Save</button>`,
        onMount: (el, close) => {
          el.querySelector('[data-save]').onclick = async () => {
            const t = el.querySelector('[data-n]').value.trim();
            close();
            if (t) { await store.update(id, { title: t }); bus.rerender(); }
          };
        },
      }),
      save: async () => {
        const c = document.createElement('canvas');
        c.width = 800;
        c.height = 1000;
        renderStrokes(c, strokes());
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
        const dataUrl = store.mode === 'demo' ? (() => { const s = document.createElement('canvas'); s.width = 480; s.height = 600; renderStrokes(s, strokes()); return s.toDataURL('image/jpeg', 0.7); })() : null;
        const photo = await store.uploadPhoto(blob, dataUrl);
        await store.add('memory', { caption: `🎨 ${b.data.title}`, photo, date: today(), place: '', milestone: false });
        await award(10, 'drawing', `drawing-${id}`);
        saveThumb(id, strokes());
        toast('Saved to Memories 📸');
      },
    },
  };
}

function saveThumb(id, strokes) {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 300;
  renderStrokes(c, strokes);
  store.update(id, { thumb: c.toDataURL('image/jpeg', 0.6) });
}

export { CW, CH };
