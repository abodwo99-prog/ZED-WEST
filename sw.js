// Service Worker — Ora Soft Services Operations
// 1) بيستقبل إشعارات الـ Web Push حتى لو التطبيق مقفول، وبيفتح الشاشة المعنية لما تدوس على الإشعار.
// 2) v7: بيخزّن التطبيق نفسه (الصفحة + المكتبات) عشان يفتح من غير إنترنت. طلبات Supabase ما بيلمسهاش خالص.
const SW_VERSION = 'v7';
const SHELL_CACHE = 'zw-shell-' + SW_VERSION;
const FONT_CACHE = 'zw-fonts-v1';
const SHELL_FILES = ['index.html', 'manifest.json', 'supabase.js', 'qrcode.min.js', 'jsQR.js', 'chart.umd.min.js', 'xlsx.full.min.js', 'icon-192.png', 'icon-512.png'];
const scopeUrl = (p) => new URL(p, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // كل ملف لوحده: لو واحد ناقص (زي أيقونة) التثبيت ما يفشلش
    await Promise.all(SHELL_FILES.map(async (f) => {
      try { const res = await fetch(scopeUrl(f), { cache: 'reload' }); if (res && res.ok) await cache.put(scopeUrl(f), res); } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  // مسح كاش النسخ القديمة بس (الجديد بيفضل)
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))); } catch (e) {}
    await self.clients.claim();
  })());
});

const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // خطوط جوجل: نخزّنها عشان الشكل يفضل زي ما هو أوفلاين
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || new Response('', { status: 504 });
    })());
    return;
  }

  // أي حاجة من خارج موقعنا (Supabase وغيره): ما نتدخلش
  if (url.origin !== self.location.origin) return;

  // فتح الصفحة: الشبكة الأول (4 ثواني) وبعدين النسخة المخزّنة — بنتجاهل ?tab= و ?qr= وغيرهم
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const key = scopeUrl('index.html');
      const cache = await caches.open(SHELL_CACHE);
      try {
        const res = await withTimeout(fetch(req), 4000);
        if (res && res.ok) cache.put(key, res.clone());
        return res;
      } catch (e) {
        const hit = await cache.match(key);
        if (hit) return hit;
        return new Response('<meta charset="utf-8"><body style="font-family:sans-serif;text-align:center;padding:40px">مفيش إنترنت ولسه التطبيق ماتخزّنش على الموبايل. افتحه مرة وانت على نت.</body>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // باقي ملفات الموقع (المكتبات والأيقونات): من الكاش فورًا وتتحدّث في الخلفية
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('', { status: 504 });
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'إشعار جديد', body: event.data ? event.data.text() : '' }; }

  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // لو التطبيق مفتوح قدّام المستخدم: نبلّغ الصفحة (توست + صوت) بدل إشعار النظام
    if (list.some((c) => c.visibilityState === 'visible')) {
      list.forEach((c) => c.postMessage({ type: 'push', data }));
      return;
    }
    await self.registration.showNotification(data.title || 'Ora Soft Services', {
      body: data.body || '',
      tag: data.tag || undefined,
      data: { tab: data.tab || null },
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      requireInteraction: data.kind === 'urgent' || data.kind === 'emergency',
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tab = (event.notification.data && event.notification.data.tab) || null;
  const tag = event.notification.tag || null; // ntf-<id>: الصفحة بتعلّم الإشعار ده كمقروء
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.length) {
      const c = list[0];
      try { await c.focus(); } catch (e) {}
      c.postMessage({ type: 'open-tab', tab, tag });
      return;
    }
    const qs = [];
    if (tab) qs.push('tab=' + encodeURIComponent(tab));
    if (tag) qs.push('ntf=' + encodeURIComponent(tag));
    await self.clients.openWindow('./' + (qs.length ? '?' + qs.join('&') : ''));
  })());
});
