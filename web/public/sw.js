// Service Worker for caching static assets only (NOT HTML pages, NOT API calls)
const CACHE_NAME = 'huglu-tekstil-v3'; // Version değiştirildi - eski cache temizlensin
const STATIC_CACHE_DURATION = 86400000; // 24 hours

self.addEventListener('install', (event) => {
  // Skip waiting - immediately activate new service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Tüm eski cache'leri temizle
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tüm client'lara yeni service worker'ı bildir
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // HTML sayfalarını asla cache'leme - her zaman fresh
  if (event.request.method === 'GET' && 
      (event.request.headers.get('accept')?.includes('text/html') ||
       url.pathname === '/' ||
       !url.pathname.includes('.') ||
       url.pathname.endsWith('/'))) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          ...Object.fromEntries(event.request.headers.entries()),
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }).catch(() => {
        // Network hatası durumunda bile HTML cache'leme
        return new Response('Network error', { status: 503 });
      })
    );
    return;
  }
  
  // API çağrılarını cache'leme - direkt fetch yap
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('api.plaxsy.com') ||
      url.hostname.includes('api.zerodaysoftware.tr') ||
      url.hostname.includes('api.')) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          ...Object.fromEntries(event.request.headers.entries()),
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    );
    return;
  }
  
  // POST, PUT, DELETE gibi istekleri cache'leme
  if (event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      })
    );
    return;
  }
  
  // Sadece aynı origin için cache (external istekler cache'lenmez)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      })
    );
    return;
  }
  
  // Sadece static asset'ler için cache (HTML değil)
  const isStaticAsset = 
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js)$/i);
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Cache'te varsa ve hala geçerliyse kullan
        if (cachedResponse) {
          // Static asset'ler için network-first strategy
          return fetch(event.request, {
            cache: 'reload'
          }).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }).catch(() => {
            // Network yoksa cache'den ver
            return cachedResponse;
          });
        }
        
        // Cache'te yoksa fetch et ve cache'le
        return fetch(event.request, {
          cache: 'reload'
        }).then((response) => {
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
    // Diğer tüm istekler (HTML dahil) için cache yapma
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          ...Object.fromEntries(event.request.headers.entries()),
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    );
  }
});
