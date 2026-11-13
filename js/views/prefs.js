// Preferences: allergies, diet and favorites, so you can look out for each other.
import { store } from '../store.js';
import {
  ALLERGENS, SEVERITY, DIETS, SPICE, CUISINES, prefsOf, allergenName, allergenEmoji,
} from '../food.js';
import { header, meName, themName, nameOf } from '../ui.js';
import { esc, toast, sheet } from '../util.js';
import { bus } from '../bus.js';

export const FAVES = [
  ['coffee', '☕ Coffee or drink order', 'Iced oat latte, extra shot'],
  ['fastfood', '🍟 Fast food order', 'Number 3, no pickles'],
  ['snack', '🍿 Go-to snack', 'Sour gummies'],
  ['dessert', '🍰 Favorite dessert', 'Tiramisu'],
  ['comfort', '🍲 Comfort food', "Mom's chicken soup"],
  ['candy', '🍬 Favorite candy', 'Reese cups'],
  ['flowers', '💐 Favorite flowers', 'Peonies'],
  ['color', '🎨 Favorite color', 'Sage green'],
  ['scent', '🕯️ Favorite scent', 'Vanilla'],
  ['song', '🎵 Our song / current song', ''],
  ['cheer', '🌈 Cheers me up when I\'m down', 'Cuddles and a movie'],
  ['gifts', '🎁 Gift ideas I\'d love', ''],
  ['sizes', '👕 Sizes (shirt, pants, shoe, ring)', 'M · 8 · 7.5'],
  ['love', '💗 How I feel most loved', 'Quality time'],
  ['pet', '😤 Pet peeves', ''],
];

let who = null;
const saveFood = async (fn) => {
  const prof = store.profile(store.me);
  const food = structuredClone(prof.food || {});
  fn(food);
  await store.update(`profile-${store.me}`, { food });
};

