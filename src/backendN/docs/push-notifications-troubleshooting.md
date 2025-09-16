# Push Notifications Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered with the iWent Push Notifications system, including configuration problems, browser compatibility issues, and performance problems.

## Quick Diagnostics

### Health Check Commands

```bash
# Check system health
curl https://api.iwent.com/api/push/health

# Check specific components
curl https://api.iwent.com/api/push/health/database
curl https://api.iwent.com/api/push/health/redis
curl https://api.iwent.com/api/push/health/vapid

# Check development statistics
curl https://api.iwent.com/api/push/dev/stats
```

### Log Analysis

```bash
# Check application logs
tail -f logs/combined.log | grep -i push

# Check error logs
tail -f logs/error.log | grep -i notification

# Check worker logs
tail -f logs/worker-combined.log

# Check Redis queue status
redis-cli LLEN bull:notification-queue:waiting
redis-cli LLEN bull:notification-queue:failed
```

## Configuration Issues

### VAPID Key Problems

#### Problem: Missing VAPID Environment Variables

**Error Message:**
```
Error: Missing required VAPID environment variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
```

**Solution:**
```bash
# Generate new VAPID keys
npm install -g web-push
web-push generate-vapid-keys

# Set environment variables
export VAPID_PUBLIC_KEY="BKd3dGJhQWxhc2RmZ2hqa2w7YXNkZmdoamtsO2Fz..."
export VAPID_PRIVATE_KEY="your-private-key-here"
export VAPID_SUBJECT="mailto:admin@iwent.com"

# Or add to .env file
echo "VAPID_PUBLIC_KEY=BKd3dGJhQWxhc2RmZ2hqa2w7YXNkZmdoamtsO2Fz..." >> .env
echo "VAPID_PRIVATE_KEY=your-private-key-here" >> .env
echo "VAPID_SUBJECT=mailto:admin@iwent.com" >> .env
```

#### Problem: Invalid VAPID Keys

**Error Message:**
```
Error: Invalid VAPID key format
```

**Solution:**
```bash
# Verify key format
node -e "
const webpush = require('web-push');
try {
  webpush.setVapidDetails('mailto:test@example.com', 'PUBLIC_KEY', 'PRIVATE_KEY');
  console.log('VAPID keys are valid');
} catch (error) {
  console.error('Invalid VAPID keys:', error.message);
}
"

# Generate new keys if invalid
web-push generate-vapid-keys
```

#### Problem: VAPID Subject Format

**Error Message:**
```
Error: VAPID subject must be a URL or mailto: address
```

**Solution:**
```bash
# Correct format examples
export VAPID_SUBJECT="mailto:admin@iwent.com"
# OR
export VAPID_SUBJECT="https://iwent.com"

# Incorrect formats (will fail)
export VAPID_SUBJECT="admin@iwent.com"  # Missing mailto:
export VAPID_SUBJECT="iwent.com"        # Missing https://
```

### Database Connection Issues

#### Problem: Database Connection Failed

**Error Message:**
```
Error: Can't reach database server at localhost:5432
```

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
# OR
brew services list | grep postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql
# OR
brew services start postgresql

# Test connection
psql -h localhost -U postgres -d iwent -c "SELECT 1;"

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database
```

#### Problem: Migration Issues

**Error Message:**
```
Error: Table "PushSubscription" doesn't exist
```

**Solution:**
```bash
# Run pending migrations
npx prisma migrate deploy

# Reset database if needed (CAUTION: This will delete all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Verify tables exist
psql -d iwent -c "\dt"
```

### Redis Connection Issues

#### Problem: Redis Connection Failed

**Error Message:**
```
Error: Redis connection to localhost:6379 failed - connect ECONNREFUSED
```

**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
sudo systemctl start redis
# OR
brew services start redis
# OR
redis-server

# Check Redis configuration
redis-cli CONFIG GET "*"

# Test connection with custom URL
redis-cli -u redis://localhost:6379 ping
```

#### Problem: Redis Authentication

**Error Message:**
```
Error: NOAUTH Authentication required
```

**Solution:**
```bash
# Check Redis password configuration
redis-cli CONFIG GET requirepass

# Connect with password
redis-cli -a your-password ping

# Update REDIS_URL with password
export REDIS_URL="redis://:password@localhost:6379"
```

