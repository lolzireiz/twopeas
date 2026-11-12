// Draw together: shared canvas with live strokes, stamps, backgrounds, prompts and wallpapers.
import { store } from '../store.js';
import { award, today } from '../logic.js';
import { header, themName, empty, meColor, notesSeg, presencePill } from '../ui.js';
import { esc, sheet, toast, confirmSheet, lsGet, lsSet, uid } from '../util.js';
import { bus } from '../bus.js';
import { makeCanvas, paletteHTML, markPalette, renderStrokes, BACKGROUNDS, CW, CH } from '../canvas.js';

const myName = () => store.mine.name || 'Your person';
export const DRAW_IDEAS = [
  ['✏️', 'Free draw', ''],
  ['👫', 'Draw each other', 'Each of you draws the other. No peeking until done!'],
  ['🏡', 'Our dream house', 'Design it together, room by room'],
  ['🐾', 'Our pet on vacation', 'Where did they go? What did they pack?'],
  ['💞', 'How we met', 'A little comic of the day you met'],
  ['🌍', 'Our dream trip', 'Draw the place, then add yourselves'],
  ['🍝', 'Our perfect date', 'Food, place, outfits'],
  ['🎭', 'Half and half', 'One draws the top half of a creature, the other the bottom'],
  ['😂', 'Inside joke', 'Draw one of your inside jokes'],
  ['🚗', 'Our future car', 'Customize it'],
];

export function boards() {
  const list = store.all('board').reverse();
  return {
    html: `${header('Draw', { sub: presencePill() })}${notesSeg('draw')}
      <button class="btn block" data-act="newBoard">🎨 New drawing</button><div class="sp"></div>
      <div class="grid2">${list.map((b) => `<a class="board-thumb" href="#/board/${b.id}">${b.data.thumb ? `<img src="${b.data.thumb}" alt="" style="flex:1;min-height:0;object-fit:cover">` : '<div style="flex:1;display:grid;place-items:center;font-size:34px">🎨</div>'}<div>${esc(b.data.title)}</div></a>`).join('')}</div>
      ${list.length ? '' : `<div class="card">${empty('🎨', 'A shared canvas. You both draw at the same time, in your own colors, and see each other\'s strokes live.')}</div>`}`,
    actions: {
      go: (d) => { location.hash = d.h; },
      newBoard: () => sheet({
        title: 'What are you drawing?',
        tall: true,
        body: `<div class="idea-list">${DRAW_IDEAS.map(([e, t, sub], i) => `<button class="idea" data-i="${i}"><span class="e">${e}</span><span class="grow"><b>${t}</b>${sub ? `<span>${sub}</span>` : ''}</span></button>`).join('')}</div>`,
        onMount: (el, close) => {
          el.querySelectorAll('[data-i]').forEach((b) => {
            b.onclick = async () => {
              close();
              const [, t, sub] = DRAW_IDEAS[Number(b.dataset.i)];
              const n = store.all('board').length + 1;
              const board = await store.add('board', { title: t === 'Free draw' ? `Doodle #${n}` : t, prompt: sub, bg: 'white' });
              store.notify('memory', `🎨 ${myName()} started a drawing`, `${board.data.title}. Come draw together!`, `#/board/${board.id}`);
              location.hash = `#/board/${board.id}`;
            };
          });
        },
      }),
    },
  };
}

