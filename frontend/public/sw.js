self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event.data?.text());

  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() || '' };
  }

  const title = data.title || 'Mila';
  const options = {
    body: data.body || 'הרצף שלך עומד להתאפס! 🔥',
    icon: '/mila_logo.png',
    badge: '/mila_logo.png',
    data: { url: data.url || '/' },
    dir: 'rtl',
    lang: 'he',
  };

  console.log('[SW] Showing notification:', title, options.body);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification shown OK'))
      .catch((err) => console.error('[SW] showNotification error:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
