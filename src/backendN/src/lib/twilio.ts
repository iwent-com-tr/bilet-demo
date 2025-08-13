// src/lib/twilio.ts
import twilio from 'twilio';

// Twilio configuration from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  throw new Error('Twilio configuration missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in environment variables.');
}

// Ensure types are strings (already validated above)
const ACCOUNT_SID = accountSid as string;
const AUTH_TOKEN = authToken as string;
const VERIFY_SERVICE_SID = verifyServiceSid as string;

// Initialize Twilio client
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

export class TwilioService {
  /**
   * Send verification code using Twilio Verify API
   * @param phoneNumber - Phone number in international format (+905XXXXXXXXX)
   * @returns Promise with verification SID and status
   */
  static async sendVerificationCode(phoneNumber: string): Promise<{
    sid: string;
    status: string;
    channel: string;
    to: string;
  }> {
    try {
      const verification = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications
        .create({
          to: phoneNumber,
          channel: 'sms'
        });

      console.log(`Verification code sent successfully to ${phoneNumber}. Verification SID: ${verification.sid}`);
      
      return {
        sid: verification.sid,
        status: verification.status,
        channel: verification.channel,
        to: verification.to
      };
    } catch (error: any) {
      console.error('Twilio Verify Error:', error);
      
      // Handle specific Twilio Verify errors
      if (error.code === 60200) {
        throw new Error('Geçersiz telefon numarası formatı');
      } else if (error.code === 60212) {
        throw new Error('Bu telefon numarası için çok fazla deneme yapıldı');
      } else if (error.code === 60203) {
        throw new Error('Bu telefon numarası için maksimum deneme sayısına ulaşıldı');
      } else if (error.code === 60202) {
        throw new Error('Telefon numarası doğrulanamadı');
      } else {
        throw new Error('Doğrulama kodu gönderilirken hata oluştu: ' + error.message);
      }
    }
  }

  /**
   * Verify the code using Twilio Verify API
   * @param phoneNumber - Phone number in international format
   * @param code - Verification code entered by user
   * @returns Promise with verification check result
   */
  static async verifyCode(phoneNumber: string, code: string): Promise<{
    sid: string;
    status: string;
    valid: boolean;
    channel: string;
    to: string;
  }> {
    try {
      const verificationCheck = await client.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verificationChecks
        .create({
          to: phoneNumber,
          code: code
        });

      console.log(`Verification check completed for ${phoneNumber}. Status: ${verificationCheck.status}`);
      
      return {
        sid: verificationCheck.sid,
        status: verificationCheck.status,
        valid: verificationCheck.valid,
        channel: verificationCheck.channel,
        to: verificationCheck.to
      };
    } catch (error: any) {
      console.error('Twilio Verify Check Error:', error);
      
      // Handle specific Twilio Verify errors
      if (error.code === 60200) {
        throw new Error('Geçersiz telefon numarası formatı');
      } else if (error.code === 60202) {
        throw new Error('Telefon numarası doğrulanamadı');
      } else if (error.code === 60203) {
        throw new Error('Bu telefon numarası için maksimum deneme sayısına ulaşıldı');
      } else if (error.code === 60022) {
        throw new Error('Geçersiz doğrulama kodu');
      } else {
        throw new Error('Kod doğrulanırken hata oluştu: ' + error.message);
      }
    }
  }

  /**
   * Send SMS message (for welcome messages, not verification)
   * @param to - Recipient phone number (international format: +905551234567)
   * @param message - SMS message content
   * @returns Promise with message SID
   */
  static async sendSMS(to: string, message: string): Promise<string> {
    try {
      // Only use direct SMS for welcome messages, use verify API for verification
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!twilioPhoneNumber) {
        console.warn('TWILIO_PHONE_NUMBER not configured, skipping SMS');
        return 'SMS_SKIPPED';
      }

      const messageResponse = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: to
      });

      console.log(`SMS sent successfully to ${to}. Message SID: ${messageResponse.sid}`);
      return messageResponse.sid;
    } catch (error: any) {
      console.error('Twilio SMS Error:', error);
      
      // Don't throw error for welcome messages, just log and continue
      console.warn('Welcome SMS could not be sent, but verification process continues');
      return 'SMS_FAILED';
    }
  }

  /**
   * Send welcome message after successful verification
   * @param phoneNumber - Verified phone number
   * @param firstName - User's first name
   * @returns Promise with message SID
   */
  static async sendWelcomeMessage(phoneNumber: string, firstName: string): Promise<string> {
    const message = `Merhaba ${firstName}! 🎉\n\niWent'e hoş geldiniz! Telefon numaranız başarıyla doğrulandı.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Validate phone number format
   * @param phoneNumber - Phone number to validate
   * @returns boolean indicating if format is valid
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Turkish phone number regex: +90XXXXXXXXXX
    const turkishPhoneRegex = /^\+90[0-9]{10}$/;
    
    // International phone number regex (basic)
    const internationalPhoneRegex = /^\+[1-9]\d{1,14}$/;
    
    return turkishPhoneRegex.test(phoneNumber) || internationalPhoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to international format
   * @param phoneNumber - Phone number to format
   * @returns Formatted phone number with country code
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 90 (Turkey country code), add +
    if (cleanNumber.startsWith('90')) {
      return '+' + cleanNumber;
    }
    
    // If it starts with 0 (Turkish local format), replace with +90
    if (cleanNumber.startsWith('0')) {
      return '+90' + cleanNumber.substring(1);
    }
    
    // If it doesn't have country code, assume Turkey
    if (cleanNumber.length === 10) {
      return '+90' + cleanNumber;
    }
    
    // Return as is if already in international format
    return phoneNumber;
  }

  /**
   * Check if Twilio Verify is properly configured
   * @returns boolean indicating if Twilio Verify is configured
   */
  static isConfigured(): boolean {
    return !!(accountSid && authToken && verifyServiceSid);
  }

  /**
   * Get Twilio Verify service information
   * @returns Promise with service details
   */
  static async getVerifyServiceInfo(): Promise<any> {
    try {
      const service = await client.verify.v2.services(VERIFY_SERVICE_SID).fetch();
      return {
        sid: service.sid,
        friendlyName: service.friendlyName,
        codeLength: service.codeLength,
        lookupEnabled: service.lookupEnabled,
        skipSmsToLandlines: service.skipSmsToLandlines
      };
    } catch (error: any) {
      console.error('Error fetching Verify service info:', error);
      throw new Error('Verify service bilgileri alınamadı');
    }
  }
}

export default TwilioService;