const CACHE_NAME = 'zedwest-v2';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './qrcode.min.js', './jsQR.js', './chart.umd.min.js', './supabase.js', './xlsx.full.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything: always try to get the freshest file first,
// and only fall back to the cached copy if the network request fails
// (e.g. no internet connection). This prevents the app from ever getting
// stuck showing an old cached version after an update is published.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(()=>{});
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
