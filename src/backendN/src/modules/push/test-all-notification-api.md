# Test Notification to All Subscribers API

## Overview
The Test Notification to All Subscribers endpoint allows administrators to send test push notifications to all active subscribers in the system. This is useful for testing the notification infrastructure and ensuring the push notification system is working correctly.

## Endpoint

```
POST /api/push/test-all
```

## Authentication & Authorization
- **Authentication**: Required (JWT token)
- **Authorization**: Admin users only (`userType: 'ADMIN'`)

## Request Headers
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

## Request Body (Optional)
All fields are optional. If not provided, default values will be used.

```typescript
{
  title?: string;        // Custom notification title (max 100 chars, no HTML)
  body?: string;         // Custom notification message (max 200 chars, no HTML) 
  url?: string;          // Custom URL to navigate to (relative or from allowed origins)
  icon?: string;         // Custom notification icon URL (valid HTTP/HTTPS)
  badge?: string;        // Custom notification badge URL (valid HTTP/HTTPS)
}
```

### Example Request
```json
{
  "title": "System Test Alert",
  "body": "Testing push notification system - all good!",
  "url": "/dashboard",
  "icon": "https://example.com/custom-icon.png",
  "badge": "https://example.com/custom-badge.png"
}
```

### Default Values (when not provided)
```json
{
  "title": "Test Notification to All Users 🔔",
  "body": "This is a test push notification sent to all active subscribers!",
  "url": "/",
  "icon": "/favicon-16x16.png",
  "badge": "/favicon-16x16.png"
}
```

## Response

### Success Response (200 OK)
```json
{
  "message": "Test notification sent to all active subscribers",
  "totalSubscribers": 150,
  "sent": 145,
  "failed": 5,
  "invalidEndpoints": 3,
  "deliveryRate": "96.67%",
  "payload": {
    "title": "System Test Alert",
    "body": "Testing push notification system - all good!",
    "url": "/dashboard"
  }
}
```

### Error Responses

#### 401 - Unauthorized
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

#### 403 - Forbidden (Non-admin user)
```json
{
  "error": "Admin access required",
  "code": "FORBIDDEN"
}
```

#### 404 - No Active Subscriptions
```json
{
  "error": "No active push subscriptions found",
  "code": "NO_SUBSCRIPTIONS",
  "message": "No users have enabled push notifications"
}
```

#### 400 - Validation Error
```json
{
  "error": "Invalid request data",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": "title",
      "message": "Title too long"
    }
  ]
}
```

#### 500 - Server Error
```json
{
  "error": "Failed to send test notification to all subscribers",
  "code": "BROADCAST_TEST_ERROR"
}
```

## Behavior Details

### Subscription Filtering
- Only sends to **active subscriptions** (`enabled: true`)
- Automatically cleans up invalid endpoints that return 404/410 errors
- Handles partial failures gracefully

### Notification Options
- **TTL (Time To Live)**: 24 hours (86400 seconds)
- **Urgency**: Normal priority
- **Topic**: `admin_test_broadcast` (for grouping/replacing notifications)

### Actions Included
Each notification includes a default action:
```json
{
  "actions": [
    {
      "action": "view",
      "title": "Open App",
      "icon": "/icons/view-icon.png"
    }
  ]
}
```

### Security Features
- Input validation with Zod schemas
- XSS prevention (no HTML tags allowed in text fields)
- URL validation (only relative URLs or from allowed origins)
- Rate limiting (via middleware)
- CSRF protection

### Logging & Monitoring
- Logs admin user ID who sent the notification
- Logs total subscribers, success/failure counts
- Tracks invalid endpoints for cleanup
- Provides delivery rate statistics

## Usage Examples

### cURL Example
```bash
curl -X POST "https://api.yourapp.com/api/push/test-all" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Weekly System Test",
    "body": "All systems operational - weekly notification test",
    "url": "/system-status"
  }'
```

### JavaScript/Fetch Example
```javascript
const response = await fetch('/api/push/test-all', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    title: "Emergency Alert Test",
    body: "This is a test of the emergency notification system",
    url: "/emergency"
  })
});

const result = await response.json();
console.log(`Sent to ${result.sent}/${result.totalSubscribers} subscribers`);
```

## Testing
Run the test suite:
```bash
npm test -- test-all-notification.test.ts
```

## Related Endpoints
- `POST /api/push/test` - Send test notification to authenticated user only
- `POST /api/events/:eventId/notify` - Send notification to event ticket holders
- `POST /api/events/notify/broadcast` - Send broadcast to all users (general purpose)

## Notes
- This endpoint is designed specifically for testing the notification infrastructure
- For production broadcasts, use the `/api/events/notify/broadcast` endpoint instead
- Invalid subscriptions are automatically cleaned up to maintain system health
- Delivery rates are calculated and returned for monitoring purposes