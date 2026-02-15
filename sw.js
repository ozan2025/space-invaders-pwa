var CACHE_NAME = 'space-invaders-v14';

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/constants.js',
  './js/audio.js',
  './js/renderer.js',
  './js/entities.js',
  './js/input.js',
  './js/storage.js',
  './js/game.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Install: precache all assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(ASSETS);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: network-first, fall back to cache (ensures updates load fast)
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});
