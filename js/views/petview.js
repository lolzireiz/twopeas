import { store } from '../store.js';
import { SHOP, SLOTS, OUTFIT_SLOTS, ROOM_SLOTS, SPECIES, PET_LINES } from '../content.js';
import { roomWithPet, itemPreview, petSVG } from '../pet.js';
import { totals, stageOf, STAGE_NAMES, petState, petMoodText, owned, bestStreak } from '../logic.js';
import { header, themName } from '../ui.js';
import { esc, sheet, toast, confetti, confirmSheet } from '../util.js';
import { feedRow, feedPet, petTap, afterFeed } from '../feed.js';

let tab = 'outfits';
const myName = () => store.mine.name || 'Your person';

export function view() {
  const c = store.couple;
  const pet = c.pet || { species: 'raccoon', name: 'Pip' };
  const t = totals();
  const st = petState();
  const stage = stageOf(t.level);
  const have = owned();
  const nextStage = t.level < 5 ? 5 : t.level < 10 ? 10 : t.level < 20 ? 20 : null;
  const best = bestStreak();

  const card = (item, on, extra = '') => `<button class="shop-item ${on ? 'on' : ''} ${extra}" data-act="${extra === 'locked' ? 'locked' : tab === 'shop' ? 'buy' : 'equip'}" data-id="${item.id}" data-slot="${item.slot}">
    ${item.id === 'none' ? '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="22" fill="none" stroke="#d9cdbf" stroke-width="5"/><path d="M34 66 L66 34" stroke="#d9cdbf" stroke-width="5"/></svg>' : itemPreview(item, pet.species)}
    <span class="nm">${esc(item.name)}</span>
    ${tab === 'shop' ? `<span class="pr">${item.unlock ? `🔒 ${item.unlock.streak}-day streak` : `🪙 ${item.cost}`}</span>` : ''}
  </button>`;

  let body = '';
  if (tab === 'outfits' || tab === 'room') {
    const slots = tab === 'outfits' ? OUTFIT_SLOTS : ROOM_SLOTS;
    const worn = tab === 'outfits' ? c.outfit || {} : c.room || {};
    body = slots.map((slot) => {
      const mine = SHOP.filter((i) => i.slot === slot && have.has(i.id));
      const def = { rug: 'Plain rug', frame: 'Pea picture', wall: 'Cozy cream' }[slot];
      const noneItem = { id: 'none', slot, name: def || 'None' };
      return `<div class="section-title">${SLOTS[slot]}</div>
        <div class="shop-grid">${card(noneItem, !worn[slot])}${mine.map((i) => card(i, worn[slot] === i.id)).join('')}
        ${mine.length ? '' : `<button class="shop-item" data-act="tab" data-t="shop" style="justify-content:center;min-height:120px"><span class="nm muted">Find more in the shop</span></button>`}</div>`;
    }).join('');
  } else {
    const groups = [...OUTFIT_SLOTS, ...ROOM_SLOTS];
    body = `<div class="card flat small"><b>How to earn love points</b><br>
      <span class="muted">Every 10 points also makes a snack for your pet. Daily question together +20 · Weekly challenge +50 · Bucket list or date +30 · Finish a game +15 (winner +5) · Memory or drawing +10 · Notes, taps, moods +5 (5 a day)</span></div>` +
      groups.map((slot) => {
        const items = SHOP.filter((i) => i.slot === slot && !have.has(i.id));
        if (!items.length) return '';
        return `<div class="section-title">${SLOTS[slot]}</div><div class="shop-grid">${items.map((i) => card(i, false, i.unlock && best < i.unlock.streak ? 'locked' : '')).join('')}</div>`;
      }).join('') || '<div class="empty"><div class="e">🛍️</div>You own everything! Show-offs.</div>';
  }

  return {
    html: `${header(esc(pet.name), { sub: `${SPECIES[pet.species]?.name || ''} · ${STAGE_NAMES[stage]}`, right: `<span class="coins">🪙 ${t.wallet.toLocaleString()}</span>` })}
      <div class="card pet-card">
        <div class="room-wrap pet-bob" data-act="petPet">${roomWithPet(c.room, { species: pet.species, mood: st.face, stage, outfit: c.outfit || {} }, st.night)}<div class="bubble" id="petBubble"></div></div>
        <div class="pet-info">
          <div class="small bold muted">${petMoodText(esc(pet.name), st.mood, st.asleep)}</div>
          <div class="row between" style="margin-top:8px"><b>Level ${t.level}</b><span class="small muted bold">${t.earned.toLocaleString()} / ${t.nextLvl.toLocaleString()} XP</span></div>
          <div class="level-bar"><i style="width:${Math.round(t.progress * 100)}%"></i></div>
          ${nextStage ? `<div class="small muted" style="margin-top:6px">Grows into a ${STAGE_NAMES[stageOf(nextStage)].toLowerCase()} at level ${nextStage}</div>` : '<div class="small muted" style="margin-top:6px">All grown up 🥹</div>'}
          <div class="meters">
            <div class="meter">Fullness<div class="bar"><i style="width:${Math.round(st.full * 100)}%"></i></div></div>
            <div class="meter love">Love<div class="bar"><i style="width:${Math.round(st.love * 100)}%"></i></div></div>
          </div>
          ${feedRow()}
        </div>
      </div>
      <div class="seg">${[['outfits', '👒 Outfits'], ['room', '🛋️ Room'], ['shop', '🛍️ Shop']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
      ${body}
      <div class="sp2"></div>
      <button class="btn ghost block" data-act="edit">Rename or change pet</button>`,
    mount: (root) => afterFeed(root),
    actions: {
      tab: (d) => { tab = d.t; return true; },
      petPet: (d, el, e) => petTap(el, e),
      feed: (d, el) => feedPet(el),
      equip: async (d) => {
        const key = OUTFIT_SLOTS.includes(d.slot) ? 'outfit' : 'room';
        await store.update('couple', (cd) => ({ ...cd, [key]: { ...(cd[key] || {}), [d.slot]: d.id === 'none' ? null : d.id } }));
        return true;
      },
      locked: (d) => {
        const it = SHOP.find((i) => i.id === d.id);
        toast(`🔒 Unlocks with a ${it.unlock.streak}-day streak. You're at ${best}.`);
      },
      buy: async (d) => {
        const it = SHOP.find((i) => i.id === d.id);
        if (!it.unlock && t.wallet < it.cost) { toast(`You need ${it.cost - t.wallet} more love points`); return; }
        if (!it.unlock && !(await confirmSheet(`Buy ${esc(it.name)}?`, `${it.cost} love points from your shared wallet.`, `Buy for 🪙 ${it.cost}`))) return;
        if (!it.unlock) await store.add('purchase', { item: it.id, cost: it.cost });
        const key = OUTFIT_SLOTS.includes(it.slot) ? 'outfit' : 'room';
        await store.update('couple', (cd) => ({ ...cd, [key]: { ...(cd[key] || {}), [it.slot]: it.id } }));
        confetti(50);
        store.notify('pet', `🛍️ ${myName()} got ${it.name} for ${pet.name}`, 'Go see how it looks!', '#/pet');
        tab = OUTFIT_SLOTS.includes(it.slot) ? 'outfits' : 'room';
        return true;
      },
      edit: () => editPet(pet),
    },
  };
}

function editPet(pet) {
  let species = pet.species;
  sheet({
    title: 'Your pet',
    tall: true,
    body: `<label class="field">Name</label><input type="text" data-n maxlength="16" value="${esc(pet.name)}">
      <label class="field">Animal</label>
      <div class="species-pick">${Object.entries(SPECIES).map(([id, s]) => `<button type="button" data-s="${id}" class="${species === id ? 'on' : ''}">${petSVG({ species: id })}${s.name}</button>`).join('')}</div>
      <p class="small muted center" style="margin-top:10px">Levels, outfits and decor all stay.</p>
      <div class="sp"></div><button class="btn block" data-save>Save</button>`,
    onMount: (el, close) => {
      el.querySelectorAll('[data-s]').forEach((b) => {
        b.onclick = () => { species = b.dataset.s; el.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('on', x === b)); };
      });
      el.querySelector('[data-save]').onclick = async () => {
        const name = el.querySelector('[data-n]').value.trim() || pet.name;
        close();
        await store.update('couple', { pet: { species, name } });
        if (species !== pet.species || name !== pet.name) store.notify('pet', `Your pet is now ${name} the ${SPECIES[species].name.toLowerCase()}`, `Changed by ${myName()}`, '#/pet');
      };
    },
  });
}
