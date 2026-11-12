// The pet and its room, drawn as SVG so they stay crisp and work offline.

let seq = 0;
const nid = (p) => `${p}${++seq}`;

const PAL = {
  raccoon: { body: '#a7acb2', belly: '#efebe4', dark: '#5d636a', inner: '#5d636a' },
  cat: { body: '#f5b06f', belly: '#fde9d3', dark: '#d98a4a', inner: '#f7a8b8' },
  capybara: { body: '#c39570', belly: '#dfbe9c', dark: '#8f6748', inner: '#8f6748' },
  bunny: { body: '#f7f2ec', belly: '#ffffff', dark: '#d8cdc2', inner: '#f7b6c6' },
  frog: { body: '#93d06e', belly: '#e3f4cb', dark: '#5f9f44', inner: '#5f9f44' },
  duck: { body: '#ffd95e', belly: '#fff2bd', dark: '#e3b536', inner: '#ff9f43' },
};
const INK = '#3b3330';
const STAGE_SCALE = { baby: 0.62, kid: 0.74, teen: 0.87, grown: 1 };

const heart = (x, y, s, fill) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C-1-2 -9-2 -9 4 C-9 9 -3 12 0 15 C3 12 9 9 9 4 C9-2 1-2 0 3Z" fill="${fill}"/>`;

function behind(sp, c) {
  switch (sp) {
    case 'raccoon': {
      const clip = nid('tail');
      return `
        <g transform="rotate(28 170 140)">
          <clipPath id="${clip}"><ellipse cx="170" cy="138" rx="15" ry="34"/></clipPath>
          <ellipse cx="170" cy="138" rx="15" ry="34" fill="${c.body}"/>
          <g clip-path="url(#${clip})" fill="${c.dark}">
            <rect x="150" y="108" width="40" height="8"/><rect x="150" y="126" width="40" height="8"/><rect x="150" y="144" width="40" height="8"/><rect x="150" y="162" width="40" height="10"/>
          </g>
        </g>
        <circle cx="64" cy="84" r="17" fill="${c.body}"/><circle cx="64" cy="84" r="9" fill="${c.inner}"/>
        <circle cx="136" cy="84" r="17" fill="${c.body}"/><circle cx="136" cy="84" r="9" fill="${c.inner}"/>`;
    }
    case 'cat':
      return `
        <path d="M158 168 Q198 150 182 108" stroke="${c.body}" stroke-width="13" fill="none" stroke-linecap="round"/>
        <path d="M54 100 L60 54 L94 80 Z" fill="${c.body}"/><path d="M62 90 L65 66 L84 80 Z" fill="${c.inner}"/>
        <path d="M146 100 L140 54 L106 80 Z" fill="${c.body}"/><path d="M138 90 L135 66 L116 80 Z" fill="${c.inner}"/>`;
    case 'capybara':
      return `<ellipse cx="68" cy="84" rx="10" ry="9" fill="${c.dark}"/><ellipse cx="132" cy="84" rx="10" ry="9" fill="${c.dark}"/>`;
    case 'bunny':
      return `
        <circle cx="164" cy="170" r="13" fill="#fff"/>
        <g transform="rotate(-12 80 60)"><ellipse cx="80" cy="50" rx="14" ry="36" fill="${c.body}"/><ellipse cx="80" cy="54" rx="7" ry="25" fill="${c.inner}"/></g>
        <g transform="rotate(12 120 60)"><ellipse cx="120" cy="50" rx="14" ry="36" fill="${c.body}"/><ellipse cx="120" cy="54" rx="7" ry="25" fill="${c.inner}"/></g>`;
    case 'frog':
      return `<circle cx="70" cy="84" r="22" fill="${c.body}"/><circle cx="130" cy="84" r="22" fill="${c.body}"/>`;
    case 'duck':
      return `
        <ellipse cx="40" cy="142" rx="12" ry="22" transform="rotate(20 40 142)" fill="${c.dark}"/>
        <ellipse cx="160" cy="142" rx="12" ry="22" transform="rotate(-20 160 142)" fill="${c.dark}"/>`;
    default: return '';
  }
}

function eyePos(sp) {
  return sp === 'frog' ? [[70, 84], [130, 84]] : [[80, 124], [120, 124]];
}

