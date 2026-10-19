// Service Worker — Ora Soft Services Operations
// بيستقبل إشعارات الـ Web Push حتى لو التطبيق مقفول، وبيفتح الشاشة المعنية لما تدوس على الإشعار.
const SW_VERSION = 'v6';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  // مسح أي كاش قديم عشان النسخة الجديدة من التطبيق تظهر فورًا
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch (e) {}
    await self.clients.claim();
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
