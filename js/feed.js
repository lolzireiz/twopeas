// Feeding and petting the pet (shared by Home and the Pet tab).
import { store } from './store.js';
import { snacks, petState, FOODS } from './logic.js';
import { toast, pick, floatHearts } from './util.js';
import { PET_LINES } from './content.js';

export function feedRow() {
  const n = snacks();
  const st = petState();
  const name = store.couple.pet?.name || 'your pet';
  const label = st.asleep ? 'Asleep 😴' : st.full >= 1 ? 'Stuffed!' : n ? `Feed ${name}` : 'No snacks yet';
  return `<div class="feed-row">
    <div class="grow"><b>🥣 ${n} snack${n === 1 ? '' : 's'}</b><div class="tiny muted">Every 10 love points you earn together makes one</div></div>
    <button class="btn small ${n && !st.asleep && st.full < 1 ? '' : 'ghost'}" data-act="feed">${label}</button>
  </div>`;
}

let busy = false;
export async function feedPet(btn) {
  if (busy) return;
  const st = petState();
  const name = store.couple.pet?.name || 'Your pet';
  if (st.asleep) { toast(`Shh, ${name} is asleep. Snacks are saved for breakfast.`); return; }
  if (snacks() <= 0) { toast('No snacks yet. Answer the daily question or play a game to earn some!'); return; }
  if (st.full >= 1) { toast(`${name} is stuffed! Save the rest for later.`); return; }
  busy = true;
  const food = pick(FOODS);
  const from = btn.getBoundingClientRect();
  const petEl = document.querySelector('.room-pet') || document.querySelector('.room');
  const to = petEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'fly-food';
  f.textContent = food;
  f.style.left = `${from.left + from.width / 2 - 18}px`;
  f.style.top = `${from.top - 10}px`;
  document.body.appendChild(f);
  requestAnimationFrame(() => {
    f.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height * 0.55 - from.top}px) scale(.5)`;
    f.style.opacity = '0.2';
  });
  await new Promise((r) => setTimeout(r, 650));
  f.remove();
  window.__petJump = Date.now();
  window.__petSay = pick(['Nom nom nom!', 'Yum!! More?', `${food} is my favorite!`, 'Best. Snack. Ever.']);
  try { await store.add('feed', { food }); } finally { busy = false; }
}

export function petTap(el, e) {
  el.classList.remove('pet-jump');
  void el.offsetWidth;
  el.classList.add('pet-jump');
  const st = petState();
  say(el, st.asleep ? 'Zzz… five more minutes…' : pick(PET_LINES).replace('{a}', store.mine.name || 'You').replace('{b}', store.theirs.name || 'them'));
  if (e) floatHearts(e.clientX, e.clientY - 20, 4);
}

export function say(el, text) {
  const b = el.querySelector('#petBubble');
  if (!b) return;
  b.textContent = text;
  b.classList.add('in');
  clearTimeout(window.__bubbleT);
  window.__bubbleT = setTimeout(() => b.classList.remove('in'), 2200);
}

// Call from a screen's mount: plays the happy jump after a feed.
export function afterFeed(root) {
  if (!window.__petJump || Date.now() - window.__petJump > 1500) return;
  window.__petJump = 0;
  const el = root.querySelector('.room-wrap');
  if (!el) return;
  el.classList.add('pet-jump');
  say(el, window.__petSay || 'Yum!');
  const r = el.getBoundingClientRect();
  floatHearts(r.left + r.width / 2, r.top + r.height * 0.5, 4);
}
