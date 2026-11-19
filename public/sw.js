/**
 * Safar India Cabs - Progressive Web App Service Worker (v4)
 * Prevents stale HTML / broken CSS hash mismatches inside Android WebView & Mobile Browsers.
 */

const CACHE_NAME = 'safar-cabs-v4';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isAssetRequest(pathname) {
  return /\.(css|js|mjs|woff2?|png|jpe?g|webp|svg|ico|json)$/i.test(pathname);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Always network-first for HTML navigations so fresh CSS/JS bundle hashes are always fetched
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          const ct = networkResponse.headers.get('content-type') || '';
          if (networkResponse.ok && ct.includes('text/html')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match('/');
          return (
            cached ||
            new Response('Offline - Please check your internet connection.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          );
        })
    );
    return;
  }

  // For static CSS/JS/images: network-first, strictly verify MIME type (never cache HTML for CSS/JS)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const ct = (networkResponse.headers.get('content-type') || '').toLowerCase();
        const isHtmlFallbackForAsset = isAssetRequest(url.pathname) && ct.includes('text/html');
        if (networkResponse && networkResponse.status === 200 && !isHtmlFallbackForAsset) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Offline asset unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});
