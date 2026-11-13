// The pet, drawn as SVG so it stays crisp and works offline.
// Soft shading, sparkly eyes, little feet, and a few idle animations (blink, breathe, wag).
import { roomSVG, roomPreview } from './room.js';

let seq = 0;
const nid = (p) => `${p}${++seq}`;

export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}

const PAL = {
  raccoon: { body: '#a9aeb5', belly: '#f1ede6', dark: '#5f656d', inner: '#5f656d', nose: '#2d2927' },
  cat: { body: '#f6b26f', belly: '#fde9d3', dark: '#de8b46', inner: '#f7a8b8', nose: '#f19bb0' },
  capybara: { body: '#c69a73', belly: '#e2c3a3', dark: '#8f6748', inner: '#8f6748', nose: '#5b3f2c' },
  bunny: { body: '#f8f3ed', belly: '#ffffff', dark: '#ddd1c5', inner: '#f7b6c6', nose: '#f19bb0' },
  frog: { body: '#95d26f', belly: '#e5f5cd', dark: '#5f9f44', inner: '#5f9f44', nose: '#5f9f44' },
  duck: { body: '#ffd95e', belly: '#fff3c2', dark: '#e8b632', inner: '#ff9f43', nose: '#ff9f43' },
  fox: { body: '#f59a4e', belly: '#fff6ec', dark: '#c96a28', inner: '#ffd9c2', nose: '#3b3330' },
  panda: { body: '#fbfaf7', belly: '#ffffff', dark: '#2f2c2b', inner: '#2f2c2b', nose: '#2f2c2b' },
  penguin: { body: '#46546a', belly: '#fbfaf7', dark: '#2f3a4b', inner: '#ffb547', nose: '#ffb547' },
};
const INK = '#3b3330';
const STAGE_SCALE = { baby: 0.62, kid: 0.74, teen: 0.87, grown: 1 };
export const SPECIES_LIST = Object.keys(PAL);

export const heart = (x, y, s, fill) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C-1-2 -9-2 -9 4 C-9 9 -3 12 0 15 C3 12 9 9 9 4 C9-2 1-2 0 3Z" fill="${fill}"/>`;
const star = (x, y, r, fill, extra = '') => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; p.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(' ')}" fill="${fill}" ${extra}/>`;
};

// ---------- Body parts behind the body (ears, tails) ----------
function behind(sp, c, g) {
  const line = mix(c.body, INK, 0.35);
  const ln = `stroke="${line}" stroke-width="2" stroke-opacity=".45"`;
  switch (sp) {
    case 'raccoon': {
      const clip = nid('tail');
      return `<g class="pet-tail" style="transform-origin:150px 168px"><g transform="rotate(28 170 140)">
          <clipPath id="${clip}"><ellipse cx="170" cy="138" rx="15" ry="34"/></clipPath>
          <ellipse cx="170" cy="138" rx="15" ry="34" fill="${c.body}" ${ln}/>
          <g clip-path="url(#${clip})" fill="${c.dark}"><rect x="150" y="108" width="40" height="8"/><rect x="150" y="126" width="40" height="8"/><rect x="150" y="144" width="40" height="8"/><rect x="150" y="162" width="40" height="10"/></g>
        </g></g>
        <circle cx="64" cy="84" r="17" fill="${c.body}" ${ln}/><circle cx="64" cy="84" r="9" fill="${c.inner}"/>
        <circle cx="136" cy="84" r="17" fill="${c.body}" ${ln}/><circle cx="136" cy="84" r="9" fill="${c.inner}"/>`;
    }
    case 'cat':
      return `<g class="pet-tail" style="transform-origin:156px 170px"><path d="M156 170 Q200 152 184 106" stroke="${line}" stroke-opacity=".45" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M156 170 Q200 152 184 106" stroke="${c.body}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M190 120 Q186 110 184 106" stroke="${c.dark}" stroke-width="13" fill="none" stroke-linecap="round"/></g>
        <path d="M52 102 L58 52 L96 80 Z" fill="${c.body}" ${ln} stroke-linejoin="round"/><path d="M61 90 L64 64 L85 80 Z" fill="${c.inner}"/>
        <path d="M148 102 L142 52 L104 80 Z" fill="${c.body}" ${ln} stroke-linejoin="round"/><path d="M139 90 L136 64 L115 80 Z" fill="${c.inner}"/>`;
    case 'capybara':
      return `<ellipse cx="66" cy="84" rx="11" ry="10" fill="${c.dark}"/><ellipse cx="134" cy="84" rx="11" ry="10" fill="${c.dark}"/><ellipse cx="66" cy="86" rx="5" ry="4" fill="${mix(c.dark, '#000', 0.2)}"/><ellipse cx="134" cy="86" rx="5" ry="4" fill="${mix(c.dark, '#000', 0.2)}"/>`;
    case 'bunny':
      return `<circle cx="164" cy="170" r="13" fill="#fff" ${ln}/>
        <g class="pet-ear-l" style="transform-origin:84px 84px"><g transform="rotate(-12 80 60)"><ellipse cx="80" cy="48" rx="14" ry="38" fill="${c.body}" ${ln}/><ellipse cx="80" cy="52" rx="7" ry="27" fill="${c.inner}"/></g></g>
        <g class="pet-ear-r" style="transform-origin:116px 84px"><g transform="rotate(12 120 60)"><ellipse cx="120" cy="48" rx="14" ry="38" fill="${c.body}" ${ln}/><ellipse cx="120" cy="52" rx="7" ry="27" fill="${c.inner}"/></g></g>`;
    case 'frog':
      return `<circle cx="70" cy="84" r="23" fill="${c.body}" ${ln}/><circle cx="130" cy="84" r="23" fill="${c.body}" ${ln}/>`;
    case 'duck':
      return `<g class="pet-wing-l" style="transform-origin:46px 130px"><ellipse cx="40" cy="142" rx="12" ry="22" transform="rotate(20 40 142)" fill="${c.dark}"/></g>
        <g class="pet-wing-r" style="transform-origin:154px 130px"><ellipse cx="160" cy="142" rx="12" ry="22" transform="rotate(-20 160 142)" fill="${c.dark}"/></g>`;
    case 'fox':
      return `<g class="pet-tail" style="transform-origin:150px 172px"><path d="M146 176 C190 182 206 140 186 104 C176 128 160 140 146 152 Z" fill="${c.body}" ${ln}/><path d="M186 104 C198 122 196 138 190 148 C184 132 182 118 186 104Z" fill="#fff6ec"/></g>
        <path d="M50 104 L56 46 L98 78 Z" fill="${c.body}" ${ln} stroke-linejoin="round"/><path d="M56 46 L66 56 L60 64 Z" fill="${INK}" opacity=".75"/><path d="M60 92 L62 64 L84 80 Z" fill="${c.inner}"/>
        <path d="M150 104 L144 46 L102 78 Z" fill="${c.body}" ${ln} stroke-linejoin="round"/><path d="M144 46 L134 56 L140 64 Z" fill="${INK}" opacity=".75"/><path d="M140 92 L138 64 L116 80 Z" fill="${c.inner}"/>`;
    case 'panda':
      return `<circle cx="62" cy="82" r="18" fill="${c.dark}"/><circle cx="138" cy="82" r="18" fill="${c.dark}"/>`;
    case 'penguin':
      return `<g class="pet-wing-l" style="transform-origin:42px 128px"><path d="M42 118 Q18 140 26 168 Q38 158 46 140 Z" fill="${c.dark}"/></g>
        <g class="pet-wing-r" style="transform-origin:158px 128px"><path d="M158 118 Q182 140 174 168 Q162 158 154 140 Z" fill="${c.dark}"/></g>`;
    default: return '';
  }
}