function eyes(sp, mood) {
  const [[lx, ly], [rx, ry]] = eyePos(sp);
  let s = '';
  if (sp === 'frog') s += `<circle cx="${lx}" cy="${ly}" r="13" fill="#fff"/><circle cx="${rx}" cy="${ry}" r="13" fill="#fff"/>`;
  if (sp === 'raccoon') {
    s += `<ellipse cx="${lx}" cy="${ly}" rx="18" ry="13" transform="rotate(-12 ${lx} ${ly})" fill="#5d636a"/>
          <ellipse cx="${rx}" cy="${ry}" rx="18" ry="13" transform="rotate(12 ${rx} ${ry})" fill="#5d636a"/>`;
  }
  const dotFill = sp === 'raccoon' ? '#1f1b19' : INK;
  const one = (x, y, side) => {
    if (mood === 'love') return heart(x, y - 7, 0.9, '#e8577a');
    if (mood === 'sleepy') return `<path d="M${x - 7} ${y} Q${x} ${y + 6} ${x + 7} ${y}" stroke="${sp === 'raccoon' ? '#f5f2ee' : INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    let e = `<circle cx="${x}" cy="${y}" r="${mood === 'sad' ? 6 : 7}" fill="${dotFill}"/><circle cx="${x + 2.4}" cy="${y - 2.6}" r="2.4" fill="#fff"/>`;
    if (mood === 'sad') {
      const bx = side < 0 ? x - 8 : x + 8;
      e += `<path d="M${bx} ${y - 14} L${x - side * 2} ${y - 11}" stroke="${sp === 'raccoon' ? '#f5f2ee' : INK}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    return e;
  };
  s += one(lx, ly, -1) + one(rx, ry, 1);
  if (mood === 'sad') s += `<path d="M${rx + 6} ${ry + 9} q-4 7 0 10 q4 -3 0 -10z" fill="#8ecbf0"/>`;
  return s;
}

