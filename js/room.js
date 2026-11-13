// The pet's room: a little scene with depth, a window that shows the real time of day
// and today's weather, warm lights at night, and lots of decor to buy.
// Room is drawn in a 360 x 300 box. Wall is y 0-200, floor 200-300.

let seq = 0;
const nid = (p) => `${p}${++seq}`;
const heart = (x, y, s, fill) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C-1-2 -9-2 -9 4 C-9 9 -3 12 0 15 C3 12 9 9 9 4 C9-2 1-2 0 3Z" fill="${fill}"/>`;
const star = (x, y, r, fill, extra = '') => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; p.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(' ')}" fill="${fill}" ${extra}/>`;
};
const pot = (x, col = '#e58f68', rim = '#d27a53') => `<path d="M${x - 17} 238 L${x + 17} 238 L${x + 11} 268 L${x - 11} 268 Z" fill="${col}"/><rect x="${x - 21}" y="232" width="42" height="9" rx="4" fill="${rim}"/><path d="M${x - 12} 246 l2 14" stroke="#fff" stroke-width="2" opacity=".25" stroke-linecap="round"/>`;

// ---------- Time of day & weather ----------
export function phaseOf(h = (typeof window !== 'undefined' && window.__petHour != null ? window.__petHour : new Date().getHours())) {
  if (h >= 21 || h < 5) return 'night';
  if (h < 7) return 'dawn';
  if (h < 17) return 'day';
  if (h < 19) return 'sunset';
  return 'dusk';
}
const SKY = {
  night: ['#1b2152', '#33307a'], dawn: ['#f7b7c8', '#ffe2b8'], day: ['#8fd0f7', '#d6efff'], sunset: ['#f78f6b', '#ffd18a'], dusk: ['#5a4a9a', '#e58fb0'],
};
export function weatherOf(d = new Date()) {
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = (h % 100) / 100;
  const winter = [11, 0, 1].includes(d.getMonth());
  if (r < 0.55) return 'clear';
  if (r < 0.78) return 'cloudy';
  if (r < 0.92) return winter ? 'snow' : 'rain';
  return winter ? 'snow' : 'cloudy';
}

// What you see through a window opening (x, y, w, h).
function skyView(x, y, w, h, phase, weather, clipId) {
  const g = nid('sky');
  const [a, b] = SKY[phase];
  const dark = phase === 'night' || phase === 'dusk';
  let s = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <g clip-path="url(#${clipId})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${g})"/>`;
  if (dark) {
    for (let i = 0; i < 9; i++) s += `<circle class="twinkle" style="animation-delay:${(i * 0.37).toFixed(2)}s" cx="${x + ((i * 37) % w)}" cy="${y + ((i * 23) % (h * 0.7)) + 4}" r="${i % 3 ? 0.9 : 1.5}" fill="#fff8d6"/>`;
    s += `<path d="M${x + w * 0.72} ${y + h * 0.18} a10 10 0 1 0 11 15 a8 8 0 1 1 -11 -15z" fill="#fff1a8"/>`;
  } else if (phase === 'day') {
    s += `<circle cx="${x + w * 0.76}" cy="${y + h * 0.26}" r="10" fill="#ffe27a"/><circle cx="${x + w * 0.76}" cy="${y + h * 0.26}" r="16" fill="#ffe27a" opacity=".3"/>`;
  } else {
    s += `<circle cx="${x + w * 0.3}" cy="${y + h * 0.8}" r="13" fill="#ffd36b" opacity=".95"/>`;
  }
  // distant hills
  s += `<path d="M${x} ${y + h} Q${x + w * 0.25} ${y + h * 0.66} ${x + w * 0.5} ${y + h * 0.84} Q${x + w * 0.75} ${y + h * 0.62} ${x + w} ${y + h * 0.8} V${y + h} Z" fill="${dark ? '#2b3a5c' : phase === 'day' ? '#9ed48a' : '#c98fa0'}" opacity=".9"/>`;
  if (weather === 'cloudy' || weather === 'rain' || weather === 'snow') {
    const cc = weather === 'rain' ? '#c9d2e0' : dark ? '#7f86b5' : '#fff';
    s += `<g class="drift">${[0.15, 0.55].map((f, i) => `<g transform="translate(${x + w * f} ${y + h * (0.28 + i * 0.16)})"><circle r="8" fill="${cc}"/><circle cx="9" cy="-3" r="10" fill="${cc}"/><circle cx="19" r="7" fill="${cc}"/><rect x="0" y="0" width="20" height="7" fill="${cc}"/></g>`).join('')}</g>`;
  }
  if (weather === 'rain') s += `<g class="rain" stroke="#a9c6ec" stroke-width="1.6" stroke-linecap="round">${Array.from({ length: 10 }, (_, i) => `<path d="M${x + 6 + ((i * 17) % (w - 8))} ${y + 8 + ((i * 13) % 30)} l-3 8"/>`).join('')}</g>`;
  if (weather === 'snow') s += `<g class="snow" fill="#fff">${Array.from({ length: 12 }, (_, i) => `<circle cx="${x + 4 + ((i * 19) % (w - 6))}" cy="${y + 6 + ((i * 11) % (h - 10))}" r="${i % 3 ? 1.6 : 2.4}"/>`).join('')}</g>`;
  return `${s}</g>`;
}

// ---------- Walls ----------
const pattern = (w, h, inner) => { const p = nid('wp'); return { id: p, def: `<pattern id="${p}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inner}</pattern>` }; };
const WALLS = {
  default: () => pattern(40, 40, '<rect width="40" height="40" fill="#fbefe2"/><circle cx="20" cy="20" r="1.6" fill="#f0dcc6"/>'),
  'wall-stripes': () => pattern(28, 28, '<rect width="28" height="28" fill="#fde4ea"/><rect width="12" height="28" fill="#f9cfd9"/>'),
  'wall-dots': () => pattern(24, 24, '<rect width="24" height="24" fill="#dff3ea"/><circle cx="6" cy="6" r="3" fill="#fff"/><circle cx="18" cy="18" r="3" fill="#fff"/>'),
  'wall-hearts': () => pattern(34, 34, `<rect width="34" height="34" fill="#ece6fb"/>${heart(9, 6, 0.5, '#d9cdf7')}${heart(26, 22, 0.5, '#d9cdf7')}`),
  'wall-stars': () => pattern(60, 60, `<rect width="60" height="60" fill="#2f3a63"/><circle cx="10" cy="12" r="1.6" fill="#fff6c9"/><circle cx="42" cy="30" r="2.4" fill="#fff6c9"/><circle cx="24" cy="50" r="1.3" fill="#fff6c9"/>${star(50, 8, 3, '#fff6c9')}`),
  'wall-clouds': () => pattern(90, 70, '<rect width="90" height="70" fill="#d8eefc"/><g fill="#fff"><circle cx="20" cy="22" r="8"/><circle cx="30" cy="18" r="10"/><circle cx="40" cy="22" r="7"/><rect x="20" y="22" width="20" height="8"/><circle cx="66" cy="54" r="6"/><circle cx="74" cy="51" r="8"/><circle cx="82" cy="54" r="5"/><rect x="66" y="54" width="16" height="6"/></g>'),
  'wall-gingham': () => pattern(24, 24, '<rect width="24" height="24" fill="#fff7d6"/><rect width="12" height="24" fill="#fbe9a6" opacity=".7"/><rect width="24" height="12" fill="#fbe9a6" opacity=".7"/>'),
  'wall-wood': () => pattern(36, 200, '<rect width="36" height="200" fill="#d9b28a"/><rect width="2" height="200" fill="#c09670"/><path d="M14 30 q3 6 0 12 M24 120 q3 6 0 12" stroke="#c9a17a" stroke-width="2" fill="none"/>'),
  'wall-plaid': () => pattern(40, 40, '<rect width="40" height="40" fill="#c94444"/><rect x="16" width="8" height="40" fill="#2f5d3a" opacity=".55"/><rect y="16" width="40" height="8" fill="#2f5d3a" opacity=".55"/><rect x="0" y="0" width="2" height="40" fill="#f2d36b" opacity=".5"/>'),
  'wall-ocean': () => pattern(60, 30, '<rect width="60" height="30" fill="#bfe6f2"/><path d="M0 18 Q15 10 30 18 T60 18" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>'),
  'wall-rainbow': () => ({ id: null, def: '', fill: 'rainbow' }),
  'wall-brick': () => pattern(48, 24, '<rect width="48" height="24" fill="#e8a088"/><g stroke="#f6d9cc" stroke-width="2"><path d="M0 0 H48 M0 12 H48 M24 0 V12 M0 12 V24 M48 12 V24"/></g>'),
  'wall-sakura': () => pattern(56, 56, `<rect width="56" height="56" fill="#fff0f4"/>${[[12, 14], [40, 40]].map(([x, y]) => [0, 72, 144, 216, 288].map((a) => `<ellipse cx="${(x + 4 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(y + 4 * Math.sin(a * Math.PI / 180)).toFixed(1)}" rx="3.2" ry="2.4" fill="#f7c1d0" transform="rotate(${a} ${(x + 4 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(y + 4 * Math.sin(a * Math.PI / 180)).toFixed(1)})"/>`).join('')).join('')}`),
};
function wallSVG(id) {
  const w = (WALLS[id] || WALLS.default)();
  if (w.fill === 'rainbow') {
    const cols = ['#f9c6d3', '#fbd9b0', '#fdf0b0', '#d3efc4', '#cde6fa', '#ddd2f7'];
    return cols.map((c, i) => `<rect x="${i * 60}" width="60" height="204" fill="${c}"/>`).join('');
  }
  return `<defs>${w.def}</defs><rect width="360" height="204" fill="url(#${w.id})"/>`;
}

// ---------- Floors ----------
const FLOORS = {
  default: { base: '#e6c49d', line: '#d6b089', top: '#f0d6b6' },
  'floor-oak': { base: '#f1dcbc', line: '#e0c49e', top: '#f8ead4' },
  'floor-walnut': { base: '#9a6a46', line: '#83583a', top: '#ad7c56' },
  'floor-checker': { checker: ['#f7f1e8', '#e3d5c4'] },
  'floor-carpet': { base: '#f4c6d2', line: null, top: '#f9d8e1', fuzzy: true },
  'floor-tile': { checker: ['#e3f1f8', '#cfe5f1'] },
  'floor-grass': { base: '#9ed48a', line: null, top: '#b6e2a3', grass: true },
};
function floorSVG(id) {
  const f = FLOORS[id] || FLOORS.default;
  const g = nid('fl');
  let s = '';
  if (f.checker) {
    const p = nid('ck');
    s = `<defs><pattern id="${p}" width="40" height="20" patternUnits="userSpaceOnUse"><rect width="40" height="20" fill="${f.checker[0]}"/><rect width="20" height="10" fill="${f.checker[1]}"/><rect x="20" y="10" width="20" height="10" fill="${f.checker[1]}"/></pattern></defs><rect y="200" width="360" height="100" fill="url(#${p})"/>`;
  } else {
    s = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.top}"/><stop offset="1" stop-color="${f.base}"/></linearGradient></defs><rect y="200" width="360" height="100" fill="url(#${g})"/>`;
    if (f.line) s += `<g stroke="${f.line}" stroke-width="2"><path d="M0 232 H360"/><path d="M0 266 H360"/><path d="M80 200 V232 M220 200 V232 M150 232 V266 M300 232 V266 M60 266 V300 M240 266 V300"/></g>`;
    if (f.fuzzy) s += `<g fill="#fff" opacity=".25">${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 47) % 360}" cy="${206 + ((i * 29) % 90)}" r="1.4"/>`).join('')}</g>`;
    if (f.grass) s += `<g stroke="#7cb66b" stroke-width="2" stroke-linecap="round">${Array.from({ length: 34 }, (_, i) => { const x = (i * 53) % 360; const y = 208 + ((i * 31) % 88); return `<path d="M${x} ${y} l-2 -6 M${x + 3} ${y} l1 -7"/>`; }).join('')}</g>`;
  }
  // Baseboard + soft shadow where the wall meets the floor.
  return `${s}<rect y="194" width="360" height="10" fill="#fffaf3"/><rect y="203" width="360" height="3" fill="#000" opacity=".06"/>`;
}

// ---------- Decor ----------
const windowFrame = (x, y, w, h, phase, weather, shape = 'rect', frameCol = '#fff') => {
  const clip = nid('wc');
  const shapeEl = shape === 'arch'
    ? `<path d="M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z"/>`
    : shape === 'round' ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/>`;
  const outline = shapeEl.replace('/>', ` fill="none" stroke="${frameCol}" stroke-width="7"/>`);
  return `<defs><clipPath id="${clip}">${shapeEl}</clipPath></defs>${skyView(x, y, w, h, phase, weather, clip)}${outline}`;
};

