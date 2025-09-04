# iWent Push Notifications System

## Overview

The iWent Push Notifications system provides comprehensive Web Push notification capabilities for the iWent PWA platform. It enables real-time notifications for event updates, new events, and other important communications to users across all their devices.

## Features

- ✅ **Web Push Notifications**: VAPID-compliant push notifications
- ✅ **Multi-Device Support**: Send to all user devices simultaneously
- ✅ **Event-Driven Notifications**: Automatic notifications for event changes
- ✅ **Scalable Architecture**: Redis-based job queuing with background workers
- ✅ **Error Handling**: Automatic cleanup of invalid subscriptions
- ✅ **Rate Limiting**: Protection against abuse and spam
- ✅ **Development Tools**: CLI tools and web dashboard for testing
- ✅ **Comprehensive Monitoring**: Health checks, metrics, and logging
- ✅ **Cross-Browser Support**: Chrome, Firefox, Safari, Edge compatibility

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- HTTPS-enabled domain (required for push notifications)

### Installation

1. **Install Dependencies**
   ```bash
   npm install web-push bullmq ioredis p-limit zod
   ```

2. **Generate VAPID Keys**
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```

3. **Configure Environment**
   ```bash
   # Add to .env
   VAPID_PUBLIC_KEY="your-public-key"
   VAPID_PRIVATE_KEY="your-private-key"
   VAPID_SUBJECT="mailto:admin@iwent.com"
   REDIS_URL="redis://localhost:6379"
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma migrate deploy
   ```

5. **Start Services**
   ```bash
   # Start main application
   npm start
   
   # Start notification worker
   npm run worker
   ```

### Basic Usage

#### Client-Side Integration

```javascript
// Register service worker
const registration = await navigator.serviceWorker.register('/sw.js');

// Get VAPID public key
const response = await fetch('/api/push/public-key');
const { publicKey } = await response.json();

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
  body: JSON.stringify({ subscription })
});
```

#### Server-Side Usage

```javascript
// Send notification to event ticket holders
await fetch(`/api/events/${eventId}/notify`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    payload: {
      title: 'Event Update',
      body: 'The event time has been changed',
      url: `/events/${eventId}`,
      actions: [
        { action: 'view', title: 'View Event' }
      ]
    }
  })
});
```

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client PWA    │    │   Express API   │    │ Background Jobs │
│                 │    │                 │    │                 │
│ • Service Worker│◄──►│ • Push Routes   │◄──►│ • Redis Queue   │
│ • Subscription  │    │ • Controllers   │    │ • Workers       │
│ • Notifications │    │ • Middleware    │    │ • Concurrency   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │  Push Services  │
                       │                 │    │                 │
                       │ • Subscriptions │    │ • FCM           │
                       │ • Logs          │    │ • Mozilla       │
                       │ • Errors        │    │ • Apple         │
                       └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Subscription**: User grants permission → PWA subscribes → Server stores subscription
2. **Event Trigger**: Event changes → Job queued → Worker processes → Notifications sent
3. **Delivery**: Push service delivers → Service worker receives → Notification displayed

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/push/public-key` | Get VAPID public key |

### Authenticated Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/subscribe` | Subscribe to notifications |
| DELETE | `/api/push/unsubscribe` | Unsubscribe from notifications |
| GET | `/api/push/subscriptions` | Get user subscriptions |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events/:id/notify` | Send event notification |
| POST | `/api/events/notify/broadcast` | Send broadcast notification |

### Development Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/push/dev/dashboard` | Development dashboard |
| GET | `/api/push/dev/templates` | Test templates |
| POST | `/api/push/dev/test-notification` | Send test notification |

## Development Tools

### Web Dashboard

Access the development dashboard at `/api/push/dev/dashboard` (development mode only):

- Send test notifications
- Test user subscriptions
- Configure mock push service
- Debug notification payloads
- View system statistics

### CLI Tool

```bash
# Show help
npm run push-cli help

# List subscriptions
npm run push-cli list --user-id USER_ID

# Send test notification
npm run push-cli send --user-id USER_ID --template event_time_change

# Test subscriptions
npm run push-cli test --user-id USER_ID --mock

# Show statistics
npm run push-cli stats --verbose

# Clean up invalid subscriptions
npm run push-cli cleanup
```

### Available Test Templates

- `event_time_change` - Event time update notification
- `new_event` - New event available notification
- `event_cancelled` - Event cancellation notification
- `venue_change` - Venue change notification
- `broadcast` - General broadcast message

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key for client subscriptions |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key for server authentication |
| `VAPID_SUBJECT` | Yes | Contact information (mailto: or https:) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `PUSH_CONCURRENCY_LIMIT` | No | Concurrent notification limit (default: 10) |
| `PUSH_TTL_DEFAULT` | No | Default notification TTL in seconds (default: 86400) |

### Database Schema

The system adds these tables to your existing schema:

