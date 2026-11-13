// The date wheel: spin it when you can't decide. If you're both on this screen, you
// both watch the same spin.
import { store } from '../store.js';
import { DATE_IDEAS } from '../content.js';
import { DECKS } from '../swipe-data.js';
import { allMatches } from './swipe.js';
import { checkBoth, LEVEL_LABEL, hasFoodPrefs } from '../food.js';
import { header, themName, meColor, themColor } from '../ui.js';
import {
  esc, toast, confetti, seededShuffle, sheet, lsGet, lsSet,
} from '../util.js';
import { bus } from '../bus.js';

const SOURCES = [
  ['matches', '💞 Our matches'],
  ['food', '🍜 Food matches'],
  ['watch', '🎬 Movie & show matches'],
  ['jar', '🫙 Date jar'],
  ['ideas', '💡 Date ideas'],
  ['custom', '✏️ My own list'],
];

let source = lsGet('twopeas-wheel-src', 'matches');
let slices = null;
let rot = 0;
let result = null;
let spinning = false;
let seed = 1;
let vetoes = { me: 0, them: 0 };

function pool() {
  const m = allMatches().filter((x) => !x.done);
  const fromMatch = (x) => ({ label: x.title, e: x.e, food: x.food, deck: x.deck });
  let items = [];
  if (source === 'matches') items = m.filter((x) => !['movies', 'shows'].includes(x.deck)).map(fromMatch);
  else if (source === 'food') items = m.filter((x) => DECKS[x.deck]?.food).map(fromMatch);
  else if (source === 'watch') items = m.filter((x) => ['movies', 'shows'].includes(x.deck)).map(fromMatch);
  else if (source === 'jar') items = store.all('jar').map((j) => ({ label: j.data.text, e: '🫙' }));
  else if (source === 'ideas') items = DATE_IDEAS.map((i) => ({ label: i.text, e: '💡' }));
  else items = (lsGet('twopeas-wheel-custom', []) || []).map((t) => ({ label: t, e: '✏️' }));
  // Never land on something that isn't safe for one of you.
  if (hasFoodPrefs(store.me) || hasFoodPrefs(store.partnerId)) items = items.filter((i) => !i.food || checkBoth(i.food).level !== 'avoid');
  return items;
}

function pickSlices() {
  const p = pool();
  slices = seededShuffle(p, `${seed}-${source}`).slice(0, 12);
}

