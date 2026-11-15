const CACHE_NAME = 'uzairue-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
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
  './features-finance.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

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
