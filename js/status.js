// Knows when the service behind Two Peas (Supabase) is having an outage, so the app can say so.
import { CONFIG } from './config.js';
import { esc } from './util.js';

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// Returns { outage, title, detail } from Supabase's public status page, or null if it can't tell.
export async function supabaseStatus() {
  try {
    const r = await withTimeout(fetch('https://status.supabase.com/api/v2/summary.json', { cache: 'no-store' }), 6000);
    const j = await r.json();
    const open = (j.incidents || []).filter((i) => !['resolved', 'postmortem'].includes(i.status));
    const outage = open.length > 0 || (j.status?.indicator && j.status.indicator !== 'none');
    return { outage, title: open[0]?.name || j.status?.description || '', detail: j.status?.description || '', count: open.length };
  } catch { return null; }
}

// Can this phone reach our database right now?
export async function backendReachable() {
  if (!CONFIG.SUPABASE_URL) return true;
  try {
    const r = await withTimeout(fetch(`${CONFIG.SUPABASE_URL}/auth/v1/health`, { headers: { apikey: CONFIG.SUPABASE_ANON_KEY }, cache: 'no-store' }), 6000);
    return r.ok;
  } catch { return false; }
}

// Full-screen message when the app can't start.
export async function showDownScreen(root, err, step) {
  const s = await supabaseStatus();
  const internet = navigator.onLine !== false;
  let emoji = '🥺';
  let title = "Can't connect";
  let lead = "Two Peas can't reach the internet right now. Try switching between Wi-Fi and cellular, or turning off a VPN or ad blocker.";
  if (!internet) {
    emoji = '📵';
    title = "You're offline";
    lead = 'Your phone has no internet connection. Two Peas will open as soon as you are back online.';
  } else if (s?.outage) {
    emoji = '🛠️';
    title = 'Two Peas is taking a nap';
    lead = `It's not you, and nothing is broken on your end. The service that stores everything for Two Peas (Supabase) is having problems right now${s.title ? `: <b>${esc(s.title)}</b>` : ''}.<br><br>Your stuff is safe. This screen checks every 30 seconds and opens the app by itself once they fix it.`;
  }
  root.innerHTML = `<div class="welcome"><div class="center" style="font-size:58px">${emoji}</div><h1>${title}</h1>
    <p class="lead">${lead}</p>
    <div class="down-check" id="downCheck"><span class="rec-dot"></span><span id="downText">Checking again in 30s…</span></div>
    <div class="sp"></div>
    <button class="btn block" id="bootRetry">Try now</button><div class="sp"></div>
    ${s?.outage ? '<a class="btn ghost block" href="https://status.supabase.com" target="_blank" rel="noopener">See Supabase status</a><div class="sp"></div>' : ''}
    <button class="btn ghost block" id="bootReset">Reset Two Peas on this phone</button>
    <p class="tiny muted center" style="margin-top:14px">Resetting signs you out on this phone only. Nothing you've saved is lost.<br>Details: ${esc(step || '')}: ${esc(err?.message || err || '')}</p></div>`;
  root.querySelector('#bootRetry').onclick = () => location.reload();
  root.querySelector('#bootReset').onclick = async () => {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
      await Promise.all(regs.map((r) => r.unregister()));
      const keys = (await caches?.keys?.()) || [];
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
    try { Object.keys(localStorage).filter((k) => /auth|sb-/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    location.reload();
  };
  let left = 30;
  const txt = root.querySelector('#downText');
  const tick = setInterval(async () => {
    left--;
    if (left > 0) { txt.textContent = `Checking again in ${left}s…`; return; }
    txt.textContent = 'Checking…';
    if (await backendReachable()) { clearInterval(tick); txt.textContent = "It's back! Opening…"; location.reload(); return; }
    left = 30;
  }, 1000);
  window.addEventListener('online', () => location.reload(), { once: true });
}

// A small bar while the app is running: shows when saving fails or Supabase reports trouble.
let barShown = false;
let watch = 0;
export async function connectionTrouble(reason = 'save') {
  if (barShown) return;
  barShown = true;
  const s = await supabaseStatus();
  const el = document.createElement('div');
  el.id = 'downBar';
  el.className = 'down-bar';
  const msg = s?.outage
    ? `🛠️ Supabase (where Two Peas keeps your stuff) is having problems${s.title ? `: ${esc(s.title)}` : ''}. Some things may not save or sync until they fix it.`
    : reason === 'save' ? "⚠️ Couldn't reach Two Peas' server. Check your internet. Your last change might not have saved." : '⚠️ Connection trouble.';
  el.innerHTML = `<span class="grow">${msg}</span><button aria-label="Hide">✕</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const hide = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); barShown = false; clearInterval(watch); };
  el.querySelector('button').onclick = hide;
  clearInterval(watch);
  watch = setInterval(async () => {
    if (await backendReachable()) { const st = await supabaseStatus(); if (!st?.outage) hide(); }
  }, 30000);
}

// Heads-up on open if Supabase has an ongoing incident (even if things still work).
// Only speaks up when this phone actually can't reach the server (not for outages elsewhere).
export async function outageHeadsUp() {
  if (!CONFIG.SUPABASE_URL || barShown) return;
  if (await backendReachable()) return;
  connectionTrouble('status');
}
