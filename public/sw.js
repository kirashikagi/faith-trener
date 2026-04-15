const CACHE_NAME = 'vera-v34';
const ESSENTIAL_ASSETS = [
  '/',
  '/?mode=pwa',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('PWA: SW Install event');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Caching essential assets individually');
      // Cache assets individually so one failure doesn't block the whole SW
      return Promise.allSettled(
        ESSENTIAL_ASSETS.map(asset => 
          cache.add(asset).then(() => console.log(`PWA: Cached ${asset}`))
            .catch(err => console.warn(`PWA: Failed to cache ${asset}`, err))
        )
      ).then(() => {
        console.log('PWA: Essential assets caching attempt finished');
        // Try to cache logo in background
        cache.add('/logo.png').catch(err => console.warn('PWA: Background logo cache failed', err));
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('PWA: SW Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // For navigation, try network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/').then(response => {
          return response || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // For other assets, try cache first, then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(networkResponse => {
        // Don't cache API calls or external resources unless necessary
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // If fetch fails and no cache, just return the error
        return null;
      });
    })
  );
});