function wheelSvg(list) {
  const n = list.length;
  const R = 150;
  const cols = [meColor().hex, themColor().hex];
  const soft = ['var(--me-soft)', 'var(--them-soft)'];
  if (!n) return '';
  const parts = list.map((s, i) => {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = R + R * Math.cos(a0); const y0 = R + R * Math.sin(a0);
    const x1 = R + R * Math.cos(a1); const y1 = R + R * Math.sin(a1);
    const mid = (a0 + a1) / 2;
    const deg = (mid * 180) / Math.PI;
    const fill = n === 1 ? cols[0] : i % 2 ? (i % 4 === 1 ? cols[1] : soft[1]) : (i % 4 === 0 ? cols[0] : soft[0]);
    const dark = fill.startsWith('#');
    const text = s.label.length > 15 ? `${s.label.slice(0, 14)}…` : s.label;
    const flip = deg > 90 && deg < 270;
    const path = n === 1 ? `<circle cx="${R}" cy="${R}" r="${R}" fill="${fill}"/>` : `<path d="M${R},${R} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z" fill="${fill}"/>`;
    return `${path}<g transform="translate(${R},${R}) rotate(${flip ? deg + 180 : deg})"><text x="${flip ? -(R - 14) : R - 14}" y="4" text-anchor="${flip ? 'start' : 'end'}" font-size="${n > 9 ? 10.5 : 12.5}" font-weight="800" fill="${dark ? '#fff' : 'var(--ink)'}">${flip ? `${s.e} ${esc(text)}` : `${esc(text)} ${s.e}`}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 300 300" class="wheel-svg" id="wheel" style="transform:rotate(${rot}deg)">${parts}<circle cx="150" cy="150" r="26" fill="var(--card)"/><text x="150" y="158" text-anchor="middle" font-size="22">🫛</text></svg>`;
}

export function view() {
  if (!slices) pickSlices();
  const p = pool();
  const custom = lsGet('twopeas-wheel-custom', []) || [];
  const res = result != null ? slices[result] : null;
  const emptyMsg = {
    matches: 'No matches to spin yet. Swipe together first, or pick another list.',
    food: 'No food matches yet. Swipe the food decks together!',
    watch: 'No movie or show matches yet.',
    jar: 'The date jar is empty.',
    custom: 'Add a few options below.',
    ideas: '',
  }[source];
  return {
    html: `${header('Date wheel', { back: '#/dates', sub: "Can't decide? Let the wheel pick." })}
      <div class="chip-scroll">${SOURCES.map(([k, l]) => `<button class="chip ${source === k ? 'on' : ''}" data-act="src" data-s="${k}">${l}</button>`).join('')}</div>
      ${slices.length ? `<div class="wheel-wrap"><div class="wheel-pin">▼</div>${wheelSvg(slices)}</div>
        <button class="btn block big-spin" data-act="spin" ${spinning ? 'disabled' : ''}>${spinning ? 'Spinning…' : res ? '🎡 Spin again' : '🎡 Spin!'}</button>
        ${p.length > 12 ? `<p class="tiny muted center" style="margin-top:8px">Showing 12 of ${p.length}. <button class="link" data-act="shuffle">Shuffle slices</button></p>` : ''}`
    : `<div class="card center"><div style="font-size:40px">🎡</div><p class="muted">${emptyMsg}</p>${source.includes('match') || source === 'food' || source === 'watch' ? '<div class="sp"></div><a class="btn" href="#/swipe">Go swipe</a>' : ''}</div>`}
      ${res && !spinning ? `<div class="card center wheel-result">
        <div class="tiny muted bold">THE WHEEL HAS SPOKEN</div>
        <div style="font-size:48px">${res.e}</div><h2>${esc(res.label)}</h2>
        ${res.food && (hasFoodPrefs(store.me) || hasFoodPrefs(store.partnerId)) ? `<span class="safe-dot ${checkBoth(res.food).level}">${LEVEL_LABEL[checkBoth(res.food).level]}</span>` : ''}
        <div class="sp"></div>
        <div class="row gap"><button class="btn grow" data-act="plan">📅 Plan it</button><button class="btn ghost grow" data-act="veto" ${vetoes.me ? 'disabled' : ''}>🙅 Veto${vetoes.me ? ' used' : ''}</button></div>
        <p class="tiny muted" style="margin-top:8px">Each of you gets one veto per round.</p>
      </div>` : ''}
      ${source === 'custom' ? `<div class="card"><h2>Your options</h2>
        <form data-form="addc" class="add-row"><input type="text" name="t" maxlength="40" placeholder="Tacos" autocomplete="off"><button class="btn">Add</button></form>
        ${custom.map((c, i) => `<div class="list-row"><div class="txt">${esc(c)}</div><button class="x-btn" data-act="rmc" data-i="${i}">×</button></div>`).join('')}</div>` : ''}`,
    live: false,
    onChange: () => !spinning,
    mount: () => {
      const off = store.onSignal((s) => {
        if (s.t !== 'wheel' || s.from === store.me) return;
        if (s.kind === 'spin') {
          source = s.source; slices = s.slices; result = null; vetoes = { me: 0, them: 0 };
          bus.rerender();
          setTimeout(() => animate(s.rot, s.result, false), 60);
        } else if (s.kind === 'veto') {
          vetoes.them = 1;
          toast(`${themName()} vetoed it 🙅`);
        }
      });
      return off;
    },
    actions: {
      src: (x) => { source = x.s; lsSet('twopeas-wheel-src', source); seed++; pickSlices(); result = null; return true; },
      shuffle: () => { seed++; pickSlices(); result = null; return true; },
      spin: () => {
        if (spinning || !slices.length) return;
        const target = Math.floor(Math.random() * slices.length);
        const n = slices.length;
        const sliceDeg = 360 / n;
        // Slice centers start at the top; land the target under the pin.
        const want = 360 - (target + 0.5) * sliceDeg + (Math.random() - 0.5) * sliceDeg * 0.6;
        const base = rot - (rot % 360);
        const next = base + 360 * 6 + want;
        vetoes = { me: 0, them: 0 };
        store.signal('wheel', { kind: 'spin', source, slices, rot: next, result: target });
        animate(next, target, true);
      },
      veto: () => {
        vetoes.me = 1;
        store.signal('wheel', { kind: 'veto' });
        const keep = slices.filter((_, i) => i !== result);
        if (keep.length) { slices = keep; result = null; toast('Vetoed! Spin again 🎡'); }
        return true;
      },
      plan: async () => { const { planSheet } = await import('./us.js'); planSheet(slices[result].label); },
      rmc: (x) => { const c = lsGet('twopeas-wheel-custom', []); c.splice(Number(x.i), 1); lsSet('twopeas-wheel-custom', c); pickSlices(); return true; },
    },
    forms: {
      addc: (d) => {
        const t = (d.t || '').trim();
        if (!t) return;
        const c = lsGet('twopeas-wheel-custom', []) || [];
        c.push(t); lsSet('twopeas-wheel-custom', c); pickSlices(); result = null;
        return true;
      },
    },
  };
}

function animate(next, target, mine) {
  const el = document.getElementById('wheel');
  spinning = true;
  result = null;
  const btn = document.querySelector('.big-spin');
  if (btn) { btn.disabled = true; btn.textContent = 'Spinning…'; }
  document.querySelector('.wheel-result')?.remove();
  if (!el) { rot = next; spinning = false; result = target; bus.rerender(); return; }
  el.style.transition = 'transform 4.6s cubic-bezier(.12,.72,.15,1)';
  requestAnimationFrame(() => { el.style.transform = `rotate(${next}deg)`; });
  setTimeout(() => {
    rot = next; spinning = false; result = target;
    confetti(50);
    if (mine) store.add('spin', { label: slices[target].label, e: slices[target].e }).catch(() => {});
    bus.rerender();
  }, 4700);
}

export { sheet };
