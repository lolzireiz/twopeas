// Swipe & Match: you each swipe through decks, and only the things you BOTH like show up.
import { store } from '../store.js';
import { DECKS, builtIn } from '../swipe-data.js';
import {
  checkBoth, checkFor, LEVEL_LABEL, hasFoodPrefs, CUISINES, ALLERGENS, guessAllergens, loveScore, allergenEmoji,
} from '../food.js';
import { award } from '../logic.js';
import { header, themName, meName, empty, nameOf } from '../ui.js';
import {
  esc, sheet, toast, confetti, lsGet, lsSet, seededShuffle, timeAgo, confirmSheet,
} from '../util.js';
import { bus } from '../bus.js';

// ---------- Data ----------
const swId = (deck, who) => `swp-${deck}-${who}`;
export const swipesOf = (deck, who) => store.get(swId(deck, who))?.data || { v: {}, t: {} };
const yes = (v) => v === 1 || v === 2;

function customCards(deck) {
  return store.all('swcard', (c) => c.data.deck === deck).map((c) => {
    const d = c.data;
    const isFood = DECKS[deck]?.food || (d.cuisine && d.cuisine !== '');
    const guessed = guessAllergens(d.title).filter((a) => !(d.has || []).includes(a));
    return {
      key: `c:${c.id}`, title: d.title, e: d.e || DECKS[deck]?.e || '💞', sub: d.sub || `Added by ${store.name(c.by)}`, tags: d.tags || [], custom: c.id, by: c.by,
      food: isFood || d.has?.length || guessed.length ? { title: d.title, cuisine: d.cuisine || 'other', has: d.has || [], often: guessed, meat: d.meat || [], veg: !d.meat?.length, spice: d.spice || 0 } : null,
      tip: d.cuisine ? CUISINES[d.cuisine]?.tip : '',
      links: d.cuisine ? [{ label: '📍 Find it', url: `https://maps.apple.com/?q=${encodeURIComponent(d.title)}` }] : [],
    };
  });
}

export function cardsOf(deck) { return [...(builtIn()[deck] || []), ...customCards(deck)]; }
export function findCard(deck, key) { return cardsOf(deck).find((c) => c.key === key); }

export function matchesOf(deck) {
  const mine = swipesOf(deck, store.me);
  const theirs = swipesOf(deck, store.partnerId);
  return cardsOf(deck).filter((c) => yes(mine.v[c.key]) && yes(theirs.v[c.key])).map((c) => ({
    ...c, deck, at: Math.max(mine.t[c.key] || 0, theirs.t[c.key] || 0), superMe: mine.v[c.key] === 2, superThem: theirs.v[c.key] === 2,
    done: !!store.get(doneId(deck, c.key)),
  }));
}
export function allMatches() {
  return Object.keys(DECKS).flatMap((d) => matchesOf(d)).sort((a, b) => b.at - a.at);
}
const doneId = (deck, key) => `swd-${deck}-${key}`;

const hideUnsafe = () => lsGet('twopeas-hide-unsafe', true);

// Your deck, in your order. Things your person liked come up sooner (we don't say which).
function queue(deck, filter) {
  const mine = swipesOf(deck, store.me);
  const theirs = swipesOf(deck, store.partnerId);
  let cards = cardsOf(deck).filter((c) => mine.v[c.key] == null);
  if (filter && filter !== 'all') {
    cards = filter === 'safe' ? cards.filter((c) => !c.food || ['ok', 'note'].includes(checkBoth(c.food).level))
      : cards.filter((c) => c.tags?.includes(filter));
  }
  if (DECKS[deck].food && hideUnsafe()) cards = cards.filter((c) => !c.food || checkBoth(c.food).level !== 'avoid');
  const order = seededShuffle(cards, `${store.me}-${deck}`);
  const superd = order.filter((c) => theirs.v[c.key] === 2);
  const liked = order.filter((c) => theirs.v[c.key] === 1);
  const rest = order.filter((c) => !yes(theirs.v[c.key]));
  rest.sort((a, b) => loveScore(b.food) - loveScore(a.food));
  const out = [...superd];
  while (liked.length || rest.length) {
    if (liked.length) out.push(liked.shift());
    if (rest.length) out.push(rest.shift());
    if (rest.length) out.push(rest.shift());
  }
  return out;
}