export function view() {
  const target = who === 'them' ? store.partnerId : store.me;
  const mine = target === store.me;
  const p = prefsOf(target);
  const faves = store.profile(target).faves || {};
  const name = mine ? 'You' : themName();
  const al = Object.entries(p.allergies);

  const readOnly = (body) => (mine ? body : '');
  const allergyList = al.length || p.other.length
    ? `<div class="al-list">${al.map(([a, sev]) => `<div class="al-item ${sev}"><span>${allergenEmoji(a)}</span><b>${allergenName(a)}</b><em>${SEVERITY.find((s) => s[0] === sev)?.[1] || ''}</em>${mine ? `<button class="x-btn" data-act="rmAl" data-a="${a}">×</button>` : ''}</div>`).join('')}
        ${p.other.map((o, i) => `<div class="al-item ${o.sev}"><span>⚠️</span><b>${esc(o.name)}</b><em>${SEVERITY.find((s) => s[0] === o.sev)?.[1] || ''}</em>${mine ? `<button class="x-btn" data-act="rmOther" data-i="${i}">×</button>` : ''}</div>`).join('')}</div>`
    : `<p class="small muted">${mine ? 'No allergies added.' : `${themName()} hasn't added any.`}</p>`;

  return {
    html: `${header('Preferences', { back: '#/us', sub: 'So you can look out for each other' })}
      <div class="seg"><button class="${!mine ? '' : 'on'}" data-act="who" data-w="me">${meName()}</button><button class="${mine ? '' : 'on'}" data-act="who" data-w="them">${themName()}</button></div>

      <div class="card">
        <div class="card-head"><h2>🥜 Allergies</h2>${al.length || p.other.length ? `<a class="link" href="#/allergy-card?w=${mine ? 'me' : 'them'}">🪪 Allergy card</a>` : ''}</div>
        ${allergyList}
        ${readOnly(`<div class="sp"></div><div class="opt-row">${ALLERGENS.filter((a) => !p.allergies[a.id]).map((a) => `<button class="opt" data-act="addAl" data-a="${a.id}">${a.e} ${a.name}</button>`).join('')}
          <button class="opt" data-act="addOther">＋ Something else</button></div>`)}
      </div>

      <div class="card">
        <h2>🥗 Diet</h2>
        ${mine ? `<div class="opt-row">${DIETS.map(([k, l]) => `<button class="opt ${p.diet.includes(k) ? 'on' : ''}" data-act="diet" data-d="${k}">${l}</button>`).join('')}</div>`
    : `<p class="small">${p.diet.length ? p.diet.map((k) => DIETS.find((d) => d[0] === k)?.[1]).join(' · ') : 'Eats everything'}</p>`}
        <h2 style="margin-top:16px">🌶️ Spice</h2>
        ${mine ? `<div class="opt-row">${SPICE.map((l, i) => `<button class="opt ${p.spice === i ? 'on' : ''}" data-act="spice" data-s="${i}">${l}</button>`).join('')}</div>` : `<p class="small">${SPICE[p.spice]}</p>`}
      </div>

      <div class="card">
        <h2>🙅 Doesn't like</h2>
        <div class="opt-row">${p.dislikes.map((d, i) => `<span class="opt on" style="background:var(--soft);color:var(--ink)">${esc(d)}${mine ? ` <button class="x-btn" style="padding:0 0 0 4px;font-size:16px" data-act="rmDis" data-i="${i}">×</button>` : ''}</span>`).join('') || `<span class="small muted">${mine ? 'Add foods you skip, like mushrooms or cilantro.' : 'Nothing listed'}</span>`}</div>
        ${readOnly('<form data-form="dis" class="add-row" style="margin-top:10px"><input type="text" name="t" maxlength="30" placeholder="Mushrooms" autocomplete="off"><button class="btn">Add</button></form>')}
        <h2 style="margin-top:16px">😍 Loves</h2>
        ${mine ? `<div class="opt-row">${Object.entries(CUISINES).filter(([k]) => k !== 'other').map(([k, c]) => `<button class="opt ${p.loves.includes(k) ? 'on' : ''}" data-act="love" data-c="${k}">${c.e} ${c.name}</button>`).join('')}</div>`
    : `<p class="small">${p.loves.map((k) => `${CUISINES[k]?.e} ${CUISINES[k]?.name}`).join(' · ') || 'Nothing picked yet'}</p>`}
      </div>

      <div class="card">
        <h2>📝 ${mine ? 'Your' : `${themName()}'s`} cheat sheet</h2>
        <p class="small muted">${mine ? 'Little things that help your person spoil you right.' : 'Everything you need to spoil them right.'}</p>
        ${FAVES.map(([k, l, ph]) => (mine
    ? `<label class="field">${l}</label><input type="text" data-change="fave:${k}" data-input="fave-${k}" value="${esc(faves[k] || '')}" maxlength="120" placeholder="${esc(ph)}">`
    : faves[k] ? `<div class="list-row"><div class="txt"><div class="tiny muted bold">${l}</div><b>${esc(faves[k])}</b></div></div>` : '')).join('')}
        ${!mine && !Object.values(faves).some(Boolean) ? `<p class="small muted" style="margin-top:8px">${themName()} hasn't filled this in yet.</p>` : ''}
      </div>
      <p class="tiny muted center">Allergy checks in the app are a best guess. Always tell the restaurant.</p>`,
    actions: {
      who: (x) => { who = x.w; return true; },
      addAl: (x) => pickSeverity(allergenName(x.a), async (sev) => { await saveFood((f) => { f.allergies = { ...(f.allergies || {}), [x.a]: sev }; }); }),
      rmAl: async (x) => { await saveFood((f) => { delete f.allergies[x.a]; }); return true; },
      addOther: () => otherSheet(),
      rmOther: async (x) => { await saveFood((f) => { f.other.splice(Number(x.i), 1); }); return true; },
      diet: async (x) => { await saveFood((f) => { const s = new Set(f.diet || []); if (s.has(x.d)) s.delete(x.d); else s.add(x.d); f.diet = [...s]; }); return true; },
      spice: async (x) => { await saveFood((f) => { f.spice = Number(x.s); }); return true; },
      love: async (x) => { await saveFood((f) => { const s = new Set(f.loves || []); if (s.has(x.c)) s.delete(x.c); else s.add(x.c); f.loves = [...s]; }); return true; },
      rmDis: async (x) => { await saveFood((f) => { f.dislikes.splice(Number(x.i), 1); }); return true; },
    },
    forms: {
      dis: async (d) => {
        const t = (d.t || '').trim();
        if (!t) return;
        await saveFood((f) => { f.dislikes = [...(f.dislikes || []), t]; });
        return true;
      },
    },
    changes: Object.fromEntries(FAVES.map(([k]) => [`fave:${k}`, async (v) => {
      const faves2 = { ...(store.mine.faves || {}), [k]: v.trim() };
      await store.update(`profile-${store.me}`, { faves: faves2 });
      toast('Saved 💚');
    }])),
  };
}

function pickSeverity(name, done) {
  sheet({
    title: `How bad is ${esc(name.toLowerCase())}?`,
    body: `${SEVERITY.map(([k, l, d]) => `<button class="list-row" style="width:100%;text-align:left" data-s="${k}"><div class="txt"><b>${l}</b><div class="tiny muted">${d}</div></div></button>`).join('')}`,
    onMount: (el, close) => {
      el.querySelectorAll('[data-s]').forEach((b) => { b.onclick = async () => { close(); await done(b.dataset.s); bus.rerender(); }; });
    },
  });
}

function otherSheet() {
  sheet({
    title: 'Another allergy',
    body: `<label class="field">What is it?</label><input type="text" data-n maxlength="30" placeholder="Strawberries">
      <label class="field">How bad?</label><div class="opt-row">${SEVERITY.map(([k, l], i) => `<button class="opt ${i === 1 ? 'on' : ''}" data-s="${k}">${l}</button>`).join('')}</div>
      <div class="sp2"></div><button class="btn block" data-save>Add</button>`,
    onMount: (el, close) => {
      let sev = 'allergy';
      el.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { sev = b.dataset.s; el.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      el.querySelector('[data-save]').onclick = async () => {
        const n = el.querySelector('[data-n]').value.trim();
        if (!n) { toast('Name it first'); return; }
        close();
        await saveFood((f) => { f.other = [...(f.other || []), { name: n, sev }]; });
        bus.rerender();
      };
    },
  });
}

// A big, clear card to show a server.
export function allergyCard(params) {
  const both = params.w === 'both';
  const ppl = both ? [store.me, store.partnerId] : [params.w === 'them' ? store.partnerId : store.me];
  const block = (w) => {
    const p = prefsOf(w);
    const items = [...Object.entries(p.allergies).map(([a, sev]) => ({ n: allergenName(a), e: allergenEmoji(a), sev })), ...p.other.map((o) => ({ n: o.name, e: '⚠️', sev: o.sev }))];
    const severe = items.some((i) => i.sev === 'severe');
    return `<div class="acard">
      <div class="acard-top">${both ? esc(store.name(w)) : 'I have food allergies'}</div>
      ${items.length ? items.map((i) => `<div class="acard-row ${i.sev}"><span>${i.e}</span><b>${esc(i.n)}</b><em>${i.sev === 'severe' ? 'SEVERE' : i.sev === 'mild' ? 'sensitive' : 'allergy'}</em></div>`).join('') : '<p class="muted">No allergies listed.</p>'}
      ${p.diet.length ? `<div class="acard-diet">Also: ${p.diet.map((k) => DIETS.find((d) => d[0] === k)?.[1].replace(/ [^\w\s]+$/u, '')).join(', ')}</div>` : ''}
      ${items.length ? `<p class="acard-ask">${severe ? 'Please make sure my food has none of these, and avoid cross-contact (shared pans, fryers, utensils).' : 'Please let me know if a dish has any of these. Thank you!'}</p>` : ''}
    </div>`;
  };
  return {
    tabs: false,
    html: `${header('Allergy card', { back: '#/prefs', sub: 'Turn your phone around and show your server' })}
      <div class="seg"><a class="${params.w !== 'them' && !both ? 'on' : ''}" href="#/allergy-card?w=me">${meName()}</a><a class="${params.w === 'them' ? 'on' : ''}" href="#/allergy-card?w=them">${themName()}</a><a class="${both ? 'on' : ''}" href="#/allergy-card?w=both">Both</a></div>
      ${ppl.map(block).join('')}
      <p class="tiny muted center" style="margin-top:12px">Turn up your screen brightness so it's easy to read.</p>`,
  };
}

export { nameOf };