// Extra details drawn on top of the body (face masks, patterns).
function overBody(sp, c) {
  switch (sp) {
    case 'raccoon':
      return `<path d="M58 120 Q66 104 88 112 Q100 117 112 112 Q134 104 142 120 Q136 138 116 132 Q100 126 84 132 Q64 138 58 120Z" fill="${c.dark}"/>
        <ellipse cx="100" cy="140" rx="20" ry="12" fill="${c.belly}"/>`;
    case 'cat':
      return `<g stroke="${c.dark}" stroke-width="4" stroke-linecap="round" opacity=".55"><path d="M100 78 V92"/><path d="M88 80 L90 91"/><path d="M112 80 L110 91"/></g>`;
    case 'capybara':
      return `<ellipse cx="100" cy="140" rx="27" ry="17" fill="${c.dark}" opacity=".5"/>`;
    case 'frog':
      return `<circle cx="64" cy="140" r="4" fill="${c.dark}" opacity=".35"/><circle cx="144" cy="132" r="5" fill="${c.dark}" opacity=".3"/><circle cx="134" cy="152" r="3" fill="${c.dark}" opacity=".3"/>`;
    case 'duck':
      return `<path d="M96 74 Q90 56 100 54 Q98 63 104 66 Q109 56 114 60 Q107 67 104 74 Z" fill="${c.dark}"/>`;
    case 'fox':
      return `<path d="M52 128 Q70 156 100 152 Q130 156 148 128 Q130 140 100 136 Q70 140 52 128Z" fill="${c.belly}"/>`;
    case 'panda':
      return `<ellipse cx="78" cy="124" rx="15" ry="19" transform="rotate(28 78 124)" fill="${c.dark}"/><ellipse cx="122" cy="124" rx="15" ry="19" transform="rotate(-28 122 124)" fill="${c.dark}"/>`;
    case 'penguin':
      return `<path d="M100 96 C80 88 54 98 56 128 C58 160 76 182 100 182 C124 182 142 160 144 128 C146 98 120 88 100 96Z" fill="${c.belly}"/>`;
    default: return '';
  }
}

function eyePos(sp) {
  return sp === 'frog' ? [[70, 84], [130, 84]] : sp === 'capybara' ? [[80, 116], [120, 116]] : [[80, 124], [120, 124]];
}

