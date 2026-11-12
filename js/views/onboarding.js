import { store } from '../store.js';
import { COLORS, SPECIES } from '../content.js';
import { petSVG, logoSVG } from '../pet.js';
import { esc, toast, dayKey, confetti } from '../util.js';

let ob = { step: 0, me: {}, them: {}, start: '', species: 'raccoon', petName: '', mode: 'signup', busy: false };

const steps = (n, of) => `<div class="steps">${Array.from({ length: of }, (_, i) => `<i class="${i === n ? 'on' : ''}"></i>`).join('')}</div>`;

const colorPick = (sel, taken, act) => `<div class="color-pick">${COLORS.map((c) =>
  `<button type="button" data-act="${act}" data-c="${c.id}" class="${sel === c.id ? 'on' : ''}" style="background:${c.hex}" ${taken === c.id ? 'disabled' : ''} aria-label="${c.name}"></button>`).join('')}</div>`;

const petPicker = () => `<div class="species-pick">${Object.entries(SPECIES).map(([id, s]) =>
  `<button type="button" data-act="species" data-s="${id}" class="${ob.species === id ? 'on' : ''}">${petSVG({ species: id, mood: ob.species === id ? 'love' : 'happy' })}${s.name}</button>`).join('')}</div>`;

// What still needs setting up? Returns null when the app is ready to use.
export function needsOnboarding() {
  if (store.state === 'auth' || store.state === 'pair') return true;
  if (!store.mine.name) return true;
  if (store.mode === 'demo' && !store.theirs.name) return true;
  if (!store.couple.pet) return true;
  return false;
}

export function onboarding() {
  if (store.state === 'auth') return auth();
  if (store.state === 'pair') return pair();
  return store.mode === 'demo' ? demoFlow() : liveFlow();
}

// ---------------- Demo ----------------
function demoFlow() {
  const total = 5;
  let html = '';
  const s = ob.step;
  if (s === 0) {
    html = `<div class="center">${logoSVG(132)}</div>
      <h1>Two Peas</h1>
      <p class="lead">A little world for just the two of you: questions, games, memories, notes, and a pet you raise together.</p>
      <div class="card flat small muted">This is <b>demo mode</b>. You'll set up both of you on this phone, then switch between you with the bar at the top so you can try everything before it goes live.</div>
      <button class="btn block" data-act="next">Let's start</button>`;
  } else if (s === 1 || s === 2) {
    const who = s === 1 ? ob.me : ob.them;
    const other = s === 1 ? ob.them : ob.me;
    html = `${steps(s - 1, total - 1)}
      <h1>${s === 1 ? 'Who are you?' : 'And your person?'}</h1>
      <p class="lead">${s === 1 ? 'Your name and your color. Everything you do shows up in your color.' : 'Her name and color. She can change these later.'}</p>
      <label class="field">Name</label>
      <input type="text" data-input="name" value="${esc(who.name || '')}" placeholder="${s === 1 ? 'Your name' : 'Her name'}" maxlength="24" autocomplete="off">
      <label class="field">Color</label>
      ${colorPick(who.color, other.color, 'color')}
      <div class="sp2"></div>
      <button class="btn block" data-act="next" ${who.name && who.color ? '' : 'disabled'}>Next</button>`;
  } else if (s === 3) {
    html = `${steps(2, total - 1)}
      <h1>When did you two get together?</h1>
      <p class="lead">Used for your days-together counter and anniversary.</p>
      <input type="date" data-input="start" value="${ob.start || ''}" max="${dayKey()}">
      <div class="sp2"></div>
      <button class="btn block" data-act="next">${ob.start ? 'Next' : 'Skip for now'}</button>`;
  } else {
    html = `${steps(3, total - 1)}
      <h1>Pick your pet together</h1>
      <p class="lead">It grows as you do things together. Choose carefully, it's family now.</p>
      ${petPicker()}
      <label class="field">Name your ${SPECIES[ob.species].name.toLowerCase()}</label>
      <input type="text" data-input="petName" value="${esc(ob.petName)}" placeholder="Pip, Mochi, Bean..." maxlength="16" autocomplete="off">
      <div class="sp2"></div>
      <button class="btn block" data-act="finishDemo" ${ob.petName ? '' : 'disabled'}>Meet your pet</button>`;
  }
  return {
    html: `<div class="welcome">${html}</div>`,
    tabs: false,
    actions: {
      next: () => { ob.step++; return true; },
      color: (d) => { (ob.step === 1 ? ob.me : ob.them).color = d.c; return true; },
      species: (d) => { ob.species = d.s; return true; },
      finishDemo: async () => {
        await store.set(`profile-${store.me}`, 'profile', { name: ob.me.name.trim(), color: ob.me.color });
        await store.set(`profile-${store.partnerId}`, 'profile', { name: ob.them.name.trim(), color: ob.them.color });
        await store.set('couple', 'couple', { startDate: ob.start || null, pet: { species: ob.species, name: ob.petName.trim() }, outfit: {}, room: {} });
        confetti();
        location.hash = '#/home';
        return true;
      },
    },
    inputs: {
      name: (v) => { const who = ob.step === 1 ? ob.me : ob.them; const had = !!who.name; who.name = v; return had !== !!v.trim(); },
      start: (v) => { const had = !!ob.start; ob.start = v; return had !== !!v; },
      petName: (v) => { const had = !!ob.petName; ob.petName = v; return had !== !!v.trim(); },
    },
  };
}