let pen = null;
const ghosts = {};
export function board({ id }) {
  const b = store.get(id);
  if (!b) return { html: `${header('Draw', { back: '#/draw' })}${empty('🎨', 'Drawing not found')}` };
  pen = pen || { color: meColor().hex, size: 10, mode: 'pen', stamp: null };
  const strokes = () => store.all('stroke', (s) => s.data.board === id).map((s) => s.data.s);
  let ctl;
  let startCount = 0;
  let cur = null;
  let lastSend = 0;
  const bg = b.data.bg || 'white';
  return {
    live: false,
    html: `${header(esc(b.data.title), { back: '#/draw', sub: presencePill(), right: '<button class="icon-btn" data-act="more" aria-label="More">⋯</button>' })}
      ${b.data.prompt ? `<p class="small muted center" style="margin:-6px 0 10px">${esc(b.data.prompt)}</p>` : ''}
      <div class="canvas-wrap" id="cv"></div>
      ${paletteHTML(pen.color, pen.size, { stamps: true, mode: pen.mode, stamp: pen.stamp })}
      <div class="bg-row">${Object.entries(BACKGROUNDS).map(([k, v]) => `<button class="bg-chip ${k === bg ? 'on' : ''}" data-act="bg" data-b="${k}" style="background:${v.base}">${k === bg ? '✓' : ''}</button>`).join('')}<span class="small muted bold">Background</span></div>
      <div class="row gap"><button class="btn ghost grow" data-act="undo">↶ Undo</button><button class="btn ghost grow" data-act="wallpaper">📱 Wallpaper</button><button class="btn grow" data-act="save">Save 📸</button></div>`,
    mount: (root) => {
      ctl = makeCanvas(root.querySelector('#cv'), {
        strokes,
        extra: () => Object.values(ghosts).filter((g) => g.board === id).map((g) => g.s),
        bg,
        color: pen.color,
        size: pen.size,
        onMove: (s) => {
          cur = cur || uid(8);
          if (Date.now() - lastSend < 70) return;
          lastSend = Date.now();
          store.signal('stroke', { board: id, gid: cur, s });
        },
        onStroke: async (s) => {
          const gid = cur || uid(8);
          cur = null;
          if (s.k !== 'stamp') store.signal('stroke', { board: id, gid, s });
          store.signal('strokeEnd', { board: id, gid });
          await store.add('stroke', { board: id, s, gid });
          const k = `twopeas-drawn-${id}`;
          if (!store.presence.online && Date.now() - (lsGet(k, 0) || 0) > 30 * 60e3) {
            lsSet(k, Date.now());
            store.notify('memory', `${myName()} is drawing 🎨`, `${b.data.title}. Come draw together!`, `#/board/${id}`);
          }
        },
      });
      if (pen.mode === 'erase') ctl.setErase();
      if (pen.mode === 'stamp') ctl.setStamp(pen.stamp);
      store.loadStrokes(id).then(() => { startCount = strokes().length; ctl.redraw(); });
      const off = store.onSignal((p) => {
        if (p.board !== id || p.from === store.me) return;
        if (p.t === 'stroke') ghosts[p.gid] = { board: id, s: p.s, at: Date.now() };
        if (p.t === 'strokeEnd') setTimeout(() => { delete ghosts[p.gid]; if (!ctl.drawing) ctl.redraw(); }, 1500);
        if (!ctl.drawing) ctl.redraw();
      });
      return () => {
        off();
        ctl.destroy();
        if (strokes().length !== startCount) saveThumb(id, strokes(), store.get(id)?.data.bg);
      };
    },
    onChange: (ch) => {
      if (ch.item?.kind === 'stroke' && ch.item.data.gid) delete ghosts[ch.item.data.gid];
      if (ch.item?.id === id && ch.type === 'update') ctl?.setBg(ch.item.data.bg || 'white');
      if (ch.type === 'presence') return false;
      if ((ch.item?.kind === 'stroke' || ch.type === 'remove' || ch.type === 'reload') && !ctl?.drawing) ctl?.redraw();
      return false;
    },
    actions: {
      color: (x, el) => { pen.color = x.c; pen.mode = 'pen'; ctl.setColor(x.c); markPalette(document, el); },
      eraser: (x, el) => { pen.mode = 'erase'; ctl.setErase(); markPalette(document, el); },
      stamp: (x, el) => { pen.mode = 'stamp'; pen.stamp = x.e; ctl.setStamp(x.e); markPalette(document, el); toast(`Tap the canvas to stamp ${x.e}`, 1400); },
      size: (x, el) => { pen.size = Number(x.s); ctl.setSize(pen.size); markPalette(document, el); },
      bg: async (x, el) => {
        document.querySelectorAll('.bg-chip').forEach((c) => { c.classList.toggle('on', c === el); c.textContent = c === el ? '✓' : ''; });
        ctl.setBg(x.b);
        await store.update(id, { bg: x.b });
      },
      undo: () => {
        const mine = store.all('stroke', (s) => s.data.board === id && s.by === store.me);
        const last = mine[mine.length - 1];
        if (last) store.remove(last.id);
      },
      wallpaper: () => makeWallpaper(strokes(), store.get(id)?.data.bg || 'white'),
      save: async () => {
        const cur2 = store.get(id);
        const c = document.createElement('canvas');
        c.width = 800;
        c.height = 1000;
        renderStrokes(c, strokes(), cur2.data.bg);
        const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
        let dataUrl = null;
        if (store.mode === 'demo') { const s2 = document.createElement('canvas'); s2.width = 480; s2.height = 600; renderStrokes(s2, strokes(), cur2.data.bg); dataUrl = s2.toDataURL('image/jpeg', 0.7); }
        const photo = await store.uploadPhoto(blob, dataUrl);
        await store.add('memory', { caption: `🎨 ${cur2.data.title}`, photo, date: today(), place: '', milestone: false });
        await award(10, 'drawing', `drawing-${id}`);
        saveThumb(id, strokes(), cur2.data.bg);
        toast('Saved to Memories 📸');
      },
      more: () => sheet({
        title: esc(b.data.title),
        body: `<button class="btn ghost block" data-rename>✏️ Rename</button><div class="sp"></div>
          <button class="btn ghost block" data-clear>🧹 Clear everything</button><div class="sp"></div>
          <button class="btn ghost block" data-delete>🗑️ Delete drawing</button>`,
        onMount: (el, close) => {
          el.querySelector('[data-rename]').onclick = () => { close(); rename(id, b.data.title); };
          el.querySelector('[data-clear]').onclick = async () => {
            close();
            if (!(await confirmSheet('Clear the whole drawing?', 'This wipes it for both of you.', 'Clear'))) return;
            for (const s of store.all('stroke', (x) => x.data.board === id)) store.remove(s.id);
          };
          el.querySelector('[data-delete]').onclick = async () => {
            close();
            if (!(await confirmSheet('Delete this drawing?', 'It disappears for both of you.', 'Delete'))) return;
            for (const s of store.all('stroke', (x) => x.data.board === id)) store.remove(s.id);
            await store.remove(id);
            location.hash = '#/draw';
          };
        },
      }),
    },
  };
}

