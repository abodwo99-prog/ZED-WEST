const CACHE_NAME = 'zedwest-v1';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './qrcode.min.js', './jsQR.js', './chart.umd.min.js', './supabase.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(SHELL)));
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

self.addEventListener('fetch', (e) => {
  // shell files: cache-first. everything else (Supabase API calls, CDN libs): network-first.
  const url = e.request.url;
  const isShell = SHELL.some((s) => url.includes(s.replace('./', '')));
  if (isShell) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  } else {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