function windowPart(id, phase, weather) {
  switch (id) {
    case 'window-day': // Sunny window with a flower box
      return `${windowFrame(36, 30, 84, 74, phase, weather)}<path d="M78 30 V104 M36 67 H120" stroke="#fff" stroke-width="4"/>
        <rect x="30" y="104" width="96" height="16" rx="4" fill="#c98f5a"/>${[44, 58, 72, 86, 100, 112].map((x, i) => `<circle cx="${x}" cy="102" r="5" fill="${['#ee8fa6', '#f2d36b', '#a68fe0'][i % 3]}"/><circle cx="${x}" cy="102" r="2" fill="#fff6c9"/>`).join('')}`;
    case 'window-arch':
      return `${windowFrame(40, 22, 76, 92, phase, weather, 'arch', '#fffaf3')}<path d="M78 30 V114 M40 76 H116" stroke="#fffaf3" stroke-width="4"/><rect x="32" y="112" width="92" height="8" rx="4" fill="#f4e1cc"/>`;
    case 'window-round':
      return `${windowFrame(42, 32, 72, 72, phase, weather, 'round', '#b9c7d6')}<circle cx="78" cy="68" r="40" fill="none" stroke="#8fa3b8" stroke-width="3"/>${[0, 90, 180, 270].map((a) => `<circle cx="${(78 + 40 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(68 + 40 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="3" fill="#8fa3b8"/>`).join('')}`;
    case 'window-bay':
      return `${windowFrame(22, 24, 120, 90, phase, weather)}<path d="M62 24 V114 M102 24 V114" stroke="#fff" stroke-width="4"/>
        <path d="M14 20 Q38 46 30 120 L14 120 Z" fill="#a6d2f2"/><path d="M150 20 Q126 46 134 120 L150 120 Z" fill="#a6d2f2"/><rect x="10" y="16" width="144" height="6" rx="3" fill="#c9b9a6"/><rect x="18" y="114" width="128" height="10" rx="4" fill="#f4e1cc"/>`;
    case 'window-heart': {
      const clip = nid('wc');
      const path = 'M78 52 C74 30 38 30 38 58 C38 80 62 94 78 108 C94 94 118 80 118 58 C118 30 82 30 78 52Z';
      return `<defs><clipPath id="${clip}"><path d="${path}"/></clipPath></defs>${skyView(36, 28, 84, 82, phase, weather, clip)}<path d="${path}" fill="none" stroke="#f6b9c8" stroke-width="7"/>`;
    }
    default: // plain window
      return `${windowFrame(40, 36, 76, 66, phase, weather)}<path d="M78 36 V102 M40 69 H116" stroke="#fff" stroke-width="4"/><rect x="32" y="102" width="92" height="8" rx="4" fill="#f4e1cc"/>
        <path d="M30 30 Q46 70 40 110 L30 110 Z" fill="#f6d3dc" opacity=".9"/><path d="M126 30 Q110 70 116 110 L126 110 Z" fill="#f6d3dc" opacity=".9"/><rect x="26" y="26" width="104" height="5" rx="2.5" fill="#c9b9a6"/>`;
  }
}