## Browser Compatibility Issues

### Chrome/Chromium Issues

#### Problem: Service Worker Registration Failed

**Error Message:**
```
DOMException: Failed to register a ServiceWorker
```

**Solution:**
```javascript
// Check HTTPS requirement
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  console.error('Push notifications require HTTPS');
}

// Check service worker support
if (!('serviceWorker' in navigator)) {
  console.error('Service workers not supported');
}

// Register with error handling
navigator.serviceWorker.register('/sw.js')
  .then(registration => {
    console.log('SW registered:', registration);
  })
  .catch(error => {
    console.error('SW registration failed:', error);
    // Check if sw.js file exists and is accessible
  });
```

#### Problem: Push Subscription Failed

**Error Message:**
```
DOMException: Registration failed - push service error
```

**Solution:**
```javascript
// Check push manager support
if (!('PushManager' in window)) {
  console.error('Push messaging not supported');
}

// Check notification permission
if (Notification.permission === 'denied') {
  console.error('Notification permission denied');
  // Guide user to enable notifications in browser settings
}

// Subscribe with error handling
registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
}).catch(error => {
  console.error('Push subscription failed:', error);
  
  if (error.name === 'NotSupportedError') {
    console.error('Push messaging is not supported');
  } else if (error.name === 'NotAllowedError') {
    console.error('Permission not granted for push notifications');
  }
});
```

### Firefox Issues

#### Problem: Push Notifications Not Working

**Solution:**
```javascript
// Check Firefox-specific requirements
console.log('Firefox version:', navigator.userAgent);

// Firefox requires different VAPID key format
const vapidKey = urlBase64ToUint8Array(vapidPublicKey);

// Ensure proper service worker scope
navigator.serviceWorker.register('/sw.js', { scope: '/' });
```

### Safari Issues

#### Problem: Push Notifications Not Supported

**Error Message:**
```
Push notifications are not supported in Safari
```

**Solution:**
```javascript
// Safari push notifications only work in PWA mode (iOS 16.4+)
if ('safari' in window && 'pushNotification' in window.safari) {
  // Safari desktop push (different API)
  console.log('Safari desktop push supported');
} else if (window.navigator.standalone) {
  // iOS PWA mode
  console.log('iOS PWA mode - push notifications may be supported');
} else {
  console.log('Safari push notifications require PWA installation');
  // Guide user to install PWA
}

// Check iOS version
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const iOSVersion = iOS && navigator.userAgent.match(/OS (\d+)_(\d+)/);
if (iOSVersion && parseInt(iOSVersion[1]) < 16) {
  console.log('iOS version too old for push notifications');
}
```

## Push Service Errors

### FCM (Firebase Cloud Messaging) Errors

#### Problem: 404 - Subscription Not Found

**Error Message:**
```
Push notification failed: 404 - Subscription not found
```

**Solution:**
```bash
# This indicates the subscription is no longer valid
# The system should automatically clean up invalid subscriptions

# Manual cleanup
npm run push-cli cleanup

# Check cleanup logs
tail -f logs/combined.log | grep -i cleanup

# Verify subscription was removed
psql -d iwent -c "SELECT COUNT(*) FROM \"PushSubscription\" WHERE enabled = false;"
```

#### Problem: 410 - Subscription Expired

**Error Message:**
```
Push notification failed: 410 - Subscription expired
```

**Solution:**
```javascript
// Client-side: Re-subscribe when subscription expires
registration.pushManager.getSubscription().then(subscription => {
  if (!subscription) {
    // Subscription expired, re-subscribe
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey
    });
  }
}).then(newSubscription => {
  if (newSubscription) {
    // Send new subscription to server
    updateSubscription(newSubscription);
  }
});
```

#### Problem: 413 - Payload Too Large

**Error Message:**
```
Push notification failed: 413 - Payload too large
```

**Solution:**
```javascript
// Server-side: Trim payload automatically
const trimmedPayload = webPushService.trimPayload(originalPayload);

// Check payload size before sending
const payloadSize = JSON.stringify(payload).length;
if (payloadSize > 4000) {
  console.warn('Payload size exceeds recommended limit:', payloadSize);
}

// Reduce payload size
const minimalPayload = {
  type: payload.type,
  eventId: payload.eventId,
  title: payload.title.substring(0, 50),
  body: payload.body.substring(0, 100),
  url: payload.url
  // Remove optional fields like icon, badge, actions
};
```

