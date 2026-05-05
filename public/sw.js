// Minimal service worker — required for PWA installability in Chrome.
// We deliberately do NOT cache app shell assets to avoid serving stale
// chunks after deploys. Network-first / pass-through for everything.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through; let the browser handle the request normally.
  return;
});
