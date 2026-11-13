// Food preferences and allergy safety.
// These are general guesses about what dishes and cuisines usually contain. Kitchens
// differ, so the app always says to check with the restaurant for real allergies.
import { store } from './store.js';

export const ALLERGENS = [
  { id: 'peanut', name: 'Peanuts', e: '🥜' },
  { id: 'treenut', name: 'Tree nuts', e: '🌰' },
  { id: 'dairy', name: 'Dairy', e: '🥛' },
  { id: 'egg', name: 'Eggs', e: '🥚' },
  { id: 'gluten', name: 'Gluten / wheat', e: '🌾' },
  { id: 'soy', name: 'Soy', e: '🫘' },
  { id: 'sesame', name: 'Sesame', e: '⚪' },
  { id: 'fish', name: 'Fish', e: '🐟' },
  { id: 'shellfish', name: 'Shellfish', e: '🦐' },
  { id: 'corn', name: 'Corn', e: '🌽' },
  { id: 'mustard', name: 'Mustard', e: '🟡' },
  { id: 'coconut', name: 'Coconut', e: '🥥' },
  { id: 'nightshade', name: 'Tomato / peppers', e: '🍅' },
  { id: 'alcohol', name: 'Alcohol', e: '🍷' },
];
export const allergenName = (id) => ALLERGENS.find((a) => a.id === id)?.name || id;
export const allergenEmoji = (id) => ALLERGENS.find((a) => a.id === id)?.e || '⚠️';

export const SEVERITY = [
  ['severe', 'Severe', 'Even a trace is dangerous'],
  ['allergy', 'Allergic', "Can't eat it"],
  ['mild', 'Sensitive', 'Makes me feel bad'],
];

export const DIETS = [
  ['vegetarian', 'Vegetarian 🥦'], ['vegan', 'Vegan 🌱'], ['pescatarian', 'Pescatarian 🐟'],
  ['nopork', 'No pork'], ['nobeef', 'No beef'], ['halal', 'Halal'], ['kosher', 'Kosher'],
  ['lowcarb', 'Low carb'], ['nofried', 'Not much fried food'],
];

export const SPICE = ['No spice 🧊', 'A little 🌶️', 'Medium 🌶️🌶️', 'Bring it 🔥'];

