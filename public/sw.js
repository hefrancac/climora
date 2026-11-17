// Climora service worker: keeps the app shell available with weak or no signal.
// Forecast data is cached by the app itself (localStorage), so only same-origin
// requests are handled here.
const CACHE = 'climora-shell-v2';
const SHELL = ['/app', '/manifest.webmanifest', '/icon.svg', '/icon-192.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network first for pages, falling back to the cached page or the app shell.
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match('/app'))),
    );
    return;
  }

  // Static assets: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then(hit => {
      const network = fetch(request)
        .then(response => {
          if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