function clockFace() {
  const d = new Date();
  const h = (d.getHours() % 12) + d.getMinutes() / 60; const m = d.getMinutes();
  const ha = (h / 12) * 360 - 90; const ma = (m / 60) * 360 - 90;
  const cx = 268; const cy = 72;
  return `<circle cx="${cx}" cy="${cy}" r="28" fill="#fff" stroke="#ee8fa6" stroke-width="6"/>${[0, 90, 180, 270].map((a) => `<circle cx="${(cx + 20 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(cy + 20 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="2" fill="#c9b9a6"/>`).join('')}
    <path d="M${cx} ${cy} L${(cx + 12 * Math.cos(ha * Math.PI / 180)).toFixed(1)} ${(cy + 12 * Math.sin(ha * Math.PI / 180)).toFixed(1)}" stroke="#3b3330" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M${cx} ${cy} L${(cx + 18 * Math.cos(ma * Math.PI / 180)).toFixed(1)} ${(cy + 18 * Math.sin(ma * Math.PI / 180)).toFixed(1)}" stroke="#3b3330" stroke-width="2.2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="3" fill="#ee6f8f"/>
    <circle cx="${cx - 20}" cy="${cy - 24}" r="7" fill="#ee8fa6"/><circle cx="${cx + 20}" cy="${cy - 24}" r="7" fill="#ee8fa6"/>`;
}

const frameBox = (stroke, inner, fill = '#fff') => `<rect x="240" y="48" width="56" height="48" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="4"/>${inner}<rect x="243" y="51" width="50" height="10" rx="3" fill="#fff" opacity=".25"/>`;

const PARTS = {
  // Wall art
  'frame-pea': () => frameBox('#e2c9ad', '<path d="M250 76 Q268 92 286 76 Q268 66 250 76Z" fill="#7cb66b"/><circle cx="262" cy="77" r="5" fill="#a5d68f"/><circle cx="274" cy="77" r="5" fill="#a5d68f"/>'),
  'frame-heart': () => frameBox('#ee8fa6', heart(268, 60, 1.25, '#ee8fa6')),
  'frame-gold': () => `<rect x="236" y="44" width="64" height="56" rx="6" fill="#fff8e1" stroke="#e7bf3f" stroke-width="6"/>${heart(268, 54, 1.0, '#ee8fa6')}<path d="M250 84 Q268 98 286 84 Q268 76 250 84Z" fill="#7cb66b"/><circle cx="262" cy="85" r="4" fill="#a5d68f"/><circle cx="274" cy="85" r="4" fill="#a5d68f"/>`,
  'frame-mountains': () => frameBox('#b9875a', '<rect x="244" y="52" width="48" height="40" fill="#cfe9fb"/><path d="M244 92 L260 66 L270 80 L280 62 L292 92Z" fill="#7aa3c9"/><path d="M260 66 l-4 7 h8z M280 62 l-4 7 h8z" fill="#fff"/><circle cx="286" cy="60" r="4" fill="#ffe27a"/>'),
  'frame-polaroids': () => `<path d="M224 44 Q268 58 312 44" stroke="#8a7f77" stroke-width="1.5" fill="none"/>${[[232, 50, -8, '#f9c6d3'], [258, 54, 4, '#cde6fa'], [284, 52, -3, '#d3efc4']].map(([x, y, r, c]) => `<g transform="rotate(${r} ${x + 11} ${y})"><rect x="${x}" y="${y}" width="22" height="26" fill="#fff" stroke="#eee" stroke-width="1"/><rect x="${x + 3}" y="${y + 3}" width="16" height="15" fill="${c}"/>${heart(x + 11, y + 6, 0.45, '#ee6f8f')}<rect x="${x + 8}" y="${y - 3}" width="6" height="5" fill="#c9b9a6"/></g>`).join('')}`,
  'frame-portrait': () => frameBox('#a68fe0', '<rect x="244" y="52" width="48" height="40" fill="#fde4ea"/><circle cx="260" cy="76" r="9" fill="#93d06e"/><circle cx="276" cy="76" r="9" fill="#93d06e"/><circle cx="257" cy="74" r="1.4" fill="#3b3330"/><circle cx="263" cy="74" r="1.4" fill="#3b3330"/><circle cx="273" cy="74" r="1.4" fill="#3b3330"/><circle cx="279" cy="74" r="1.4" fill="#3b3330"/>' + heart(268, 54, 0.6, '#ee6f8f')),
  'frame-clock': () => clockFace(),
  'frame-mirror': () => `<ellipse cx="268" cy="72" rx="26" ry="34" fill="#dff0fa" stroke="#e7bf3f" stroke-width="5"/><path d="M252 56 l12 -10 M256 72 l18 -16" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>`,
  'frame-cork': () => `<rect x="232" y="44" width="72" height="56" rx="4" fill="#d6a874" stroke="#b9875a" stroke-width="4"/><rect x="240" y="52" width="20" height="18" fill="#fff8b0" transform="rotate(-6 250 61)"/><rect x="266" y="54" width="22" height="16" fill="#cde6fa" transform="rotate(5 277 62)"/><rect x="248" y="74" width="24" height="18" fill="#f9c6d3" transform="rotate(3 260 83)"/><circle cx="250" cy="53" r="2.4" fill="#e04848"/><circle cx="277" cy="55" r="2.4" fill="#6fb3e3"/><circle cx="260" cy="76" r="2.4" fill="#7cb66b"/>${heart(286, 80, 0.6, '#ee6f8f')}`,

  // Shelf (center wall)
  'shelf-books': () => `<rect x="138" y="94" width="86" height="6" rx="2" fill="#c98f5a"/>${[[144, 22, '#ee8fa6'], [152, 26, '#6fb3e3'], [160, 20, '#f2d36b'], [168, 24, '#7cb66b'], [178, 18, '#a68fe0']].map(([x, h, c]) => `<rect x="${x}" y="${94 - h}" width="7" height="${h}" rx="1.5" fill="${c}"/>`).join('')}<rect x="184" y="76" width="7" height="18" rx="1.5" fill="#f3a06b" transform="rotate(14 188 94)"/><circle cx="210" cy="84" r="9" fill="#93d06e"/><rect x="204" y="86" width="12" height="8" rx="2" fill="#e58f68"/>`,
  'shelf-plants': () => `<rect x="138" y="94" width="86" height="6" rx="2" fill="#fffaf3" stroke="#e8dccb" stroke-width="1"/>${[150, 180, 210].map((x, i) => `<path d="M${x - 7} 84 h14 l-2 10 h-10z" fill="${['#e58f68', '#a6d2f2', '#f9c6d3'][i]}"/><path d="M${x} 84 q-8 -12 -2 -16 M${x} 84 q6 -14 2 -18 M${x} 84 q10 -6 10 -12" stroke="#5f9f44" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join('')}<path d="M210 94 q-4 14 -2 24 M214 94 q2 12 6 18" stroke="#5f9f44" stroke-width="2" fill="none"/>`,
  'shelf-trophies': () => `<rect x="138" y="94" width="86" height="6" rx="2" fill="#8a5a3a"/><path d="M150 74 h16 q0 12 -8 14 q-8 -2 -8 -14z" fill="#f2c94c"/><rect x="154" y="88" width="8" height="6" fill="#d9a920"/><path d="M178 80 h12 q0 9 -6 10 q-6 -1 -6 -10z" fill="#cfd6e3"/><rect x="181" y="90" width="6" height="4" fill="#aab3c3"/>${star(208, 82, 10, '#f2c94c', 'stroke="#d9a920" stroke-width="1.5"')}`,
  'shelf-candy': () => `<rect x="138" y="94" width="86" height="6" rx="2" fill="#fffaf3" stroke="#e8dccb" stroke-width="1"/>${[[156, '#f9c6d3'], [182, '#cde6fa'], [208, '#fdf0b0']].map(([x, c]) => `<rect x="${x - 11}" y="70" width="22" height="24" rx="6" fill="${c}" opacity=".8" stroke="#fff" stroke-width="2"/><rect x="${x - 8}" y="66" width="16" height="5" rx="2" fill="#ee8fa6"/>${[[-5, 80], [3, 84], [-2, 88], [5, 78]].map(([dx, y], i) => `<circle cx="${x + dx}" cy="${y}" r="3" fill="${['#e04848', '#7cb66b', '#a68fe0', '#f2d36b'][i]}"/>`).join('')}`).join('')}`,
  'shelf-fishbowl': () => `<rect x="138" y="94" width="86" height="6" rx="2" fill="#c98f5a"/><circle cx="180" cy="76" r="18" fill="#cfeefc" stroke="#fff" stroke-width="2" opacity=".95"/><path d="M164 70 h32" stroke="#a6d8f2" stroke-width="2"/><g class="fish"><ellipse cx="178" cy="80" rx="6" ry="4" fill="#f3a06b"/><path d="M184 80 l6 -4 v8z" fill="#f3a06b"/><circle cx="175" cy="79" r="1" fill="#3b3330"/></g><path d="M170 92 q4 -6 2 -10 M190 92 q-3 -5 0 -9" stroke="#7cb66b" stroke-width="2" fill="none"/>`,
  'shelf-records': () => `<rect x="138" y="94" width="86" height="6" rx="2" fill="#8a5a3a"/><rect x="146" y="78" width="40" height="16" rx="3" fill="#e8576a"/><circle cx="160" cy="78" r="12" fill="#2f2c2b"/><circle cx="160" cy="78" r="4" fill="#f2d36b"/><path d="M174 70 l8 6" stroke="#cfd6e3" stroke-width="2"/><g fill="#a68fe0"><rect x="196" y="72" width="4" height="22"/><rect x="202" y="70" width="4" height="24" fill="#6fb3e3"/><rect x="208" y="73" width="4" height="21" fill="#f2d36b"/></g><g class="note-float" fill="#3b3330" opacity=".6"><text x="150" y="58" font-size="12">♪</text><text x="168" y="50" font-size="10">♫</text></g>`,

  // Lights (along the top)
  'lights-fairy': (night) => `<path d="M0 14 Q45 34 90 14 Q135 34 180 14 Q225 34 270 14 Q315 34 360 14" stroke="#6b5d52" stroke-width="1.5" fill="none"/>${[22, 45, 68, 112, 135, 158, 202, 225, 248, 292, 315, 338].map((x, i) => { const y = 14 + 20 * Math.sin(((x % 90) / 90) * Math.PI) * 0.5 + 4; const col = ['#f2d36b', '#ee8fa6', '#6fb3e3', '#7cb66b'][i % 4]; return `<circle cx="${x}" cy="${y.toFixed(1)}" r="${night ? 12 : 9}" fill="${col}" opacity="${night ? 0.4 : 0.22}" class="${night ? 'glow' : ''}"/><circle cx="${x}" cy="${y.toFixed(1)}" r="4.2" fill="${col}"/>`; }).join('')}`,
  'lights-lanterns': (night) => `<path d="M0 10 Q90 28 180 10 Q270 28 360 10" stroke="#6b5d52" stroke-width="1.5" fill="none"/>${[40, 110, 180, 250, 320].map((x, i) => { const y = 10 + Math.sin((x / 360) * Math.PI * 2) * 0 + (i % 2 ? 14 : 10); const col = ['#f9c6d3', '#fdf0b0', '#cde6fa', '#d3efc4', '#ddd2f7'][i]; return `${night ? `<circle cx="${x}" cy="${y + 12}" r="22" fill="${col}" opacity=".35"/>` : ''}<path d="M${x} ${y - 4} v4" stroke="#6b5d52"/><ellipse cx="${x}" cy="${y + 12}" rx="12" ry="13" fill="${col}"/><path d="M${x - 12} ${y + 12} h24 M${x - 10} ${y + 6} h20 M${x - 10} ${y + 18} h20" stroke="#fff" stroke-width="1.2" opacity=".6"/><rect x="${x - 5}" y="${y - 2}" width="10" height="3" fill="#c9b9a6"/>`; }).join('')}`,
  'lights-bunting': () => `<path d="M0 8 Q90 30 180 8 Q270 30 360 8" stroke="#6b5d52" stroke-width="1.5" fill="none"/>${Array.from({ length: 14 }, (_, i) => { const x = 8 + i * 26; const t = (x % 180) / 180; const y = 8 + 22 * Math.sin(t * Math.PI) * 0.55; return `<path d="M${x} ${y.toFixed(1)} l14 1 l-8 16z" fill="${['#ee8fa6', '#f2d36b', '#6fb3e3', '#7cb66b', '#a68fe0', '#f3a06b'][i % 6]}"/>`; }).join('')}`,
  'lights-stars': (night) => `<path d="M0 12 Q90 30 180 12 Q270 30 360 12" stroke="#c9b9a6" stroke-width="1.2" fill="none"/>${Array.from({ length: 9 }, (_, i) => { const x = 20 + i * 40; const t = (x % 180) / 180; const y = 12 + 18 * Math.sin(t * Math.PI) * 0.6 + 6; return `${night ? `<circle cx="${x}" cy="${y.toFixed(1)}" r="12" fill="#fff3b0" opacity=".35"/>` : ''}${star(x, y, 7, '#f7dc6f')}`; }).join('')}`,
  'lights-holiday': (night) => `<path d="M0 14 Q45 34 90 14 Q135 34 180 14 Q225 34 270 14 Q315 34 360 14" stroke="#2f5d3a" stroke-width="3" fill="none"/>${Array.from({ length: 16 }, (_, i) => { const x = 11 + i * 22.5; const y = 14 + 20 * Math.sin(((x % 90) / 90) * Math.PI) * 0.5 + 5; const col = ['#e04848', '#f2d36b', '#3fa45b', '#6fb3e3'][i % 4]; return `${night ? `<circle cx="${x}" cy="${(y + 3).toFixed(1)}" r="10" fill="${col}" opacity=".35"/>` : ''}<ellipse cx="${x}" cy="${(y + 3).toFixed(1)}" rx="3.5" ry="5.5" fill="${col}"/>`; }).join('')}`,

  // Hanging from the ceiling (center top)
  'hang-mobile': () => `<g class="sway" style="transform-origin:180px 0px"><path d="M180 0 V30 M156 30 H204 M156 30 v12 M204 30 v16 M180 30 v22" stroke="#a89a8c" stroke-width="1.5"/>${star(156, 48, 8, '#f7dc6f')}<path d="M210 54 a9 9 0 1 0 -6 -12 a7 7 0 1 1 6 12z" fill="#fff1a8"/><g transform="translate(180 60)"><circle r="7" fill="#fff"/><circle cx="7" cy="-2" r="8" fill="#fff"/><circle cx="14" r="5" fill="#fff"/></g></g>`,
  'hang-disco': (night) => `<path d="M180 0 V18" stroke="#a89a8c" stroke-width="1.5"/><g class="spin-slow" style="transform-origin:180px 36px"><circle cx="180" cy="36" r="18" fill="#cfd6e3"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${166 + (i % 4) * 7}" y="${24 + Math.floor(i / 4) * 8}" width="6" height="6" fill="${['#fff', '#e8edf5', '#b7c2d4'][i % 3]}"/>`).join('')}</g>${night ? [[100, 150, '#ee8fa6'], [250, 120, '#6fb3e3'], [60, 60, '#f2d36b'], [300, 170, '#a68fe0']].map(([x, y, c]) => `<circle class="twinkle" cx="${x}" cy="${y}" r="5" fill="${c}" opacity=".6"/>`).join('') : ''}`,
  'hang-plant': () => `<path d="M180 0 L168 40 M180 0 L192 40" stroke="#c9a17a" stroke-width="1.5"/><path d="M164 40 h32 l-4 18 h-24z" fill="#f4e1cc"/><g class="sway" style="transform-origin:180px 50px" stroke="#5f9f44" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M170 54 q-6 20 -2 40"/><path d="M180 56 q2 24 -4 46"/><path d="M190 54 q8 18 4 34"/></g><g fill="#7cb66b">${[[168, 74], [166, 90], [180, 76], [178, 96], [192, 70], [194, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" transform="rotate(30 ${x} ${y})"/>`).join('')}</g>`,
  'hang-cranes': () => `<g class="sway" style="transform-origin:180px 0px"><path d="M150 0 v40 M180 0 v56 M210 0 v34" stroke="#a89a8c" stroke-width="1"/>${[[150, 44, '#f9c6d3'], [180, 60, '#cde6fa'], [210, 38, '#fdf0b0']].map(([x, y, c]) => `<path d="M${x - 12} ${y} L${x} ${y - 6} L${x + 12} ${y} L${x} ${y + 4}Z M${x} ${y - 6} L${x + 4} ${y - 14}" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`).join('')}</g>`,
  'hang-pinata': () => `<path d="M180 0 V24" stroke="#a89a8c" stroke-width="1.5"/><g class="sway" style="transform-origin:180px 0px"><rect x="160" y="26" width="40" height="20" rx="4" fill="#ee8fa6"/><rect x="160" y="34" width="40" height="5" fill="#f2d36b"/><rect x="196" y="16" width="8" height="14" rx="3" fill="#ee8fa6"/><path d="M166 46 v10 M174 46 v10 M186 46 v10 M194 46 v10" stroke="#a68fe0" stroke-width="3"/><circle cx="200" cy="20" r="1.5" fill="#3b3330"/></g>`,
  'hang-moon': (night) => `<path d="M180 0 V20" stroke="#a89a8c" stroke-width="1.5"/>${night ? '<circle cx="180" cy="44" r="30" fill="#fff3b0" opacity=".3"/>' : ''}<path d="M172 24 a22 22 0 1 0 22 34 a17 17 0 1 1 -22 -34z" fill="#fff1a8" stroke="#f2d36b" stroke-width="2"/>${star(198, 32, 5, '#f7dc6f')}`,

  // Rugs
  'rug-default': () => `<ellipse cx="180" cy="262" rx="112" ry="26" fill="#bfe0ae"/><ellipse cx="180" cy="262" rx="92" ry="19" fill="none" stroke="#a6d08f" stroke-width="3" stroke-dasharray="6 6"/>`,
  'rug-heart': () => `<path transform="translate(180 236) scale(5.4 2.1)" d="M0 3 C-1-2 -11-2 -11 5 C-11 10 -3 14 0 17 C3 14 11 10 11 5 C11-2 1-2 0 3Z" fill="#f6b9c8"/>`,
  'rug-rainbow': () => `<ellipse cx="180" cy="262" rx="118" ry="28" fill="#f6b9c8"/><ellipse cx="180" cy="262" rx="98" ry="23" fill="#fbd9a8"/><ellipse cx="180" cy="262" rx="78" ry="18" fill="#fff0a8"/><ellipse cx="180" cy="262" rx="58" ry="13" fill="#c6e8b5"/><ellipse cx="180" cy="262" rx="38" ry="8" fill="#bde0f7"/>`,
  'rug-gold': () => `<ellipse cx="180" cy="262" rx="116" ry="27" fill="#f2d36b"/><ellipse cx="180" cy="262" rx="100" ry="21" fill="none" stroke="#fff6c9" stroke-width="3"/><ellipse cx="180" cy="262" rx="116" ry="27" fill="none" stroke="#d9a920" stroke-width="2" stroke-dasharray="2 4"/>`,
  'rug-checker': () => { const p = nid('rc'); const c = nid('rcc'); return `<defs><pattern id="${p}" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#fff"/><rect width="12" height="6" fill="#bfe0ae"/><rect x="12" y="6" width="12" height="6" fill="#bfe0ae"/></pattern><clipPath id="${c}"><rect x="80" y="240" width="200" height="46" rx="10"/></clipPath></defs><rect x="80" y="240" width="200" height="46" rx="10" fill="url(#${p})"/><rect x="80" y="240" width="200" height="46" rx="10" fill="none" stroke="#a6d08f" stroke-width="3"/>`; },
  'rug-fluffy': () => `<ellipse cx="180" cy="262" rx="114" ry="27" fill="#fbf8f4"/>${Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return `<circle cx="${(180 + 112 * Math.cos(a)).toFixed(1)}" cy="${(262 + 26 * Math.sin(a)).toFixed(1)}" r="6" fill="#fbf8f4"/>`; }).join('')}<ellipse cx="180" cy="262" rx="80" ry="16" fill="#f3ede6"/>`,
  'rug-strawberry': () => `<path d="M80 252 Q180 222 280 252 Q270 292 180 296 Q90 292 80 252Z" fill="#ee5a6a"/>${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${100 + (i * 13) % 160}" cy="${256 + (i * 7) % 30}" rx="2" ry="3" fill="#ffe7a3"/>`).join('')}<path d="M120 244 Q150 230 180 240 Q210 230 240 244 Q210 248 180 244 Q150 248 120 244Z" fill="#6fb35a"/>`,
  'rug-peapod': () => `<path d="M64 262 Q180 312 296 262 Q180 226 64 262Z" fill="#7cb66b"/><path d="M76 262 Q180 298 284 262 Q180 238 76 262Z" fill="#d7efc8"/>${[124, 160, 196, 232].map((x) => `<circle cx="${x}" cy="264" r="14" fill="#93d06e"/>`).join('')}`,
  'rug-star': () => `${star(180, 262, 60, '#fdf0b0', 'transform="translate(180 262) scale(1.6 .5) translate(-180 -262)"')}`,

  // Beds (left floor)
  'bed-basket': () => `<ellipse cx="62" cy="262" rx="52" ry="22" fill="#c98f5a"/><ellipse cx="62" cy="254" rx="44" ry="14" fill="#f6efe6"/><path d="M14 258 Q62 290 110 258" stroke="#a8743f" stroke-width="3" fill="none" stroke-dasharray="5 4"/><ellipse cx="62" cy="252" rx="30" ry="8" fill="#fde4ea"/>`,
  'bed-cloud': () => `<path d="M14 268 a20 20 0 0 1 16 -30 a26 26 0 0 1 46 -6 a20 20 0 0 1 34 18 a14 14 0 0 1 -4 18 Z" fill="#fff" stroke="#e6ecf5" stroke-width="3"/><ellipse cx="44" cy="248" rx="16" ry="8" fill="#e0f0fb"/>`,
  'bed-pillows': () => `<rect x="10" y="246" width="56" height="30" rx="14" fill="#a6d2f2"/><rect x="40" y="240" width="60" height="34" rx="16" fill="#f9c6d3"/><rect x="22" y="232" width="44" height="26" rx="12" fill="#fdf0b0"/><path d="M52 256 h36 M30 244 h28" stroke="#fff" stroke-width="2" stroke-dasharray="3 4" opacity=".7"/>`,
  'bed-teepee': () => `<path d="M14 276 L60 190 L106 276 Z" fill="#f6efe6"/><path d="M60 190 L44 276 M60 190 L76 276" stroke="#e2d6c8" stroke-width="2"/><path d="M48 214 L60 190 L72 214" stroke="#c98f5a" stroke-width="3" fill="none"/><path d="M60 200 L60 184 M56 184 l8 -6 M64 184 l-8 -6" stroke="#c98f5a" stroke-width="3"/><path d="M44 276 L60 236 L76 276 Z" fill="#7a5a44" opacity=".25"/><path d="M22 260 L98 260" stroke="#ee8fa6" stroke-width="4" stroke-dasharray="6 6"/>`,
  'bed-heart': () => `${heart(60, 232, 3.3, '#ee6f8f')}${heart(60, 238, 2.6, '#fbd0db')}`,
  'bed-royal': () => `<rect x="12" y="250" width="100" height="26" rx="8" fill="#a68fe0"/><rect x="18" y="242" width="88" height="14" rx="7" fill="#fff"/><rect x="10" y="196" width="6" height="80" fill="#e7bf3f"/><rect x="108" y="196" width="6" height="80" fill="#e7bf3f"/><path d="M8 196 Q62 176 116 196 Q100 224 104 260 L114 260 L114 196 M8 196 Q22 224 18 260 L10 260" fill="#ee8fa6" opacity=".7"/><path d="M8 196 Q62 176 116 196" stroke="#e7bf3f" stroke-width="4" fill="none"/>${star(62, 186, 6, '#f2c94c')}`,

  // Plants (right floor)
  'plant-pot': () => `${pot(323)}<path d="M323 232 Q322 214 323 206" stroke="#5f9f44" stroke-width="3"/><ellipse cx="314" cy="210" rx="10" ry="6" fill="#7cb66b" transform="rotate(-30 314 210)"/><ellipse cx="332" cy="214" rx="10" ry="6" fill="#93d06e" transform="rotate(25 332 214)"/>`,
  'plant-cactus': () => `${pot(323)}<rect x="315" y="180" width="16" height="54" rx="8" fill="#6fb35a"/><rect x="300" y="196" width="10" height="24" rx="5" fill="#6fb35a"/><rect x="304" y="212" width="14" height="8" rx="4" fill="#6fb35a"/><rect x="336" y="190" width="10" height="22" rx="5" fill="#6fb35a"/><rect x="328" y="204" width="14" height="8" rx="4" fill="#6fb35a"/><circle cx="323" cy="178" r="5" fill="#ee8fa6"/>`,
  'plant-monstera': () => `${pot(323, '#f4e1cc', '#e6cbae')}<g fill="#4f9a3c"><path d="M322 232 C300 214 296 176 318 166 C320 190 322 210 322 232Z"/><path d="M324 232 C340 206 352 176 336 160 C328 182 326 206 324 232Z"/><path d="M322 232 C296 230 282 204 290 190 C304 202 314 218 322 232Z"/></g><g stroke="#cfe8c2" stroke-width="1.5"><path d="M318 170 L321 228"/><path d="M336 166 L325 226"/></g>`,
  'plant-sunflower': () => `${pot(323, '#6fb3e3', '#4f97cc')}<path d="M323 232 V160" stroke="#5f9f44" stroke-width="4"/><ellipse cx="312" cy="200" rx="10" ry="5" fill="#7cb66b" transform="rotate(-30 312 200)"/><ellipse cx="334" cy="190" rx="10" ry="5" fill="#7cb66b" transform="rotate(30 334 190)"/><g class="sway" style="transform-origin:323px 160px"><g transform="translate(323 156)">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-14" rx="5" ry="10" fill="#f6c933" transform="rotate(${i * 30})"/>`).join('')}<circle r="9" fill="#8a5a2b"/></g></g>`,
  'plant-tulips': () => `<path d="M310 268 Q304 238 314 228 H332 Q342 238 336 268 Z" fill="#dff0fa" opacity=".9" stroke="#fff" stroke-width="2"/>${[[312, 186, '#ee6f8f'], [323, 176, '#f2d36b'], [334, 188, '#a68fe0']].map(([x, y, c]) => `<path d="M323 232 Q${x} ${y + 30} ${x} ${y}" stroke="#5f9f44" stroke-width="2.5" fill="none"/><path d="M${x - 7} ${y} Q${x - 7} ${y - 12} ${x - 3} ${y - 14} L${x} ${y - 8} L${x + 3} ${y - 14} Q${x + 7} ${y - 12} ${x + 7} ${y} Q${x} ${y + 6} ${x - 7} ${y}Z" fill="${c}"/>`).join('')}`,
  'plant-bonsai': () => `<rect x="300" y="250" width="46" height="16" rx="4" fill="#5b7a8c"/><rect x="296" y="246" width="54" height="6" rx="3" fill="#6f90a3"/><path d="M323 248 Q318 230 326 220 Q334 210 324 198" stroke="#7a5a44" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#5f9f44"><ellipse cx="308" cy="214" rx="16" ry="9"/><ellipse cx="334" cy="200" rx="18" ry="10"/><ellipse cx="320" cy="190" rx="14" ry="8" fill="#7cb66b"/></g>`,
  'plant-xmas': (night) => `<rect x="316" y="246" width="14" height="20" fill="#7a5a44"/><path d="M290 250 L323 170 L356 250 Z" fill="#3fa45b"/><path d="M296 226 L323 160 L350 226 Z" fill="#4bb366"/><path d="M302 200 L323 150 L344 200 Z" fill="#5cc277"/>${star(323, 148, 10, '#f7dc6f')}${[[310, 212, '#e04848'], [334, 230, '#f2d36b'], [318, 238, '#6fb3e3'], [332, 196, '#ee8fa6'], [306, 240, '#f2d36b']].map(([x, y, c]) => `${night ? `<circle cx="${x}" cy="${y}" r="7" fill="${c}" opacity=".4"/>` : ''}<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>`).join('')}<rect x="300" y="254" width="18" height="14" rx="2" fill="#ee8fa6"/><path d="M309 254 v14 M300 261 h18" stroke="#fff" stroke-width="2"/>`,
  'plant-bamboo': () => `${pot(323, '#2f2c2b', '#3b3836')}${[312, 323, 334].map((x, i) => `<rect x="${x - 3}" y="${170 + i * 10}" width="6" height="${62 - i * 10}" rx="2" fill="#8cc56b"/>${[0, 1, 2].map((k) => `<rect x="${x - 3.5}" y="${184 + i * 10 + k * 16}" width="7" height="2" fill="#6fa64e"/>`).join('')}<ellipse cx="${x + 7}" cy="${176 + i * 10}" rx="7" ry="3" fill="#7cb66b" transform="rotate(-30 ${x + 7} ${176 + i * 10})"/>`).join('')}`,

  // Lamps (right, mid)
  'lamp-mushroom': (night) => `<circle cx="270" cy="208" r="${night ? 48 : 34}" fill="#ffe9a8" opacity="${night ? 0.4 : 0.3}"/><rect x="264" y="212" width="12" height="34" rx="5" fill="#fff6e8"/><ellipse cx="270" cy="248" rx="16" ry="5" fill="#e8d6c0"/><path d="M244 214 Q246 186 270 184 Q294 186 296 214 Z" fill="#e8576a"/><circle cx="258" cy="200" r="4" fill="#fff"/><circle cx="276" cy="194" r="5" fill="#fff"/><circle cx="286" cy="206" r="3.5" fill="#fff"/>`,
  'lamp-moon': (night) => `<circle cx="270" cy="196" r="${night ? 50 : 36}" fill="#fff3b0" opacity="${night ? 0.4 : 0.3}"/><rect x="268" y="214" width="4" height="34" fill="#c9b9a6"/><ellipse cx="270" cy="249" rx="16" ry="5" fill="#c9b9a6"/><path d="M262 176 a22 22 0 1 0 26 30 a17 17 0 1 1 -26 -30z" fill="#fff1a8" stroke="#f2d36b" stroke-width="2"/>`,
  'lamp-lava': (night) => `${night ? '<circle cx="270" cy="214" r="40" fill="#f9a8c0" opacity=".35"/>' : ''}<path d="M262 186 h16 l6 46 h-28z" fill="#f9c6d3" opacity=".9" stroke="#fff" stroke-width="1.5"/><g class="lava" fill="#ee6f8f"><ellipse cx="268" cy="200" rx="5" ry="7"/><ellipse cx="274" cy="220" rx="6" ry="5"/></g><path d="M260 180 h20 l-2 6 h-16z" fill="#a68fe0"/><path d="M254 232 h32 l-4 16 h-24z" fill="#a68fe0"/>`,
  'lamp-floor': (night) => `<circle cx="276" cy="160" r="${night ? 56 : 40}" fill="#ffe9a8" opacity="${night ? 0.4 : 0.25}"/><path d="M276 166 V246" stroke="#7a6a5c" stroke-width="4"/><ellipse cx="276" cy="248" rx="18" ry="5" fill="#7a6a5c"/><path d="M256 166 L264 136 H288 L296 166 Z" fill="#fdf0b0" stroke="#f2d36b" stroke-width="2"/>`,
  'lamp-candles': (night) => `${night ? '<circle cx="270" cy="228" r="36" fill="#ffd9a0" opacity=".45"/>' : ''}${[[256, 26], [270, 36], [284, 20]].map(([x, h]) => `<rect x="${x - 6}" y="${250 - h}" width="12" height="${h}" rx="3" fill="#fff6e8" stroke="#eadfcf" stroke-width="1"/><path class="flicker" style="transform-origin:${x}px ${246 - h}px" d="M${x} ${238 - h} q5 6 0 10 q-5 -4 0 -10z" fill="#ffb347"/>`).join('')}<ellipse cx="270" cy="251" rx="26" ry="4" fill="#e8d6c0"/>`,
  'lamp-projector': (night) => `${night ? [[60, 40], [120, 80], [200, 30], [300, 60], [340, 120], [30, 130], [160, 140], [250, 100]].map(([x, y], i) => `${star(x, y, i % 2 ? 4 : 6, '#fff3b0', `class="twinkle" style="animation-delay:${i * 0.3}s" opacity=".85"`)}`).join('') : ''}<ellipse cx="270" cy="246" rx="18" ry="5" fill="#cfd6e3"/><path d="M254 246 Q254 220 270 218 Q286 220 286 246Z" fill="#6c5ba5"/>${[0, 1, 2, 3].map((i) => star(262 + i * 6, 230 + (i % 2) * 6, 2.5, '#fff3b0')).join('')}`,

  // Toys (front left)
  'toy-ball': () => `<circle cx="122" cy="278" r="12" fill="#e04848"/><path d="M110 278 Q122 268 134 278" stroke="#fff" stroke-width="3" fill="none"/><path d="M112 284 Q122 292 132 284" stroke="#f2d36b" stroke-width="3" fill="none"/>`,
  'toy-yarn': () => `<circle cx="120" cy="278" r="12" fill="#a68fe0"/><path d="M110 272 Q120 286 130 270 M108 280 Q120 290 132 280 M114 268 Q124 280 128 290" stroke="#8a72cc" stroke-width="1.5" fill="none"/><path d="M132 282 Q150 296 170 284" stroke="#a68fe0" stroke-width="2" fill="none"/>`,
  'toy-duck': () => `<ellipse cx="122" cy="282" rx="14" ry="9" fill="#ffd95e"/><circle cx="114" cy="272" r="8" fill="#ffd95e"/><path d="M106 272 l-6 1 l6 3z" fill="#ff9f43"/><circle cx="112" cy="270" r="1.5" fill="#3b3330"/>`,
  'toy-blocks': () => `<rect x="106" y="272" width="16" height="16" rx="3" fill="#6fb3e3"/><rect x="124" y="272" width="16" height="16" rx="3" fill="#ee8fa6"/><rect x="115" y="256" width="16" height="16" rx="3" fill="#f2d36b"/><text x="110" y="285" font-size="11" font-weight="900" fill="#fff">A</text><text x="128" y="285" font-size="11" font-weight="900" fill="#fff">B</text><text x="119" y="269" font-size="11" font-weight="900" fill="#fff">C</text>`,
  'toy-car': () => `<rect x="104" y="272" width="36" height="12" rx="5" fill="#6fb3e3"/><path d="M112 272 Q116 262 126 262 Q132 262 134 272Z" fill="#a6d2f2"/><circle cx="112" cy="286" r="5" fill="#3b3330"/><circle cx="132" cy="286" r="5" fill="#3b3330"/>`,
  'toy-mouse': () => `<ellipse cx="122" cy="282" rx="13" ry="8" fill="#cfc5ba"/><circle cx="112" cy="276" r="4" fill="#f7b6c6"/><circle cx="111" cy="283" r="1.4" fill="#3b3330"/><path d="M135 282 Q148 290 156 280" stroke="#cfc5ba" stroke-width="2" fill="none"/>`,

  // Food bowls (front right)
  'bowl-basic': () => `<ellipse cx="248" cy="280" rx="20" ry="6" fill="#d8cdc2"/><path d="M228 276 Q230 290 248 290 Q266 290 268 276Z" fill="#6fb3e3"/><ellipse cx="248" cy="276" rx="20" ry="5" fill="#c98f5a"/>`,
  'bowl-heart': () => `<path d="M228 276 Q230 290 248 290 Q266 290 268 276Z" fill="#ee8fa6"/><ellipse cx="248" cy="276" rx="20" ry="5" fill="#c98f5a"/>${heart(248, 280, 0.45, '#fff')}`,
  'bowl-gold': () => `<path d="M226 276 Q228 292 248 292 Q268 292 270 276Z" fill="#f2c94c"/><ellipse cx="248" cy="276" rx="22" ry="5" fill="#d9a920"/><path d="M234 282 h8" stroke="#fff6c9" stroke-width="2"/>`,
  'bowl-fruit': () => `<path d="M228 278 Q230 292 248 292 Q266 292 268 278Z" fill="#fff" stroke="#e6ecf5" stroke-width="2"/><circle cx="240" cy="274" r="6" fill="#e04848"/><circle cx="252" cy="272" r="6" fill="#f3a06b"/><circle cx="260" cy="276" r="5" fill="#a68fe0"/><path d="M246 268 Q256 262 262 270" stroke="#f2d36b" stroke-width="5" fill="none" stroke-linecap="round"/>`,

  // Plushies (sit on the bed spot)
  'plush-bear': () => `<circle cx="38" cy="242" r="6" fill="#c98f5a"/><circle cx="58" cy="242" r="6" fill="#c98f5a"/><circle cx="48" cy="252" r="13" fill="#d9a074"/><ellipse cx="48" cy="270" rx="14" ry="11" fill="#d9a074"/><ellipse cx="48" cy="256" rx="5" ry="4" fill="#f3d6bd"/><circle cx="44" cy="250" r="1.6" fill="#3b3330"/><circle cx="52" cy="250" r="1.6" fill="#3b3330"/>`,
  'plush-bunny': () => `<ellipse cx="42" cy="232" rx="4" ry="12" fill="#fff"/><ellipse cx="54" cy="232" rx="4" ry="12" fill="#fff"/><circle cx="48" cy="252" r="12" fill="#fff"/><ellipse cx="48" cy="270" rx="13" ry="10" fill="#fff"/><circle cx="44" cy="250" r="1.6" fill="#3b3330"/><circle cx="52" cy="250" r="1.6" fill="#3b3330"/><circle cx="48" cy="255" r="1.6" fill="#f19bb0"/>`,
  'plush-dino': () => `<path d="M30 276 Q28 250 44 246 Q52 236 62 244 Q66 258 60 276Z" fill="#8cd17a"/><path d="M44 246 l4 -6 l4 6 M54 246 l4 -5 l3 6" fill="#f2d36b"/><circle cx="56" cy="252" r="1.6" fill="#3b3330"/><path d="M30 270 Q20 272 18 264" stroke="#8cd17a" stroke-width="6" stroke-linecap="round" fill="none"/>`,
  'plush-whale': () => `<path d="M24 268 Q24 248 48 248 Q70 248 70 266 Q70 276 48 276 Q26 276 24 268Z" fill="#8ecbf0"/><path d="M24 262 l-8 -8 l2 12z" fill="#8ecbf0"/><ellipse cx="50" cy="270" rx="16" ry="5" fill="#d8eefc"/><circle cx="58" cy="260" r="1.6" fill="#3b3330"/><path d="M48 248 q-2 -8 -6 -10 M48 248 q2 -8 6 -10" stroke="#8ecbf0" stroke-width="2" fill="none"/>`,
  'plush-pea': () => `<path d="M18 268 Q48 290 78 268 Q48 254 18 268Z" fill="#5f9f44"/><circle cx="38" cy="266" r="10" fill="#93d06e"/><circle cx="58" cy="266" r="10" fill="#93d06e"/><circle cx="35" cy="264" r="1.4" fill="#3b3330"/><circle cx="41" cy="264" r="1.4" fill="#3b3330"/><circle cx="55" cy="264" r="1.4" fill="#3b3330"/><circle cx="61" cy="264" r="1.4" fill="#3b3330"/>`,
};

