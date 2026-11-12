// Shared bits of markup.
import { store } from './store.js';
import { colorOf } from './content.js';
import { esc } from './util.js';

const BACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

export function header(title, { back, right = '', sub = '' } = {}) {
  return `<div class="top">
    ${back ? `<a class="back" href="${back}" aria-label="Back">${BACK_SVG}</a>` : ''}
    <div class="grow"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
    ${right}
  </div>`;
}

export const empty = (e, text) => `<div class="empty"><div class="e">${e}</div>${text}</div>`;

export const meColor = () => colorOf(store.mine.color || 'pea');
export const themColor = () => colorOf(store.theirs.color || 'blush');
export const colorFor = (who) => (who === store.me ? meColor() : themColor());
export const whoClass = (who) => (who === store.me ? 'me' : 'them');
export const nameOf = (who) => esc(store.name(who));
export const meName = () => esc(store.mine.name || 'You');
export const themName = () => esc(store.theirs.name || 'Your person');

export function applyColors() {
  const r = document.documentElement.style;
  const m = meColor();
  const t = themColor();
  r.setProperty('--me', m.hex);
  r.setProperty('--me-soft', m.soft);
  r.setProperty('--them', t.hex);
  r.setProperty('--them-soft', t.soft);
}

export function photoImg(ref, cls = '', alt = '') {
  if (!ref) return '';
  if (ref.startsWith('data:')) return `<img class="${cls}" src="${ref}" alt="${esc(alt)}">`;
  return `<img class="${cls}" data-photo="${esc(ref)}" alt="${esc(alt)}">`;
}

export async function hydratePhotos(root) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const ref = img.dataset.photo;
    img.removeAttribute('data-photo');
    store.photoUrl(ref).then((u) => { if (u) img.src = u; });
  }
}

export const toggle = (name, on) => `<label class="switch"><input type="checkbox" data-change="${name}" ${on ? 'checked' : ''}><span></span></label>`;

export const notesSeg = (on) => `<div class="seg">
  <button class="${on === 'notes' ? 'on' : ''}" data-act="go" data-h="#/notes">💌 Chat</button>
  <button class="${on === 'letters' ? 'on' : ''}" data-act="go" data-h="#/letters">✉️ Letters</button>
  <button class="${on === 'draw' ? 'on' : ''}" data-act="go" data-h="#/draw">🎨 Draw</button>
</div>`;

// "Sam is here" pill, kept fresh by the app without redrawing the page.
const VIEW_WORDS = [
  [/^board\//, 'drawing with you 🎨'], [/^draw/, 'in Draw'], [/^notes/, 'in your chat 💬'], [/^game\//, 'playing a game'], [/^play/, 'looking at games'],
  [/^dq/, "on today's question"], [/^snap/, 'on the daily snap'], [/^pet/, 'with the pet'], [/^memories/, 'looking at memories'], [/^letters?/, 'reading letters'],
];
export function presenceText() {
  const p = store.presence;
  if (!p.online) return '';
  const v = p.view || '';
  const w = VIEW_WORDS.find(([re]) => re.test(v));
  return `${themName()} is ${w ? w[1] : 'here'}`;
}
export const presencePill = () => `<span class="presence ${store.presence.online ? 'on' : ''}" data-presence>${presenceText()}</span>`;
export function refreshPresence() {
  document.querySelectorAll('[data-presence]').forEach((el) => {
    el.textContent = presenceText();
    el.classList.toggle('on', store.presence.online);
  });
}
