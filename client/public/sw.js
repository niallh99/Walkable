const CACHE_NAME = 'walkable-v1';

// App shell: files that are always available
const APP_SHELL = [
  '/',
  '/index.html',
];

// Cache external dependencies separately
const EXTERNAL_CACHE = 'walkable-external-v1';
const EXTERNAL_ORIGINS = [
  'https://unpkg.com',
  'https://a.tile.openstreetmap.org',
  'https://b.tile.openstreetmap.org',
  'https://c.tile.openstreetmap.org',
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate new SW immediately without waiting for old one to stop
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== EXTERNAL_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Map tile & external asset caching (cache-first, long TTL)
  if (EXTERNAL_ORIGINS.some((origin) => url.origin === origin)) {
    event.respondWith(
      caches.open(EXTERNAL_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Same-origin static assets (JS/CSS/images/fonts): cache-first
  if (url.origin === self.location.origin) {
    const isStaticAsset =
      url.pathname.startsWith('/assets/') ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf)$/);

    if (isStaticAsset) {
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
          cache.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            });
          })
        )
      );
      return;
    }

    // Navigation requests (HTML): network-first, fall back to cached index.html
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() =>
            caches.match('/index.html').then((cached) => cached || caches.match('/'))
          )
      );
    }
  }
});