function rename(id, title) {
  sheet({
    title: 'Rename drawing',
    body: `<input type="text" data-n maxlength="40" value="${esc(title)}"><div class="sp"></div><button class="btn block" data-save>Save</button>`,
    onMount: (el, close) => {
      el.querySelector('[data-save]').onclick = async () => {
        const t = el.querySelector('[data-n]').value.trim();
        close();
        if (t) { await store.update(id, { title: t }); bus.rerender(); }
      };
    },
  });
}

// A phone-sized image of the drawing to set as your lock screen.
function makeWallpaper(strokes, bg) {
  const W = 1179;
  const H = 2556;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const art = document.createElement('canvas');
  art.width = W;
  art.height = Math.round(W * (CH / CW));
  renderStrokes(art, strokes, bg);
  renderStrokes(c, [], bg);
  ctx.drawImage(art, 0, Math.round((H - art.height) / 2));
  const url = c.toDataURL('image/png');
  const bin = atob(url.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = new File([bytes], 'two-peas-wallpaper.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).then(() => toast('Pick "Save Image", then set it in Photos 📱')).catch(() => {});
    return;
  }
  sheet({
    title: 'Your wallpaper',
    body: `<img src="${url}" style="width:60%;margin:0 auto;border-radius:18px;box-shadow:var(--shadow)"><p class="small muted center" style="margin-top:12px">Press and hold the image, then Save to Photos.</p>`,
  });
}

function saveThumb(id, strokes, bg) {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 300;
  renderStrokes(c, strokes, bg || 'white');
  store.update(id, { thumb: c.toDataURL('image/jpeg', 0.6) });
}