export const CUISINES = {
  american: { name: 'American', e: '🍔', cross: ['gluten', 'dairy', 'egg'], tip: 'Ask if fries share a fryer with breaded or battered things.' },
  bbq: { name: 'BBQ', e: '🍖', cross: ['gluten', 'mustard', 'nightshade'], tip: 'Rubs and sauces vary a lot. Ask what is in them.' },
  breakfast: { name: 'Brunch', e: '🥞', cross: ['egg', 'dairy', 'gluten'], tip: 'Griddles are shared, so ask about eggs, butter and pancake batter.' },
  bakery: { name: 'Bakery & café', e: '🥐', cross: ['gluten', 'dairy', 'egg', 'treenut', 'peanut', 'sesame'], tip: 'Bakeries are hard for severe allergies. Flour and nut dust get everywhere.' },
  chinese: { name: 'Chinese', e: '🥡', cross: ['soy', 'gluten', 'peanut', 'sesame', 'shellfish', 'egg'], tip: 'Woks are shared and soy sauce has wheat. Ask about peanut oil.' },
  japanese: { name: 'Japanese', e: '🍣', cross: ['fish', 'shellfish', 'soy', 'gluten', 'sesame', 'egg'], tip: 'Soy sauce has wheat (ask for tamari). Sushi knives and boards touch everything.' },
  korean: { name: 'Korean', e: '🥢', cross: ['soy', 'sesame', 'gluten', 'shellfish', 'fish'], tip: 'Sesame oil and soy are in most dishes. Kimchi often has fish or shrimp.' },
  thai: { name: 'Thai', e: '🍜', cross: ['peanut', 'fish', 'shellfish', 'soy', 'coconut', 'egg'], tip: 'Fish sauce and peanuts are everywhere in Thai kitchens. Say it clearly when ordering.' },
  vietnamese: { name: 'Vietnamese', e: '🍲', cross: ['fish', 'shellfish', 'peanut', 'soy'], tip: 'Fish sauce is in most dishes and dipping sauces. Peanuts top a lot of salads.' },
  indian: { name: 'Indian', e: '🍛', cross: ['dairy', 'treenut', 'gluten', 'mustard', 'nightshade'], tip: 'Ghee, cream and cashew paste hide in sauces. Ask about nuts in kormas and naan.' },
  mexican: { name: 'Mexican', e: '🌮', cross: ['corn', 'dairy', 'nightshade', 'gluten'], tip: 'Corn is in most tortillas and chips. Ask about lard and shared fryers.' },
  italian: { name: 'Italian', e: '🍝', cross: ['gluten', 'dairy', 'egg', 'treenut'], tip: 'Pesto usually has pine nuts. Fresh pasta usually has egg.' },
  pizza: { name: 'Pizza', e: '🍕', cross: ['gluten', 'dairy'], tip: 'Gluten-free crusts are often baked in the same oven.' },
  mediterranean: { name: 'Mediterranean', e: '🧆', cross: ['sesame', 'gluten', 'dairy', 'treenut'], tip: 'Hummus and tahini sauce are sesame. Falafel often shares a fryer.' },
  greek: { name: 'Greek', e: '🥙', cross: ['dairy', 'gluten', 'sesame'], tip: 'Feta, yogurt and pita are in a lot of dishes.' },
  seafood: { name: 'Seafood', e: '🦞', cross: ['fish', 'shellfish', 'gluten', 'dairy'], tip: 'Not a good pick for a severe shellfish or fish allergy. Steam and fryers are shared.' },
  steakhouse: { name: 'Steakhouse', e: '🥩', cross: ['dairy', 'gluten'], tip: 'Steaks are often finished with butter. Just ask for it plain.' },
  burgers: { name: 'Burgers', e: '🍔', cross: ['gluten', 'dairy', 'egg', 'sesame'], tip: 'Buns often have sesame. Lettuce wraps are an easy swap.' },
  dessert: { name: 'Dessert', e: '🍨', cross: ['dairy', 'egg', 'gluten', 'treenut', 'peanut'], tip: 'Ice cream scoops and toppings get shared. Ask for a fresh scoop and tub.' },
  poke: { name: 'Poke & bowls', e: '🥗', cross: ['fish', 'shellfish', 'soy', 'sesame'], tip: 'Sauces are mostly soy and sesame based.' },
  caribbean: { name: 'Caribbean', e: '🌴', cross: ['nightshade', 'coconut', 'gluten'], tip: 'Scotch bonnet peppers are hot. Coconut milk is common.' },
  french: { name: 'French', e: '🥖', cross: ['dairy', 'gluten', 'egg'], tip: 'Butter and cream are in almost everything.' },
  middleeast: { name: 'Middle Eastern', e: '🫓', cross: ['sesame', 'treenut', 'gluten', 'dairy'], tip: 'Tahini, pistachios and pine nuts are common.' },
  vegan: { name: 'Vegan / veggie', e: '🌱', cross: ['soy', 'treenut', 'gluten', 'coconut'], tip: 'Great for dairy and egg. Watch for nut-based cheeses and soy.' },
  drinks: { name: 'Café & drinks', e: '☕', cross: ['dairy', 'soy', 'treenut', 'coconut'], tip: 'Milk alternatives share steam wands. Ask them to rinse it.' },
  other: { name: 'Other', e: '🍽️', cross: [], tip: 'Ask what is in it.' },
};

// Words in a card that hint at what's in it, for cards without hand-written info
// (custom ones, date ideas).
const HINTS = [
  [/peanut|pad thai|satay|pb&j|reese/i, 'peanut'],
  [/almond|cashew|pecan|walnut|pistachio|hazelnut|nutella|pesto|baklava|praline|marzipan/i, 'treenut'],
  [/ice cream|cheese|pizza|milkshake|latte|fondue|gelato|cream|mac|butter|chocolate|hot chocolate|yogurt|queso|alfredo/i, 'dairy'],
  [/egg|brunch|omelet|pancake|waffle|bake|cookie|cake|cupcake|brownie|custard|mayo|aioli|carbonara|ramen/i, 'egg'],
  [/pizza|bread|baguette|pasta|bake|cookie|cake|cupcake|brownie|donut|doughnut|bagel|pancake|waffle|burger|sandwich|dumpling|beer|brewery|noodle|ramen|pretzel|croissant|pie|tempura|fried chicken|taco night/i, 'gluten'],
  [/sushi|soy|tofu|edamame|teriyaki|miso/i, 'soy'],
  [/sesame|tahini|hummus|bagel|bibimbap/i, 'sesame'],
  [/sushi|fish|salmon|tuna|cod|anchov|caesar/i, 'fish'],
  [/shrimp|lobster|crab|clam|oyster|scallop|mussel|seafood|paella|boil/i, 'shellfish'],
  [/taco|tortilla|nacho|popcorn|corn|elote|arepa|tamale/i, 'corn'],
  [/coconut|piña|pina colada/i, 'coconut'],
  [/wine|beer|brewery|cocktail|winery|bar crawl|margarita|sangria|mimosa|vineyard/i, 'alcohol'],
];
export function guessAllergens(text = '') {
  const out = new Set();
  for (const [re, a] of HINTS) if (re.test(text)) out.add(a);
  return [...out];
}

