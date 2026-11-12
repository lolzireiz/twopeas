import { store } from '../store.js';
import { COLORS, DECKS } from '../content.js';
import { APP_VERSION, APP_BUILD, WHATS_NEW, CONFIG } from '../config.js';
import { header, themName, toggle } from '../ui.js';
import { esc, toast, confirmSheet, dayKey, isStandalone } from '../util.js';
import { enablePush, pushSupported } from '../push.js';

const NOTIF_TYPES = [
  ['tap', 'Thinking-of-you taps'],
  ['note', 'Notes and letters'],
  ['game', 'Your turn in games'],
  ['dq', 'Daily question activity'],
  ['memory', 'New memories and drawings'],
  ['mood', 'Mood check-ins'],
  ['daily', 'Daily reminders'],
  ['special', 'Dates, countdowns, anniversaries'],
  ['challenge', 'Weekly challenge'],
  ['pet', 'Pet updates'],
];

const hourOpts = (sel) => Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === sel ? 'selected' : ''}>${h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}</option>`).join('');

export function view() {
  const me = store.mine;
  const prefs = me.prefs || { quiet: [23, 8], off: {} };
  const decks = store.couple.decks || Object.keys(DECKS);
  const theirColor = store.theirs.color;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const notifStatus = store.mode === 'demo' ? 'Demo mode: notifications show as pop-ups when you switch people.'
    : !isStandalone() ? 'Open Two Peas from your Home Screen to turn these on.'
      : !pushSupported() ? 'Needs iOS 16.4 or newer.'
        : perm === 'granted' ? 'On for this phone 🔔' : perm === 'denied' ? 'Blocked. Turn on in iPhone Settings, Notifications, Two Peas.' : 'Off on this phone';
  return {
    html: `${header('Settings', { back: '#/home' })}
      <div class="card">
        <h2>You</h2>
        <label class="field">Name</label>
        <input type="text" data-change="name" value="${esc(me.name || '')}" maxlength="24">
        <label class="field">Your color</label>
        <div class="color-pick">${COLORS.map((c) => `<button data-act="color" data-c="${c.id}" class="${me.color === c.id ? 'on' : ''}" style="background:${c.hex}" ${theirColor === c.id ? 'disabled' : ''} aria-label="${c.name}"></button>`).join('')}</div>
        ${store.mode === 'live' && store.email ? `<p class="small muted" style="margin-top:12px">Signed in as ${esc(store.email)}</p>` : ''}
      </div>

      <div class="card">
        <h2>Us</h2>
        <div class="row between"><span class="bold">Your person</span><span class="muted bold">${themName()}</span></div>
        <label class="field">Together since</label>
        <input type="date" data-change="start" value="${store.couple.startDate || ''}" max="${dayKey()}">
        ${store.mode === 'live' ? `<p class="small muted" style="margin-top:12px">Pairing code: <b>${esc(store.pairCode || '')}</b></p>` : ''}
      </div>

      <div class="card">
        <h2>Daily question decks</h2>
        ${Object.entries(DECKS).map(([id, d]) => `<div class="list-row"><span style="font-size:22px">${d.emoji}</span><div class="txt bold">${d.name}</div>${toggle(`deck:${id}`, decks.includes(id))}</div>`).join('')}
        <p class="small muted">Shared by both of you.</p>
      </div>

      <div class="card">
        <h2>Notifications</h2>
        <p class="small muted">${notifStatus}</p>
        ${store.mode === 'live' && isStandalone() && perm !== 'granted' && perm !== 'denied' ? '<div class="sp"></div><button class="btn block" data-act="push">Turn on notifications</button>' : ''}
        <div class="sp"></div>
        ${NOTIF_TYPES.map(([id, l]) => `<div class="list-row"><div class="txt">${l}</div>${toggle(`notif:${id}`, !prefs.off?.[id])}</div>`).join('')}
        <label class="field">Quiet hours</label>
        <div class="row gap"><select data-change="q0">${hourOpts(prefs.quiet?.[0] ?? 23)}</select><span class="bold muted">to</span><select data-change="q1">${hourOpts(prefs.quiet?.[1] ?? 8)}</select></div>
        <p class="small muted" style="margin-top:8px">Only thinking-of-you taps get through during quiet hours.</p>
      </div>

      <div class="card">
        <h2>Backup</h2>
        <p class="small muted">Save a backup file to iCloud Drive (pick "Save to Files", then iCloud Drive).${store.mode === 'live' ? ' Photos stay safe in your cloud storage.' : ''}</p>
        <div class="sp"></div>
        <div class="row gap"><button class="btn ghost grow" data-act="export">Export backup</button><label class="btn ghost grow" style="position:relative">Restore<input type="file" accept="application/json,.json" data-change="import" style="position:absolute;inset:0;opacity:0"></label></div>
      </div>

      <div class="card">
        <h2>About</h2>
        <div class="row between"><span class="bold">Two Peas</span><span class="pill">v${APP_VERSION} · ${APP_BUILD}</span></div>
        ${WHATS_NEW.map((w) => `<div style="margin-top:10px"><b class="small">v${w.v}</b> <span class="tiny muted">${w.date}</span><ul class="small muted" style="margin:4px 0 0;padding-left:18px">${w.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('')}
        <div class="sp"></div>
        <button class="btn ghost block" data-act="update">Check for updates</button>
      </div>

      ${store.mode === 'demo' ? `<div class="card"><h2>Demo mode</h2><p class="small muted">Everything is saved on this phone only. Tonight it moves to the real thing.</p><div class="sp"></div>
        <button class="btn ghost block" data-act="switch">Switch to ${themName()}</button><div class="sp"></div>
        <button class="btn ghost block" data-act="reset">Reset demo</button></div>`
    : '<button class="btn ghost block" data-act="signout">Sign out</button>'}`,
    actions: {
      color: async (d) => { await store.update(`profile-${store.me}`, { color: d.c }); return true; },
      push: async () => { await enablePush(); return true; },
      export: () => exportBackup(),
      update: async () => { const { applyUpdate } = await import('../updater.js'); applyUpdate(); },
      switch: () => store.backend.switchUser(),
      reset: async () => { if (await confirmSheet('Reset the demo?', 'This erases everything in demo mode on this phone.', 'Reset')) store.backend.reset(); },
      signout: async () => { if (await confirmSheet('Sign out?', 'You can sign back in any time.', 'Sign out')) store.backend.signOut(); },
    },
    changes: {
      name: async (v) => { if (v.trim()) await store.update(`profile-${store.me}`, { name: v.trim() }); toast('Saved'); },
      start: async (v) => { await store.set('couple', 'couple', { startDate: v || null }); toast('Saved 💚'); },
      q0: (v) => savePrefs((p) => { p.quiet = [Number(v), p.quiet?.[1] ?? 8]; }),
      q1: (v) => savePrefs((p) => { p.quiet = [p.quiet?.[0] ?? 23, Number(v)]; }),
      import: async (files) => importBackup(files[0]),
      ...Object.fromEntries(Object.keys(DECKS).map((id) => [`deck:${id}`, async (on) => {
        const cur = new Set(store.couple.decks || Object.keys(DECKS));
        if (on) cur.add(id); else cur.delete(id);
        if (!cur.size) { toast('Keep at least one deck on'); return true; }
        await store.update('couple', { decks: [...cur] });
      }])),
      ...Object.fromEntries(NOTIF_TYPES.map(([id]) => [`notif:${id}`, (on) => savePrefs((p) => { p.off = { ...(p.off || {}), [id]: !on }; })])),
    },
  };
}

