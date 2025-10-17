// Service Worker for Push Notifications
/* eslint-env serviceworker */

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const notificationData = data.data || {};
      
      // Format notification body with bold username (Instagram style)
      let formattedBody = data.body;
      
      if (notificationData.userName && notificationData.teamName) {
        if (notificationData.type === 'clock-in') {
          formattedBody = `${notificationData.userName} clocked in to ${notificationData.teamName}`;
        } else if (notificationData.type === 'clock-out') {
          const duration = notificationData.duration ? ` (${notificationData.duration})` : '';
          formattedBody = `${notificationData.userName} clocked out of ${notificationData.teamName}${duration}`;
        }
      }
      
      const options = {
        body: formattedBody,
        icon: data.icon || '/timeharbor-icon.svg',
        badge: data.badge || '/timeharbor-icon.svg',
        tag: data.tag || 'default',
        data: notificationData,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        // Add image for richer notification (optional)
        image: data.image,
        // Direction for better text rendering
        dir: 'ltr',
        // Silent false to allow sound
        silent: false
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (error) {
      console.error('[Service Worker] Error processing push:', error);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(err => console.error('[Service Worker] Error handling notification click:', err))
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  // Let the browser handle the request normally
  return;
});