- `PushSubscription` - User push subscriptions
- `NotificationLog` - Notification delivery logs
- `PushError` - Error tracking and debugging

## Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|---------|-------|
| Chrome | ✅ 50+ | ✅ 50+ | Full support |
| Firefox | ✅ 44+ | ✅ 44+ | Full support |
| Safari | ✅ 16+ | ✅ 16.4+ | PWA installation required on mobile |
| Edge | ✅ 17+ | ✅ 17+ | Full support |

## Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export VAPID_PUBLIC_KEY="your-production-public-key"
   export VAPID_PRIVATE_KEY="your-production-private-key"
   export DATABASE_URL="postgresql://user:pass@host:5432/db"
   export REDIS_URL="redis://host:6379"
   ```

2. **Build and Start**
   ```bash
   npm run build
   npm start
   npm run worker
   ```

3. **Process Management**
   ```bash
   # Using PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Scale workers
docker-compose up -d --scale worker=3
```

### Health Monitoring

```bash
# Check system health
curl https://api.iwent.com/api/push/health

# Monitor queue status
redis-cli LLEN bull:notification-queue:waiting
redis-cli LLEN bull:notification-queue:failed
```

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm test -- --run integration

# Test coverage
npm test -- --coverage

# Test specific component
npm test -- push-subscription.service.test.ts
```

### Manual Testing

1. **Development Dashboard**: Use `/api/push/dev/dashboard` for interactive testing
2. **CLI Testing**: Use `npm run push-cli` commands for subscription management
3. **Browser Testing**: Test across different browsers and devices
4. **Load Testing**: Use Artillery or similar tools for performance testing

## Monitoring and Logging

### Key Metrics

- Active push subscriptions
- Notification success/failure rates
- Queue processing times
- Error rates by type
- Database performance

### Log Analysis

```bash
# View recent errors
tail -f logs/error.log | grep -i push

# Monitor notification processing
tail -f logs/combined.log | grep -i notification

# Check worker performance
tail -f logs/worker-combined.log
```

### Alerting

Set up alerts for:
- High error rates (>10%)
- Queue backlogs (>1000 jobs)
- Service downtime
- Database connection issues

## Security

### Best Practices

- ✅ VAPID private keys stored securely server-side only
- ✅ All subscription endpoints require authentication
- ✅ Rate limiting prevents abuse
- ✅ CSRF protection on state-changing operations
- ✅ Input validation and sanitization
- ✅ HTTPS required for all push operations

### Security Checklist

- [ ] VAPID keys are secure and not exposed
- [ ] Database credentials are protected
- [ ] Rate limiting is configured
- [ ] HTTPS is enforced
- [ ] Authentication is required for sensitive endpoints

## Performance

### Optimization Tips

1. **Database**: Add proper indexes, use connection pooling
2. **Redis**: Configure memory limits, use clustering for scale
3. **Workers**: Increase concurrency, run multiple instances
4. **Payloads**: Keep notifications under 4KB, trim when necessary

### Scaling

- **Horizontal**: Multiple app instances behind load balancer
- **Vertical**: Increase server resources
- **Database**: Read replicas, connection pooling
- **Queue**: Redis clustering, multiple workers

## Troubleshooting

### Common Issues

1. **VAPID Configuration**: Ensure keys are properly formatted and set
2. **HTTPS Requirement**: Push notifications require secure context
3. **Browser Compatibility**: Check supported browser versions
4. **Queue Backlogs**: Monitor and scale workers as needed

### Debug Commands

```bash
# Check system health
curl /api/push/health

# View queue status
redis-cli LLEN bull:notification-queue:waiting

# Test VAPID configuration
npm run push-cli templates

# Clean up invalid subscriptions
npm run push-cli cleanup
```

## Contributing

### Development Setup

1. Fork the repository
2. Install dependencies: `npm install`
3. Set up test environment: `cp .env.example .env.test`
4. Run tests: `npm test`
5. Start development server: `npm run dev`

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add tests for new features
- Update documentation

### Pull Request Process

1. Create feature branch
2. Add tests for changes
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

## Documentation

- [API Documentation](./push-notifications-api.md)
- [Deployment Guide](./push-notifications-deployment.md)
- [Testing Guide](./push-notifications-testing.md)
- [Troubleshooting Guide](./push-notifications-troubleshooting.md)

## Support

### Getting Help

1. Check the troubleshooting guide
2. Review system logs
3. Use development tools for debugging
4. Check browser compatibility
5. Verify environment configuration

### Reporting Issues

When reporting issues, include:
- System information (OS, Node.js version, browser)
- Environment configuration (sanitized)
- Error messages and logs
- Steps to reproduce
- Expected vs actual behavior

## License

This project is part of the iWent platform and follows the same licensing terms.

## Changelog

### v1.0.0 (Current)
- Initial release with full push notification support
- Web dashboard and CLI tools
- Comprehensive testing suite
- Production-ready deployment configuration
- Cross-browser compatibility
- Scalable architecture with Redis queuing