# Secure VAPID Key Storage Best Practices

This document outlines security best practices for storing and managing VAPID keys in the iWent push notification system.

## Overview

VAPID keys are cryptographic credentials that authenticate your server with push services. Proper key management is critical for:

- Preventing unauthorized access to your push notification system
- Maintaining user trust and data security
- Ensuring compliance with security standards
- Protecting against key compromise and misuse

## Key Storage Principles

### 1. Separation of Concerns

- **Public keys**: Can be exposed to clients safely
- **Private keys**: Must never be exposed or logged
- **Subject**: Should be a monitored email address

### 2. Environment-Based Storage

Store keys in environment variables, not in code or configuration files:

```bash
# ✅ Correct - Environment variables
VAPID_PUBLIC_KEY=BNXxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:admin@yourdomain.com

# ❌ Wrong - Never in code
const vapidKeys = {
  publicKey: 'BNXxxx...',  // Never do this
  privateKey: 'xxx...'     // Especially not this
};
```

## Production Key Storage Solutions

### 1. Cloud Secret Management

#### AWS Secrets Manager
```bash
# Store secrets
aws secretsmanager create-secret \
  --name "iwent/vapid-keys" \
  --description "VAPID keys for push notifications" \
  --secret-string '{
    "VAPID_PUBLIC_KEY": "BNXxxx...",
    "VAPID_PRIVATE_KEY": "xxx...",
    "VAPID_SUBJECT": "mailto:admin@yourdomain.com"
  }'

# Retrieve in application
const secret = await secretsManager.getSecretValue({
  SecretId: 'iwent/vapid-keys'
}).promise();
```

#### Azure Key Vault
```bash
# Store secrets
az keyvault secret set \
  --vault-name "iwent-keyvault" \
  --name "vapid-public-key" \
  --value "BNXxxx..."

az keyvault secret set \
  --vault-name "iwent-keyvault" \
  --name "vapid-private-key" \
  --value "xxx..."
```

#### Google Secret Manager
```bash
# Store secrets
gcloud secrets create vapid-public-key --data-file=public_key.txt
gcloud secrets create vapid-private-key --data-file=private_key.txt
```

### 2. Container Orchestration

#### Docker Secrets
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: iwent-backend
    secrets:
      - vapid_private_key
      - vapid_public_key
    environment:
      VAPID_PRIVATE_KEY_FILE: /run/secrets/vapid_private_key
      VAPID_PUBLIC_KEY_FILE: /run/secrets/vapid_public_key

secrets:
  vapid_private_key:
    external: true
  vapid_public_key:
    external: true
```

#### Kubernetes Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vapid-keys
type: Opaque
data:
  public-key: <base64-encoded-public-key>
  private-key: <base64-encoded-private-key>
  subject: <base64-encoded-subject>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iwent-backend
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: VAPID_PUBLIC_KEY
          valueFrom:
            secretKeyRef:
              name: vapid-keys
              key: public-key
        - name: VAPID_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: vapid-keys
              key: private-key
```

## Development Environment

### Local Development

For local development, use a `.env` file (never committed to version control):

```bash
# .env (add to .gitignore)
VAPID_PUBLIC_KEY=BNXxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:dev@yourdomain.com
```

### Development Key Generation

```typescript
// Only for development environments
import { generateVapidKeys } from './vapid-config.js';

if (process.env.NODE_ENV !== 'production') {
  const keys = generateVapidKeys();
  console.log('Development VAPID Keys:');
  console.log('Public:', keys.publicKey);
  console.log('Private:', keys.privateKey);
}
```

## Access Control

### 1. Role-Based Access

Define clear roles for key access:

- **Administrators**: Full access to all keys
- **Developers**: Access to development keys only
- **CI/CD Systems**: Automated access with service accounts
- **Monitoring**: Read-only access for health checks

### 2. Principle of Least Privilege

```typescript
// Example: Separate interfaces for different access levels
interface PublicVapidConfig {
  publicKey: string;
  subject: string;
}

interface FullVapidConfig extends PublicVapidConfig {
  privateKey: string;
}

// Public interface for client-facing code
export function getPublicVapidConfig(): PublicVapidConfig {
  const config = getVapidConfig();
  return {
    publicKey: config.publicKey,
    subject: config.subject
  };
}
```