// Preview crops for the shop (viewBox per slot).
const CROPS = {
  wall: '0 0 360 204', floor: '0 196 360 104', rug: '56 228 248 70', bed: '4 176 120 104', plant: '284 140 76 132', lamp: '222 134 100 122',
  window: '8 14 150 112', frame: '220 30 96 80', lights: '0 0 360 50', hang: '130 0 100 110', shelf: '130 40 100 66', toy: '96 248 76 46', bowl: '222 258 52 38', plush: '10 222 76 60',
};

export function roomSVG({ room = {}, pet = '', preview = null, night = false } = {}) {
  const r = { rug: 'rug-default', frame: 'frame-pea', ...room };
  const phase = preview ? 'day' : phaseOf();
  const dark = night || phase === 'night';
  const weather = preview ? 'clear' : weatherOf();
  const only = preview ? { [preview.slot]: preview.id } : null;
  const use = (slot) => (only ? only[slot] : r[slot]);
  const part = (slot) => { const id = use(slot); return id && PARTS[id] ? PARTS[id](dark) : ''; };
  const vb = preview ? CROPS[preview.slot] : '0 0 360 300';
  const vg = nid('vg'); const lg = nid('lg');
  const sunbeam = !preview && (phase === 'day' || phase === 'sunset') && weather !== 'rain';
  const winOn = !preview || preview.slot === 'window';
  const tint = { night: ['#2a2f6a', 0.22], dusk: ['#4a3a7a', 0.13], sunset: ['#ff8a4a', 0.07], dawn: ['#ff9fb8', 0.05], day: null }[phase];
  return `<svg class="room" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <radialGradient id="${vg}" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3b2a1a" stop-opacity=".16"/></radialGradient>
      <linearGradient id="${lg}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffbe6" stop-opacity=".55"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></linearGradient>
    </defs>
    ${preview && !['wall', 'floor', 'window'].includes(preview.slot) ? '<rect x="-10" y="-10" width="400" height="320" fill="#fbf4ec"/>' : ''}
    ${!preview || preview.slot === 'wall' ? wallSVG(use('wall')) : ''}
    ${!preview ? '<rect width="360" height="200" fill="#000" opacity=".03"/>' : ''}
    ${winOn ? windowPart(use('window'), phase, weather) : ''}
    ${!preview || preview.slot === 'floor' ? floorSVG(use('floor')) : ''}
    ${sunbeam ? `<path d="M40 104 L116 104 L250 290 L110 290 Z" fill="url(#${lg})" opacity="${phase === 'sunset' ? 0.5 : 0.75}" pointer-events="none"/>
      <g class="motes" fill="#fff">${[[90, 150], [120, 190], [150, 230], [110, 250], [170, 200]].map(([x, y], i) => `<circle class="mote" style="animation-delay:${i * 0.9}s" cx="${x}" cy="${y}" r="1.3"/>`).join('')}</g>` : ''}
    ${part('frame')}${part('shelf')}${part('lights')}<g transform="translate(${preview ? 0 : 136} 0)">${part('hang')}</g>${part('rug')}${part('bed')}${part('plush')}${part('plant')}${part('lamp')}
    ${pet ? `<g class="room-pet">${pet}</g>` : ''}
    ${part('toy')}${part('bowl')}
    ${!preview ? `<rect width="360" height="300" fill="url(#${vg})" pointer-events="none"/>` : ''}
    ${tint && !preview ? `<rect width="360" height="300" fill="${tint[0]}" opacity="${tint[1]}" pointer-events="none" style="mix-blend-mode:multiply"/>` : ''}
    ${dark && !preview && (use('lamp') || use('lights')) ? `<rect width="360" height="300" fill="#ffcf7a" opacity=".1" pointer-events="none" style="mix-blend-mode:soft-light"/>` : ''}
  </svg>`;
}

export function roomPreview(item) {
  return roomSVG({ preview: { slot: item.slot, id: item.id } });
}

export const ROOM_PART_IDS = [...Object.keys(PARTS), ...Object.keys(WALLS), ...Object.keys(FLOORS), 'window-day', 'window-arch', 'window-round', 'window-heart', 'window-bay'];
