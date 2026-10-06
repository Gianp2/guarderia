// Service Worker for Nido Cuidado - Push Notifications & Instant Alerts
const CACHE_NAME = 'nido-cuidado-sw-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification event (triggered via Web Push API)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Nido Cuidado • Novedad de Sala',
    body: 'Se ha registrado una nueva actividad en el cuaderno de tu hijo/a.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'nido-activity',
    data: {
      url: '/familia',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = { ...payload, ...json };
    } catch (err) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    vibrate: [150, 80, 150],
    tag: payload.tag || 'nido-notification',
    renotify: true,
    data: payload.data || { url: '/familia' },
    actions: payload.actions || [
      { action: 'open', title: 'Ver Novedad' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Direct message event from frontend to show native notification via Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || 'nido-instant-alert',
      renotify: true,
      vibrate: [150, 80, 150],
      data: options.data || { url: '/familia' },
      actions: options.actions || [
        { action: 'open', title: 'Ver en Portal' }
      ],
      ...options
    };

    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  }
});

// Handle notification click: navigate and focus the tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/familia';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
