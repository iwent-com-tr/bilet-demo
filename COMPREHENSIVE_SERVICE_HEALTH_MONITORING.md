# Comprehensive Service Health Monitoring

## Overview

This document details the comprehensive service integration and health monitoring system implemented for the bilet-demo application. All external services and dependencies now have proper health monitoring, graceful fallbacks, and detailed status reporting.

## Services Monitored

### 🔧 Core Services

#### 1. Database (PostgreSQL + Prisma)
- **Status**: Critical service
- **Health Check**: Connection test + query execution
- **Fallback**: Application cannot start without database
- **Endpoints**: 
  - `GET /api/v1/health/service/database`
  - `GET /api/v1/db-check`

#### 2. Redis (Queue System)
- **Status**: Optional service
- **Health Check**: Ping + queue statistics
- **Fallback**: Synchronous processing when unavailable
- **Features**: Background job processing, notification queuing
- **Endpoints**: `GET /api/v1/health/service/redis`

### 📱 Communication Services

#### 3. Twilio (SMS & Phone Verification)
- **Status**: Optional service
- **Health Check**: Service info retrieval
- **Fallback**: Phone verification disabled when unavailable
- **Features**: SMS sending, phone number verification
- **Configuration**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
- **Endpoints**: `GET /api/v1/health/service/twilio`

#### 4. SendGrid (Email Service)
- **Status**: Optional service
- **Health Check**: Configuration validation
- **Fallback**: Email notifications disabled when unavailable
- **Features**: Transactional emails, ticket confirmations
- **Configuration**: `SENDGRID_API_KEY`, `EMAIL_FROM`
- **Endpoints**: `GET /api/v1/health/service/sendGrid`

### 🔔 Notification Services

#### 5. VAPID (Web Push Notifications)
- **Status**: Optional service
- **Health Check**: Key validation
- **Fallback**: Web push disabled when misconfigured
- **Features**: Browser push notifications
- **Configuration**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **Endpoints**: `GET /api/v1/health/service/pushNotifications`

#### 6. Notification Worker
- **Status**: Optional service
- **Health Check**: Worker process status
- **Fallback**: Synchronous notification processing
- **Features**: Background notification processing
- **Dependencies**: Redis
- **Endpoints**: `GET /api/v1/health/service/worker`

### 🔍 Search & AI Services

#### 7. MeiliSearch (Search Engine)
- **Status**: Optional service
- **Health Check**: Service health endpoint
- **Fallback**: Search functionality disabled when unavailable
- **Features**: Fast full-text search for events, venues, artists
- **Configuration**: `MEILI_HOST`, `MEILI_API_KEY`
- **Endpoints**: `GET /api/v1/health/service/meilisearch`

#### 8. OpenAI (AI Features)
- **Status**: Optional service
- **Health Check**: API key validation
- **Fallback**: AI features disabled when unavailable
- **Features**: AI-powered content generation
- **Configuration**: `OPENAI_API_KEY`
- **Endpoints**: `GET /api/v1/health/service/openai`

## Health Check Endpoints

### Basic Health Check
```http
GET /api/v1/health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Detailed Health Check
```http
GET /api/v1/health/detailed
```
**Response:**
```json
{
  "status": "healthy|degraded|critical",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": {
      "name": "Database (PostgreSQL)",
      "status": "healthy",
      "message": "Database connection successful",
      "lastChecked": "2024-01-01T00:00:00.000Z",
      "dependencies": []
    },
    "redis": {
      "name": "Redis (Queue System)",
      "status": "healthy",
      "message": "Redis connection successful",
      "lastChecked": "2024-01-01T00:00:00.000Z",
      "dependencies": []
    },
    // ... other services
  },
  "version": "1.0.0",
  "uptime": 123.456,
  "memory": {
    "rss": 45678912,
    "heapTotal": 23456789,
    "heapUsed": 12345678,
    "external": 1234567
  }
}
```

### Services by Category
```http
GET /api/v1/health/services
```
**Response:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "categories": {
    "core": {
      "database": { /* service status */ },
      "redis": { /* service status */ }
    },
    "communication": {
      "twilio": { /* service status */ },
      "sendGrid": { /* service status */ }
    },
    "search": {
      "meilisearch": { /* service status */ }
    },
    "ai": {
      "openai": { /* service status */ }
    },
    "notifications": {
      "pushNotifications": { /* service status */ },
      "worker": { /* service status */ }
    }
  }
}
```

