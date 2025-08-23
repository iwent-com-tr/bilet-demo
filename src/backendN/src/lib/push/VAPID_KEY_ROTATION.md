# VAPID Key Rotation Guide

This document provides procedures for securely rotating VAPID keys in the iWent push notification system.

## Overview

VAPID (Voluntary Application Server Identification) keys are used to authenticate your server with push services. Regular key rotation is a security best practice that should be performed:

- Annually as a preventive measure
- Immediately if keys are suspected to be compromised
- When team members with key access leave the organization
- As part of security incident response

## Key Generation

### Production Key Generation

**IMPORTANT**: Production VAPID keys should be generated offline on a secure machine, not on production servers.

1. **Install web-push CLI tool**:
   ```bash
   npm install -g web-push
   ```

2. **Generate new key pair**:
   ```bash
   web-push generate-vapid-keys
   ```

3. **Secure the keys**:
   - Store private key in a secure password manager
   - Never commit keys to version control
   - Limit access to essential personnel only

### Development Key Generation

For development environments only, you can use the built-in key generator:

```typescript
import { generateVapidKeys } from './vapid-config.js';

// Only works in non-production environments
const keys = generateVapidKeys();
console.log('Public Key:', keys.publicKey);
console.log('Private Key:', keys.privateKey);
```

## Key Rotation Procedure

### 1. Pre-Rotation Checklist

- [ ] Backup current environment variables
- [ ] Verify new keys are properly formatted
- [ ] Schedule maintenance window if needed
- [ ] Notify team of upcoming rotation

### 2. Generate New Keys

Follow the production key generation steps above to create new VAPID keys.

### 3. Update Environment Variables

Update the following environment variables:

```bash
# New VAPID keys
VAPID_PUBLIC_KEY=your_new_public_key_here
VAPID_PRIVATE_KEY=your_new_private_key_here
VAPID_SUBJECT=mailto:your-email@domain.com
```

### 4. Validation

Before deploying, validate the new configuration:

```typescript
import { validateVapidEnvironment, isVapidConfigValid } from './vapid-config.js';

// Check for validation errors
const errors = validateVapidEnvironment();
if (errors.length > 0) {
  console.error('VAPID validation errors:', errors);
  process.exit(1);
}

// Verify configuration is valid
if (!isVapidConfigValid()) {
  console.error('VAPID configuration is invalid');
  process.exit(1);
}

console.log('VAPID configuration is valid');
```

### 5. Deployment

1. **Update environment variables** in your deployment system
2. **Restart the application** to load new keys
3. **Monitor logs** for any VAPID-related errors
4. **Test push notifications** to ensure they work with new keys

### 6. Client-Side Updates

After key rotation, existing push subscriptions will continue to work, but new subscriptions will use the new public key. No immediate client-side changes are required.

## Post-Rotation Tasks

### 1. Verify Functionality

- [ ] Test push notification sending
- [ ] Verify new subscriptions work
- [ ] Check error logs for issues
- [ ] Monitor notification delivery rates

### 2. Security Cleanup

- [ ] Securely delete old private keys
- [ ] Update documentation with new public key
- [ ] Remove old keys from password managers
- [ ] Update any hardcoded references (if any)

### 3. Documentation

- [ ] Update deployment documentation
- [ ] Record rotation date and reason
- [ ] Update team access documentation

## Emergency Key Rotation

If keys are compromised:

1. **Immediately rotate keys** following the standard procedure
2. **Monitor for unauthorized usage** of old keys
3. **Review access logs** for suspicious activity
4. **Consider invalidating all existing subscriptions** if breach is severe
5. **Conduct security review** to prevent future compromises

## Key Storage Best Practices

### Environment Variables

- Use secure environment variable management (e.g., AWS Secrets Manager, Azure Key Vault)
- Never store keys in plain text files
- Use different keys for different environments (dev, staging, prod)

### Access Control

- Limit key access to essential personnel only
- Use role-based access control
- Regularly audit who has access to keys
- Remove access when team members leave

### Monitoring

- Monitor for VAPID authentication failures
- Set up alerts for key-related errors
- Track key usage patterns
- Log key rotation events

## Troubleshooting

### Common Issues

1. **"Invalid VAPID configuration" error**:
   - Check key format (base64url encoding)
   - Verify all required environment variables are set
   - Ensure keys are properly trimmed (no extra whitespace)

2. **"VAPID public and private keys do not form a valid key pair" error**:
   - Regenerate keys using the same tool
   - Ensure you're using the complete key strings
   - Check for copy/paste errors

3. **Push notifications fail after rotation**:
   - Verify new keys are deployed correctly
   - Check application restart completed successfully
   - Monitor push service response codes

### Validation Commands

```bash
# Check environment variables are set
echo "Public Key: ${VAPID_PUBLIC_KEY:0:20}..."
echo "Private Key: ${VAPID_PRIVATE_KEY:0:20}..."
echo "Subject: $VAPID_SUBJECT"

# Test key format
node -e "
const config = require('./vapid-config.js');
try {
  config.getVapidConfig();
  console.log('✅ VAPID configuration is valid');
} catch (error) {
  console.error('❌ VAPID configuration error:', error.message);
}
"
```

## Security Considerations

- **Never log private keys** in application logs
- **Use secure channels** for key distribution
- **Implement key rotation reminders** (calendar events, monitoring alerts)
- **Consider using hardware security modules (HSMs)** for high-security environments
- **Regular security audits** of key management practices

## Compliance Notes

Depending on your organization's compliance requirements:

- Document all key rotations for audit trails
- Follow your organization's cryptographic key management policies
- Consider compliance frameworks (SOC 2, ISO 27001, etc.)
- Maintain key lifecycle documentation