// OnlyUs Custom Service Worker for Push Notifications and Calling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'OnlyUs';
    const options = {
      body: payload.body || 'You have a new notification',
      icon: payload.icon || '/icons/heart-icon.svg',
      badge: payload.badge || '/icons/heart-icon.svg',
      tag: payload.tag || 'onlyus-general',
      data: payload.data || {},
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      vibrate: payload.vibrate || [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = data.url || '/';

  if (action === 'accept' && data.callId) {
    targetUrl = `/?acceptCall=${data.callId}&type=${data.callType || 'video'}`;
  } else if (action === 'decline' && data.callId) {
    targetUrl = `/?declineCall=${data.callId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
