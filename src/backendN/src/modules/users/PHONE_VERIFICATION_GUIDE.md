# Phone Verification System with Twilio Verify API

## Overview
Professional phone verification system using Twilio Verify API. This provides better deliverability, international support, and built-in security features compared to direct SMS.

## Features
- ✅ SMS-based phone verification using Twilio Verify API
- ✅ Automatic OTP code generation and management
- ✅ Built-in rate limiting and fraud protection
- ✅ Turkish phone number formatting
- ✅ International phone number support
- ✅ Welcome message after verification
- ✅ Phone number masking for security
- ✅ Automatic code expiration (10 minutes)
- ✅ Resend functionality with cooldown
- ✅ Better deliverability rates
- ✅ Automatic retry and optimization

## Environment Configuration

Add the following variables to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACb4bea0f8cd29b8e572d86a4a70d87a03
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VA8eaae0cc7bb8871851d3171478dab586

# Optional: For welcome messages only
TWILIO_PHONE_NUMBER=+1234567890
```

### Getting Twilio Verify Credentials
1. Sign up at [Twilio Console](https://console.twilio.com/)
2. Get your Account SID and Auth Token from the dashboard
3. Create a Verify Service at [Verify Services](https://console.twilio.com/us1/develop/verify/services)
4. Copy the Verify Service SID (starts with "VA")
5. Add all credentials to your environment variables

**Note**: Phone number is only needed for welcome messages, not for verification codes.

## API Endpoints

### Phone Verification Routes

#### 1. Send Verification Code
```http
POST /api/users/verify/send
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "phoneNumber": "+905551234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Doğrulama kodu gönderildi. Lütfen telefonunuzu kontrol edin.",
  "maskedPhone": "+90 (***) *** ** 67"
}
```

#### 2. Verify Code
```http
POST /api/users/verify/confirm
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "phoneNumber": "+905551234567",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telefon numaranız başarıyla doğrulandı!",
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+905551234567",
    "phoneVerified": true,
    ...
  }
}
```

#### 3. Get Verification Status
```http
GET /api/users/verify/status
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "phoneNumber": "+90 (***) *** ** 67",
  "isVerified": false,
  "hasPendingVerification": true,
  "canRequestNew": true,
  "timeUntilNewRequest": 8
}
```

#### 4. Resend Verification Code
```http
POST /api/users/verify/resend
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "message": "Doğrulama kodu gönderildi. Lütfen telefonunuzu kontrol edin."
}
```

#### 5. Update Phone Number
```http
PUT /api/users/phone
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "phoneNumber": "+905559876543"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Doğrulama kodu gönderildi. Lütfen telefonunuzu kontrol edin.",
  "maskedPhone": "+90 (***) *** ** 43",
  "requiresVerification": true
}
```

## Phone Number Formats

### Supported Formats
- **Turkish Format**: `+90XXXXXXXXXX` (e.g., `+905551234567`)
- **Local Turkish**: `0XXXXXXXXX` (auto-converted to +90)
- **International**: `+[country_code][number]`

### Auto-Formatting
The system automatically formats phone numbers:
- `05551234567` → `+905551234567`
- `905551234567` → `+905551234567`
- `+905551234567` → `+905551234567` (unchanged)

## Verification Process

### 1. User Registration Flow
```javascript
// After user registration
const user = await UserService.register(userData);

// Automatically trigger phone verification
const verificationResult = await PhoneVerificationService.sendVerificationCode(
  user.id, 
  user.phone
);
```

### 2. Verification Code Generation (Handled by Twilio)
- 6-digit numeric code (default)
- 10-minute expiration time
- Maximum 5 attempts per phone number
- Automatic retry and optimization
- Built-in fraud protection

### 3. SMS Content (Managed by Twilio)
Twilio Verify automatically sends properly formatted SMS messages with verification codes in the appropriate language for the target country.

### 4. Welcome Message
```
Merhaba John! 🎉

iWent'e hoş geldiniz! Telefon numaranız başarıyla doğrulandı.
```

## Security Features

### Rate Limiting
- Maximum 3 verification attempts per code
- Cooldown period after max attempts
- Auto-cleanup of expired verification data

### Phone Number Masking
```javascript
// Original: +905551234567
// Masked: +90 (***) *** ** 67

