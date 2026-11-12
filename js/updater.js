// Checks GitHub for a newer build and shows a banner: tap to update, X to snooze 15 minutes.
import { APP_BUILD } from './config.js';
import { lsGet, lsSet } from './util.js';

const SNOOZE = 15 * 60e3;
let shown = false;

async function latest() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).build;
  } catch { return null; }
}

export async function applyUpdate() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.update().catch(() => {})));
    const keys = (await caches?.keys?.()) || [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch { /* ignore */ }
  location.reload();
}

function banner(build) {
  if (shown || document.getElementById('updBar')) return;
  shown = true;
  const el = document.createElement('div');
  el.id = 'updBar';
  el.className = 'upd-bar';
  el.innerHTML = '<button class="upd-go">✨ New version ready. <b>Tap to update</b></button><button class="upd-x" aria-label="Later">✕</button>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  el.querySelector('.upd-go').onclick = () => { el.querySelector('.upd-go').textContent = 'Updating…'; applyUpdate(); };
  el.querySelector('.upd-x').onclick = () => {
    lsSet('twopeas-upd-snooze', { build, until: Date.now() + SNOOZE });
    el.classList.remove('in');
    setTimeout(() => { el.remove(); shown = false; }, 300);
  };
}

export async function checkForUpdate() {
  if (APP_BUILD === 'dev' || document.visibilityState !== 'visible') return;
  const b = await latest();
  if (!b || b === APP_BUILD) return;
  const sn = lsGet('twopeas-upd-snooze');
  if (sn && sn.build === b && Date.now() < sn.until) return;
  banner(b);
}

export function startUpdater() {
  checkForUpdate();
  setInterval(checkForUpdate, 30e3);
  document.addEventListener('visibilitychange', checkForUpdate);
}