#### Problem: 429 - Rate Limited

**Error Message:**
```
Push notification failed: 429 - Too many requests
```

**Solution:**
```javascript
// Implement exponential backoff
async function sendWithRetry(subscription, payload, retries = 3) {
  try {
    await webPushService.sendNotification(subscription, payload);
  } catch (error) {
    if (error.statusCode === 429 && retries > 0) {
      const delay = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
      console.log(`Rate limited, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendWithRetry(subscription, payload, retries - 1);
    }
    throw error;
  }
}
```

## Performance Issues

### High Memory Usage

#### Problem: Worker Memory Leak

**Symptoms:**
- Worker process memory continuously increasing
- Out of memory errors
- Slow notification processing

**Solution:**
```bash
# Monitor memory usage
ps aux | grep notification-worker
top -p $(pgrep -f notification-worker)

# Check for memory leaks in code
node --inspect src/workers/notification-worker.ts

# Restart worker periodically
# Add to crontab:
0 */6 * * * pm2 restart notification-worker
```

```javascript
// Fix potential memory leaks
class NotificationWorker {
  async processJob(job) {
    try {
      // Process job
      await this.sendNotifications(job.data);
    } finally {
      // Clean up resources
      job.data = null;
      // Force garbage collection in development
      if (global.gc) global.gc();
    }
  }
}
```

### Slow Notification Processing

#### Problem: Queue Backlog

**Symptoms:**
- Notifications delayed
- Large queue size
- High processing times

**Solution:**
```bash
# Check queue status
redis-cli LLEN bull:notification-queue:waiting
redis-cli LLEN bull:notification-queue:active

# Increase worker concurrency
export PUSH_CONCURRENCY_LIMIT=20

# Add more worker instances
pm2 scale notification-worker +2

# Monitor processing times
redis-cli --latency-history -i 1
```

```javascript
// Optimize bulk sending
const limit = pLimit(20); // Increase concurrency
const sendPromises = subscriptions.map(subscription =>
  limit(() => this.sendNotification(subscription, payload))
);
```

### Database Performance Issues

#### Problem: Slow Subscription Queries

**Solution:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PushSubscription_userId_enabled_idx" 
ON "PushSubscription"("userId", "enabled");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "PushSubscription_lastSeenAt_idx" 
ON "PushSubscription"("lastSeenAt");

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "PushSubscription" 
WHERE "userId" = 'user-id' AND "enabled" = true;

-- Update table statistics
ANALYZE "PushSubscription";
```

```javascript
// Optimize subscription queries
// Use pagination for large result sets
const subscriptions = await prisma.pushSubscription.findMany({
  where: { userId, enabled: true },
  take: 100,
  skip: offset
});

// Use select to limit returned fields
const subscriptions = await prisma.pushSubscription.findMany({
  where: { userId, enabled: true },
  select: {
    id: true,
    endpoint: true,
    p256dh: true,
    auth: true
  }
});
```

## Development and Testing Issues

### Development Dashboard Not Loading

#### Problem: Dashboard Returns 404

**Solution:**
```bash
# Check if development routes are enabled
echo $NODE_ENV
# Should be 'development' or 'test'

# Verify route registration
curl http://localhost:3000/api/push/dev/dashboard

# Check server logs
tail -f logs/combined.log | grep -i dev
```

### CLI Tool Issues

#### Problem: CLI Commands Not Working

**Error Message:**
```
Command not found: push-cli
```

**Solution:**
```bash
# Check package.json scripts
cat package.json | grep push-cli

# Run directly with npx
npx tsx src/lib/push/subscription-manager.cli.ts help

# Or use npm run
npm run push-cli help

# Check file permissions
ls -la src/lib/push/subscription-manager.cli.ts
chmod +x src/lib/push/subscription-manager.cli.ts
```

### Test Failures

#### Problem: Tests Failing Due to Missing Environment Variables

**Solution:**
```bash
# Create test environment file
cp .env.example .env.test

# Set test-specific variables
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/iwent_test"
export VAPID_PUBLIC_KEY="test-public-key"
export VAPID_PRIVATE_KEY="test-private-key"
export VAPID_SUBJECT="mailto:test@example.com"

# Run tests with environment
npm test
```

