self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Clear any existing cache that is trapping the user on a blank screen
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key === 'melodix-store') {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Always fetch from network to ensure we get the latest Netlify build
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