const masked = maskPhoneNumber(phoneNumber);
```

### Data Storage
- In-memory storage for verification codes
- Automatic cleanup every 5 minutes
- Redis-ready structure for production scaling

## Error Handling

### Common Error Responses

#### Invalid Phone Format
```json
{
  "success": false,
  "message": "Geçersiz telefon numarası formatı. Lütfen +90XXXXXXXXXX formatında giriniz."
}
```

#### Too Many Attempts
```json
{
  "success": false,
  "message": "Çok fazla deneme yapıldı. 8 dakika sonra tekrar deneyin."
}
```

#### Invalid Code
```json
{
  "success": false,
  "message": "Geçersiz doğrulama kodu. 2 deneme hakkınız kaldı."
}
```

#### Code Expired
```json
{
  "success": false,
  "message": "Doğrulama kodu bulunamadı veya süresi dolmuş. Lütfen yeni kod isteyin."
}
```

## Twilio Service Features

### SMS Sending
```javascript
// Basic SMS
await TwilioService.sendSMS(phoneNumber, message);

// Verification code SMS
await TwilioService.sendVerificationCode(phoneNumber, code);

// Welcome message
await TwilioService.sendWelcomeMessage(phoneNumber, firstName);
```

### Phone Validation
```javascript
// Validate format
const isValid = TwilioService.validatePhoneNumber('+905551234567');

// Format phone number
const formatted = TwilioService.formatPhoneNumber('05551234567');
// Returns: +905551234567
```

### Configuration Check
```javascript
// Check if Twilio is properly configured
if (TwilioService.isConfigured()) {
  // Proceed with SMS operations
}
```

## Production Considerations

### Redis Integration
For production environments, replace in-memory storage with Redis:

```javascript
// Replace VerificationStore with Redis
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store verification code
await redis.setex(`verification:${key}`, 600, JSON.stringify(data));

// Get verification code
const data = await redis.get(`verification:${key}`);
```

### Monitoring & Logging
- Track SMS delivery status
- Monitor verification success rates
- Log failed attempts for security analysis
- Set up alerts for high failure rates

### Cost Optimization
- Implement regional SMS pricing
- Use verification services for high-volume
- Cache verification results
- Implement smart retry logic

## Integration Examples

### Frontend Integration (React)

```javascript
// Send verification code
const sendCode = async (phoneNumber) => {
  const response = await fetch('/api/users/verify/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phoneNumber })
  });
  
  const result = await response.json();
  return result;
};

// Verify code
const verifyCode = async (phoneNumber, code) => {
  const response = await fetch('/api/users/verify/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phoneNumber, code })
  });
  
  const result = await response.json();
  return result;
};
```

### Backend Integration

```javascript
// In registration flow
app.post('/auth/register', async (req, res) => {
  // Register user
  const user = await AuthService.register(userData);
  
  // Automatically send verification code
  await PhoneVerificationService.sendVerificationCode(
    user.id, 
    userData.phoneNumber
  );
  
  res.json({ 
    user, 
    tokens,
    requiresPhoneVerification: true 
  });
});
```

## Testing

### Mock Twilio for Development
```javascript
// In test environment
const mockTwilioService = {
  sendSMS: jest.fn().mockResolvedValue('mock-sid'),
  sendVerificationCode: jest.fn().mockResolvedValue('mock-sid'),
  validatePhoneNumber: jest.fn().mockReturnValue(true),
  isConfigured: jest.fn().mockReturnValue(true)
};
```

### Test Phone Numbers
Use Twilio's test numbers for development:
- `+15005550006` - Valid test number
- `+15005550009` - Invalid test number
- Configure webhook URLs for testing

## Troubleshooting

### Common Issues

1. **SMS Not Delivered**
   - Check Twilio account balance
   - Verify phone number format
   - Check country restrictions
   - Verify webhook configuration

2. **Configuration Errors**
   - Ensure all environment variables are set
   - Verify Account SID and Auth Token
   - Check phone number ownership

3. **Rate Limiting**
   - Check attempt counters
   - Verify expiration times
   - Clear verification storage if needed

### Debug Commands
```javascript
// Check verification status
const status = await PhoneVerificationService.getVerificationStatus(userId);

// Cancel verification
await PhoneVerificationService.cancelVerification(userId, phoneNumber);

// Check Twilio configuration
console.log('Twilio configured:', TwilioService.isConfigured());
```
