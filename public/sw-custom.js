// ==========================================================
// TimeFlow PWA & Monetag Service Worker Integration Module
// ==========================================================

// 1. Monetag Advertising Integration (Preserved & Safely Isolated)
self.options = {
  domain: '3nbf4.com',
  zoneId: 11724775,
};
self.lary = '';

try {
  // Import Monetag external service worker script
  importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');
} catch (err) {
  // Ensure ad-blockers or offline state never fail TimeFlow's PWA
  console.warn('[TimeFlow SW] Monetag external service worker script unavailable:', err);
}

// 2. TimeFlow Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and notify it of the click
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: notificationData,
          });
          return;
        }
      }
      // If no window is currently open, open a new window at the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. TimeFlow Notification Close Handler
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};
  // Inform active windows if needed for analytics/tracking
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage({
        type: 'NOTIFICATION_CLOSED',
        payload: notificationData,
      });
    }
  });
});

// 4. Message Listener for client-initiated actions
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
