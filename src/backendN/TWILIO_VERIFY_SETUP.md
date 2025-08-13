# Twilio Verify API Setup Guide

## Environment Configuration

Add these environment variables to your `.env` file:

```env
# Twilio Verify API Configuration
TWILIO_ACCOUNT_SID=ACb4bea0f8cd29b8e572d86a4a70d87a03
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VA8eaae0cc7bb8871851d3171478dab586

# Optional: For welcome messages (not required for verification)
TWILIO_PHONE_NUMBER=+1234567890
```

## Required Environment Variables

1. **TWILIO_ACCOUNT_SID**: Your Twilio Account SID (starts with AC)
2. **TWILIO_AUTH_TOKEN**: Your Twilio Auth Token
3. **TWILIO_VERIFY_SERVICE_SID**: Your Verify Service SID (starts with VA)

## Creating a Twilio Verify Service

### Option 1: Using Twilio Console
1. Go to [Twilio Console > Verify > Services](https://console.twilio.com/us1/develop/verify/services)
2. Click "Create new Service"
3. Enter a friendly name (e.g., "iWent Phone Verification")
4. Configure settings:
   - **Code Length**: 6 digits (default)
   - **Lookup**: Enabled (recommended)
   - **Skip SMS to Landlines**: Enabled
   - **PSD2**: Disabled (unless needed)
5. Save and copy the Service SID

### Option 2: Using Twilio CLI
```bash
twilio api:verify:v2:services:create --friendly-name "iWent Phone Verification"
```

### Option 3: Using Node.js
```javascript
const client = require('twilio')(accountSid, authToken);

client.verify.v2.services
  .create({
    friendlyName: 'iWent Phone Verification',
    codeLength: 6
  })
  .then(service => console.log('Service SID:', service.sid));
```

## Configuration Example

```env
# From your provided values
TWILIO_ACCOUNT_SID=ACb4bea0f8cd29b8e572d86a4a70d87a03
TWILIO_AUTH_TOKEN=[Your Auth Token]
TWILIO_VERIFY_SERVICE_SID=VA8eaae0cc7bb8871851d3171478dab586
```

## Testing Configuration

You can test if your configuration is working by adding this endpoint to your controller:

```javascript
// Add to user.controller.ts for testing
export const testTwilioConfig = async (req: Request, res: Response) => {
  try {
    const serviceInfo = await PhoneVerificationService.getServiceInfo();
    res.json({
      configured: TwilioService.isConfigured(),
      serviceInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Verify Service Features

### Default Configuration
- **Code Length**: 6 digits
- **Code Type**: Numeric
- **Expiry**: 10 minutes
- **Max Attempts**: 5 attempts per phone number
- **Rate Limiting**: Automatic

### Supported Channels
- SMS (primary)
- Voice calls (optional)
- WhatsApp (if configured)

## Error Codes Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| 60200 | Invalid phone number | Check phone format (+90XXXXXXXXXX) |
| 60202 | Phone number not verified | Phone cannot be verified |
| 60203 | Max attempts reached | Wait before retrying |
| 60212 | Too many requests | Rate limited, wait longer |
| 60022 | Invalid verification code | Code is incorrect |

## Advantages of Twilio Verify API

### vs Direct SMS
1. **Better Deliverability**: Higher success rates
2. **International Support**: Works in more countries
3. **Automatic Retry**: Built-in retry logic
4. **Rate Limiting**: Automatic protection
5. **Code Management**: No need to generate/store codes
6. **Fraud Prevention**: Built-in security features

### Cost Benefits
- Only pay for successful verifications
- Automatic optimization for delivery
- Reduced fraud attempts

## Testing with Different Phone Numbers

### Turkish Numbers
```
+905551234567  - Valid Turkish mobile
+905077298286  - Your test number
```

### International Test Numbers
```
+15005550006   - Valid test number (US)
+15005550009   - Invalid test number (US)
+441234567890  - UK format
```

## Troubleshooting

### Common Issues

1. **Service SID Not Found**
   - Verify the Service SID starts with "VA"
   - Check if service exists in your Twilio account

2. **Authentication Errors**
   - Verify Account SID starts with "AC"
   - Check Auth Token is correct
   - Ensure no extra spaces in environment variables

3. **Phone Number Issues**
   - Ensure international format (+90XXXXXXXXXX)
   - Check if country is supported
   - Verify phone number is mobile (not landline)

### Debug Commands

```javascript
// Check configuration
console.log('Configured:', TwilioService.isConfigured());

// Get service info
const info = await TwilioService.getVerifyServiceInfo();
console.log('Service:', info);

// Test verification
const result = await TwilioService.sendVerificationCode('+905551234567');
console.log('Result:', result);
```

## Monitoring & Analytics

### Twilio Console
- View verification attempts
- Monitor success rates
- Track costs
- Analyze error rates

### Custom Logging
The implementation includes comprehensive logging:
- Verification requests
- Success/failure rates
- Error tracking
- Performance metrics

## Security Features

### Built-in Protection
- Rate limiting per phone number
- Automatic fraud detection
- Code expiration
- Attempt limiting

### Additional Security
- Phone number masking in responses
- Secure token storage
- Input validation
- Error message sanitization