async function savePrefs(fn) {
  const prefs = structuredClone(store.mine.prefs || { quiet: [23, 8], off: {} });
  fn(prefs);
  await store.update(`profile-${store.me}`, { prefs });
}

async function exportBackup() {
  const items = [...store.items.values()].filter((i) => store.visible(i));
  const json = JSON.stringify({ app: 'two-peas', version: APP_VERSION, exported: new Date().toISOString(), mode: store.mode, me: store.me, partner: store.partnerId, items }, null, 1);
  const name = `two-peas-backup-${dayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Two Peas backup' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importBackup(file) {
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast("That file isn't a Two Peas backup"); return; }
  if (data.app !== 'two-peas' || !Array.isArray(data.items)) { toast("That file isn't a Two Peas backup"); return; }
  if (!(await confirmSheet('Restore this backup?', `Adds anything missing from ${esc(data.exported?.slice(0, 10) || 'the backup')}. Nothing gets deleted.`, 'Restore'))) return;
  // Swap the old person ids for the current ones (e.g. moving from demo to the real app).
  const swap = (str) => {
    let out = str;
    if (data.me && data.me !== store.me) out = out.split(data.me).join('\u0001');
    if (data.partner && data.partner !== store.partnerId && store.partnerId) out = out.split(data.partner).join('\u0002');
    return out.split('\u0001').join(store.me).split('\u0002').join(store.partnerId || data.partner);
  };
  let n = 0;
  for (const raw of data.items) {
    const it = JSON.parse(swap(JSON.stringify(raw)));
    if (store.items.has(it.id)) continue;
    await store.add(it.kind, it.data, { id: it.id, once: true, hiddenFrom: it.hiddenFrom || null }).catch(() => {});
    n++;
  }
  toast(`Restored ${n} thing${n === 1 ? '' : 's'} 💚`);
}

export { CONFIG };