// ---------------- Live ----------------
function auth() {
  const up = ob.mode === 'signup';
  return {
    tabs: false,
    html: `<div class="welcome">
      <div class="center">${logoSVG(110)}</div>
      <h1>Two Peas</h1>
      <p class="lead">${up ? 'Make your account. You only do this once on each phone.' : 'Welcome back!'}</p>
      <div class="seg"><button data-act="mode" data-m="signup" class="${up ? 'on' : ''}">New here</button><button data-act="mode" data-m="signin" class="${up ? '' : 'on'}">Sign in</button></div>
      <form data-form="auth">
        <label class="field">Email</label>
        <input type="email" name="email" autocomplete="email" required>
        <label class="field">Password</label>
        <input type="password" name="password" minlength="6" autocomplete="${up ? 'new-password' : 'current-password'}" required>
        <div class="sp2"></div>
        <button class="btn block" ${ob.busy ? 'disabled' : ''}>${up ? 'Create account' : 'Sign in'}</button>
      </form>
    </div>`,
    actions: { mode: (d) => { ob.mode = d.m; return true; } },
    forms: {
      auth: async (f) => {
        ob.busy = true;
        try {
          if (up) await store.backend.signUp(f.email, f.password);
          else await store.backend.signIn(f.email, f.password);
        } catch (e) { toast(esc(e.message || 'Something went wrong')); }
        ob.busy = false;
        return true;
      },
    },
  };
}

function pair() {
  return {
    tabs: false,
    html: `<div class="welcome">
      <div class="center">${logoSVG(110)}</div>
      <h1>Pair up</h1>
      <p class="lead">One of you creates your shared space, the other joins with the code.</p>
      <button class="btn block" data-act="create" ${ob.busy ? 'disabled' : ''}>Create our space</button>
      <div class="sp2"></div>
      <div class="center muted bold">or join your person</div>
      <form data-form="join" class="add-row">
        <input type="text" name="code" placeholder="6-letter code" maxlength="6" autocapitalize="characters" autocomplete="off" required>
        <button class="btn" ${ob.busy ? 'disabled' : ''}>Join</button>
      </form>
      <div class="sp2"></div>
      <button class="link center" data-act="signout">Sign out</button>
    </div>`,
    actions: {
      create: async () => {
        ob.busy = true;
        try { await store.backend.createCouple(); } catch (e) { toast(esc(e.message)); }
        ob.busy = false;
        return true;
      },
      signout: () => store.backend.signOut(),
    },
    forms: {
      join: async (f) => {
        ob.busy = true;
        try { await store.backend.joinCouple(f.code); confetti(); } catch (e) { toast(esc(e.message)); }
        ob.busy = false;
        return true;
      },
    },
  };
}

function liveFlow() {
  const theirColor = store.theirs.color;
  if (!store.mine.name) {
    ob.me.color = ob.me.color || (theirColor === 'pea' ? 'blush' : 'pea');
    return {
      tabs: false,
      html: `<div class="welcome">
        <h1>Who are you?</h1>
        <p class="lead">Your name and color. Everything you do shows up in your color.</p>
        <label class="field">Name</label>
        <input type="text" data-input="name" value="${esc(ob.me.name || '')}" placeholder="Your name" maxlength="24" autocomplete="off">
        <label class="field">Color</label>
        ${colorPick(ob.me.color, theirColor, 'color')}
        <div class="sp2"></div>
        <button class="btn block" data-act="saveMe" ${ob.me.name ? '' : 'disabled'}>Next</button>
      </div>`,
      actions: {
        color: (d) => { ob.me.color = d.c; return true; },
        saveMe: async () => {
          await store.set(`profile-${store.me}`, 'profile', {
            name: ob.me.name.trim(), color: ob.me.color, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            prefs: { quiet: [23, 8], off: {} },
          });
          return true;
        },
      },
      inputs: { name: (v) => { const had = !!ob.me.name; ob.me.name = v; return had !== !!v.trim(); } },
    };
  }
  // Start date and pet (either of you can do this).
  if (ob.step < 3) ob.step = 3;
  if (ob.step === 3) {
    return {
      tabs: false,
      html: `<div class="welcome">
        <h1>When did you two get together?</h1>
        <p class="lead">Used for your days-together counter and anniversary.</p>
        <input type="date" data-input="start" value="${ob.start || ''}" max="${dayKey()}">
        <div class="sp2"></div>
        <button class="btn block" data-act="next">${ob.start ? 'Next' : 'Skip for now'}</button>
      </div>`,
      actions: { next: () => { ob.step = 4; return true; } },
      inputs: { start: (v) => { const had = !!ob.start; ob.start = v; return had !== !!v; } },
    };
  }
  return {
    tabs: false,
    html: `<div class="welcome">
      <h1>Pick your pet together</h1>
      <p class="lead">Do this side by side if you can. It grows as you do things together.</p>
      ${petPicker()}
      <label class="field">Name your ${SPECIES[ob.species].name.toLowerCase()}</label>
      <input type="text" data-input="petName" value="${esc(ob.petName)}" placeholder="Pip, Mochi, Bean..." maxlength="16" autocomplete="off">
      <div class="sp2"></div>
      <button class="btn block" data-act="savePet" ${ob.petName ? '' : 'disabled'}>Meet your pet</button>
    </div>`,
    actions: {
      species: (d) => { ob.species = d.s; return true; },
      savePet: async () => {
        await store.set('couple', 'couple', { startDate: ob.start || store.couple.startDate || null, pet: { species: ob.species, name: ob.petName.trim() }, outfit: {}, room: {} });
        confetti();
        location.hash = '#/home';
        return true;
      },
    },
    inputs: { petName: (v) => { const had = !!ob.petName; ob.petName = v; return had !== !!v.trim(); } },
  };
}