export function prefsOf(who) {
  const f = store.profile(who).food || {};
  return {
    allergies: f.allergies || {}, // id -> severity
    other: f.other || [], // [{ name, sev }]
    diet: f.diet || [],
    spice: f.spice ?? 2,
    dislikes: f.dislikes || [],
    loves: f.loves || [],
  };
}
export const hasFoodPrefs = (who) => {
  const p = prefsOf(who);
  return Object.keys(p.allergies).length || p.other.length || p.diet.length || p.dislikes.length;
};

const MEATY = ['beef', 'pork', 'chicken', 'lamb', 'turkey', 'duck'];

// What a card's food info looks like: { has, often, meat, veg, vegan, spice, ing, cuisine }
// Returns { level: 'ok'|'note'|'ask'|'avoid', notes: [...] } for one person.
export function checkFor(who, food) {
  if (!food) return { level: 'ok', notes: [] };
  const p = prefsOf(who);
  const notes = [];
  let level = 'ok';
  const bump = (l) => { const r = { ok: 0, note: 1, ask: 2, avoid: 3 }; if (r[l] > r[level]) level = l; };
  const has = new Set(food.has || []);
  const often = new Set(food.often || []);
  const cross = new Set([...(CUISINES[food.cuisine]?.cross || []), ...(food.cross || [])]);
  for (const [a, sev] of Object.entries(p.allergies)) {
    const n = allergenName(a).toLowerCase();
    if (has.has(a)) { bump('avoid'); notes.push(`Usually has ${n}`); }
    else if (often.has(a)) {
      if (sev === 'mild') { bump('ask'); notes.push(`Often has ${n}, ask for it without`); }
      else { bump(sev === 'severe' ? 'avoid' : 'ask'); notes.push(`Often has ${n}. Ask for it without`); }
    } else if (cross.has(a) && sev === 'severe') { bump('ask'); notes.push(`${allergenName(a)} is common in these kitchens`); }
  }
  const text = `${food.title || ''} ${(food.ing || []).join(' ')}`.toLowerCase();
  for (const o of p.other) {
    const n = (o.name || '').toLowerCase().trim();
    if (n && text.includes(n.replace(/s$/, ''))) { bump(o.sev === 'mild' ? 'ask' : 'avoid'); notes.push(`Might have ${o.name}`); }
  }
  const meat = food.meat || [];
  const d = new Set(p.diet);
  const meatNoFish = meat.filter((m) => MEATY.includes(m));
  if ((d.has('vegetarian') || d.has('vegan')) && meat.length) {
    if (food.veg || (d.has('vegan') && food.vegan)) { bump('ask'); notes.push('Get the veggie version'); } else { bump('avoid'); notes.push('Has meat'); }
  }
  if (d.has('vegan') && !meat.length && (has.has('dairy') || has.has('egg')) && !food.vegan) { bump('avoid'); notes.push('Has dairy or egg'); }
  if (d.has('pescatarian') && meatNoFish.length && !d.has('vegetarian')) { if (food.veg) { bump('ask'); notes.push('Ask for a fish or veggie version'); } else { bump('avoid'); notes.push('Has meat'); } }
  if ((d.has('nopork') || d.has('halal') || d.has('kosher')) && meat.includes('pork')) { bump(food.veg ? 'ask' : 'avoid'); notes.push('Usually has pork'); }
  if (d.has('nobeef') && meat.includes('beef')) { bump(food.veg ? 'ask' : 'avoid'); notes.push('Usually has beef'); }
  if (d.has('kosher') && meat.includes('shellfish')) { bump('avoid'); notes.push('Has shellfish'); }
  if (d.has('halal') && meatNoFish.length) { bump('note'); notes.push('Ask if the meat is halal'); }
  if (d.has('lowcarb') && food.carby) { bump('note'); notes.push('Pretty carb heavy'); }
  if (d.has('nofried') && food.fried) { bump('note'); notes.push('Fried'); }
  if ((food.spice ?? 0) > p.spice) { bump(food.spice - p.spice >= 2 ? 'ask' : 'note'); notes.push(food.spice - p.spice >= 2 ? 'Spicy. Ask for it mild' : 'Can be a bit spicy'); }
  for (const dl of p.dislikes) {
    const w = dl.toLowerCase().trim();
    if (w && text.includes(w.replace(/s$/, ''))) { bump('note'); notes.push(`Has ${dl}`); }
  }
  return { level, notes };
}

// Both of you at once.
export function checkBoth(food) {
  const me = checkFor(store.me, food);
  const them = checkFor(store.partnerId, food);
  const r = { ok: 0, note: 1, ask: 2, avoid: 3 };
  return { me, them, level: r[me.level] >= r[them.level] ? me.level : them.level };
}

export const LEVEL_LABEL = { ok: '🛡️ Safe for both', note: '👌 Should be fine', ask: '⚠️ Ask first', avoid: '🚫 Not safe' };

// Love a cuisine? Those cards float up a little.
export function loveScore(food) {
  if (!food?.cuisine) return 0;
  return [store.me, store.partnerId].filter((w) => prefsOf(w).loves.includes(food.cuisine)).length;
}