### Individual Service Health
```http
GET /api/v1/health/service/{serviceName}
```
**Response:**
```json
{
  "service": "database",
  "name": "Database (PostgreSQL)",
  "status": "healthy",
  "message": "Database connection successful",
  "lastChecked": "2024-01-01T00:00:00.000Z",
  "dependencies": [],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Service Status Types

### 🟢 Healthy
- Service is fully operational
- All features available
- No issues detected

### 🟡 Degraded
- Service has issues but is partially functional
- Some features may be limited
- Requires attention

### 🔴 Unavailable
- Service is not operational
- Features dependent on this service are disabled
- Graceful fallbacks are active

## Configuration Examples

### Complete Configuration (.env)
```env
# Core Services
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iwent"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Communication Services
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_VERIFY_SERVICE_SID="your_verify_service_sid"

SENDGRID_API_KEY="your_sendgrid_api_key"
EMAIL_FROM="noreply@yourdomain.com"

# Notification Services
VAPID_PUBLIC_KEY="your_vapid_public_key"
VAPID_PRIVATE_KEY="your_vapid_private_key"
VAPID_SUBJECT="mailto:admin@yourdomain.com"

# Search & AI Services
MEILI_HOST="http://localhost:7700"
MEILI_API_KEY="your_meili_api_key"

OPENAI_API_KEY="your_openai_api_key"

# Worker Configuration
START_WORKER="false"
NOTIFICATION_WORKER_CONCURRENCY="200"
```

### Minimal Configuration (Core Only)
```env
# Only database is required
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iwent"
JWT_ACCESS_SECRET="your_jwt_access_secret"
JWT_REFRESH_SECRET="your_jwt_refresh_secret"

# All other services will be disabled with graceful fallbacks
```

## Monitoring and Observability

### Health Check Dashboard
You can create a simple monitoring dashboard by polling the health endpoints:

```bash
# Monitor overall health
curl -s http://localhost:3001/api/v1/health/detailed | jq '.status'

# Monitor specific service
curl -s http://localhost:3001/api/v1/health/service/database | jq '.status'

# Get services by category
curl -s http://localhost:3001/api/v1/health/services | jq '.categories'
```

### Automated Monitoring
Set up automated monitoring with tools like:
- **Prometheus + Grafana**: Scrape health endpoints for metrics
- **Uptime monitoring**: Monitor `/health` endpoint
- **Log aggregation**: Monitor service status logs

### Alerting
Configure alerts based on service status:
- **Critical**: Database unavailable
- **Warning**: Optional services degraded
- **Info**: Service recovered

## Graceful Degradation Patterns

### Push Notifications
1. **OneSignal Available**: Use OneSignal for enhanced features
2. **VAPID Available**: Fall back to web push notifications
3. **Neither Available**: Disable push notifications, log warnings

### Background Processing
1. **Redis Available**: Use queue system for background jobs
2. **Redis Unavailable**: Process notifications synchronously
3. **Fallback**: Direct database operations

### Search Functionality
1. **MeiliSearch Available**: Fast full-text search
2. **MeiliSearch Unavailable**: Disable search features, use basic filtering

### Communication
1. **Twilio Available**: Phone verification enabled
2. **Twilio Unavailable**: Skip phone verification step
3. **SendGrid Available**: Email notifications enabled
4. **SendGrid Unavailable**: Log email attempts, disable email features

## Implementation Benefits

### 🛡️ Reliability
- Application continues functioning even when optional services fail
- Graceful degradation prevents complete system failures
- Early detection of service issues

### 📊 Observability
- Real-time service status monitoring
- Detailed health information for debugging
- Historical health data for trend analysis

### 🔧 Maintainability
- Clear service dependency mapping
- Centralized service health management
- Consistent error handling patterns

### 🚀 Performance
- Non-blocking health checks
- Efficient service initialization
- Optimized fallback mechanisms

## Troubleshooting

### Common Issues

1. **Service shows as degraded**
   - Check service configuration
   - Verify network connectivity
   - Review service logs

2. **Critical status**
   - Database connection issues
   - Check DATABASE_URL
   - Verify database is running

3. **Worker not starting**
   - Redis connection required
   - Check REDIS_HOST and REDIS_PORT
   - Verify START_WORKER setting

### Debug Commands
```bash
# Check all service health
curl http://localhost:3001/api/v1/health/detailed

# Check specific service
curl http://localhost:3001/api/v1/health/service/database

# Check database connection directly
curl http://localhost:3001/api/v1/db-check
```

## Conclusion

The comprehensive service health monitoring system provides:
- **Complete visibility** into all service dependencies
- **Graceful degradation** when services are unavailable  
- **Detailed health reporting** for operations and debugging
- **Robust error handling** to prevent cascading failures

All services are now properly monitored and the application can operate effectively even when optional services are unavailable.