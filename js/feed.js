// Feeding and petting the pet (shared by Home and the Pet tab).
import { store } from './store.js';
import { snacks, petState, FOODS, awardCapped } from './logic.js';
import { petSVG } from './pet.js';
import { toast, pick, floatHearts, sheet, esc } from './util.js';
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

// ---- Toys ----
const TOYS = [['🎾', 'Fetch!'], ['🧶', 'Ooh, yarn!'], ['🫧', 'Bubbles! Pop pop pop'], ['🪀', 'Wheee!'], ['🧸', 'Best cuddle buddy']];
export function playToy(btn) {
  const st = petState();
  const name = store.couple.pet?.name || 'Your pet';
  if (st.asleep) { toast(`${name} is sleeping. Let them rest 😴`); return; }
  const wrap = document.querySelector('.room-wrap');
  if (!wrap) return;
  const [toy, line] = pick(TOYS);
  const r = wrap.getBoundingClientRect();
  const t = document.createElement('div');
  t.className = 'toy-fly';
  t.textContent = toy;
  t.style.left = `${r.left + r.width * 0.2}px`;
  t.style.top = `${r.top + r.height * 0.55}px`;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.transform = `translate(${r.width * 0.55}px, -${r.height * 0.3}px) rotate(540deg)`; });
  setTimeout(() => { t.style.transform = `translate(${r.width * 0.3}px, 0) rotate(900deg)`; }, 450);
  setTimeout(() => {
    t.remove();
    wrap.classList.remove('pet-jump');
    void wrap.offsetWidth;
    wrap.classList.add('pet-jump');
    say(wrap, line);
    floatHearts(r.left + r.width / 2, r.top + r.height * 0.5, 4);
  }, 900);
  const mine = store.all('pet', (p) => p.by === store.me);
  const last = mine[mine.length - 1];
  if (!last || Date.now() - last.at > 10 * 60e3) setTimeout(() => store.add('pet', { toy }), 2600);
}

// ---- Visits: send the pet over with a message ----
export function sendVisit() {
  const name = store.couple.pet?.name || 'Your pet';
  const them = store.theirs.name || 'them';
  sheet({
    title: `Send ${name} to ${them}`,
    body: `<p class="small muted center">${name} will show up on ${them}'s home screen carrying your message.</p><div class="sp"></div>
      <textarea data-v maxlength="300" placeholder="Tell ${them} something sweet…"></textarea><div class="sp"></div>
      <button class="btn block" data-go>Send ${name} 🐾</button>`,
    onMount: (el, close) => {
      el.querySelector('[data-go]').onclick = async () => {
        const text = el.querySelector('[data-v]').value.trim();
        if (!text) { toast('Give them a message to carry 💌'); return; }
        close();
        await store.add('visit', { to: store.partnerId, text });
        awardCapped(5, 'note');
        store.notify('pet', `🐾 ${name} is visiting with a message from ${store.mine.name || 'your person'}`, 'Open Two Peas to read it', '#/home');
        toast(`${name} is on the way 🐾`);
      };
    },
  });
}

export function openVisit(v) {
  if (!v) return;
  const name = store.couple.pet?.name || 'Your pet';
  const from = store.name(v.by);
  store.update(v.id, { readAt: Date.now() });
  sheet({
    body: `<div class="center"><div style="width:120px;margin:0 auto">${petSVG({ species: store.couple.pet?.species || 'raccoon', mood: 'love', outfit: store.couple.outfit || {} })}</div>
      <div class="small muted bold">${esc(name)} brought you this from ${esc(from)}</div>
      <p class="letter-body" style="margin-top:12px;text-align:left">${esc(v.data.text)}</p><div class="sp"></div>
      <div class="row gap"><button class="btn ghost grow" data-close>Aww 🥹</button><button class="btn grow" data-back>Send ${esc(name)} back</button></div></div>`,
    onMount: (el, close) => {
      const r = el.getBoundingClientRect();
      floatHearts(r.left + r.width / 2, r.top + 80, 6);
      el.querySelector('[data-close]').onclick = close;
      el.querySelector('[data-back]').onclick = () => { close(); setTimeout(sendVisit, 300); };
    },
  });
}
