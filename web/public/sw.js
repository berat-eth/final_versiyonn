// Service Worker for caching static assets only (NOT API calls)
const CACHE_NAME = 'huglu-tekstil-v2';
const STATIC_CACHE_DURATION = 86400000; // 24 hours

const urlsToCache = [
  '/',
  '/assets/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API çağrılarını cache'leme - direkt fetch yap
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('api.plaxsy.com') ||
      url.hostname.includes('api.zerodaysoftware.tr')) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          ...event.request.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    );
    return;
  }
  
  // Sadece GET istekleri ve static asset'ler için cache
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Sadece aynı origin için cache
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Static asset'ler için cache (images, fonts, etc.)
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i);
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
  } else {
    // Diğer istekler için cache yapma, direkt fetch
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      })
    );
  }
});
