const STATIC_CACHE = 'fupasnack-static-v1';
const DYNAMIC_CACHE = 'fupasnack-dynamic-v1';
const STATIC_ASSETS = [
  '/', 
  '/index.html',
  '/karyawan.html',
  '/admin.html',
  '/manifest.webmanifest',
  '/service-worker.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js'
];

// Install: cache shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, then network; navigate requests fall back to index.html
self.addEventListener('fetch', event => {
  // Only handle GET
  if (event.request.method !== 'GET') return;

  // SPA navigation: serve index.html from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch('/index.html'))
    );
    return;
  }

  // Try cache first, then network, and update dynamic cache
  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      if (cacheRes) return cacheRes;
      return fetch(event.request)
        .then(fetchRes => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        })
        .catch(() => {
          // Optional: offline fallback for images or pages can go here
        });
    })
  );
});