function eyes(sp, mood) {
  const [[lx, ly], [rx, ry]] = eyePos(sp);
  const onDark = sp === 'raccoon' || sp === 'panda';
  let s = '';
  if (sp === 'frog') s += `<circle cx="${lx}" cy="${ly}" r="14" fill="#fff"/><circle cx="${rx}" cy="${ry}" r="14" fill="#fff"/>`;
  const one = (x, y, side) => {
    if (mood === 'love') return heart(x, y - 7, 0.95, '#e8577a') + `<circle cx="${x - 2.5}" cy="${y - 3}" r="1.6" fill="#fff" opacity=".8"/>`;
    if (mood === 'sleepy') return `<path d="M${x - 7} ${y} Q${x} ${y + 6} ${x + 7} ${y}" stroke="${onDark ? '#f5f2ee' : INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const r = mood === 'sad' ? 6.5 : 8;
    let e = onDark && sp === 'panda' ? `<circle cx="${x}" cy="${y}" r="${r + 2}" fill="#fff"/>` : '';
    e += `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a2321"/><circle cx="${x + 2.8}" cy="${y - 3}" r="3.1" fill="#fff"/><circle cx="${x - 2.6}" cy="${y + 2.8}" r="1.3" fill="#fff" opacity=".85"/>`;
    if (mood === 'sad') {
      const bx = side < 0 ? x - 8 : x + 8;
      e += `<path d="M${bx} ${y - 14} L${x - side * 2} ${y - 11}" stroke="${onDark ? '#f5f2ee' : INK}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    return e;
  };
  s += `<g class="${mood === 'happy' ? 'pet-eyes' : ''}" style="transform-origin:100px ${ly}px">${one(lx, ly, -1)}${one(rx, ry, 1)}</g>`;
  if (mood === 'sad') s += `<path d="M${rx + 6} ${ry + 9} q-4 7 0 10 q4 -3 0 -10z" fill="#8ecbf0"/>`;
  return s;
}

function mouth(sp, mood, c) {
  if (sp === 'duck' || sp === 'penguin') {
    const open = mood === 'happy' || mood === 'love';
    const y = sp === 'penguin' ? 140 : 144;
    return `<ellipse cx="100" cy="${y}" rx="${sp === 'penguin' ? 10 : 17}" ry="${sp === 'penguin' ? 6 : 8}" fill="${c.nose}"/>${open ? `<path d="M${sp === 'penguin' ? 92 : 86} ${y + 3} Q100 ${y + 14} ${sp === 'penguin' ? 108 : 114} ${y + 3} Z" fill="${mix(c.nose, '#c05a00', 0.4)}"/>` : ''}`;
  }
  let s = '';
  const my = sp === 'frog' ? 134 : 142;
  if (sp === 'capybara') s += `<ellipse cx="92" cy="134" rx="3.2" ry="2.2" fill="${c.nose}"/><ellipse cx="108" cy="134" rx="3.2" ry="2.2" fill="${c.nose}"/>`;
  if (['cat', 'bunny', 'raccoon', 'fox', 'panda'].includes(sp)) s += `<path d="M95 133 Q100 131 105 133 Q103 138.5 100 139.5 Q97 138.5 95 133Z" fill="${c.nose}"/>`;
  if (sp === 'cat' || sp === 'fox') {
    s += `<g stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".45"><path d="M62 136 L44 132"/><path d="M62 141 L44 143"/><path d="M138 136 L156 132"/><path d="M138 141 L156 143"/></g>`;
  }
  if (sp === 'frog') {
    if (mood === 'sad') return s + `<path d="M84 ${my + 6} Q100 ${my - 4} 116 ${my + 6}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (mood === 'sleepy') return s + `<ellipse cx="100" cy="${my}" rx="4" ry="5" fill="${INK}" opacity=".7"/>`;
    if (mood === 'love') return s + `<path d="M78 ${my - 2} Q100 ${my + 22} 122 ${my - 2} Z" fill="#c9455e"/><ellipse cx="100" cy="${my + 9}" rx="8" ry="4" fill="#f58aa0"/>`;
    return s + `<path d="M76 ${my - 2} Q100 ${my + 18} 124 ${my - 2}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  const y = sp === 'capybara' ? 148 : my;
  const st = sp === 'panda' ? INK : INK;
  if (mood === 'sad') return s + `<path d="M93 ${y + 5} Q100 ${y - 2} 107 ${y + 5}" stroke="${st}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (mood === 'sleepy') return s + `<ellipse cx="100" cy="${y + 2}" rx="3" ry="4" fill="${st}" opacity=".7"/>`;
  if (mood === 'love') return s + `<path d="M92 ${y} Q100 ${y + 12} 108 ${y} Z" fill="#c9455e"/><ellipse cx="100" cy="${y + 5}" rx="4" ry="2.4" fill="#f58aa0"/>`;
  return s + `<path d="M91 ${y} Q95.5 ${y + 6} 100 ${y + 1} Q104.5 ${y + 6} 109 ${y}" stroke="${st}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
}

// ---------- Outfits ----------
const T = (top, inner) => `<g transform="translate(0 ${top - 72})">${inner}</g>`;
const beanie = (col) => {
  const d = mix(col, '#000', 0.15);
  return `<path d="M62 90 Q64 46 100 44 Q136 46 138 90 Z" fill="${col}"/><path d="M80 56 L80 86 M100 46 L100 86 M120 56 L120 86" stroke="${d}" stroke-width="3"/>
    <rect x="58" y="80" width="84" height="15" rx="7.5" fill="${d}"/><circle cx="100" cy="42" r="10" fill="#fff"/>`;
};
const bow = (col) => `<path d="M100 70 L74 54 L76 88 Z" fill="${col}"/><path d="M100 70 L126 54 L124 88 Z" fill="${col}"/><path d="M80 62 L80 80" stroke="#fff" stroke-width="2" opacity=".35"/><circle cx="100" cy="71" r="7" fill="${mix(col, '#000', 0.15)}"/>`;

const OUTFIT = {
  // Hats
  'hat-party': (t) => `<path d="M82 ${t + 6} L100 ${t - 44} L118 ${t + 6} Z" fill="#ee8fa6"/><path d="M88 ${t - 12} L112 ${t - 12}" stroke="#fff" stroke-width="3" opacity=".7"/><path d="M85 ${t - 2} L115 ${t - 2}" stroke="#a68fe0" stroke-width="3"/><circle cx="100" cy="${t - 44}" r="7" fill="#f2d36b"/>`,
  'hat-bow': (t) => T(t, bow('#ee6f8f')),
  'hat-bow-red': (t) => T(t, bow('#e04848')),
  'hat-bow-lilac': (t) => T(t, bow('#a68fe0')),
  'hat-beanie': (t) => T(t, beanie('#6fb3e3')),
  'hat-beanie-pink': (t) => T(t, beanie('#f2a0b6')),
  'hat-beanie-green': (t) => T(t, beanie('#7cb66b')),
  'hat-chef': (t) => T(t, `<circle cx="80" cy="50" r="17" fill="#fff" stroke="#e8e2da" stroke-width="2"/><circle cx="120" cy="50" r="17" fill="#fff" stroke="#e8e2da" stroke-width="2"/><circle cx="100" cy="40" r="20" fill="#fff" stroke="#e8e2da" stroke-width="2"/><rect x="76" y="54" width="48" height="24" rx="4" fill="#fff" stroke="#e8e2da" stroke-width="2"/>`),
  'hat-flower': (t) => {
    const pts = [[68, 84], [83, 74], [100, 70], [117, 74], [132, 84]];
    const cols = ['#ee8fa6', '#f2d36b', '#a68fe0', '#6fb3e3', '#f3a06b'];
    return T(t, `<path d="M62 88 Q100 60 138 88" stroke="#7cb66b" stroke-width="4" fill="none"/>${pts.map(([x, y], i) => `<g>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + 5 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(y + 5 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="4.2" fill="${cols[i]}"/>`).join('')}<circle cx="${x}" cy="${y}" r="3" fill="#fff6c9"/></g>`).join('')}`);
  },
  'hat-crown': (t) => T(t, `<path d="M74 80 L78 48 L91 64 L100 42 L109 64 L122 48 L126 80 Z" fill="#f2c94c" stroke="#d9a920" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="70" r="4" fill="#ee6f8f"/><circle cx="86" cy="72" r="3" fill="#6fb3e3"/><circle cx="114" cy="72" r="3" fill="#7cb66b"/>`),
  'hat-halo': (t) => `<ellipse cx="100" cy="${t - 22}" rx="30" ry="8" fill="none" stroke="#f7dc6f" stroke-width="5"/><ellipse cx="100" cy="${t - 22}" rx="30" ry="8" fill="none" stroke="#fff6c9" stroke-width="2"/>`,
  'hat-cowboy': (t) => T(t, `<ellipse cx="100" cy="80" rx="58" ry="11" fill="#b5783f"/><path d="M72 80 Q70 48 88 46 Q100 54 112 46 Q130 48 128 80 Z" fill="#c98a4b"/><path d="M72 74 Q100 80 128 74 L128 80 Q100 86 72 80Z" fill="#7a4a24"/>`),
  'hat-beret': (t) => T(t, `<ellipse cx="96" cy="70" rx="40" ry="16" fill="#e05a5a" transform="rotate(-10 96 70)"/><path d="M96 54 l3 -8" stroke="#c94444" stroke-width="4" stroke-linecap="round"/>`),
  'hat-witch': (t) => T(t, `<ellipse cx="100" cy="82" rx="52" ry="10" fill="#5b4a8a"/><path d="M74 82 L100 18 Q108 14 116 26 L104 34 L126 82 Z" fill="#6c5ba5"/><rect x="74" y="72" width="52" height="8" fill="#f2d36b"/>${star(118, 52, 6, '#f2d36b')}`),
  'hat-santa': (t) => T(t, `<path d="M66 82 Q72 36 104 34 Q132 36 150 70 L138 76 Q126 54 112 52 L134 82 Z" fill="#e04848"/><rect x="60" y="76" width="82" height="16" rx="8" fill="#fff"/><circle cx="146" cy="74" r="10" fill="#fff"/>`),
  'hat-antlers': (t) => T(t, `<g stroke="#a0703f" stroke-width="6" stroke-linecap="round" fill="none"><path d="M76 78 L64 46 M68 58 L54 52 M66 50 L72 38"/><path d="M124 78 L136 46 M132 58 L146 52 M134 50 L128 38"/></g><circle cx="100" cy="128" r="0" fill="none"/>`),
  'hat-bucket': (t) => T(t, `<path d="M64 84 L70 52 Q100 42 130 52 L136 84 Z" fill="#7cb66b"/><ellipse cx="100" cy="84" rx="48" ry="9" fill="#5f9f44"/><circle cx="86" cy="64" r="4" fill="#fff" opacity=".7"/><circle cx="112" cy="60" r="3" fill="#fff" opacity=".7"/>`),
  'hat-sunflower': (t) => T(t, `<g transform="translate(128 70)">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-12" rx="5" ry="10" fill="#f6c933" transform="rotate(${i * 30})"/>`).join('')}<circle r="8" fill="#8a5a2b"/><circle r="8" fill="none" stroke="#6b421b" stroke-width="2" stroke-dasharray="2 2"/></g>`),
  'hat-tiara': (t) => T(t, `<path d="M70 82 Q100 68 130 82" stroke="#d7dbe6" stroke-width="5" fill="none"/><path d="M82 78 L86 64 L92 74 L100 56 L108 74 L114 64 L118 78" fill="#eef1f8" stroke="#c8cede" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="66" r="4" fill="#ee8fa6"/><circle cx="86" cy="70" r="2.5" fill="#8ecbf0"/><circle cx="114" cy="70" r="2.5" fill="#8ecbf0"/>`),
  'hat-propeller': (t) => T(t, `<path d="M66 82 Q66 46 100 46 Q134 46 134 82 Z" fill="#f2d36b"/><path d="M100 46 Q118 50 134 82 L120 82 Q114 56 100 52Z" fill="#ee6f8f"/><path d="M100 46 Q82 50 66 82 L80 82 Q86 56 100 52Z" fill="#6fb3e3"/><rect x="98" y="34" width="4" height="12" fill="#3b3330"/><g class="pet-prop" style="transform-origin:100px 34px"><ellipse cx="86" cy="34" rx="14" ry="4" fill="#e04848"/><ellipse cx="114" cy="34" rx="14" ry="4" fill="#6fb3e3"/></g>`),
  'hat-headphones': (t) => T(t, `<path d="M58 104 Q58 44 100 44 Q142 44 142 104" stroke="#3b3330" stroke-width="7" fill="none"/><rect x="48" y="94" width="20" height="30" rx="9" fill="#ee6f8f"/><rect x="132" y="94" width="20" height="30" rx="9" fill="#ee6f8f"/>`),
  'hat-pirate': (t) => T(t, `<path d="M58 82 Q64 50 100 48 Q136 50 142 82 Q100 70 58 82Z" fill="#2f2c2b"/><path d="M58 82 Q100 70 142 82" stroke="#f2d36b" stroke-width="3" fill="none"/><circle cx="100" cy="64" r="6" fill="#fff"/><path d="M95 72 L105 72" stroke="#fff" stroke-width="2"/>`),
  'hat-grad': (t) => T(t, `<path d="M70 70 Q70 86 100 88 Q130 86 130 70 Z" fill="#2f2c2b"/><path d="M50 62 L100 46 L150 62 L100 78 Z" fill="#3b3836"/><path d="M100 62 L136 66 L136 84" stroke="#f2d36b" stroke-width="2.5" fill="none"/><circle cx="136" cy="86" r="4" fill="#f2d36b"/>`),
  'hat-tophat': (t) => T(t, `<ellipse cx="100" cy="82" rx="42" ry="8" fill="#2f2c2b"/><rect x="76" y="34" width="48" height="48" rx="4" fill="#3b3836"/><rect x="76" y="68" width="48" height="8" fill="#e04848"/>`),
  'hat-strawberry': (t) => T(t, `<path d="M62 86 Q62 40 100 40 Q138 40 138 86 Z" fill="#ee5a6a"/>${[[80, 60], [96, 52], [114, 58], [126, 72], [74, 76], [92, 70], [108, 74]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3" fill="#ffe7a3"/>`).join('')}<path d="M80 44 Q90 30 100 40 Q110 30 120 44 Q110 46 100 42 Q90 46 80 44Z" fill="#6fb35a"/><rect x="98" y="26" width="4" height="12" rx="2" fill="#5f9f44"/>`),
  'hat-mushroom': (t) => T(t, `<path d="M56 86 Q58 40 100 38 Q142 40 144 86 Q100 76 56 86Z" fill="#e8576a"/><circle cx="80" cy="60" r="7" fill="#fff"/><circle cx="104" cy="50" r="8" fill="#fff"/><circle cx="126" cy="66" r="6" fill="#fff"/><circle cx="96" cy="72" r="4" fill="#fff"/>`),
  'hat-frog': (t) => T(t, `<path d="M64 86 Q64 52 100 52 Q136 52 136 86 Z" fill="#95d26f"/><circle cx="80" cy="54" r="12" fill="#95d26f"/><circle cx="120" cy="54" r="12" fill="#95d26f"/><circle cx="80" cy="54" r="7" fill="#fff"/><circle cx="120" cy="54" r="7" fill="#fff"/><circle cx="81" cy="55" r="4" fill="#2a2321"/><circle cx="121" cy="55" r="4" fill="#2a2321"/><path d="M88 72 Q100 80 112 72" stroke="#3b3330" stroke-width="2" fill="none"/>`),
  'hat-golden': (t) => T(t, `<path d="M70 82 L74 40 L88 60 L100 30 L112 60 L126 40 L130 82 Z" fill="#ffd34d" stroke="#d9a920" stroke-width="2.5" stroke-linejoin="round"/>${star(100, 66, 7, '#fff6c9')}<circle cx="80" cy="74" r="3.5" fill="#ee6f8f"/><circle cx="120" cy="74" r="3.5" fill="#6fb3e3"/><path d="M76 46 l4 -6 M124 46 l-4 -6" stroke="#fff6c9" stroke-width="2"/>`),
  // Face
  'face-glasses': (t, [[lx, ly], [rx, ry]]) => `<g stroke="${INK}" stroke-width="3" fill="rgba(255,255,255,.25)"><circle cx="${lx}" cy="${ly}" r="13"/><circle cx="${rx}" cy="${ry}" r="13"/></g><path d="M${lx + 13} ${ly} Q100 ${ly - 5} ${rx - 13} ${ry}" stroke="${INK}" stroke-width="3" fill="none"/>`,
  'face-hearts': (t, [[lx, ly], [rx, ry]]) => `${heart(lx, ly - 12, 1.45, '#e8577a')}${heart(rx, ry - 12, 1.45, '#e8577a')}<path d="M${lx + 12} ${ly - 3} L${rx - 12} ${ry - 3}" stroke="#c43d62" stroke-width="3"/><path d="M${lx - 6} ${ly - 4} l3 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M${rx - 6} ${ry - 4} l3 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
  'face-stars': (t, [[lx, ly], [rx, ry]]) => `${star(lx, ly, 15, '#f2c94c', 'stroke="#d9a920" stroke-width="2" stroke-linejoin="round"')}${star(rx, ry, 15, '#f2c94c', 'stroke="#d9a920" stroke-width="2" stroke-linejoin="round"')}<path d="M${lx + 12} ${ly - 2} L${rx - 12} ${ry - 2}" stroke="#d9a920" stroke-width="3"/>`,
  'face-shades': (t, [[lx, ly], [rx, ry]]) => `<path d="M${lx - 16} ${ly - 8} H${lx + 14} Q${lx + 12} ${ly + 12} ${lx} ${ly + 12} Q${lx - 14} ${ly + 12} ${lx - 16} ${ly - 8}Z" fill="#2f2c2b"/><path d="M${rx - 14} ${ry - 8} H${rx + 16} Q${rx + 14} ${ry + 12} ${rx} ${ry + 12} Q${rx - 12} ${ry + 12} ${rx - 14} ${ry - 8}Z" fill="#2f2c2b"/><path d="M${lx + 14} ${ly - 6} H${rx - 14}" stroke="#2f2c2b" stroke-width="4"/><path d="M${lx - 10} ${ly - 4} l6 0" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/><path d="M${rx - 8} ${ry - 4} l6 0" stroke="#fff" stroke-width="2.5" opacity=".5" stroke-linecap="round"/>`,
  'face-monocle': (t, [, [rx, ry]]) => `<circle cx="${rx}" cy="${ry}" r="13" fill="rgba(255,255,255,.2)" stroke="#d9a920" stroke-width="3"/><path d="M${rx + 10} ${ry + 9} Q${rx + 18} ${ry + 30} ${rx + 8} ${ry + 46}" stroke="#d9a920" stroke-width="1.5" fill="none"/>`,
  'face-mustache': () => `<path d="M100 137 Q90 128 80 134 Q74 140 66 136 Q72 148 86 144 Q96 142 100 139 Q104 142 114 144 Q128 148 134 136 Q126 140 120 134 Q110 128 100 137Z" fill="#5b3f2c"/>`,
  'face-freckles': (t, [[lx, ly], [rx, ry]]) => `${[[-6, 18], [0, 22], [6, 18], [-2, 14]].map(([dx, dy]) => `<circle cx="${lx + dx - 4}" cy="${ly + dy}" r="1.6" fill="#b5724a" opacity=".7"/><circle cx="${rx - dx + 4}" cy="${ry + dy}" r="1.6" fill="#b5724a" opacity=".7"/>`).join('')}`,
  'face-mask': (t, [[lx, ly]]) => `<path d="M64 ${ly - 30} Q100 ${ly - 44} 136 ${ly - 30} Q138 ${ly - 16} 120 ${ly - 16} Q100 ${ly - 22} 80 ${ly - 16} Q62 ${ly - 16} 64 ${ly - 30}Z" fill="#a68fe0"/><path d="M78 ${ly - 26} q5 3 10 0 M112 ${ly - 26} q5 3 10 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // Neck
  'neck-bowtie': () => `<path d="M100 166 L80 154 L80 178 Z" fill="#a68fe0"/><path d="M100 166 L120 154 L120 178 Z" fill="#a68fe0"/><rect x="94" y="160" width="12" height="12" rx="4" fill="#8a72cc"/>`,
  'neck-bandana': () => `<path d="M64 156 Q100 168 136 156 L100 190 Z" fill="#e05a5a"/><circle cx="92" cy="166" r="2.5" fill="#fff"/><circle cx="106" cy="170" r="2.5" fill="#fff"/><circle cx="100" cy="179" r="2.5" fill="#fff"/><circle cx="114" cy="162" r="2.5" fill="#fff"/><circle cx="84" cy="161" r="2.5" fill="#fff"/>`,
  'neck-scarf': () => `<path d="M50 154 Q100 174 150 154 L152 168 Q100 190 48 168 Z" fill="#f3a06b"/><rect x="118" y="164" width="16" height="30" rx="5" fill="#e88a52" transform="rotate(-8 126 164)"/><path d="M60 162 Q100 178 140 162" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" fill="none" opacity=".6"/>`,
  'neck-holiday': () => `<path d="M50 154 Q100 174 150 154 L152 168 Q100 190 48 168 Z" fill="#e04848"/><path d="M56 160 Q100 178 146 160" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="8 8"/><rect x="118" y="164" width="16" height="30" rx="5" fill="#5f9f44" transform="rotate(-8 126 164)"/>`,
  'neck-bell': () => `<path d="M62 156 Q100 170 138 156" stroke="#e05a5a" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="100" cy="172" r="9" fill="#f2c94c" stroke="#d9a920" stroke-width="2"/><path d="M94 174 H106" stroke="#a87a10" stroke-width="2"/><circle cx="97" cy="168" r="2" fill="#fff" opacity=".7"/>`,
  'neck-pearls': () => `${Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (0.15 + 0.07 * i); return `<circle cx="${(100 - 44 * Math.cos(a)).toFixed(1)}" cy="${(150 + 18 * Math.sin(a)).toFixed(1)}" r="4.2" fill="#fbf7f1" stroke="#e2d9ca" stroke-width="1"/>`; }).join('')}`,
  'neck-lei': () => `${Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.12 + 0.095 * i); const x = 100 - 46 * Math.cos(a); const y = 152 + 20 * Math.sin(a); const col = ['#ee8fa6', '#f2d36b', '#f3a06b', '#a68fe0'][i % 4]; return `<g>${[0, 72, 144, 216, 288].map((d) => `<circle cx="${(x + 5 * Math.cos(d * Math.PI / 180)).toFixed(1)}" cy="${(y + 5 * Math.sin(d * Math.PI / 180)).toFixed(1)}" r="4" fill="${col}"/>`).join('')}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="#fff6c9"/></g>`; }).join('')}`,
  'neck-tie': () => `<path d="M92 156 L108 156 L104 166 L110 196 L100 204 L90 196 L96 166 Z" fill="#6fb3e3"/><path d="M95 176 L106 170 M94 188 L108 180" stroke="#4f97cc" stroke-width="3"/>`,
  'neck-locket': () => `<path d="M66 154 Q100 176 134 154" stroke="#d9a920" stroke-width="2" fill="none"/>${heart(100, 164, 1.1, '#f2c94c')}<path d="M100 167 v8" stroke="#d9a920" stroke-width="1" opacity=".5"/>`,
};

// Things worn on the back are drawn behind the body.
const BACK = {
  'back-wings': () => `<g class="pet-flap" style="transform-origin:100px 130px"><path d="M60 128 C20 96 4 124 14 146 C24 166 48 160 66 150Z" fill="#fff" stroke="#e8e2da" stroke-width="2"/><path d="M140 128 C180 96 196 124 186 146 C176 166 152 160 134 150Z" fill="#fff" stroke="#e8e2da" stroke-width="2"/><path d="M24 132 Q40 140 56 140 M28 148 Q44 150 58 148" stroke="#e8e2da" stroke-width="2" fill="none"/><path d="M176 132 Q160 140 144 140 M172 148 Q156 150 142 148" stroke="#e8e2da" stroke-width="2" fill="none"/></g>`,
  'back-fairy': () => `<g class="pet-flap" style="transform-origin:100px 130px" opacity=".85"><ellipse cx="44" cy="112" rx="30" ry="20" transform="rotate(-30 44 112)" fill="#cfe9fb" stroke="#a6d2f2" stroke-width="2"/><ellipse cx="50" cy="152" rx="20" ry="13" transform="rotate(20 50 152)" fill="#f9d6e1" stroke="#efb3c6" stroke-width="2"/><ellipse cx="156" cy="112" rx="30" ry="20" transform="rotate(30 156 112)" fill="#cfe9fb" stroke="#a6d2f2" stroke-width="2"/><ellipse cx="150" cy="152" rx="20" ry="13" transform="rotate(-20 150 152)" fill="#f9d6e1" stroke="#efb3c6" stroke-width="2"/></g>`,
  'back-bat': () => `<g class="pet-flap" style="transform-origin:100px 130px"><path d="M60 122 L18 104 Q24 120 14 128 Q28 128 26 142 Q38 134 44 148 Q50 136 64 140Z" fill="#6c5ba5"/><path d="M140 122 L182 104 Q176 120 186 128 Q172 128 174 142 Q162 134 156 148 Q150 136 136 140Z" fill="#6c5ba5"/></g>`,
  'back-cape': () => `<path d="M64 150 Q40 186 52 194 L148 194 Q160 186 136 150 Z" fill="#e04848"/><path d="M64 150 Q100 166 136 150" stroke="#b83030" stroke-width="5" fill="none"/>`,
  'back-backpack': () => `<rect x="128" y="110" width="44" height="56" rx="14" fill="#f2a0b6"/><rect x="136" y="134" width="28" height="20" rx="6" fill="#ee8fa6"/><path d="M140 120 h20" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
  'back-balloon': () => `<g class="pet-balloon" style="transform-origin:160px 150px"><path d="M152 150 Q170 110 166 64" stroke="#8a7f77" stroke-width="1.5" fill="none"/><ellipse cx="166" cy="44" rx="20" ry="24" fill="#ee6f8f"/><path d="M162 68 l4 6 l4 -6z" fill="#d9506f"/><ellipse cx="158" cy="36" rx="5" ry="8" fill="#fff" opacity=".4"/></g>`,
  'back-golden': () => `<g class="pet-flap" style="transform-origin:100px 130px"><path d="M60 128 C16 90 0 122 12 148 C24 170 50 162 66 150Z" fill="#ffd34d" stroke="#d9a920" stroke-width="2"/><path d="M140 128 C184 90 200 122 188 148 C176 170 150 162 134 150Z" fill="#ffd34d" stroke="#d9a920" stroke-width="2"/><path d="M22 130 Q40 140 56 140 M26 148 Q44 150 58 148" stroke="#fff6c9" stroke-width="2.5" fill="none"/><path d="M178 130 Q160 140 144 140 M174 148 Q156 150 142 148" stroke="#fff6c9" stroke-width="2.5" fill="none"/></g>`,
};
export const OUTFIT_IDS = [...Object.keys(OUTFIT), ...Object.keys(BACK)];

function outfitPart(id, sp) {
  if (!id || !OUTFIT[id]) return '';
  const top = sp === 'bunny' ? 64 : sp === 'frog' ? 66 : sp === 'fox' ? 70 : 72;
  return OUTFIT[id](top, eyePos(sp));
}

export function petSVG({ species = 'raccoon', mood = 'happy', stage = 'grown', outfit = {}, cls = '' } = {}) {
  const sp = PAL[species] ? species : 'raccoon';
  const c = PAL[sp];
  const s = STAGE_SCALE[stage] || 1;
  const body = sp === 'capybara'
    ? 'M100 78 C152 76 170 106 170 138 C170 172 144 186 100 186 C56 186 30 172 30 138 C30 106 48 80 100 78 Z'
    : sp === 'penguin'
      ? 'M100 70 C140 70 160 104 160 140 C160 172 138 188 100 188 C62 188 40 172 40 140 C40 104 60 70 100 70 Z'
      : 'M100 72 C148 72 166 108 166 140 C166 170 142 186 100 186 C58 186 34 170 34 140 C34 108 52 72 100 72 Z';
  const g = nid('pg'); const gb = nid('pb'); const gs = nid('ps');
  const blushY = sp === 'frog' ? 120 : sp === 'capybara' ? 128 : 140;
  const line = mix(c.body, INK, 0.38);
  const zzz = mood === 'sleepy' ? `<g class="zzz" fill="#a68fe0" font-weight="800" font-family="ui-rounded, system-ui"><text x="150" y="70" font-size="18">z</text><text x="164" y="52" font-size="24">Z</text></g>` : '';
  const footCol = sp === 'penguin' ? c.inner : sp === 'panda' ? c.dark : mix(c.body, c.dark, 0.35);
  return `<svg class="pet ${cls}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="pet">
    <defs>
      <radialGradient id="${g}" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${mix(c.body, '#ffffff', 0.32)}"/><stop offset=".55" stop-color="${c.body}"/><stop offset="1" stop-color="${mix(c.body, c.dark, 0.45)}"/></radialGradient>
      <radialGradient id="${gb}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="${c.belly}"/></radialGradient>
      <radialGradient id="${gs}"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="100" cy="190" rx="${62 * s}" ry="${10 * s}" fill="url(#${gs})"/>
    <g class="pet-body" transform="translate(100 190) scale(${s}) translate(-100 -190)">
      <g class="pet-breathe" style="transform-origin:100px 186px">
      ${outfit.back && BACK[outfit.back] ? BACK[outfit.back]() : ''}
      ${behind(sp, c, g)}
      <ellipse cx="80" cy="184" rx="13" ry="8" fill="${footCol}"/><ellipse cx="120" cy="184" rx="13" ry="8" fill="${footCol}"/>
      <path d="${body}" fill="url(#${g})" stroke="${line}" stroke-width="2.2" stroke-opacity=".5"/>
      ${sp === 'penguin' ? '' : `<ellipse cx="100" cy="162" rx="42" ry="23" fill="url(#${gb})"/>`}
      ${overBody(sp, c)}
      <ellipse cx="72" cy="94" rx="18" ry="8" fill="#fff" opacity=".32" transform="rotate(-25 72 94)"/>
      <circle cx="58" cy="108" r="3" fill="#fff" opacity=".35"/>
      <ellipse cx="64" cy="${blushY}" rx="10" ry="5.5" fill="#ff8fa6" opacity=".5"/>
      <ellipse cx="136" cy="${blushY}" rx="10" ry="5.5" fill="#ff8fa6" opacity=".5"/>
      ${eyes(sp, mood)}
      ${mouth(sp, mood, c)}
      ${outfitPart(outfit.neck, sp)}
      ${outfitPart(outfit.face, sp)}
      ${outfitPart(outfit.head, sp)}
      </g>
    </g>
    ${zzz}
  </svg>`;
}

// Place a pet SVG inside the room (pet is drawn in a 200 box).
export function roomWithPet(room, petOpts, night = false) {
  const inner = petSVG(petOpts).replace('<svg ', '<svg x="104" y="112" width="152" height="152" ');
  return roomSVG({ room, pet: inner, night });
}

const OUT_SLOTS = ['head', 'face', 'neck', 'back'];
export function itemPreview(item, species = 'raccoon') {
  if (OUT_SLOTS.includes(item.slot)) {
    const outfit = { [item.slot]: item.id };
    const vb = item.slot === 'neck' ? '30 40 140 165' : item.slot === 'back' ? '0 10 200 190' : '30 -8 140 180';
    return petSVG({ species, outfit, mood: 'happy' }).replace('viewBox="0 0 200 200"', `viewBox="${vb}"`);
  }
  return roomPreview(item);
}

export { roomSVG };

// Two peas in a pod with a heart: used for the logo.
export function logoSVG(size = 64) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 22 C57 14 44 14 44 25 C44 33 54 38 60 44 C66 38 76 33 76 25 C76 14 63 14 60 22Z" fill="#ee8fa6"/>
    <path d="M14 70 Q60 108 106 70 Q60 52 14 70Z" fill="#5f9f44"/>
    <path d="M18 70 Q60 98 102 70 Q60 60 18 70Z" fill="#d7efc8"/>
    <circle cx="45" cy="74" r="15" fill="#93d06e"/><circle cx="75" cy="74" r="15" fill="#93d06e"/>
    <circle cx="40" cy="72" r="2.4" fill="#3b3330"/><circle cx="50" cy="72" r="2.4" fill="#3b3330"/><path d="M41 79 Q45 83 49 79" stroke="#3b3330" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="70" cy="72" r="2.4" fill="#3b3330"/><circle cx="80" cy="72" r="2.4" fill="#3b3330"/><path d="M71 79 Q75 83 79 79" stroke="#3b3330" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="36" cy="78" rx="3.5" ry="2" fill="#ff8fa6" opacity=".6"/><ellipse cx="84" cy="78" rx="3.5" ry="2" fill="#ff8fa6" opacity=".6"/>
    <path d="M14 70 Q8 66 6 60" stroke="#5f9f44" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`;
}