function mouth(sp, mood, c) {
  if (sp === 'duck') {
    const open = mood === 'happy' || mood === 'love';
    return `<ellipse cx="100" cy="144" rx="17" ry="8" fill="#ff9f43"/>${open ? '<path d="M86 147 Q100 160 114 147 Z" fill="#f08a2c"/>' : ''}`;
  }
  let s = '';
  const my = sp === 'frog' ? 134 : 142;
  if (sp === 'capybara') {
    s += `<ellipse cx="100" cy="140" rx="24" ry="15" fill="${c.dark}" opacity=".55"/>
          <ellipse cx="92" cy="135" rx="3" ry="2" fill="${INK}"/><ellipse cx="108" cy="135" rx="3" ry="2" fill="${INK}"/>`;
  }
  if (sp === 'cat' || sp === 'bunny' || sp === 'raccoon') {
    s += `<path d="M95.5 134 L104.5 134 L100 139.5 Z" fill="${sp === 'raccoon' ? '#2d2927' : '#f19bb0'}"/>`;
  }
  if (sp === 'cat') {
    s += `<g stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".55">
      <path d="M62 136 L44 132"/><path d="M62 141 L44 143"/><path d="M138 136 L156 132"/><path d="M138 141 L156 143"/></g>`;
  }
  if (sp === 'frog') {
    if (mood === 'sad') return s + `<path d="M84 ${my + 6} Q100 ${my - 4} 116 ${my + 6}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    if (mood === 'sleepy') return s + `<ellipse cx="100" cy="${my}" rx="4" ry="5" fill="${INK}" opacity=".7"/>`;
    return s + `<path d="M76 ${my - 2} Q100 ${my + 18} 124 ${my - 2}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  const y = sp === 'capybara' ? 150 : my;
  if (mood === 'sad') return s + `<path d="M93 ${y + 5} Q100 ${y - 2} 107 ${y + 5}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (mood === 'sleepy') return s + `<ellipse cx="100" cy="${y + 2}" rx="3" ry="4" fill="${INK}" opacity=".7"/>`;
  return s + `<path d="M91 ${y} Q95.5 ${y + 6} 100 ${y + 1} Q104.5 ${y + 6} 109 ${y}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
}

function outfitPart(id, sp) {
  const [[lx, ly], [rx, ry]] = eyePos(sp);
  const top = sp === 'bunny' ? 64 : sp === 'frog' ? 66 : 72;
  switch (id) {
    case 'hat-party':
      return `<path d="M82 ${top + 6} L100 ${top - 44} L118 ${top + 6} Z" fill="#ee8fa6"/>
        <path d="M88 ${top - 12} L112 ${top - 12}" stroke="#fff" stroke-width="3" opacity=".7"/><path d="M85 ${top - 2} L115 ${top - 2}" stroke="#a68fe0" stroke-width="3"/>
        <circle cx="100" cy="${top - 44}" r="7" fill="#f2d36b"/>`;
    case 'hat-bow':
      return `<g transform="translate(0 ${top - 72})"><path d="M100 70 L74 54 L76 88 Z" fill="#ee6f8f"/><path d="M100 70 L126 54 L124 88 Z" fill="#ee6f8f"/><circle cx="100" cy="71" r="7" fill="#d9506f"/></g>`;
    case 'hat-beanie':
      return `<g transform="translate(0 ${top - 72})"><path d="M62 90 Q64 46 100 44 Q136 46 138 90 Z" fill="#6fb3e3"/>
        <path d="M80 56 L80 86 M100 46 L100 86 M120 56 L120 86" stroke="#5aa0d2" stroke-width="3"/>
        <rect x="58" y="80" width="84" height="15" rx="7.5" fill="#4f97cc"/><circle cx="100" cy="42" r="10" fill="#fff"/></g>`;
    case 'hat-chef':
      return `<g transform="translate(0 ${top - 72})"><circle cx="80" cy="50" r="17" fill="#fff" stroke="#e8e2da" stroke-width="2"/><circle cx="120" cy="50" r="17" fill="#fff" stroke="#e8e2da" stroke-width="2"/><circle cx="100" cy="40" r="20" fill="#fff" stroke="#e8e2da" stroke-width="2"/><rect x="76" y="54" width="48" height="24" rx="4" fill="#fff" stroke="#e8e2da" stroke-width="2"/></g>`;
    case 'hat-flower': {
      const pts = [[68, 84], [83, 74], [100, 70], [117, 74], [132, 84]];
      const cols = ['#ee8fa6', '#f2d36b', '#a68fe0', '#6fb3e3', '#f3a06b'];
      return `<g transform="translate(0 ${top - 72})"><path d="M62 88 Q100 60 138 88" stroke="#7cb66b" stroke-width="4" fill="none"/>${pts.map(([x, y], i) => `
        <g>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${x + 5 * Math.cos(a * Math.PI / 180)}" cy="${y + 5 * Math.sin(a * Math.PI / 180)}" r="4.2" fill="${cols[i]}"/>`).join('')}<circle cx="${x}" cy="${y}" r="3" fill="#fff6c9"/></g>`).join('')}</g>`;
    }
    case 'hat-crown':
      return `<g transform="translate(0 ${top - 72})"><path d="M74 80 L78 48 L91 64 L100 42 L109 64 L122 48 L126 80 Z" fill="#f2c94c" stroke="#d9a920" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="100" cy="70" r="4" fill="#ee6f8f"/><circle cx="86" cy="72" r="3" fill="#6fb3e3"/><circle cx="114" cy="72" r="3" fill="#7cb66b"/></g>`;
    case 'hat-halo':
      return `<ellipse cx="100" cy="${top - 22}" rx="30" ry="8" fill="none" stroke="#f7dc6f" stroke-width="5"/><ellipse cx="100" cy="${top - 22}" rx="30" ry="8" fill="none" stroke="#fff6c9" stroke-width="2"/>`;
    case 'face-glasses':
      return `<g stroke="${INK}" stroke-width="3" fill="rgba(255,255,255,.25)"><circle cx="${lx}" cy="${ly}" r="13"/><circle cx="${rx}" cy="${ry}" r="13"/></g><path d="M${lx + 13} ${ly} Q100 ${ly - 5} ${rx - 13} ${ry}" stroke="${INK}" stroke-width="3" fill="none"/>`;
    case 'face-hearts':
      return `${heart(lx, ly - 12, 1.45, '#e8577a')}${heart(rx, ry - 12, 1.45, '#e8577a')}<path d="M${lx + 12} ${ly - 3} L${rx - 12} ${ry - 3}" stroke="#c43d62" stroke-width="3"/>
        <path d="M${lx - 6} ${ly - 4} l3 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/><path d="M${rx - 6} ${ry - 4} l3 -3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
    case 'neck-bowtie':
      return `<path d="M100 166 L80 154 L80 178 Z" fill="#a68fe0"/><path d="M100 166 L120 154 L120 178 Z" fill="#a68fe0"/><rect x="94" y="160" width="12" height="12" rx="4" fill="#8a72cc"/>`;
    case 'neck-bandana':
      return `<path d="M64 156 Q100 168 136 156 L100 190 Z" fill="#e05a5a"/><circle cx="92" cy="166" r="2.5" fill="#fff"/><circle cx="106" cy="170" r="2.5" fill="#fff"/><circle cx="100" cy="179" r="2.5" fill="#fff"/><circle cx="114" cy="162" r="2.5" fill="#fff"/><circle cx="84" cy="161" r="2.5" fill="#fff"/>`;
    case 'neck-scarf':
      return `<path d="M50 154 Q100 174 150 154 L152 168 Q100 190 48 168 Z" fill="#f3a06b"/><rect x="118" y="164" width="16" height="30" rx="5" fill="#e88a52" transform="rotate(-8 126 164)"/>
        <path d="M60 162 Q100 178 140 162" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" fill="none" opacity=".6"/>`;
    default: return '';
  }
}

export function petSVG({ species = 'raccoon', mood = 'happy', stage = 'grown', outfit = {}, cls = '' } = {}) {
  const c = PAL[species] || PAL.raccoon;
  const s = STAGE_SCALE[stage] || 1;
  const body = species === 'capybara'
    ? 'M100 78 C152 76 170 106 170 138 C170 172 144 186 100 186 C56 186 30 172 30 138 C30 106 48 80 100 78 Z'
    : 'M100 72 C148 72 166 108 166 140 C166 170 142 186 100 186 C58 186 34 170 34 140 C34 108 52 72 100 72 Z';
  const blushY = species === 'frog' ? 120 : 140;
  const zzz = mood === 'sleepy' ? `<g class="zzz" fill="#a68fe0" font-weight="800" font-family="ui-rounded, system-ui"><text x="150" y="70" font-size="18">z</text><text x="164" y="52" font-size="24">Z</text></g>` : '';
  return `<svg class="pet ${cls}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="pet">
    <ellipse cx="100" cy="190" rx="${56 * s}" ry="${8 * s}" fill="#000" opacity=".08"/>
    <g class="pet-body" transform="translate(100 190) scale(${s}) translate(-100 -190)">
      ${behind(species, c)}
      <path d="${body}" fill="${c.body}"/>
      <ellipse cx="100" cy="160" rx="42" ry="24" fill="${c.belly}"/>
      <ellipse cx="74" cy="96" rx="18" ry="9" fill="#fff" opacity=".28" transform="rotate(-25 74 96)"/>
      ${species === 'duck' ? `<path d="M96 74 Q90 56 100 54 Q98 63 104 66 Q109 56 114 60 Q107 67 104 74 Z" fill="${c.dark}"/>` : ''}
      <ellipse cx="66" cy="${blushY}" rx="9" ry="5" fill="#ff8fa6" opacity=".5"/>
      <ellipse cx="134" cy="${blushY}" rx="9" ry="5" fill="#ff8fa6" opacity=".5"/>
      ${eyes(species, mood)}
      ${mouth(species, mood, c)}
      ${outfitPart(outfit.neck, species)}
      ${outfitPart(outfit.face, species)}
      ${outfitPart(outfit.head, species)}
    </g>
    ${zzz}
  </svg>`;
}

// ---------------- Room ----------------

function wall(id) {
  const p = nid('wp');
  switch (id) {
    case 'wall-stripes':
      return `<defs><pattern id="${p}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#fde4ea"/><rect width="12" height="28" fill="#f9cfd9"/></pattern></defs><rect width="360" height="204" fill="url(#${p})"/>`;
    case 'wall-dots':
      return `<defs><pattern id="${p}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#dff3ea"/><circle cx="6" cy="6" r="3" fill="#fff"/><circle cx="18" cy="18" r="3" fill="#fff"/></pattern></defs><rect width="360" height="204" fill="url(#${p})"/>`;
    case 'wall-hearts':
      return `<defs><pattern id="${p}" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#ece6fb"/>${heart(9, 6, 0.5, '#d9cdf7')}${heart(26, 22, 0.5, '#d9cdf7')}</pattern></defs><rect width="360" height="204" fill="url(#${p})"/>`;
    case 'wall-stars':
      return `<rect width="360" height="204" fill="#2f3a63"/>${[[30, 30], [90, 60], [150, 24], [210, 70], [290, 34], [330, 90], [60, 120], [180, 130], [260, 150], [120, 170], [320, 170]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.6}" fill="#fff6c9" opacity=".9"/>`).join('')}
        <path d="M300 54 a16 16 0 1 0 14 -22 a12 12 0 1 1 -14 22z" fill="#fff1a8"/>`;
    default:
      return `<defs><pattern id="${p}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fbefe2"/><circle cx="20" cy="20" r="1.6" fill="#f0dcc6"/></pattern></defs><rect width="360" height="204" fill="url(#${p})"/>`;
  }
}

function floor() {
  return `<rect y="198" width="360" height="10" fill="#ecd3b8"/><rect y="206" width="360" height="94" fill="#e6c49d"/>
    <g stroke="#d9b38a" stroke-width="2"><path d="M0 236 H360"/><path d="M0 268 H360"/><path d="M80 206 V236 M220 206 V236 M150 236 V268 M300 236 V268 M60 268 V300 M240 268 V300"/></g>`;
}

const PARTS = {
  'window-day': () => `<g><rect x="34" y="34" width="88" height="76" rx="8" fill="#fff"/><rect x="40" y="40" width="76" height="64" rx="5" fill="#bfe3fb"/>
    <circle cx="96" cy="58" r="9" fill="#ffe27a"/><path d="M48 86 a9 9 0 0 1 16 -4 a8 8 0 0 1 14 4 z" fill="#fff"/>
    <path d="M78 40 V104 M40 72 H116" stroke="#fff" stroke-width="4"/><rect x="28" y="108" width="100" height="8" rx="4" fill="#f4e1cc"/></g>`,
  'frame-pea': () => `<g><rect x="240" y="48" width="56" height="48" rx="6" fill="#fff" stroke="#e2c9ad" stroke-width="4"/>
    <path d="M250 76 Q268 92 286 76 Q268 66 250 76Z" fill="#7cb66b"/><circle cx="262" cy="77" r="5" fill="#a5d68f"/><circle cx="274" cy="77" r="5" fill="#a5d68f"/></g>`,
  'frame-heart': () => `<g><rect x="240" y="48" width="56" height="48" rx="6" fill="#fff" stroke="#ee8fa6" stroke-width="4"/>${heart(268, 60, 1.25, '#ee8fa6')}</g>`,
  'frame-gold': () => `<g><rect x="236" y="44" width="64" height="56" rx="6" fill="#fff8e1" stroke="#e7bf3f" stroke-width="6"/>${heart(268, 54, 1.0, '#ee8fa6')}
    <path d="M250 84 Q268 98 286 84 Q268 76 250 84Z" fill="#7cb66b"/><circle cx="262" cy="85" r="4" fill="#a5d68f"/><circle cx="274" cy="85" r="4" fill="#a5d68f"/></g>`,
  'lights-fairy': () => `<g><path d="M0 14 Q45 34 90 14 Q135 34 180 14 Q225 34 270 14 Q315 34 360 14" stroke="#6b5d52" stroke-width="1.5" fill="none"/>
    ${[22, 45, 68, 112, 135, 158, 202, 225, 248, 292, 315, 338].map((x, i) => { const y = 14 + 20 * Math.sin(((x % 90) / 90) * Math.PI) * 0.5 + 4; const col = ['#f2d36b', '#ee8fa6', '#6fb3e3', '#7cb66b'][i % 4]; return `<circle cx="${x}" cy="${y}" r="9" fill="${col}" opacity=".22"/><circle cx="${x}" cy="${y}" r="4.2" fill="${col}"/>`; }).join('')}</g>`,
  'rug-default': () => `<ellipse cx="180" cy="262" rx="112" ry="26" fill="#bfe0ae"/><ellipse cx="180" cy="262" rx="92" ry="19" fill="none" stroke="#a6d08f" stroke-width="3" stroke-dasharray="6 6"/>`,
  'rug-heart': () => `<path transform="translate(180 236) scale(5.4 2.1)" d="M0 3 C-1-2 -11-2 -11 5 C-11 10 -3 14 0 17 C3 14 11 10 11 5 C11-2 1-2 0 3Z" fill="#f6b9c8"/>`,
  'rug-rainbow': () => `<ellipse cx="180" cy="262" rx="118" ry="28" fill="#f6b9c8"/><ellipse cx="180" cy="262" rx="98" ry="23" fill="#fbd9a8"/><ellipse cx="180" cy="262" rx="78" ry="18" fill="#fff0a8"/><ellipse cx="180" cy="262" rx="58" ry="13" fill="#c6e8b5"/><ellipse cx="180" cy="262" rx="38" ry="8" fill="#bde0f7"/>`,
  'rug-gold': () => `<ellipse cx="180" cy="262" rx="116" ry="27" fill="#f2d36b"/><ellipse cx="180" cy="262" rx="100" ry="21" fill="none" stroke="#fff6c9" stroke-width="3"/><ellipse cx="180" cy="262" rx="116" ry="27" fill="none" stroke="#d9a920" stroke-width="2" stroke-dasharray="2 4"/>`,
  'bed-basket': () => `<g><ellipse cx="62" cy="262" rx="52" ry="22" fill="#c98f5a"/><ellipse cx="62" cy="254" rx="44" ry="14" fill="#f6efe6"/>
    <path d="M14 258 Q62 290 110 258" stroke="#a8743f" stroke-width="3" fill="none" stroke-dasharray="5 4"/><ellipse cx="62" cy="252" rx="30" ry="8" fill="#fde4ea"/></g>`,
  'bed-cloud': () => `<g><path d="M14 268 a20 20 0 0 1 16 -30 a26 26 0 0 1 46 -6 a20 20 0 0 1 34 18 a14 14 0 0 1 -4 18 Z" fill="#fff" stroke="#e6ecf5" stroke-width="3"/>
    <ellipse cx="44" cy="248" rx="16" ry="8" fill="#e0f0fb"/></g>`,
  'plant-pot': () => `<g><path d="M306 238 L340 238 L334 268 L312 268 Z" fill="#e58f68"/><rect x="302" y="232" width="42" height="9" rx="4" fill="#d27a53"/>
    <path d="M323 232 Q322 214 323 206" stroke="#5f9f44" stroke-width="3"/><ellipse cx="314" cy="210" rx="10" ry="6" fill="#7cb66b" transform="rotate(-30 314 210)"/><ellipse cx="332" cy="214" rx="10" ry="6" fill="#93d06e" transform="rotate(25 332 214)"/></g>`,
  'plant-cactus': () => `<g><path d="M306 238 L340 238 L334 268 L312 268 Z" fill="#e58f68"/><rect x="302" y="232" width="42" height="9" rx="4" fill="#d27a53"/>
    <rect x="315" y="180" width="16" height="54" rx="8" fill="#6fb35a"/><rect x="300" y="196" width="10" height="24" rx="5" fill="#6fb35a"/><rect x="304" y="212" width="14" height="8" rx="4" fill="#6fb35a"/>
    <rect x="336" y="190" width="10" height="22" rx="5" fill="#6fb35a"/><rect x="328" y="204" width="14" height="8" rx="4" fill="#6fb35a"/><circle cx="323" cy="178" r="5" fill="#ee8fa6"/></g>`,
  'plant-monstera': () => `<g><path d="M302 236 L344 236 L338 270 L308 270 Z" fill="#f4e1cc"/><rect x="298" y="230" width="50" height="9" rx="4" fill="#e6cbae"/>
    <g fill="#4f9a3c"><path d="M322 232 C300 214 296 176 318 166 C320 190 322 210 322 232Z"/><path d="M324 232 C340 206 352 176 336 160 C328 182 326 206 324 232Z"/><path d="M322 232 C296 230 282 204 290 190 C304 202 314 218 322 232Z"/></g>
    <g stroke="#cfe8c2" stroke-width="1.5"><path d="M318 170 L321 228"/><path d="M336 166 L325 226"/></g></g>`,
  'lamp-mushroom': () => `<g><circle cx="270" cy="208" r="34" fill="#ffe9a8" opacity=".35"/><rect x="264" y="212" width="12" height="34" rx="5" fill="#fff6e8"/><ellipse cx="270" cy="248" rx="16" ry="5" fill="#e8d6c0"/>
    <path d="M244 214 Q246 186 270 184 Q294 186 296 214 Z" fill="#e8576a"/><circle cx="258" cy="200" r="4" fill="#fff"/><circle cx="276" cy="194" r="5" fill="#fff"/><circle cx="286" cy="206" r="3.5" fill="#fff"/></g>`,
  'lamp-moon': () => `<g><circle cx="270" cy="196" r="36" fill="#fff3b0" opacity=".35"/><rect x="268" y="214" width="4" height="34" fill="#c9b9a6"/><ellipse cx="270" cy="249" rx="16" ry="5" fill="#c9b9a6"/>
    <path d="M262 176 a22 22 0 1 0 26 30 a17 17 0 1 1 -26 -30z" fill="#fff1a8" stroke="#f2d36b" stroke-width="2"/></g>`,
};

const CROPS = {
  wall: '0 0 360 204', rug: '56 228 248 68', bed: '6 224 116 66', plant: '286 156 72 120', lamp: '226 150 90 106',
  window: '24 28 108 94', frame: '228 38 82 70', lights: '0 0 360 46', head: '40 10 120 120', face: '40 60 120 100', neck: '40 120 120 80',
};

export function roomSVG({ room = {}, pet = '', preview = null, night = false } = {}) {
  const r = { rug: 'rug-default', frame: 'frame-pea', ...room };
  const only = preview ? { [preview.slot]: preview.id } : null;
  const use = (slot) => (only ? only[slot] : r[slot]);
  const part = (slot) => { const id = use(slot); return id && PARTS[id] ? PARTS[id]() : ''; };
  const vb = preview ? CROPS[preview.slot] : '0 0 360 300';
  const bg = preview && preview.slot !== 'wall' ? `<rect x="-10" y="-10" width="400" height="320" fill="#fbf4ec"/>` : '';
  return `<svg class="room" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    ${bg}
    ${!preview || preview.slot === 'wall' ? wall(use('wall')) : ''}
    ${!preview ? floor() : ''}
    ${part('window')}${part('frame')}${part('lights')}${part('rug')}${part('bed')}${part('plant')}${part('lamp')}
    ${pet ? `<g class="room-pet">${pet}</g>` : ''}
    ${night && !preview ? `<rect width="360" height="300" fill="#1b2452" opacity=".3" pointer-events="none"/>
      ${use('wall') === 'wall-stars' ? '' : [[40, 150], [150, 60], [200, 130], [320, 120], [330, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff6c9" opacity=".7"/>`).join('')}
      ${use('window') ? '<rect x="40" y="40" width="76" height="64" rx="5" fill="#27306a" opacity=".85"/><path d="M92 52 a11 11 0 1 0 12 16 a9 9 0 1 1 -12 -16z" fill="#fff1a8"/><path d="M78 40 V104 M40 72 H116" stroke="#cfd3ea" stroke-width="4"/>' : ''}
      ${use('lamp') ? '<circle cx="270" cy="204" r="46" fill="#ffe9a8" opacity=".28"/>' : ''}` : ''}
  </svg>`;
}

// Place a pet SVG inside the room (pet is drawn in a 200 box).
export function roomWithPet(room, petOpts, night = false) {
  const inner = petSVG(petOpts).replace('<svg ', '<svg x="104" y="112" width="152" height="152" ');
  return roomSVG({ room, pet: inner, night });
}

export function itemPreview(item, species = 'raccoon') {
  if (['head', 'face', 'neck'].includes(item.slot)) {
    const outfit = { [item.slot]: item.id };
    return petSVG({ species, outfit, mood: 'happy' }).replace('viewBox="0 0 200 200"', `viewBox="${CROPS[item.slot] === CROPS.neck ? '30 40 140 160' : '30 0 140 180'}"`);
  }
  return roomSVG({ preview: { slot: item.slot, id: item.id } });
}

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