## Monitoring and Alerting

### Setting Up Alerts

#### High Error Rate Alert

```bash
# Create monitoring script
#!/bin/bash
# check-push-errors.sh

ERROR_RATE=$(redis-cli LLEN bull:notification-queue:failed)
TOTAL_JOBS=$(redis-cli LLEN bull:notification-queue:completed)

if [ $TOTAL_JOBS -gt 0 ]; then
  ERROR_PERCENTAGE=$(echo "scale=2; $ERROR_RATE * 100 / $TOTAL_JOBS" | bc)
  
  if (( $(echo "$ERROR_PERCENTAGE > 10" | bc -l) )); then
    echo "ALERT: Push notification error rate is ${ERROR_PERCENTAGE}%"
    # Send alert (email, Slack, etc.)
  fi
fi
```

#### Queue Backlog Alert

```bash
# Monitor queue size
QUEUE_SIZE=$(redis-cli LLEN bull:notification-queue:waiting)

if [ $QUEUE_SIZE -gt 1000 ]; then
  echo "ALERT: Push notification queue backlog: $QUEUE_SIZE jobs"
  # Scale up workers
  pm2 scale notification-worker +1
fi
```

### Log Analysis Scripts

```bash
# Analyze error patterns
grep -E "Push notification failed|statusCode" logs/error.log | \
  awk '{print $NF}' | sort | uniq -c | sort -nr

# Monitor notification success rate
grep -c "Notification sent successfully" logs/combined.log
grep -c "Notification failed" logs/error.log

# Check average processing time
grep "Processing time" logs/combined.log | \
  awk '{sum+=$NF; count++} END {print "Average:", sum/count, "ms"}'
```

## Emergency Procedures

### System Down Recovery

1. **Check System Health**
   ```bash
   curl https://api.iwent.com/api/push/health
   ```

2. **Restart Services**
   ```bash
   pm2 restart all
   sudo systemctl restart postgresql
   sudo systemctl restart redis
   ```

3. **Clear Failed Jobs**
   ```bash
   redis-cli DEL bull:notification-queue:failed
   ```

4. **Verify Recovery**
   ```bash
   npm run push-cli stats
   curl https://api.iwent.com/api/push/health
   ```

### Data Recovery

#### Restore Invalid Subscriptions

```sql
-- Re-enable accidentally disabled subscriptions
UPDATE "PushSubscription" 
SET enabled = true, "lastSeenAt" = NOW()
WHERE enabled = false 
  AND "createdAt" > NOW() - INTERVAL '1 day';
```

#### Recover Failed Notifications

```bash
# Retry failed jobs
redis-cli LRANGE bull:notification-queue:failed 0 -1 | \
while read job; do
  redis-cli LPUSH bull:notification-queue:waiting "$job"
done

# Clear failed queue after retry
redis-cli DEL bull:notification-queue:failed
```

## Getting Help

### Log Collection for Support

```bash
# Collect system information
echo "=== System Info ===" > debug-info.txt
uname -a >> debug-info.txt
node --version >> debug-info.txt
npm --version >> debug-info.txt

echo "=== Environment ===" >> debug-info.txt
env | grep -E "(NODE_ENV|DATABASE_URL|REDIS_URL|VAPID)" >> debug-info.txt

echo "=== Service Status ===" >> debug-info.txt
pm2 status >> debug-info.txt

echo "=== Recent Logs ===" >> debug-info.txt
tail -100 logs/error.log >> debug-info.txt

echo "=== Queue Status ===" >> debug-info.txt
redis-cli INFO >> debug-info.txt
```

### Common Support Questions

1. **What browser versions are supported?**
   - Chrome 50+, Firefox 44+, Safari 16+, Edge 17+

2. **Why aren't notifications working on iOS?**
   - iOS requires PWA installation (iOS 16.4+)
   - Check if app is installed to home screen

3. **How to increase notification throughput?**
   - Increase `PUSH_CONCURRENCY_LIMIT`
   - Add more worker instances
   - Optimize database queries

4. **How to handle VAPID key rotation?**
   - Generate new keys with `web-push generate-vapid-keys`
   - Update environment variables
   - Restart application
   - Users will need to re-subscribe

5. **What's the maximum payload size?**
   - Recommended: 4KB
   - System automatically trims oversized payloads