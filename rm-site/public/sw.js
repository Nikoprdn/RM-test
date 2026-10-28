// Service worker Radio Monaco : pages et ressources en cache pour un chargement instantané
// et une page hors ligne. Jamais de cache pour l'audio, les flux ni l'API WordPress.
const V = 'rm-v1';
const SCOPE = self.registration.scope;
const OFFLINE = SCOPE + 'hors-ligne/';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll([SCOPE, OFFLINE, SCOPE + 'styles/site.css', SCOPE + 'styles/layout.css', SCOPE + 'assets/rm-logo-ink.png', SCOPE + 'assets/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request; const url = new URL(r.url);
  if (r.method !== 'GET') return;
  if (/\.(mp3|aac|m3u8|xspf)$/i.test(url.pathname) || url.hostname.includes('infomaniak') || url.hostname.startsWith('audio.') || url.pathname.includes('/wp-json/') || url.hostname.includes('itunes')) return;
  if (r.mode === 'navigate') {
    // pages : réseau d'abord (contenu frais), cache en secours, puis page hors ligne
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match(OFFLINE))));
    return;
  }
  if (url.origin === location.origin || /image\.ausha\.co|radio-monaco\.com\/wp-content/.test(r.url)) {
    // ressources : cache d'abord, mise à jour en arrière-plan
    e.respondWith(caches.match(r).then((m) => {
      const net = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => m);
      return m || net;
    }));
  }
});
