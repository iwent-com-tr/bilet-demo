// public/sw.js - iWent Service Worker
// OneSignal Service Worker
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Simple Service Worker for Push Notifications
// This provides basic push notification support without OneSignal

const CACHE_NAME = 'bildirimi-dene-v1';

// Install event
self.addEventListener('install', function(event) {
  console.log('[SW] Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[SW] Service Worker activating');
  event.waitUntil(
    self.clients.claim()
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received:', event);
  
  let notificationData = {
    title: 'Bildirimi Dene',
    body: 'Test bildirimi alındı!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'bildirimi-dene',
    requireInteraction: false
  };

  // If push event has data, use it
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (e) {
      console.warn('[SW] Could not parse push data as JSON:', e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: [
        {
          action: 'open',
          title: 'Aç'
        },
        {
          action: 'close',
          title: 'Kapat'
        }
      ]
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app window
  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    let clientToFocus;

    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url.includes('/bildirimi-dene') && 'focus' in windowClient) {
        clientToFocus = windowClient;
        break;
      }
    }

    if (clientToFocus) {
      return clientToFocus.focus();
    } else {
      return self.clients.openWindow('/bildirimi-dene');
    }
  });

  event.waitUntil(promiseChain);
});

// Message event - handle messages from the main thread
self.addEventListener('message', function(event) {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker script loaded');
