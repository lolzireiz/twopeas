// A drawing surface shared by Draw Together and Draw & Guess.
// Strokes live in a fixed 1000 x 1250 space so they look the same on any phone.
// A stroke is { c, w, p: [x,y,...] }, an eraser stroke adds k: 'erase', a stamp is { k: 'stamp', e, x, y, s }.
export const CW = 1000;
export const CH = 1250;

export const BACKGROUNDS = {
  white: { name: 'Plain', base: '#ffffff' },
  paper: { name: 'Notebook', base: '#fffaf0' },
  grid: { name: 'Grid', base: '#ffffff' },
  blush: { name: 'Blush', base: '#fde4ea' },
  mint: { name: 'Mint', base: '#e3f2dc' },
  sky: { name: 'Sky', base: '#e0f0fb' },
  night: { name: 'Night', base: '#27304f' },
};

export function paintBackground(ctx, bg, w, h) {
  const B = BACKGROUNDS[bg] || BACKGROUNDS.white;
  ctx.fillStyle = B.base;
  ctx.fillRect(0, 0, w, h);
  const sc = w / CW;
  if (bg === 'paper') {
    ctx.strokeStyle = '#d7e6f5';
    ctx.lineWidth = 2 * sc;
    for (let y = 90; y < CH; y += 60) { ctx.beginPath(); ctx.moveTo(0, y * sc); ctx.lineTo(w, y * sc); ctx.stroke(); }
    ctx.strokeStyle = '#f5b9c4';
    ctx.beginPath(); ctx.moveTo(90 * sc, 0); ctx.lineTo(90 * sc, h); ctx.stroke();
  } else if (bg === 'grid') {
    ctx.strokeStyle = '#eee6dc';
    ctx.lineWidth = 2 * sc;
    for (let x = 50; x < CW; x += 50) { ctx.beginPath(); ctx.moveTo(x * sc, 0); ctx.lineTo(x * sc, h); ctx.stroke(); }
    for (let y = 50; y < CH; y += 50) { ctx.beginPath(); ctx.moveTo(0, y * sc); ctx.lineTo(w, y * sc); ctx.stroke(); }
  } else if (bg === 'night') {
    ctx.fillStyle = '#fff6c9';
    [[120, 140], [300, 80], [520, 200], [760, 110], [880, 300], [180, 420], [640, 360], [90, 900], [930, 820], [420, 1120]].forEach(([x, y], i) => {
      ctx.globalAlpha = 0.5 + (i % 3) * 0.2;
      ctx.beginPath(); ctx.arc(x * sc, y * sc, (i % 3 ? 3 : 5) * sc, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

export function paintStroke(ctx, s, scale, upto = Infinity) {
  if (s.k === 'stamp') {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${s.s * scale}px system-ui, "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.e, s.x * scale, s.y * scale);
    ctx.restore();
    return;
  }
  const p = s.p;
  if (!p || p.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = s.k === 'erase' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.c;
  ctx.fillStyle = s.c;
  ctx.lineWidth = s.w * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = Math.min(p.length / 2, upto);
  if (n === 1) {
    ctx.beginPath();
    ctx.arc(p[0] * scale, p[1] * scale, (s.w * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(p[0] * scale, p[1] * scale);
  for (let i = 1; i < n; i++) {
    const x = p[i * 2] * scale;
    const y = p[i * 2 + 1] * scale;
    if (i < n - 1) {
      const nx = p[i * 2 + 2] * scale;
      const ny = p[i * 2 + 3] * scale;
      ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Strokes go on their own layer so the eraser never wipes the background.
let layer = null;
function layerFor(w, h) {
  if (!layer) layer = document.createElement('canvas');
  if (layer.width !== w || layer.height !== h) { layer.width = w; layer.height = h; }
  return layer;
}

export function renderStrokes(canvas, strokes, bg = 'white', upto = Infinity) {
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / CW;
  paintBackground(ctx, bg, canvas.width, canvas.height);
  const L = layerFor(canvas.width, canvas.height);
  const lc = L.getContext('2d');
  lc.clearRect(0, 0, L.width, L.height);
  let left = upto;
  for (const s of strokes) {
    if (left <= 0) break;
    const n = s.k === 'stamp' ? 1 : s.p.length / 2;
    paintStroke(lc, s, scale, Math.min(n, left));
    left -= n;
  }
  ctx.drawImage(L, 0, 0);
}

// Interactive canvas. opts: { strokes: () => [], extra: () => [], bg, color, size, readOnly, onStroke(stroke), onMove(stroke) }
export function makeCanvas(wrap, opts) {
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  const ctx = canvas.getContext('2d');
  const state = { color: opts.color || '#3d3833', size: opts.size || 10, cur: null, readOnly: !!opts.readOnly, stamp: null, erase: false, bg: opts.bg || 'white' };

  function fit() {
    w = wrap.clientWidth || 320;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * (CH / CW) * dpr);
    canvas.style.height = `${w * (CH / CW)}px`;
    redraw();
  }
  const scale = () => canvas.width / CW;
  function redraw() {
    const all = opts.strokes().concat(opts.extra ? opts.extra() : []);
    if (state.cur) all.push(state.cur);
    renderStrokes(canvas, all, state.bg);
  }
  function pt(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * CW), Math.round(((e.clientY - r.top) / r.height) * CH)];
  }
  function down(e) {
    if (state.readOnly) return;
    e.preventDefault();
    const [x, y] = pt(e);
    if (state.stamp) {
      const st = { k: 'stamp', e: state.stamp, x, y, s: 60 + state.size * 3 };
      opts.onStroke && opts.onStroke(st);
      redraw();
      return;
    }
    canvas.setPointerCapture?.(e.pointerId);
    state.cur = { c: state.erase ? '#000' : state.color, w: state.erase ? Math.max(30, state.size * 2) : state.size, p: [x, y] };
    if (state.erase) state.cur.k = 'erase';
    redraw();
    opts.onMove && opts.onMove(state.cur);
  }
  function move(e) {
    if (!state.cur) return;
    e.preventDefault();
    const [x, y] = pt(e);
    const p = state.cur.p;
    const lx = p[p.length - 2];
    const ly = p[p.length - 1];
    if (Math.hypot(x - lx, y - ly) < 4) return;
    p.push(x, y);
    if (state.erase) { redraw(); } else {
      ctx.strokeStyle = state.cur.c;
      ctx.lineWidth = state.cur.w * scale();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx * scale(), ly * scale());
      ctx.lineTo(x * scale(), y * scale());
      ctx.stroke();
    }
    opts.onMove && opts.onMove(state.cur);
  }
  function up() {
    if (!state.cur) return;
    const s = state.cur;
    state.cur = null;
    opts.onStroke && opts.onStroke(s);
    redraw();
  }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  const ro = new ResizeObserver(() => { if (Math.abs(wrap.clientWidth - w) > 1) fit(); });
  ro.observe(wrap);
  fit();

  return {
    canvas,
    redraw,
    setColor(c) { state.color = c; state.erase = false; state.stamp = null; },
    setErase() { state.erase = true; state.stamp = null; },
    setStamp(e) { state.stamp = e; state.erase = false; },
    setSize(s) { state.size = s; },
    setBg(b) { state.bg = b; redraw(); },
    setReadOnly(v) { state.readOnly = v; },
    get drawing() { return !!state.cur; },
    destroy() { ro.disconnect(); },
    replay(strokes, ms = 6000) {
      const total = strokes.reduce((a, s) => a + (s.k === 'stamp' ? 1 : s.p.length / 2), 0) || 1;
      const start = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          const shown = Math.floor(((now - start) / ms) * total);
          renderStrokes(canvas, strokes, state.bg, shown);
          if (shown < total) requestAnimationFrame(step);
          else { redraw(); resolve(); }
        };
        requestAnimationFrame(step);
      });
    },
  };
}

export const PALETTE = ['#3d3833', '#ffffff', '#e8576a', '#f3a06b', '#e7bf3f', '#7cb66b', '#6fb3e3', '#a68fe0', '#ee8fa6', '#8f6748'];
export const SIZES = [5, 10, 20, 36];
export const STAMPS = ['💚', '💗', '⭐', '✨', '🌸', '🌈', '☁️', '🔥', '😘', '🥺', '🐾', '🫛'];

export function paletteHTML(color, size, { stamps = false, mode = 'pen', stamp = null } = {}) {
  return `<div class="palette">
    ${PALETTE.map((c) => `<button class="swatch ${mode === 'pen' && c === color ? 'on' : ''}" style="background:${c}" data-act="color" data-c="${c}" aria-label="color"></button>`).join('')}
    <button class="swatch ${mode === 'erase' ? 'on' : ''}" style="background:#fff;display:grid;place-items:center;font-size:15px" data-act="eraser" aria-label="eraser">🧽</button>
  </div>
  <div class="palette">${SIZES.map((s) => `<button class="size-btn ${s === size ? 'on' : ''}" data-act="size" data-s="${s}"><i style="width:${Math.max(4, s / 2.4)}px;height:${Math.max(4, s / 2.4)}px"></i></button>`).join('')}
    ${stamps ? `<span class="pal-sep"></span>${STAMPS.map((e) => `<button class="stamp-btn ${mode === 'stamp' && stamp === e ? 'on' : ''}" data-act="stamp" data-e="${e}">${e}</button>`).join('')}` : ''}
  </div>`;
}

// Keep palette buttons highlighted after a tap without redrawing the page.
export function markPalette(root, el) {
  root.querySelectorAll('.swatch, .stamp-btn').forEach((b) => b.classList.remove('on'));
  if (el.classList.contains('size-btn')) {
    root.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('on', b === el));
  } else el.classList.add('on');
}
