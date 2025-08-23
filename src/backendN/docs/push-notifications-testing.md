# Push Notifications Testing Guide

## Overview

This guide covers comprehensive testing procedures for the iWent Push Notifications system, including unit tests, integration tests, browser compatibility testing, and manual testing procedures.

## Testing Environment Setup

### Prerequisites

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/ui supertest @types/supertest

# Set up test environment variables
cp .env.example .env.test
```

### Test Environment Variables

```bash
# .env.test
NODE_ENV=test
DATABASE_URL="postgresql://test:test@localhost:5432/iwent_test"
REDIS_URL="redis://localhost:6379/1"
VAPID_PUBLIC_KEY="BKd3dGJhQWxhc2RmZ2hqa2w7YXNkZmdoamtsO2Fz..."
VAPID_PRIVATE_KEY="test-private-key"
VAPID_SUBJECT="mailto:test@iwent.com"
JWT_SECRET="test-jwt-secret"
```

### Test Database Setup

```bash
# Create test database
createdb iwent_test

# Run migrations
DATABASE_URL="postgresql://test:test@localhost:5432/iwent_test" npx prisma migrate deploy

# Seed test data
DATABASE_URL="postgresql://test:test@localhost:5432/iwent_test" npx prisma db seed
```

## Unit Testing

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- push-subscription.service.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

Tests are organized by component:

```
src/
├── lib/push/
│   ├── push-subscription.service.test.ts
│   ├── web-push.service.test.ts
│   ├── notification-logger.service.test.ts
│   ├── error-tracking.service.test.ts
│   ├── metrics-collector.service.test.ts
│   └── dev-tools.service.test.ts
├── modules/push/
│   ├── push.controller.test.ts
│   ├── dev.controller.test.ts
│   └── health.controller.test.ts
└── lib/queue/
    ├── notification.service.test.ts
    └── notification.worker.test.ts
```

### Key Test Cases

#### Push Subscription Service Tests

```typescript
describe('PushSubscriptionService', () => {
  it('should create new subscription', async () => {
    const subscription = await service.createSubscription({
      userId: 'user-123',
      subscription: mockSubscriptionData,
      userAgent: 'Test Browser'
    });
    
    expect(subscription.userId).toBe('user-123');
    expect(subscription.enabled).toBe(true);
  });

  it('should update existing subscription', async () => {
    // Test subscription update logic
  });

  it('should cleanup invalid subscriptions', async () => {
    // Test cleanup functionality
  });
});
```

#### Web Push Service Tests

```typescript
describe('WebPushService', () => {
  it('should send notification successfully', async () => {
    const mockSubscription = createMockSubscription();
    const mockPayload = createMockPayload();
    
    await expect(
      service.sendNotification(mockSubscription, mockPayload)
    ).resolves.not.toThrow();
  });

  it('should handle 404 errors gracefully', async () => {
    // Mock 404 response from push service
    mockWebPush.sendNotification.mockRejectedValue({
      statusCode: 404,
      message: 'Subscription not found'
    });

    await expect(
      service.sendNotification(mockSubscription, mockPayload)
    ).rejects.toThrow('Push subscription no longer valid: 404');
  });
});
```

## Integration Testing

### API Integration Tests

```bash
# Run integration tests
npm test -- --run integration

