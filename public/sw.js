
const CACHE_NAME = 'mmg-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/homepage.html',
  '/styles.css',
  '/script.js',
  '/libs/tailwindcss/tailwindcss.min.js',
  '/libs/chart.js/chart.min.js',
  '/libs/socket.io/socket.io.min.js',
  '/libs/xlsx/xlsx.full.min.js',
  '/logo-bg.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});
