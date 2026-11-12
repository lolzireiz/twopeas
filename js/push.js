// Turning on push notifications for this phone.
import { store } from './store.js';
import { CONFIG } from './config.js';
import { toast, isStandalone } from './util.js';

const b64 = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function enablePush() {
  if (store.mode !== 'live') { toast('Notifications turn on once the app is live. In demo mode they show up as pop-ups when you switch.'); return; }
  if (!isStandalone()) { toast('Add Two Peas to your Home Screen first (Share, then Add to Home Screen), then open it from there.'); return; }
  if (!pushSupported()) { toast('This phone needs iOS 16.4 or newer for notifications.'); return; }
  if (!CONFIG.VAPID_PUBLIC_KEY) { toast('Notifications aren\'t set up yet (missing key).'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Notifications are off. You can turn them on in iPhone Settings, Notifications, Two Peas.'); return; }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(CONFIG.VAPID_PUBLIC_KEY) });
  await store.backend.savePushSub(sub.toJSON());
  toast('Notifications are on 🔔');
}

// Re-save the subscription on launch in case it changed.
export async function refreshPush() {
  if (store.mode !== 'live' || !pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await store.backend.savePushSub(sub.toJSON());
    else await enablePush();
  } catch (e) { console.warn(e); }
}
