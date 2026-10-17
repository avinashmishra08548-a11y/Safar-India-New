/**
 * Safar India Cabs - Progressive Web App Service Worker
 * Cache Name: safar-cabs-v1
 */

const CACHE_NAME = 'safar-cabs-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
];

// Install: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first strategy with cache fallback for HTML/assets; bypass /api/
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin, POST/PUT methods, and serverless /api/ routes
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for GET requests
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If navigating to a page offline, return cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Network error occurred while offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
