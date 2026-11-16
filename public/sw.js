const CACHE_NAME = 'ourcloset-v2';
const APP_SHELL_ROUTES = [
  '/',
  '/today',
  '/closet',
  '/laundry',
  '/history',
  '/trip',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/apple-touch-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        APP_SHELL_ROUTES.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Precache failed for ${url}:`, err);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and external URLs
  if (event.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin)) return;

  // Navigation requests: Network-first, fallback to cached route, then /offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedRoute = await caches.match(event.request);
          if (cachedRoute) return cachedRoute;

          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          // Fallback to cached root/today if available
          return (await caches.match('/today')) || (await caches.match('/'));
        })
    );
    return;
  }

  // Static assets & chunks: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
