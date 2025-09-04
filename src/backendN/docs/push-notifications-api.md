# Push Notifications API Documentation

## Overview

The iWent Push Notifications API provides endpoints for managing Web Push subscriptions and sending notifications to users. The API follows REST principles and uses JSON for data exchange.

## Base URL

```
https://api.iwent.com/api/push
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- Subscription endpoints: 10 requests per minute per IP
- Notification endpoints: 5 requests per minute per user (admin only)

## Endpoints

### Public Endpoints

#### Get VAPID Public Key

Get the VAPID public key required for client-side push subscription.

```http
GET /api/push/public-key
```

**Response:**
```json
{
  "publicKey": "BKd3dGJh..."
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - VAPID configuration error

---

### Authenticated Endpoints

#### Subscribe to Push Notifications

Register a new push subscription for the authenticated user.

```http
POST /api/push/subscribe
```

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BKd3dGJh...",
      "auth": "k8JV..."
    },
    "expirationTime": null
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**Response:**
```json
{
  "message": "Push subscription registered successfully",
  "subscription": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "enabled": true,
    "createdAt": "2024-08-22T10:30:00Z"
  }
}
```

**Status Codes:**
- `201 Created` - Subscription created successfully
- `400 Bad Request` - Invalid subscription data
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Server error

---

#### Unsubscribe from Push Notifications

Remove a push subscription.

```http
DELETE /api/push/unsubscribe
```

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:**
```json
{
  "message": "Push subscription removed successfully"
}
```

**Status Codes:**
- `200 OK` - Subscription removed successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Not authorized to unsubscribe this endpoint
- `404 Not Found` - Subscription not found
- `500 Internal Server Error` - Server error

---

#### Get User Subscriptions

Get all push subscriptions for the authenticated user.

```http
GET /api/push/subscriptions
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "enabled": true,
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-08-22T10:30:00Z",
      "lastSeenAt": "2024-08-22T15:45:00Z"
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Authentication required
- `500 Internal Server Error` - Server error

---

### Admin Endpoints

#### Send Event Notification

Send a manual notification for an event (admin/organizer only).

```http
POST /api/events/:eventId/notify
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "payload": {
    "title": "Event Update",
    "body": "The event time has been changed",
    "url": "/events/123",
    "icon": "/icons/event-update.png",
    "badge": "/icons/badge.png",
    "actions": [
      {
        "action": "view",
        "title": "View Event",
        "icon": "/icons/view.png"
      }
    ]
  },
  "options": {
    "notificationType": "event_update",
    "ttl": 86400,
    "urgency": "normal"
  },
  "targetUserIds": ["user-1", "user-2"]
}
```

**Response:**
```json
{
  "message": "Notification sent successfully",
  "sent": 15,
  "failed": 2,
  "invalidEndpoints": 1,
  "targetSubscriptions": 17
}
```

**Status Codes:**
- `200 OK` - Notification sent successfully
- `400 Bad Request` - Invalid notification data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Admin access required
- `404 Not Found` - Event not found
- `500 Internal Server Error` - Server error

---

#### Send Broadcast Notification

Send a broadcast notification to all users (admin only).

```http
POST /api/events/notify/broadcast
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "payload": {
    "title": "Important Update",
    "body": "New features are now available!",
    "url": "/updates",
    "icon": "/icons/broadcast.png",
    "badge": "/icons/badge.png"
  }
}
```

**Response:**
```json
{
  "message": "Broadcast notification sent successfully",
  "sent": 1250,
  "failed": 45,
  "invalidEndpoints": 23,
  "targetSubscriptions": 1295
}
```

**Status Codes:**
- `200 OK` - Broadcast sent successfully
- `400 Bad Request` - Invalid notification data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Admin access required
- `500 Internal Server Error` - Server error

---

### Health and Monitoring

#### Health Check

Check the health of the push notification system.

```http
GET /api/push/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-08-22T15:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "vapid": "healthy"
  },
  "metrics": {
    "activeSubscriptions": 1250,
    "queueSize": 5,
    "recentNotifications": 150
  }
}
```

**Status Codes:**
- `200 OK` - System healthy
- `503 Service Unavailable` - System unhealthy

---

### Development Endpoints

*Available only in development environment*

#### Development Dashboard

Access the development dashboard for testing push notifications.

```http
GET /api/push/dev/dashboard
```

**Response:** HTML dashboard interface

---

#### Get Test Templates

Get available test notification templates.

```http
GET /api/push/dev/templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "event_time_change",
      "name": "Event Time Change",
      "description": "Notification for when an event time is updated",
      "payload": {
        "type": "event_update",
        "eventId": "test-event-1",
        "title": "🕐 Event Time Changed",
        "body": "Summer Music Festival has been moved to 8:00 PM",
        "url": "/events/test-event-1"
      }
    }
  ],
  "count": 5
}
```

---

#### Send Test Notification

Send a test notification using a predefined template.

```http
POST /api/push/dev/test-notification
```

**Request Body:**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "templateId": "event_time_change",
  "customPayload": {
    "title": "Custom Test Title"
  }
}
```

