// Small helpers shared by every screen.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export const uid = (n = 12) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
};

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
export const parseDay = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k, n) => {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
export const daysBetween = (aKey, bKey) => Math.round((parseDay(bKey) - parseDay(aKey)) / 864e5);

// Monday of the week, as a day key.
export const weekKey = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return dayKey(x);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDay = (k, opts = {}) => {
  if (!k) return '';
  const d = parseDay(k);
  const s = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return opts.year || d.getFullYear() !== new Date().getFullYear() ? `${s}, ${d.getFullYear()}` : s;
};
export const monthName = (m) => MONTHS_LONG[m];
export const fmtTime = (ts) => {
  const d = new Date(ts);
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())}${ap}`;
};

export const timeAgo = (ts) => {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const days = Math.round(s / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return fmtDay(dayKey(new Date(ts)));
};

export const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Deterministic shuffle so both phones agree on the same order.
export const seededShuffle = (arr, seed) => {
  const a = arr.slice();
  let s = hash(String(seed)) || 1;
  const rnd = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---- Toasts, sheets, confetti ----

export function toast(msg, ms = 2600) {
  let wrap = document.getElementById('toasts');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toasts';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// A bottom sheet. body is HTML. Returns {el, close}. onMount(el) wires it up.
export function sheet({ title = '', body = '', onMount, onClose, tall = false }) {
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.innerHTML = `<div class="sheet ${tall ? 'tall' : ''}" role="dialog">
    <div class="sheet-grab"></div>
    ${title ? `<div class="sheet-title">${title}</div>` : ''}
    <div class="sheet-body">${body}</div>
  </div>`;
  document.body.appendChild(back);
  const el = back.querySelector('.sheet');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove('in');
    setTimeout(() => back.remove(), 260);
    onClose && onClose();
  };
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  requestAnimationFrame(() => back.classList.add('in'));
  onMount && onMount(el, close);
  return { el, close };
}

export function confirmSheet(title, text, yes = 'Yes', no = 'Cancel') {
  return new Promise((resolve) => {
    sheet({
      title,
      body: `<p class="muted center">${text}</p><div class="sp2"></div>
        <div class="row gap"><button class="btn ghost grow" data-no>${no}</button><button class="btn grow" data-yes>${yes}</button></div>`,
      onMount: (el, close) => {
        el.querySelector('[data-no]').onclick = () => { resolve(false); close(); };
        el.querySelector('[data-yes]').onclick = () => { resolve(true); close(); };
      },
      onClose: () => resolve(false),
    });
  });
}

export function confetti(count = 70) {
  const colors = ['#7cb66b', '#ee8fa6', '#a68fe0', '#6fb3e3', '#f3a06b', '#e7bf3f'];
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (i % 3 === 0) p.style.borderRadius = '50%';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3400);
}

export function floatHearts(x, y, n = 5) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'float-heart';
    h.textContent = ['💚', '💗', '💕'][i % 3];
    h.style.left = `${x + (Math.random() - 0.5) * 60}px`;
    h.style.top = `${y}px`;
    h.style.animationDelay = `${i * 0.08}s`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1600);
  }
}

// Shrink a photo before saving: max edge px, JPEG quality.
export async function compressImage(file, max = 1280, quality = 0.78) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
    const dataUrl = c.toDataURL('image/jpeg', quality);
    return { blob, dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const lsGet = (k, fallback = null) => {
  try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
};
export const lsSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};
