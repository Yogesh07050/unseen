// Minimal offline shell: cache art, fonts and verified public verses (§15).
const CACHE = 'unseen-shell-v1';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((n) => n.startsWith('unseen-') && n !== CACHE).map((n) => caches.delete(n)),
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Cache-first for art and fonts.
  if (url.pathname.startsWith('/art/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      c.put(e.request, res.clone());
      return res;
    }));
    return;
  }

  // Stale-while-revalidate for public-domain verses.
  if (url.pathname.startsWith('/api/verse/3034/') || url.pathname.startsWith('/api/bible/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((res) => { c.put(e.request, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // App shell navigation fallback.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
  }
});
