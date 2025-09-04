// public/sw.js - iWent Service Worker
// OneSignal Service Worker
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Cache name for static assets
const CACHE_NAME = 'iwent-pwa-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple network-first strategy for now
  const req = event.request;
  const url = new URL(req.url);

  // 1) POST/PUT/DELETE gibi GET olmayanları SW hiç ele almasın
  if (req.method !== 'GET') return;

  // 2) Cross-origin istekleri (api.iwent.com.tr) SW’de bırakma
  if (url.origin !== self.location.origin) return;

  // 3) Aynı origin’de bile /api/... isteklerine dokunma
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(fetch(event.request));
});

// Custom push event handler (works alongside OneSignal)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  let notificationData;
  
  try {
    // Parse the push payload
    if (event.data) {
      notificationData = event.data.json();
    } else {
      // Fallback for empty payload
      notificationData = {
        title: 'iWent Notification',
        body: 'You have a new notification',
        url: '/',
        type: 'general'
      };
    }
  } catch (error) {
    console.error('[SW] Error parsing push payload:', error);
    // Fallback for malformed payload
    notificationData = {
      title: 'iWent Notification',
      body: 'You have a new notification',
      url: '/',
      type: 'error'
    };
  }
  
  // Validate required fields
  if (!notificationData.title || !notificationData.body) {
    console.error('[SW] Invalid notification data:', notificationData);
    return;
  }
  
  // Show the notification
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/android-chrome-192x192.png',
    badge: notificationData.badge || '/android-chrome-192x192.png',
    data: {
      url: notificationData.url || '/',
      type: notificationData.type || 'general',
      timestamp: Date.now()
    },
    tag: notificationData.tag || 'iwent-notification',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    actions: notificationData.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/';
  
  // Log notification interaction
  logNotificationInteraction('click', {
    tag: event.notification.tag,
    type: event.notification.data?.type,
    timestamp: Date.now(),
    url: urlToOpen
  });
  
  // Handle notification click - open the URL
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with this URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
  
  // Log notification interaction
  logNotificationInteraction('close', {
    tag: event.notification.tag,
    type: event.notification.data?.type,
    timestamp: Date.now()
  });
});

// Background sync handler
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper function to log notification interactions
function logNotificationInteraction(action, data) {
  try {
    console.log(`[SW] Notification ${action}:`, data);
    
    // Store interaction data in IndexedDB or send to analytics
    // For now, just log to console
    const interactionData = {
      action,
      ...data,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
    
    // In a real implementation, you might want to send this to an analytics service
    // or store it in IndexedDB for later synchronization
  } catch (error) {
    console.error('[SW] Error logging notification interaction:', error);
  }
}

// Background sync function
function doBackgroundSync() {
  console.log('[SW] Performing background sync...');
  
  // Implement your background sync logic here
  // This could include:
  // - Syncing offline data
  // - Fetching latest content
  // - Cleaning up old cache entries
  
  return Promise.resolve();
}