### 3. Audit Logging

```typescript
// Log key access (but never the keys themselves)
function logKeyAccess(operation: string, userId?: string): void {
  console.log({
    timestamp: new Date().toISOString(),
    operation,
    userId: userId || 'system',
    component: 'vapid-config'
  });
}

export function getVapidConfig(): VapidConfig {
  logKeyAccess('key-access');
  // ... rest of implementation
}
```

## Security Monitoring

### 1. Key Usage Monitoring

```typescript
// Monitor for unusual key usage patterns
export class VapidSecurityMonitor {
  private static accessCount = 0;
  private static lastAccess = 0;

  static recordAccess(): void {
    const now = Date.now();
    this.accessCount++;
    
    // Alert on unusual access patterns
    if (this.accessCount > 1000 && (now - this.lastAccess) < 60000) {
      console.warn('Unusual VAPID key access pattern detected');
    }
    
    this.lastAccess = now;
  }
}
```

### 2. Configuration Validation

```typescript
// Regular validation of key integrity
setInterval(() => {
  try {
    const config = getVapidConfig();
    if (!areKeysConsistent(config.publicKey, config.privateKey)) {
      console.error('VAPID key consistency check failed');
      // Alert administrators
    }
  } catch (error) {
    console.error('VAPID configuration validation failed:', error);
  }
}, 60000); // Check every minute
```

## Incident Response

### Key Compromise Response

1. **Immediate Actions**:
   ```bash
   # Rotate keys immediately
   web-push generate-vapid-keys
   
   # Update environment variables
   # Restart all services
   # Monitor for unauthorized usage
   ```

2. **Investigation**:
   - Review access logs
   - Identify compromise vector
   - Assess impact scope
   - Document findings

3. **Recovery**:
   - Deploy new keys
   - Invalidate old subscriptions if necessary
   - Update monitoring rules
   - Conduct security review

### Monitoring Alerts

Set up alerts for:
- VAPID authentication failures
- Unusual key access patterns
- Configuration validation failures
- Key rotation events

## Compliance Considerations

### Data Protection

- Keys are considered sensitive data under GDPR/CCPA
- Implement data retention policies
- Ensure secure deletion of old keys
- Document key lifecycle management

### Audit Requirements

- Maintain key access logs
- Document key rotation procedures
- Regular security assessments
- Compliance reporting

## Testing Key Security

### Security Tests

```typescript
// Test that private keys are never exposed
describe('VAPID Key Security', () => {
  it('should not expose private key in public interface', () => {
    const publicConfig = getPublicVapidConfig();
    expect(publicConfig).not.toHaveProperty('privateKey');
  });

  it('should validate key format', () => {
    expect(() => {
      process.env.VAPID_PRIVATE_KEY = 'invalid-key';
      getVapidConfig();
    }).toThrow('Invalid VAPID configuration');
  });

  it('should not log private keys', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    getVapidConfig();
    
    const loggedMessages = consoleSpy.mock.calls.flat().join(' ');
    expect(loggedMessages).not.toContain(process.env.VAPID_PRIVATE_KEY);
  });
});
```

### Penetration Testing

Regular security testing should include:
- Environment variable exposure tests
- Log file analysis for key leakage
- Access control validation
- Key rotation procedure testing

## Emergency Procedures

### Lost Key Recovery

If keys are lost but not compromised:
1. Generate new keys using secure procedure
2. Update all deployment environments
3. Test notification functionality
4. Update documentation

### Suspected Compromise

If key compromise is suspected:
1. **Immediately** rotate keys
2. Review all recent push notification activity
3. Check for unauthorized subscriptions
4. Monitor push service logs for abuse
5. Consider temporary service suspension if needed

## Checklist for Key Management

- [ ] Keys generated using secure, offline method
- [ ] Private keys never stored in code or logs
- [ ] Environment variables properly secured
- [ ] Access control implemented and documented
- [ ] Key rotation procedure tested
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled
- [ ] Compliance requirements met
- [ ] Team training completed