// A drawing surface shared by Draw Together and Draw & Guess.
// Strokes are stored in a fixed 1000 x 1250 space so they look the same on any phone.
export const CW = 1000;
export const CH = 1250;

export function paintStroke(ctx, s, scale, upto = Infinity) {
  const p = s.p;
  if (!p || p.length < 2) return;
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
}

export function renderStrokes(canvas, strokes) {
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / CW;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const s of strokes) paintStroke(ctx, s, scale);
}

// Interactive canvas. opts: { strokes: () => [], color, size, readOnly, onStroke(stroke) }
export function makeCanvas(wrap, opts) {
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  const ctx = canvas.getContext('2d');
  const state = { color: opts.color || '#3d3833', size: opts.size || 10, cur: null, readOnly: !!opts.readOnly };

  function fit() {
    w = wrap.clientWidth || 320;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * (CH / CW) * dpr);
    canvas.style.height = `${w * (CH / CW)}px`;
    redraw();
  }
  function scale() { return canvas.width / CW; }
  function redraw() {
    renderStrokes(canvas, opts.strokes());
    if (state.cur) paintStroke(ctx, state.cur, scale());
  }
  function pt(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * CW), Math.round(((e.clientY - r.top) / r.height) * CH)];
  }
  function down(e) {
    if (state.readOnly) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    const [x, y] = pt(e);
    state.cur = { c: state.color, w: state.size, p: [x, y] };
    paintStroke(ctx, state.cur, scale());
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
    // draw just the newest segment for speed
    ctx.strokeStyle = state.cur.c;
    ctx.lineWidth = state.cur.w * scale();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx * scale(), ly * scale());
    ctx.lineTo(x * scale(), y * scale());
    ctx.stroke();
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
    setColor(c) { state.color = c; },
    setSize(s) { state.size = s; },
    setReadOnly(v) { state.readOnly = v; },
    get drawing() { return !!state.cur; },
    destroy() { ro.disconnect(); },
    // Replay strokes point by point (for Draw & Guess).
    replay(strokes, ms = 6000) {
      const total = strokes.reduce((a, s) => a + s.p.length / 2, 0) || 1;
      const start = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          const shown = Math.floor(((now - start) / ms) * total);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          let left = shown;
          for (const s of strokes) {
            const n = s.p.length / 2;
            if (left <= 0) break;
            paintStroke(ctx, s, scale(), Math.min(n, left));
            left -= n;
          }
          if (shown < total) requestAnimationFrame(step);
          else { redraw(); resolve(); }
        };
        requestAnimationFrame(step);
      });
    },
  };
}

export const PALETTE = ['#3d3833', '#e8576a', '#f3a06b', '#e7bf3f', '#7cb66b', '#6fb3e3', '#a68fe0', '#ee8fa6', '#8f6748'];
export const SIZES = [5, 10, 20, 36];

export function paletteHTML(color, size) {
  return `<div class="palette">
    ${PALETTE.map((c) => `<button class="swatch ${c === color ? 'on' : ''}" style="background:${c}" data-act="color" data-c="${c}" aria-label="color"></button>`).join('')}
    <button class="swatch ${color === '#ffffff' ? 'on' : ''}" style="background:#fff;display:grid;place-items:center;font-size:15px" data-act="color" data-c="#ffffff" aria-label="eraser">🧽</button>
  </div>
  <div class="palette">${SIZES.map((s) => `<button class="size-btn ${s === size ? 'on' : ''}" data-act="size" data-s="${s}"><i style="width:${Math.max(4, s / 2.4)}px;height:${Math.max(4, s / 2.4)}px"></i></button>`).join('')}</div>`;
}
