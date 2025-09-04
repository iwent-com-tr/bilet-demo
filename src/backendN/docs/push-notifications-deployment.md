# Push Notifications Deployment Guide

## Overview

This guide covers the deployment of the iWent Push Notifications system, including environment setup, infrastructure requirements, and configuration steps.

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 13.x or higher
- **Redis**: 6.x or higher
- **SSL Certificate**: Required for push notifications (HTTPS only)

### Dependencies

The following npm packages are required:
- `web-push`: ^3.6.7
- `bullmq`: ^5.58.0
- `ioredis`: ^5.7.0
- `p-limit`: ^7.1.0
- `zod`: ^3.23.8

## Environment Variables

### Required Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/iwent_db"

# Redis Configuration
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# VAPID Configuration (Required for Push Notifications)
VAPID_PUBLIC_KEY="BKd3dGJhQWxhc2RmZ2hqa2w7YXNkZmdoamtsO2Fz..."
VAPID_PRIVATE_KEY="your-vapid-private-key-here"
VAPID_SUBJECT="mailto:admin@iwent.com"

# Application Configuration
NODE_ENV="production"
PORT="3000"
JWT_SECRET="your-jwt-secret-here"

# Optional: Push Notification Settings
PUSH_CONCURRENCY_LIMIT="10"
PUSH_TTL_DEFAULT="86400"
PUSH_RETRY_ATTEMPTS="3"
PUSH_RETRY_DELAY="5000"

# Optional: Monitoring and Logging
LOG_LEVEL="info"
ENABLE_PUSH_METRICS="true"
ENABLE_ERROR_TRACKING="true"
```

### Generating VAPID Keys

Use the web-push library to generate VAPID keys:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys

# Output:
# Public Key: BKd3dGJhQWxhc2RmZ2hqa2w7YXNkZmdoamtsO2Fz...
# Private Key: your-private-key-here
```

**Important**: 
- Keep the private key secure and never expose it to clients
- Store keys in environment variables, not in code
- Use the same keys across all environments for consistency

## Database Setup

### 1. Run Migrations

Ensure the database schema includes the push notification tables:

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2. Verify Schema

The following tables should exist:

```sql
-- Push subscriptions table
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "ua" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- Notification logs table
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "eventId" TEXT,
    "userId" TEXT,
    "subscriptionCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- Push errors table
CREATE TABLE "PushError" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "statusCode" INTEGER,
    "jobId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushError_pkey" PRIMARY KEY ("id")
);
```

### 3. Create Indexes

Add performance indexes:

```sql
-- Indexes for push subscriptions
CREATE INDEX "PushSubscription_userId_enabled_idx" ON "PushSubscription"("userId", "enabled");
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- Indexes for notification logs
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
CREATE INDEX "NotificationLog_eventId_idx" ON "NotificationLog"("eventId");

-- Indexes for push errors
CREATE INDEX "PushError_endpoint_idx" ON "PushError"("endpoint");
CREATE INDEX "PushError_createdAt_idx" ON "PushError"("createdAt");
```

## Redis Setup

### 1. Configuration

Redis is used for job queuing and caching. Configure Redis with the following settings:

```bash
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 2. Queue Configuration

The system uses BullMQ for job processing. Queues are automatically created:

- `notification-queue`: For processing notification jobs
- `cleanup-queue`: For cleaning up invalid subscriptions

### 3. Monitoring

Use Redis CLI to monitor queue status:

```bash
# Connect to Redis
redis-cli

# Check queue length
LLEN bull:notification-queue:waiting
LLEN bull:notification-queue:active
LLEN bull:notification-queue:completed
LLEN bull:notification-queue:failed
```

## Application Deployment

### 1. Build the Application

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Generate Prisma client
npx prisma generate
```

### 2. Start Services

#### Main Application

```bash
# Start the main server
npm start

# Or with PM2
pm2 start ecosystem.config.js --only iwent-api
```

#### Background Worker

```bash
# Start the notification worker
npm run worker

# Or with PM2
pm2 start ecosystem.config.js --only notification-worker
```

### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'iwent-api',
      script: 'dist/src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'notification-worker',
      script: 'dist/src/workers/notification-worker.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true
    }
  ]
};
```

## Docker Deployment

### 1. Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/iwent
      - REDIS_URL=redis://redis:6379
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_SUBJECT=${VAPID_SUBJECT}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  worker:
    build: .
    command: npm run worker
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/iwent
      - REDIS_URL=redis://redis:6379
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_SUBJECT=${VAPID_SUBJECT}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=iwent
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## SSL/HTTPS Configuration

Push notifications require HTTPS. Configure SSL using:

### 1. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.iwent.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.iwent.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.iwent.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Logging

### 1. Health Checks

Set up health check endpoints:

```bash
# Check application health
curl https://api.iwent.com/api/push/health

# Check specific services
curl https://api.iwent.com/api/push/health/database
curl https://api.iwent.com/api/push/health/redis
curl https://api.iwent.com/api/push/health/vapid
```

### 2. Logging Configuration

Configure structured logging:

```javascript
// logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### 3. Metrics Collection

Monitor key metrics:

- Active push subscriptions
- Notification success/failure rates
- Queue processing times
- Error rates by type
- Database connection pool status

## Security Checklist

### 1. Environment Security

- [ ] VAPID private key is secure and not exposed
- [ ] Database credentials are secure
- [ ] JWT secret is strong and unique
- [ ] Redis is password-protected (if exposed)
- [ ] Environment variables are not logged

### 2. Network Security

- [ ] HTTPS is enforced for all endpoints
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Firewall rules are in place
- [ ] Database is not publicly accessible

### 3. Application Security

- [ ] Input validation is implemented
- [ ] SQL injection protection is in place
- [ ] XSS protection is enabled
- [ ] CSRF protection is configured
- [ ] Authentication is required for sensitive endpoints

## Troubleshooting

### Common Issues

#### 1. VAPID Configuration Errors

```bash
# Error: Missing VAPID keys
# Solution: Generate and set VAPID keys
web-push generate-vapid-keys
```

#### 2. Push Service Errors

```bash
# Error: 404/410 responses
# Solution: Clean up invalid subscriptions
npm run push-cli cleanup
```

#### 3. Queue Processing Issues

```bash
# Check Redis connection
redis-cli ping

# Check queue status
redis-cli LLEN bull:notification-queue:waiting

# Restart worker
pm2 restart notification-worker
```

#### 4. Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Check connection pool
# Monitor active connections in PostgreSQL
SELECT count(*) FROM pg_stat_activity;
```

### Performance Optimization

#### 1. Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "PushSubscription" WHERE "userId" = 'user-id';

-- Update table statistics
ANALYZE "PushSubscription";
ANALYZE "NotificationLog";
```

#### 2. Redis Optimization

```bash
# Monitor Redis performance
redis-cli --latency-history -i 1

# Check memory usage
redis-cli INFO memory
```

#### 3. Application Optimization

- Increase concurrency limit for bulk notifications
- Implement connection pooling
- Use database read replicas for queries
- Cache frequently accessed data

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup
pg_dump -h localhost -U postgres iwent > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U postgres iwent < backup_20240822_120000.sql
```

### 2. Redis Backup

```bash
# Create Redis backup
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backup/redis_$(date +%Y%m%d_%H%M%S).rdb
```

### 3. Environment Backup

```bash
# Backup environment variables
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Backup VAPID keys separately
echo "VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY" > vapid_keys.backup
echo "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY" >> vapid_keys.backup
```

## Scaling Considerations

### 1. Horizontal Scaling

- Use load balancer for multiple app instances
- Run multiple worker instances
- Implement Redis Cluster for high availability
- Use database read replicas

### 2. Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database configuration
- Tune Redis memory settings
- Adjust Node.js heap size

### 3. Monitoring at Scale

- Implement distributed tracing
- Use centralized logging (ELK stack)
- Set up alerting for critical metrics
- Monitor resource utilization

## Maintenance

### 1. Regular Tasks

- Clean up old notification logs
- Remove invalid push subscriptions
- Update dependencies
- Rotate VAPID keys (if needed)
- Monitor and optimize database performance

### 2. Scheduled Maintenance

```bash
# Weekly cleanup script
#!/bin/bash
# cleanup.sh

# Clean up old logs (older than 30 days)
npm run push-cli cleanup

# Vacuum database
psql -c "VACUUM ANALYZE;"

# Clear Redis expired keys
redis-cli --eval "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" , "expired:*"
```

### 3. Updates and Patches

- Test updates in staging environment
- Plan maintenance windows
- Have rollback procedures ready
- Monitor system after updates