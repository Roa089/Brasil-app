// sw.js - Service Worker für NotifyMindFit PWA (Cache-First mit Offline-Fallback)

const CACHE_NAME = 'notify-mindfit-v1'; // Versionierung für Updates
const OFFLINE_FALLBACK = '/offline.html'; // Erstelle eine einfache offline.html (z.B. mit "Offline – verbinde dich erneut")

// Statische Assets zum Cachen (erweitere bei Bedarf: app.js, style.css, etc.)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css', // Später hinzufügen
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html' // Fallback-Seite
];

// Install: Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Alte Caches löschen
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

// Fetch: Cache-First mit Network-Fallback und Offline-Handling
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Offline: Fallback für Navigation zu offline.html
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_FALLBACK);
          }
          return caches.match(OFFLINE_FALLBACK);
        });
      })
  );
});