**Response:**
```json
{
  "message": "Test notification sent",
  "result": {
    "sent": 2,
    "failed": 0,
    "subscriptions": 2,
    "errors": []
  }
}
```

---

## Data Models

### PushSubscription

```typescript
interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  enabled: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}
```

### NotificationPayload

```typescript
interface NotificationPayload {
  type: string;
  eventId: string;
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
  actions?: NotificationAction[];
  change?: ChangeDetails;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface ChangeDetails {
  field: string;
  oldValue: any;
  newValue: any;
}
```

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": [
    {
      "path": "field.name",
      "message": "Validation error message"
    }
  ]
}
```

### Common Error Codes

- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Request validation failed
- `SUBSCRIPTION_ERROR` - Push subscription operation failed
- `NOTIFICATION_ERROR` - Notification sending failed
- `VAPID_CONFIG_ERROR` - VAPID configuration issue
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded

## Client Integration

### JavaScript Example

```javascript
// Get VAPID public key
const response = await fetch('/api/push/public-key');
const { publicKey } = await response.json();

// Register service worker
const registration = await navigator.serviceWorker.register('/sw.js');

// Subscribe to push notifications
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(publicKey)
});

// Send subscription to server
await fetch('/api/push/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    subscription,
    userAgent: navigator.userAgent
  })
});
```

### Service Worker Example

```javascript
// Handle push events
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/default.png',
    badge: data.badge || '/icons/badge.png',
    actions: data.actions || [],
    data: {
      url: data.url,
      eventId: data.eventId
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

## Testing

### Using cURL

```bash
# Get VAPID public key
curl -X GET https://api.iwent.com/api/push/public-key

# Subscribe to notifications
curl -X POST https://api.iwent.com/api/push/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "BKd3dGJh...",
        "auth": "k8JV..."
      }
    }
  }'

# Send test notification (admin only)
curl -X POST https://api.iwent.com/api/events/123/notify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "title": "Test Notification",
      "body": "This is a test",
      "url": "/test"
    }
  }'
```

### Using the Development Dashboard

1. Start the server in development mode
2. Navigate to `/api/push/dev/dashboard`
3. Use the web interface to test notifications

## Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|---------|-------|
| Chrome | ✅ 50+ | ✅ 50+ | Full support |
| Firefox | ✅ 44+ | ✅ 44+ | Full support |
| Safari | ✅ 16+ | ✅ 16.4+ | PWA only on mobile |
| Edge | ✅ 17+ | ✅ 17+ | Full support |

## Security Considerations

1. **VAPID Keys**: Keep private keys secure and server-side only
2. **Authentication**: All subscription endpoints require user authentication
3. **Rate Limiting**: Implemented to prevent abuse
4. **CSRF Protection**: Applied to state-changing operations
5. **Payload Sanitization**: All notification content is sanitized
6. **Subscription Ownership**: Users can only manage their own subscriptions

## Performance

- **Concurrency**: Bulk notifications are sent with controlled concurrency (default: 10)
- **Queue Processing**: Background job processing with Redis
- **Automatic Cleanup**: Invalid subscriptions are automatically removed
- **Caching**: VAPID public key and user preferences are cached
- **Database Indexes**: Optimized queries with proper indexing