# Run specific integration test
npm test -- push-api.e2e.test.ts
```

### Test Examples

#### Subscription Flow Integration Test

```typescript
describe('Push Subscription Integration', () => {
  it('should complete full subscription flow', async () => {
    // 1. Get VAPID public key
    const keyResponse = await request(app)
      .get('/api/push/public-key')
      .expect(200);

    expect(keyResponse.body.publicKey).toBeDefined();

    // 2. Subscribe with valid data
    const subscribeResponse = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        subscription: mockSubscriptionData,
        userAgent: 'Test Browser'
      })
      .expect(201);

    expect(subscribeResponse.body.subscription.id).toBeDefined();

    // 3. Verify subscription exists
    const listResponse = await request(app)
      .get('/api/push/subscriptions')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(listResponse.body.subscriptions).toHaveLength(1);

    // 4. Unsubscribe
    await request(app)
      .delete('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ endpoint: mockSubscriptionData.endpoint })
      .expect(200);
  });
});
```

#### Notification Flow Integration Test

```typescript
describe('Notification Flow Integration', () => {
  it('should send notification to event ticket holders', async () => {
    // Setup: Create event and tickets
    const event = await createTestEvent();
    const user = await createTestUser();
    const ticket = await createTestTicket(event.id, user.id);
    const subscription = await createTestSubscription(user.id);

    // Send notification
    const response = await request(app)
      .post(`/api/events/${event.id}/notify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        payload: {
          title: 'Event Update',
          body: 'Test notification',
          url: `/events/${event.id}`
        }
      })
      .expect(200);

    expect(response.body.sent).toBe(1);
    expect(response.body.failed).toBe(0);

    // Verify notification was logged
    const logs = await prisma.notificationLog.findMany({
      where: { eventId: event.id }
    });
    expect(logs).toHaveLength(1);
  });
});
```

## Browser Compatibility Testing

### Supported Browsers

| Browser | Version | Desktop | Mobile | Notes |
|---------|---------|---------|---------|-------|
| Chrome | 50+ | ✅ | ✅ | Full support |
| Firefox | 44+ | ✅ | ✅ | Full support |
| Safari | 16+ | ✅ | 16.4+ | PWA only on mobile |
| Edge | 17+ | ✅ | ✅ | Full support |

### Manual Browser Testing

#### Chrome/Edge Testing

```javascript
// Test in browser console
// 1. Check push notification support
console.log('Push supported:', 'serviceWorker' in navigator && 'PushManager' in window);

// 2. Register service worker
navigator.serviceWorker.register('/sw.js')
  .then(registration => console.log('SW registered:', registration))
  .catch(error => console.error('SW registration failed:', error));

// 3. Request permission
Notification.requestPermission()
  .then(permission => console.log('Permission:', permission));

// 4. Subscribe to push notifications
navigator.serviceWorker.ready.then(registration => {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
  });
}).then(subscription => {
  console.log('Subscription:', subscription);
});
```

#### Firefox Testing

```javascript
// Firefox-specific testing
// Check for Firefox-specific features
console.log('Firefox push support:', 'mozNotification' in window);

// Test notification display
new Notification('Test Notification', {
  body: 'Testing Firefox notifications',
  icon: '/icons/test.png'
});
```

#### Safari Testing (iOS 16.4+)

```javascript
// Safari PWA testing
// Must be installed as PWA on home screen
console.log('Safari push support:', 'safari' in window && 'pushNotification' in window.safari);

// Check PWA installation
console.log('Standalone mode:', window.navigator.standalone);
```

### Automated Browser Testing

Using Playwright for cross-browser testing:

```typescript
// tests/browser/push-notifications.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Push Notifications', () => {
  test('should request permission in Chrome', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);
    
    await page.goto('/');
    
    // Click notification permission button
    await page.click('[data-testid="enable-notifications"]');
    
    // Verify permission granted
    const permission = await page.evaluate(() => Notification.permission);
    expect(permission).toBe('granted');
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration
    await page.waitForFunction(() => 
      navigator.serviceWorker.controller !== null
    );
    
    const swRegistered = await page.evaluate(() => 
      navigator.serviceWorker.controller !== null
    );
    expect(swRegistered).toBe(true);
  });
});
```

## Performance Testing

### Load Testing

Using Artillery for load testing:

```yaml
# artillery-config.yml
config:
  target: 'https://api.iwent.com'
  phases:
    - duration: 60
      arrivalRate: 10
  headers:
    Authorization: 'Bearer {{ $randomString() }}'

scenarios:
  - name: 'Subscribe to notifications'
    flow:
      - get:
          url: '/api/push/public-key'
      - post:
          url: '/api/push/subscribe'
          json:
            subscription:
              endpoint: 'https://fcm.googleapis.com/fcm/send/{{ $randomString() }}'
              keys:
                p256dh: '{{ $randomString() }}'
                auth: '{{ $randomString() }}'
```

```bash
# Run load test
artillery run artillery-config.yml
```

### Bulk Notification Testing

```typescript
describe('Bulk Notification Performance', () => {
  it('should handle 1000 notifications efficiently', async () => {
    const subscriptions = await createTestSubscriptions(1000);
    const payload = createTestPayload();
    
    const startTime = Date.now();
    
    const result = await webPushService.sendBulkNotifications(
      subscriptions,
      payload
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(result.sent + result.failed).toBe(1000);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });
});
```

## Manual Testing Procedures

### 1. Development Dashboard Testing

```bash
# Start development server
npm run dev

# Open dashboard
open http://localhost:3000/api/push/dev/dashboard
```

**Test Steps:**
1. ✅ Dashboard loads without errors
2. ✅ Statistics display correctly
3. ✅ Test templates are available
4. ✅ Send test notification works
5. ✅ Mock configuration works
6. ✅ Payload debugging works

### 2. CLI Tool Testing

```bash
# Test CLI commands
npm run push-cli help
npm run push-cli templates
npm run push-cli stats
npm run push-cli mock --help
```

**Test Steps:**
1. ✅ Help command shows usage
2. ✅ Templates command lists templates
3. ✅ Stats command shows statistics
4. ✅ Mock command configures mock mode

### 3. End-to-End User Flow Testing

**Prerequisites:**
- Running application with HTTPS
- Valid VAPID keys configured
- Test user account

**Test Steps:**

1. **Permission Request**
   ```javascript
   // In browser console
   Notification.requestPermission().then(console.log);
   ```
   ✅ Permission dialog appears
   ✅ Permission is granted/denied correctly

2. **Service Worker Registration**
   ```javascript
   navigator.serviceWorker.register('/sw.js').then(console.log);
   ```
   ✅ Service worker registers successfully
   ✅ No console errors

3. **Push Subscription**
   ```javascript
   // Use app's subscription flow
   // Or test via API
   fetch('/api/push/subscribe', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       subscription: subscriptionObject
     })
   });
   ```
   ✅ Subscription created successfully
   ✅ Subscription appears in user's list

4. **Notification Sending**
   ```bash
   # Using CLI
   npm run push-cli send --user-id USER_ID --template event_time_change
   
   # Or using API
   curl -X POST /api/events/EVENT_ID/notify \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -d '{"payload": {"title": "Test", "body": "Test message"}}'
   ```
   ✅ Notification appears on device
   ✅ Notification has correct content
   ✅ Clicking notification opens correct URL

5. **Unsubscription**
   ```javascript
   fetch('/api/push/unsubscribe', {
     method: 'DELETE',
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       endpoint: 'SUBSCRIPTION_ENDPOINT'
     })
   });
   ```
   ✅ Subscription removed successfully
   ✅ No more notifications received

### 4. Error Handling Testing

**Test Invalid Subscriptions:**
```bash
# Send notification to invalid endpoint
npm run push-cli send --user-id INVALID_USER --template event_time_change
```
✅ Error handled gracefully
✅ Invalid subscription cleaned up

**Test Rate Limiting:**
```bash
# Send multiple requests quickly
for i in {1..20}; do
  curl -X POST /api/push/subscribe -H "Authorization: Bearer TOKEN" &
done
```
✅ Rate limiting activated
✅ Appropriate error responses

**Test VAPID Key Issues:**
```bash
# Test with invalid VAPID keys
VAPID_PRIVATE_KEY=invalid npm run dev
```
✅ Clear error message displayed
✅ Application doesn't crash

## Test Data Management

### Creating Test Data

```typescript
// test-helpers.ts
export async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      ...overrides
    }
  });
}

export async function createTestSubscription(userId: string) {
  return await prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      p256dh: 'test-p256dh',
      auth: 'test-auth',
      enabled: true
    }
  });
}

export async function createTestEvent(overrides = {}) {
  return await prisma.event.create({
    data: {
      name: 'Test Event',
      startDate: new Date(),
      venue: 'Test Venue',
      ...overrides
    }
  });
}
```

### Cleaning Test Data

```typescript
// test-cleanup.ts
export async function cleanupTestData() {
  await prisma.pushError.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Push Notifications

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: iwent_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/iwent_test
      
      - name: Run unit tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/iwent_test
          REDIS_URL: redis://localhost:6379
          VAPID_PUBLIC_KEY: ${{ secrets.TEST_VAPID_PUBLIC_KEY }}
          VAPID_PRIVATE_KEY: ${{ secrets.TEST_VAPID_PRIVATE_KEY }}
          VAPID_SUBJECT: mailto:test@iwent.com
      
      - name: Run integration tests
        run: npm test -- --run integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/iwent_test
          REDIS_URL: redis://localhost:6379
          VAPID_PUBLIC_KEY: ${{ secrets.TEST_VAPID_PUBLIC_KEY }}
          VAPID_PRIVATE_KEY: ${{ secrets.TEST_VAPID_PRIVATE_KEY }}
          VAPID_SUBJECT: mailto:test@iwent.com
```

## Test Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% endpoint coverage
- **E2E Tests**: 100% critical user flows

### Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# View coverage in browser
npm test -- --coverage --reporter=html
open coverage/index.html
```

## Troubleshooting Test Issues

### Common Test Failures

1. **VAPID Configuration Errors**
   ```bash
   # Solution: Set test VAPID keys
   export VAPID_PUBLIC_KEY="test-public-key"
   export VAPID_PRIVATE_KEY="test-private-key"
   ```

2. **Database Connection Issues**
   ```bash
   # Solution: Ensure test database is running
   createdb iwent_test
   DATABASE_URL="postgresql://test:test@localhost:5432/iwent_test" npx prisma migrate deploy
   ```

3. **Redis Connection Issues**
   ```bash
   # Solution: Start Redis on different port for tests
   redis-server --port 6380 --daemonize yes
   export REDIS_URL="redis://localhost:6380"
   ```

4. **Service Worker Registration Failures**
   ```javascript
   // Solution: Mock service worker in tests
   Object.defineProperty(navigator, 'serviceWorker', {
     value: {
       register: jest.fn(() => Promise.resolve()),
       ready: Promise.resolve()
     }
   });
   ```

### Test Debugging

```bash
# Run tests in debug mode
npm test -- --inspect-brk

# Run specific test with verbose output
npm test -- --verbose push-subscription.service.test.ts

# Run tests with custom timeout
npm test -- --testTimeout=30000
```