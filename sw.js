// Two Peas service worker: offline cache + push notifications.
const CACHE = 'twopeas-1.4.4';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/config.js', './js/store.js', './js/logic.js', './js/content.js', './js/util.js', './js/ui.js',
  './js/pet.js', './js/canvas.js', './js/push.js', './js/bus.js', './js/vendor/supabase.js', './js/updater.js', './js/backup.js', './js/status.js', './js/camera.js', './js/feed.js', './js/stickers.js', './js/views/hunt.js', './js/views/extras.js', './js/views/chat.js', './js/views/draw.js', './js/views/snap.js', './data/words.txt',
  './js/views/home.js', './js/views/play.js', './js/views/us.js', './js/views/notes.js', './js/views/petview.js',
  './js/views/settings.js', './js/views/onboarding.js',
  './js/theme.js', './js/food.js', './js/swipe-data.js', './js/habits-logic.js', './js/wrapped.js', './data/peadle.txt', './data/words5.txt',
  './js/views/look.js', './js/views/peadle.js', './js/views/swipe.js', './js/views/prefs.js', './js/views/wheel.js', './js/views/habits.js', './js/views/wrapped.js',
  './icons/icon-192.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache Supabase data or auth.
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;
  if (url.origin === location.origin) {
    // Network first so updates show up right away; cache when offline.
    if (url.pathname.endsWith('/version.json')) { e.respondWith(fetch(req, { cache: 'no-store' })); return; }
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }
  if (url.hostname === 'esm.sh') {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: 'Two Peas', body: e.data && e.data.text() }; }
  const title = data.title || 'Two Peas';
  const opts = {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || data.type || undefined,
    renotify: !!data.tag,
    data: { url: data.url || './#/home' },
  };
  e.waitUntil((async () => {
    await self.registration.showNotification(title, opts);
    try { if (data.badge != null && self.navigator.setAppBadge) await self.navigator.setAppBadge(data.badge); } catch { /* ignore */ }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './#/home', self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.registration.scope)) {
        c.postMessage({ type: 'open', url: target });
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
