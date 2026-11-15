const CACHE_NAME = 'uzairue-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './config.js',
  './firebase.js',
  './core.js',
  './auth.js',
  './public.js',
  './member.js',
  './admin.js',
  './app.js',
  './features-core.js',
  './features-admin.js',
  './features-members.js',
  './features-finance.js',
  './map.jpg'
];

// Install the service worker and cache the files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch from cache first, then network
self.addEventListener('fetch', (e) => {
  // Don't cache Firebase or ImgBB API calls
  if (e.request.url.includes('googleapis') || e.request.url.includes('imgbb')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});