export function deckProgress(deck) {
  const all = cardsOf(deck);
  const mine = swipesOf(deck, store.me);
  const left = all.filter((c) => mine.v[c.key] == null).length;
  const theirs = swipesOf(deck, store.partnerId);
  const superWaiting = all.filter((c) => theirs.v[c.key] === 2 && mine.v[c.key] == null).length;
  return { total: all.length, left, matches: matchesOf(deck).length, superWaiting };
}

// ---------- Safety badges ----------
function safety(food, { full = false } = {}) {
  if (!food) return '';
  if (!hasFoodPrefs(store.me) && !hasFoodPrefs(store.partnerId)) return full ? '<div class="tiny muted">Add your food preferences so this checks allergies for you.</div>' : '';
  const r = checkBoth(food);
  if (!full) {
    const who = [r.me.level, r.them.level];
    const bad = r.level === 'ask' || r.level === 'avoid';
    const names = bad ? [who[0] !== 'ok' && who[0] !== 'note' ? meName() : '', who[1] !== 'ok' && who[1] !== 'note' ? themName() : ''].filter(Boolean).join(' & ') : '';
    const first = (r.them.level === r.level ? r.them : r.me).notes[0];
    return `<div class="safe-pill ${r.level}">${LEVEL_LABEL[r.level]}${bad && names ? ` · ${names}` : ''}${first && r.level !== 'ok' ? `<span>${esc(first)}</span>` : ''}</div>`;
  }
  const row = (who, res) => `<div class="safe-row ${res.level}"><b>${nameOf(who)}</b> ${LEVEL_LABEL[res.level].replace(' for both', '')}${res.notes.length ? `<ul>${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>`;
  return `${row(store.me, r.me)}${row(store.partnerId, r.them)}`;
}

// ---------- Hub ----------
export function hub() {
  const needPrefs = !hasFoodPrefs(store.me) || !hasFoodPrefs(store.partnerId);
  const total = allMatches();
  return {
    html: `${header('Swipe & match', { back: '#/us', sub: 'Swipe on your own. Only what you BOTH like shows up.' })}
      <a class="card match-banner" href="#/matches"><span class="e">💞</span><div class="grow"><b>${total.length} match${total.length === 1 ? '' : 'es'}</b><div class="small muted">${total.filter((m) => !m.done).length} still to do together</div></div><span class="chev">›</span></a>
      ${needPrefs ? `<a class="card prefs-nudge" href="#/prefs"><span class="e">🥜</span><div class="grow"><b>Set food preferences</b><div class="small muted">${!hasFoodPrefs(store.me) ? 'Add your allergies and diet' : `${themName()} hasn't added theirs yet`} so food picks stay safe for both of you.</div></div><span class="chev">›</span></a>` : ''}
      <div class="deck-grid">${Object.entries(DECKS).map(([id, d]) => {
        const p = deckProgress(id);
        return `<a class="deck-tile" href="#/swipe/${id}"><span class="e">${d.e}</span><b>${d.name}</b><span class="small muted">${d.blurb}</span>
          <div class="deck-meta">${p.left ? `${p.left} left` : p.total ? 'All swiped ✓' : 'Add some cards'}${p.matches ? ` · 💞 ${p.matches}` : ''}</div>
          ${p.superWaiting ? `<span class="deck-hot">⭐ ${p.superWaiting}</span>` : ''}</a>`;
      }).join('')}</div>
      <p class="tiny muted center" style="margin-top:12px">⭐ means ${themName()} super-liked something you haven't seen yet.</p>`,
  };
}

// ---------- Deck ----------
const filters = {};
let lastSwipe = null;
let busy = false;

export function deck({ deck: id }) {
  const d = DECKS[id];
  if (!d) return { html: `${header('Swipe', { back: '#/swipe' })}${empty('🤷', 'That deck is gone.')}` };
  const f = filters[id] || 'all';
  const q = queue(id, f);
  const p = deckProgress(id);
  const theirs = swipesOf(id, store.partnerId);
  let chips = [['all', 'All']];
  if (d.food) {
    const used = [...new Set(cardsOf(id).map((c) => c.food?.cuisine).filter(Boolean))];
    chips = [['all', 'All'], ['safe', '🛡️ Safe for both'], ...used.map((c) => [c, `${CUISINES[c]?.e || ''} ${CUISINES[c]?.name || c}`])];
  } else chips = [...chips, ...d.filters];
  const top = q.slice(0, 3);
  const cardHtml = (c, i) => `<div class="sw-card ${i === 0 ? 'top' : ''}" data-key="${esc(c.key)}" style="--n:${i}">
      <div class="sw-stamp like">LIKE</div><div class="sw-stamp nope">NOPE</div><div class="sw-stamp super">SUPER ⭐</div>
      ${theirs.v[c.key] === 2 ? `<div class="sw-super">⭐ ${themName()} super-liked this</div>` : ''}
      <div class="sw-e">${c.e}</div>
      <h2>${esc(c.title)}</h2>
      <p class="muted bold small">${esc(c.sub || '')}</p>
      ${safety(c.food)}
      ${c.links?.length ? `<div class="sw-links">${c.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${l.label}</a>`).join('')}</div>` : ''}
    </div>`;
  return {
    tabs: false,
    live: false,
    onChange: () => !busy && !document.querySelector('.sw-card.top[style*="translate"]'),
    html: `${header(`${d.e} ${d.name}`, { back: '#/swipe', sub: `${p.left} left · 💞 ${p.matches} match${p.matches === 1 ? '' : 'es'}`, right: '<a class="icon-btn" href="#/matches" aria-label="Matches">💞</a>' })}
      ${chips.length > 1 ? `<div class="chip-scroll">${chips.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="sw-stack">${top.length ? top.map(cardHtml).reverse().join('') : `<div class="sw-empty">${empty('🎉', p.left ? 'Nothing left with this filter.' : `You've swiped the whole deck! ${p.matches ? `You two matched on ${p.matches}.` : ''}`)}
        <div class="sp"></div><button class="btn ghost block" data-act="add">+ Add your own card</button><div class="sp"></div>
        <button class="btn ghost block" data-act="again">See the ones I skipped again</button></div>`}</div>
      ${top.length ? `<div class="sw-btns">
        <button class="sw-b undo" data-act="undo" ${lastSwipe?.deck === id ? '' : 'disabled'} aria-label="Undo">↩️</button>
        <button class="sw-b nope" data-act="swipe" data-v="0" aria-label="Nope">✖️</button>
        <button class="sw-b super" data-act="swipe" data-v="2" aria-label="Super like">⭐</button>
        <button class="sw-b like" data-act="swipe" data-v="1" aria-label="Like">💚</button>
        <button class="sw-b add" data-act="add" aria-label="Add a card">＋</button>
      </div>
      <p class="tiny muted center">Swipe right for yes, left for no, up to super-like.${d.food && hideUnsafe() ? ' Picks that aren\'t safe for one of you are hidden.' : ''}</p>` : ''}
      ${d.food ? `<div class="list-row" style="margin-top:8px"><div class="txt small bold">Hide picks that aren't safe</div><label class="switch"><input type="checkbox" data-change="hide" ${hideUnsafe() ? 'checked' : ''}><span></span></label></div>
        <p class="tiny muted">Allergy checks are a best guess from usual ingredients. Always confirm with the restaurant.</p>` : ''}`,
    mount: (root) => {
      const el = root.querySelector('.sw-card.top');
      if (!el) return;
      let sx = 0; let sy = 0; let dx = 0; let dy = 0; let dragging = false;
      const stamps = { like: el.querySelector('.sw-stamp.like'), nope: el.querySelector('.sw-stamp.nope'), super: el.querySelector('.sw-stamp.super') };
      const paint = () => {
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 14}deg)`;
        stamps.like.style.opacity = Math.max(0, Math.min(1, dx / 90));
        stamps.nope.style.opacity = Math.max(0, Math.min(1, -dx / 90));
        stamps.super.style.opacity = Math.max(0, Math.min(1, -dy / 110 - Math.abs(dx) / 200));
      };
      const down = (e) => {
        if (e.target.closest('a')) return;
        dragging = true; sx = e.clientX; sy = e.clientY; dx = 0; dy = 0;
        el.setPointerCapture(e.pointerId);
        el.style.transition = 'none';
      };
      const move = (e) => { if (!dragging) return; dx = e.clientX - sx; dy = e.clientY - sy; paint(); };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        el.style.transition = '';
        if (dx > 100) fling(1);
        else if (dx < -100) fling(0);
        else if (dy < -120) fling(2);
        else { dx = 0; dy = 0; paint(); }
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    },
    actions: {
      filter: (x) => { filters[id] = x.f; return true; },
      swipe: (x) => fling(Number(x.v)),
      undo: async () => {
        if (!lastSwipe || lastSwipe.deck !== id) return;
        const cur = swipesOf(id, store.me);
        const v = { ...cur.v }; const t = { ...cur.t };
        delete v[lastSwipe.key]; delete t[lastSwipe.key];
        lastSwipe = null;
        await store.set(swId(id, store.me), 'swipes', { v, t });
        return true;
      },
      add: () => addCard(id),
      again: async () => {
        const cur = swipesOf(id, store.me);
        const v = {}; const t = {};
        for (const [k, val] of Object.entries(cur.v)) if (yes(val)) { v[k] = val; t[k] = cur.t[k]; }
        await store.set(swId(id, store.me), 'swipes', { v, t });
        toast('Skipped cards are back 🔁');
        return true;
      },
    },
    changes: { hide: (on) => { lsSet('twopeas-hide-unsafe', on); return true; } },
  };

  function fling(val) {
    if (busy) return;
    const el = document.querySelector('.sw-card.top');
    if (!el) return;
    busy = true;
    const key = el.dataset.key;
    const outX = val === 1 ? 600 : val === 0 ? -600 : 0;
    const outY = val === 2 ? -800 : 40;
    el.style.transition = 'transform .3s ease-in, opacity .3s';
    el.style.transform = `translate(${outX}px, ${outY}px) rotate(${outX / 20}deg)`;
    el.style.opacity = '0';
    const s = el.querySelector(`.sw-stamp.${val === 1 ? 'like' : val === 0 ? 'nope' : 'super'}`);
    if (s) s.style.opacity = 1;
    setTimeout(async () => {
      try { await commit(id, key, val); } finally { busy = false; }
    }, 260);
  }
}

async function commit(deckId, key, val) {
  const cur = swipesOf(deckId, store.me);
  const v = { ...cur.v, [key]: val };
  const t = { ...cur.t, [key]: Date.now() };
  lastSwipe = { deck: deckId, key };
  await store.set(swId(deckId, store.me), 'swipes', { v, t });
  const theirs = swipesOf(deckId, store.partnerId);
  if (yes(val) && yes(theirs.v[key])) {
    const c = findCard(deckId, key);
    celebrate(deckId, c, val === 2 || theirs.v[key] === 2);
    award(10, 'match', `match-${deckId}-${key}`);
    store.notify('special', `It's a match! ${c?.e || '💞'} ${c?.title || ''}`, `You both said yes in ${DECKS[deckId].name}`, '#/matches');
  }
  bus.rerender();
}

function celebrate(deckId, c, sup) {
  if (!c) return;
  confetti(sup ? 120 : 70);
  sheet({
    body: `<div class="center match-pop"><div class="match-title">It's a match!</div><div style="font-size:64px;margin:6px 0">${c.e}</div>
      <h2>${esc(c.title)}</h2><p class="small muted">${sup ? 'And somebody super-liked it ⭐' : `You and ${themName()} both said yes`}</p>
      ${c.food ? `<div class="sp"></div>${safety(c.food)}` : ''}
      <div class="sp2"></div><button class="btn block" data-plan>📅 Plan it</button><div class="sp"></div><button class="btn ghost block" data-close>Keep swiping</button></div>`,
    onMount: (el, close) => {
      el.querySelector('[data-close]').onclick = close;
      el.querySelector('[data-plan]').onclick = async () => { close(); const { planSheet } = await import('./us.js'); planSheet(c.title); };
    },
  });
}

// ---------- Add a card ----------
function addCard(deckId) {
  const d = DECKS[deckId];
  const deckOpts = Object.entries(DECKS).map(([k, x]) => `<option value="${k}" ${k === deckId ? 'selected' : ''}>${x.e} ${x.name}</option>`).join('');
  sheet({
    title: 'Add a card',
    body: `<p class="small muted">${themName()} will see it in their deck. If you both swipe yes, it's a match.</p>
      <label class="field">What is it?</label><input type="text" data-t maxlength="70" placeholder="${d.food ? 'That ramen place downtown' : 'Something fun'}">
      <div class="row gap"><div style="width:80px"><label class="field">Emoji</label><input type="text" data-e maxlength="4" placeholder="${d.e}"></div>
      <div class="grow"><label class="field">Deck</label><select data-d>${deckOpts}</select></div></div>
      <div data-foodbits style="${d.food ? '' : 'display:none'}">
        <label class="field">Kind of food</label><select data-c><option value="">Pick one</option>${Object.entries(CUISINES).map(([k, c]) => `<option value="${k}">${c.e} ${c.name}</option>`).join('')}</select>
        <label class="field">Anything in it to know about?</label>
        <div class="opt-row">${ALLERGENS.map((a) => `<button class="opt" data-al="${a.id}">${a.e} ${a.name}</button>`).join('')}</div>
      </div>
      <div class="sp2"></div><button class="btn block" data-save>Add it</button>`,
    onMount: (el, close) => {
      const has = new Set();
      el.querySelectorAll('[data-al]').forEach((b) => { b.onclick = () => { const a = b.dataset.al; if (has.has(a)) has.delete(a); else has.add(a); b.classList.toggle('on'); }; });
      const sel = el.querySelector('[data-d]');
      sel.onchange = () => { el.querySelector('[data-foodbits]').style.display = DECKS[sel.value].food ? '' : 'none'; };
      el.querySelector('[data-save]').onclick = async () => {
        const title = el.querySelector('[data-t]').value.trim();
        if (!title) { toast('Give it a name'); return; }
        const dk = sel.value;
        const cuisine = DECKS[dk].food ? el.querySelector('[data-c]').value : '';
        close();
        await store.add('swcard', { deck: dk, title, e: el.querySelector('[data-e]').value.trim(), cuisine, has: [...has] });
        toast(`Added to ${DECKS[dk].name} 💞`);
        bus.rerender();
      };
    },
  });
}

// ---------- Matches ----------
let matchFilter = 'all';
export function matches() {
  const all = allMatches();
  const shown = all.filter((m) => matchFilter === 'all' || (matchFilter === 'todo' ? !m.done : m.deck === matchFilter));
  const decks = [...new Set(all.map((m) => m.deck))];
  const row = (m) => `<button class="list-row match-row ${m.done ? 'done' : ''}" data-act="open" data-d="${m.deck}" data-k="${esc(m.key)}" style="width:100%;text-align:left">
      <span style="font-size:26px">${m.e}</span>
      <div class="txt"><b>${esc(m.title)}</b>${m.superMe || m.superThem ? ' ⭐' : ''}<div class="tiny muted">${DECKS[m.deck].e} ${DECKS[m.deck].name} · ${timeAgo(m.at)}${m.done ? ' · done ✓' : ''}</div>
      ${m.food && (hasFoodPrefs(store.me) || hasFoodPrefs(store.partnerId)) ? `<span class="safe-dot ${checkBoth(m.food).level}">${LEVEL_LABEL[checkBoth(m.food).level]}</span>` : ''}</div>
      <span class="chev">›</span></button>`;
  return {
    html: `${header('Matches', { back: '#/swipe', sub: `${all.length} thing${all.length === 1 ? '' : 's'} you both said yes to` })}
      <div class="chip-scroll"><button class="chip ${matchFilter === 'all' ? 'on' : ''}" data-act="f" data-f="all">All</button><button class="chip ${matchFilter === 'todo' ? 'on' : ''}" data-act="f" data-f="todo">To do</button>
        ${decks.map((d) => `<button class="chip ${matchFilter === d ? 'on' : ''}" data-act="f" data-f="${d}">${DECKS[d].e} ${DECKS[d].name}</button>`).join('')}</div>
      <div class="card">${shown.map(row).join('') || empty('💞', all.length ? 'Nothing here with this filter.' : 'No matches yet. Go swipe!')}</div>
      <a class="btn ghost block" href="#/wheel">🎡 Can't pick? Spin the wheel</a>
      <div class="sp"></div><a class="btn ghost block" href="#/swipe">Keep swiping</a>`,
    mount: () => { markMatchesSeen(); },
    actions: {
      f: (x) => { matchFilter = x.f; return true; },
      open: (x) => openMatch(x.d, x.k),
    },
  };
}

export function openMatch(deckId, key) {
  const c = findCard(deckId, key);
  if (!c) return;
  const done = !!store.get(doneId(deckId, key));
  sheet({
    body: `<div class="center"><div style="font-size:56px">${c.e}</div><h2>${esc(c.title)}</h2><p class="small muted bold">${esc(c.sub || '')}</p></div>
      ${c.food ? `<div class="sp"></div><div class="card flat" style="margin:0">${safety(c.food, { full: true })}${c.tip ? `<p class="tiny muted" style="margin-top:8px">💡 ${esc(c.tip)}</p>` : ''}
        <div class="sp"></div><a class="btn ghost block" href="#/allergy-card">🪪 Show the allergy card</a></div>` : ''}
      ${c.links?.length ? `<div class="sw-links" style="justify-content:center;margin-top:12px">${c.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${l.label}</a>`).join('')}</div>` : ''}
      <div class="sp2"></div>
      <button class="btn block" data-plan>📅 Plan it</button><div class="sp"></div>
      <div class="row gap"><button class="btn ghost grow" data-done>${done ? 'Not done yet' : '✅ We did it'}</button><button class="btn ghost grow" data-un>Unmatch</button></div>`,
    onMount: (el, close) => {
      el.querySelectorAll('a[href^="#"]').forEach((a) => { a.addEventListener('click', close); });
      el.querySelector('[data-plan]').onclick = async () => { close(); const { planSheet } = await import('./us.js'); planSheet(c.title); };
      el.querySelector('[data-done]').onclick = async () => {
        close();
        if (done) await store.remove(doneId(deckId, key));
        else {
          await store.add('swdone', { deck: deckId, key, title: c.title }, { id: doneId(deckId, key), once: true });
          await award(15, 'match-done', `matchdone-${deckId}-${key}`);
          confetti(60);
          toast('Checked off together 💞');
        }
        bus.rerender();
      };
      const unBtn = el.querySelector('[data-un]');
      unBtn.onclick = async () => {
        close();
        if (!(await confirmSheet('Unmatch?', 'This switches your swipe to a no. You can always swipe on it again later.', 'Unmatch'))) return;
        const cur = swipesOf(deckId, store.me);
        await store.set(swId(deckId, store.me), 'swipes', { v: { ...cur.v, [key]: 0 }, t: { ...cur.t, [key]: Date.now() } });
        bus.rerender();
      };
    },
  });
}

// For Home / Us: new matches since you last looked.
export function newMatchCount() {
  const seen = lsGet('twopeas-matches-seen', 0);
  return allMatches().filter((m) => m.at > seen).length;
}
export function markMatchesSeen() { lsSet('twopeas-matches-seen', Date.now()); }
export { checkFor, allergenEmoji };
