// Monthly nudge to save a backup to iCloud Drive.
import { lsGet, lsSet, timeAgo, toast } from './util.js';
import { store } from './store.js';

const KEY = 'twopeas-last-backup';
const EVERY = 30 * 864e5;
const SNOOZE = 3 * 864e5;
const FIRST_AFTER = 7 * 864e5;

export const markBackedUp = () => { lsSet(KEY, Date.now()); document.getElementById('bkBar')?.remove(); };
export const lastBackupText = () => { const t = lsGet(KEY); return t ? timeAgo(t) : 'never'; };

function due() {
  const now = Date.now();
  if (!lsGet('twopeas-first-seen')) lsSet('twopeas-first-seen', now);
  const snooze = lsGet('twopeas-backup-snooze') || 0;
  if (now < snooze) return false;
  const last = lsGet(KEY);
  if (last) return now - last > EVERY;
  return now - lsGet('twopeas-first-seen') > FIRST_AFTER && store.items.size > 20;
}

export function checkBackup() {
  if (store.state !== 'ready' || !store.couple.pet) return;
  if (document.getElementById('bkBar') || document.getElementById('updBar') || !due()) return;
  const el = document.createElement('div');
  el.id = 'bkBar';
  el.className = 'upd-bar';
  el.innerHTML = '<button class="upd-go">💾 Time for a backup? <b>Tap to save to iCloud</b></button><button class="upd-x" aria-label="Later">✕</button>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  el.querySelector('.upd-go').onclick = async () => {
    const { exportBackup } = await import('./views/settings.js');
    const ok = await exportBackup();
    if (ok) { toast('Backed up 💾 Pick "Save to Files", then iCloud Drive'); el.remove(); }
  };
  el.querySelector('.upd-x').onclick = () => {
    lsSet('twopeas-backup-snooze', Date.now() + SNOOZE);
    el.classList.remove('in');
    setTimeout(() => el.remove(), 300);
  };
}

export function startBackupNudge() {
  setTimeout(checkBackup, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(checkBackup, 4000); });
}
