/* eslint-disable no-restricted-globals */

// Minimal service worker used to prevent registration 404s in hosted environments.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Intentionally no custom caching strategy yet.
});
