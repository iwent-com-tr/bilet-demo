// public/sw.js

// Cache name for static assets
const CACHE_NAME = 'iwent-pwa-v1';

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Push event handler for incoming notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
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
    console.error('Error parsing push payload:', error);
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
    console.error('Invalid notification payload: missing title or body');
    return;
  }
  
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/android-chrome-192x192.png',
    badge: notificationData.badge || '/favicon-32x32.png',
    tag: notificationData.eventId || 'iwent-notification',
    data: {
      url: notificationData.url || '/',
      eventId: notificationData.eventId,
      type: notificationData.type,
      change: notificationData.change
    },
    requireInteraction: notificationData.type === 'event_update',
    actions: notificationData.actions || []
  };
  
  // Add default actions based on notification type
  if (notificationData.type === 'event_update' && notificationData.eventId) {
    notificationOptions.actions = [
      {
        action: 'view_event',
        title: 'View Event',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ];
  } else if (notificationData.type === 'new_event' && notificationData.eventId) {
    notificationOptions.actions = [
      {
        action: 'view_event',
        title: 'View Event',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ];
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .catch(error => {
        console.error('Error showing notification:', error);
      })
  );
});

// Notification click handler for navigation and focus management
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Log the interaction for analytics
  logNotificationInteraction(action || 'click', data);
  
  // Close the notification
  notification.close();
  
  // Resolve the target URL based on action and data
  const targetUrl = resolveNotificationUrl(data, action);
  
  // If no URL to navigate to (e.g., dismiss action), just return
  if (!targetUrl) {
    return;
  }
  
  // Handle the navigation
  event.waitUntil(
    handleNotificationClick(targetUrl)
  );
});

// Helper function to handle notification click navigation and focus management
async function handleNotificationClick(url) {
  try {
    // Get all window clients
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Normalize the target URL for comparison
    const targetUrl = new URL(url, self.location.origin);
    
    // Check if there's already a window open with the target URL
    for (const client of clients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.href === targetUrl.href && 'focus' in client) {
          return client.focus();
        }
      } catch (e) {
        // Skip invalid URLs
        continue;
      }
    }
    
    // Check if there's any window open to the app that we can navigate
    for (const client of clients) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          // Try to navigate existing window to the target URL
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl.href);
              return client.focus();
            } catch (navError) {
              console.warn('Navigation failed, will try to focus existing client:', navError);
              // If navigation fails, just focus the existing client
              if ('focus' in client) {
                return client.focus();
              }
            }
          } else if ('focus' in client) {
            // If navigation is not supported, just focus the existing client
            return client.focus();
          }
        }
      } catch (e) {
        // Skip invalid URLs
        continue;
      }
    }
    
    // No existing window found or navigation failed, open a new one
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl.href);
    }
  } catch (error) {
    console.error('Error handling notification click:', error);
    // Fallback: try to open a new window
    if (self.clients.openWindow) {
      try {
        const fallbackUrl = new URL(url, self.location.origin);
        return self.clients.openWindow(fallbackUrl.href);
      } catch (urlError) {
        console.error('Failed to create fallback URL:', urlError);
        // Last resort: open the app root
        return self.clients.openWindow(self.location.origin);
      }
    }
  }
}

// Helper function to resolve URLs based on notification data and action
function resolveNotificationUrl(data, action) {
  let targetUrl = '/';
  
  // Handle specific actions
  switch (action) {
    case 'view_event':
      if (data.eventId) {
        targetUrl = `/events/${data.eventId}`;
      } else {
        targetUrl = data.url || '/events';
      }
      break;
    case 'view_tickets':
      targetUrl = '/user/tickets';
      break;
    case 'view_profile':
      targetUrl = '/user/profile';
      break;
    case 'dismiss':
      // No navigation needed for dismiss
      return null;
    default:
      // Default click behavior
      if (data.eventId) {
        targetUrl = `/events/${data.eventId}`;
      } else {
        targetUrl = data.url || '/';
      }
  }
  
  return targetUrl;
}

// Helper function to log notification interactions for analytics
function logNotificationInteraction(action, notificationData) {
  try {
    // Log to console for debugging
    console.log('Notification interaction:', {
      action,
      type: notificationData.type,
      eventId: notificationData.eventId,
      timestamp: new Date().toISOString()
    });
    
    // In a real implementation, you might want to send this to an analytics service
    // or store it in IndexedDB for later synchronization
  } catch (error) {
    console.error('Error logging notification interaction:', error);
  }
}