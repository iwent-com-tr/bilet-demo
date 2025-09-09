// public/sw.js - iWent Service Worker
// VAPID Push Notifications Service Worker
// Optimized for Android and cross-platform compatibility

const CACHE_NAME = 'bildirimi-dene-v3';
const SW_VERSION = '3.0.0';

console.log('[SW] VAPID Service Worker v' + SW_VERSION + ' script loaded');

// Install event
self.addEventListener('install', function(event) {
  console.log('[SW] VAPID Service Worker installing v' + SW_VERSION);
  
  // Skip waiting to activate immediately
  event.waitUntil(
    self.skipWaiting()
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[SW] VAPID Service Worker activating v' + SW_VERSION);
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('bildirimi-dene-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all pages
      return self.clients.claim();
    })
  );
});

// Push event - handle incoming VAPID push notifications
self.addEventListener('push', function(event) {
  console.log('[SW] VAPID Push event received:', event);
  
  let notificationData = {
    title: 'iWent Bildirimi',
    body: 'Yeni bir bildirim aldınız!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'iwent-vapid-push',
    requireInteraction: false,
    vibrate: [200, 100, 200], // Enhanced for Android
    silent: false,
    renotify: true,
    image: null // Can be used for rich notifications
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('[SW] VAPID push data received:', pushData);
      
      // Merge with default data
      notificationData = {
        ...notificationData,
        ...pushData,
        // Ensure Android-specific properties
        vibrate: pushData.vibrate || [200, 100, 200],
        tag: pushData.tag || 'iwent-vapid-push-' + Date.now()
      };
    } catch (e) {
      console.warn('[SW] Could not parse VAPID push data as JSON:', e);
      const textData = event.data.text();
      if (textData) {
        notificationData.body = textData;
      }
    }
  }

  // Display notification with Android-optimized options
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    vibrate: notificationData.vibrate,
    silent: notificationData.silent,
    renotify: notificationData.renotify,
    image: notificationData.image,
    actions: [
      {
        action: 'open',
        title: 'Aç',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Kapat'
      }
    ],
    data: {
      url: notificationData.url || '/bildirimi-dene',
      timestamp: Date.now(),
      eventId: notificationData.eventId || null,
      type: notificationData.type || 'general'
    }
  };

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationOptions
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

  // Get the URL to open (default to bildirimi-dene page)
  const urlToOpen = event.notification.data?.url || '/bildirimi-dene';

  // Open or focus the app window
  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    console.log('[SW] Found window clients:', windowClients.length);
    
    // Try to find an existing window with our app
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      console.log('[SW] Checking window client:', windowClient.url);
      
      if (windowClient.url.includes('bildirimi-dene') || windowClient.url.includes(self.location.origin)) {
        console.log('[SW] Focusing existing window');
        return windowClient.focus();
      }
    }

    // No suitable window found, open a new one
    console.log('[SW] Opening new window:', urlToOpen);
    return self.clients.openWindow(urlToOpen);
  }).catch(error => {
    console.error('[SW] Error handling notification click:', error);
    // Fallback: try to open a new window anyway
    return self.clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});

// Notification close event
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Message event - handle messages from the main thread
self.addEventListener('message', function(event) {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting due to message');
    self.skipWaiting();
    return;
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
    return;
  }
});

// Fetch event - basic caching for offline support
self.addEventListener('fetch', function(event) {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For the bildirimi-dene page, always try network first
  if (event.request.url.includes('/bildirimi-dene')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, return a basic offline page
        return new Response(
          '<html><body><h1>Bildirimi Dene</h1><p>Çevrimdışı - Lütfen internet bağlantınızı kontrol edin</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
  }
});

console.log('[SW] VAPID Service Worker v' + SW_VERSION + ' ready for Android push notifications');
