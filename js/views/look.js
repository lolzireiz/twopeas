// Look & feel: dark mode, themes, patterns, fonts.
import { store } from '../store.js';
import { header, themName, meColor } from '../ui.js';
import { toast, lsGet } from '../util.js';
import {
  THEMES, PATTERNS, FONTS, SIZES, CORNERS, DEFAULT_LOOK, getLook, saveLook, isDark, previewPattern,
} from '../theme.js';

let saveT = 0;
function set(patch) {
  const look = { ...getLook(), ...patch };
  saveLook(look);
  clearTimeout(saveT);
  saveT = setTimeout(() => store.update(`profile-${store.me}`, { look }).catch(() => {}), 800);
  return true;
}

// First launch on a new phone: pick up the look saved in your profile.
let synced = false;
export function syncLookFromProfile() {
  if (synced || !store.me) return;
  const saved = store.mine.look;
  if (!store.get(`profile-${store.me}`)) return;
  synced = true;
  if (saved && !lsGet('twopeas-look')) saveLook({ ...DEFAULT_LOOK, ...saved });
}

const opt = (act, val, cur, label) => `<button class="opt ${cur === val ? 'on' : ''}" data-act="${act}" data-v="${val}">${label}</button>`;

export function view() {
  const look = getLook();
  const dark = isDark(look);
  const theirs = store.theirs.look;
  return {
    html: `${header('Look & feel', { back: '#/settings', sub: 'Only changes this phone. Your person keeps their own.' })}
      <div class="card">
        <h2>Mode</h2>
        <div class="seg" style="margin:0">${[['light', '☀️ Light'], ['dark', '🌙 Dark'], ['auto', '📱 Auto']].map(([v, l]) => `<button class="${look.mode === v ? 'on' : ''}" data-act="mode" data-v="${v}">${l}</button>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">Auto follows your iPhone's light and dark setting.</p>
      </div>

      <div class="card">
        <h2>Theme</h2>
        <div class="theme-grid">${THEMES.map((t) => {
          const p = dark ? t.dark : t.light;
          return `<button class="theme-sw ${look.theme === t.id ? 'on' : ''}" data-act="theme" data-v="${t.id}" style="background:${p.bg};color:${p.ink}">
            <div class="tp"><i style="background:${p.pea}"></i><i style="background:${p.card}"></i><i style="background:${p.soft}"></i></div>
            <b>${t.e} ${t.name}</b>
            <div class="mini" style="background:${p.card};color:${p.muted}">Hi you 💚</div></button>`;
        }).join('')}</div>
        <div class="list-row" style="margin-top:10px"><div class="txt"><b>Use my color for buttons</b><div class="tiny muted">Swap the theme's accent for your ${meColor().name.toLowerCase()}</div></div>
          <label class="switch"><input type="checkbox" data-change="own" ${look.ownColorAccent ? 'checked' : ''}><span></span></label></div>
      </div>

      <div class="card">
        <h2>Background</h2>
        <div class="opt-row">${PATTERNS.map((p) => `<button class="pat-sw ${look.pattern === p.id ? 'on' : ''}" data-act="pattern" data-v="${p.id}" data-pat="${p.id}" aria-label="${p.name}"></button>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">${PATTERNS.find((p) => p.id === look.pattern)?.name}</p>
      </div>

      <div class="card">
        <h2>Font</h2>
        ${FONTS.map((f) => `<button class="list-row" style="width:100%;text-align:left" data-act="font" data-v="${f.id}"><div class="txt" style="font-family:${f.css.replace(/"/g, "'")};font-size:17px;font-weight:700">${f.name} · Two Peas in a pod</div>${look.font === f.id ? '<span class="pill me">✓</span>' : ''}</button>`).join('')}
      </div>

      <div class="card">
        <h2>Text size</h2>
        <div class="opt-row">${SIZES.map(([v, l]) => opt('size', v, look.size, l)).join('')}</div>
        <h2 style="margin-top:16px">Corners</h2>
        <div class="opt-row">${CORNERS.map(([v, l]) => opt('corners', v, look.corners, l)).join('')}</div>
        <div class="list-row" style="margin-top:12px"><div class="txt"><b>Animations</b><div class="tiny muted">Turn off for a calmer app</div></div>
          <label class="switch"><input type="checkbox" data-change="motion" ${look.motion ? 'checked' : ''}><span></span></label></div>
      </div>

      <div class="card">
        ${theirs ? `<button class="btn ghost block" data-act="copy">🪞 Copy ${themName()}'s look</button><div class="sp"></div>` : ''}
        <button class="btn ghost block" data-act="reset">Reset to default</button>
      </div>`,
    mount: (root) => {
      root.querySelectorAll('[data-pat]').forEach((el) => { el.style.background = `${previewPattern(el.dataset.pat)}, var(--bg)`; });
    },
    actions: {
      mode: (d) => set({ mode: d.v }),
      theme: (d) => set({ theme: d.v }),
      pattern: (d) => set({ pattern: d.v }),
      font: (d) => set({ font: d.v }),
      size: (d) => set({ size: d.v }),
      corners: (d) => set({ corners: d.v }),
      copy: () => { set({ ...DEFAULT_LOOK, ...theirs }); toast(`Now matching ${themName()} 🪞`); return true; },
      reset: () => set({ ...DEFAULT_LOOK }),
    },
    changes: {
      own: (on) => set({ ownColorAccent: on }),
      motion: (on) => set({ motion: on }),
    },
  };
}

