// src/modules/users/phone-verification.service.ts
import { prisma } from '../../lib/prisma';
import TwilioService from '../../lib/twilio';

// Simple verification tracking for rate limiting
interface VerificationAttempt {
  phoneNumber: string;
  userId: string;
  lastAttempt: Date;
  attemptCount: number;
  pendingVerificationSid?: string;
}

class VerificationStore {
  private static attempts: Map<string, VerificationAttempt> = new Map();

  static set(key: string, data: VerificationAttempt): void {
    this.attempts.set(key, data);
  }

  static get(key: string): VerificationAttempt | undefined {
    return this.attempts.get(key);
  }

  static delete(key: string): void {
    this.attempts.delete(key);
  }

  static cleanup(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour

    for (const [key, data] of this.attempts.entries()) {
      if (data.lastAttempt < oneHourAgo) {
        this.attempts.delete(key);
      }
    }
  }
}

// Cleanup expired attempts every 30 minutes
setInterval(() => {
  VerificationStore.cleanup();
}, 30 * 60 * 1000);

export class PhoneVerificationService {
  /**
   * Generate a unique key for verification tracking
   */
  private static generateKey(userId: string, phoneNumber: string): string {
    return `${userId}:${phoneNumber}`;
  }

  /**
   * Send verification code to user's phone using Twilio Verify API
   * @param userId - User ID
   * @param phoneNumber - Phone number to verify (international format)
   * @returns Promise with success status
   */
  static async sendVerificationCode(userId: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if Twilio Verify is configured
      if (!TwilioService.isConfigured()) {
        throw new Error('SMS doğrulama servisi yapılandırılmamış');
      }

      // Validate phone number format
      if (!TwilioService.validatePhoneNumber(phoneNumber)) {
        throw new Error('Geçersiz telefon numarası formatı. Lütfen +90XXXXXXXXXX formatında giriniz.');
      }

      // Format phone number
      const formattedPhone = TwilioService.formatPhoneNumber(phoneNumber);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, phone: true, phoneVerified: true }
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Check if phone is already verified
      if (user.phoneVerified && user.phone === formattedPhone) {
        return {
          success: false,
          message: 'Bu telefon numarası zaten doğrulanmış.'
        };
      }

      // Prevent assigning a phone that is already used by another account
      const phoneOwner = await prisma.user.findFirst({
        where: { phone: formattedPhone, NOT: { id: userId } },
        select: { id: true }
      });
      if (phoneOwner) {
        return {
          success: false,
          message: 'Bu telefon numarası başka bir hesapta kayıtlı.'
        };
      }

      // Check rate limiting
      const key = this.generateKey(userId, formattedPhone);
      const existingAttempt = VerificationStore.get(key);
      
      if (existingAttempt) {
        const timeSinceLastAttempt = Date.now() - existingAttempt.lastAttempt.getTime();
        const oneMinute = 60 * 1000;
        
        // Allow only one attempt per minute
        if (timeSinceLastAttempt < oneMinute) {
          const waitTime = Math.ceil((oneMinute - timeSinceLastAttempt) / 1000);
          return {
            success: false,
            message: `Lütfen ${waitTime} saniye bekleyin ve tekrar deneyin.`
          };
        }

        // Check if too many attempts in the last hour
        if (existingAttempt.attemptCount >= 5) {
          return {
            success: false,
            message: 'Çok fazla deneme yapıldı. 1 saat sonra tekrar deneyin.'
          };
        }
      }

      // Send verification code using Twilio Verify API
      const verificationResult = await TwilioService.sendVerificationCode(formattedPhone);

      // Update user's phone number if it's different
      if (user.phone !== formattedPhone) {
        await prisma.user.update({
          where: { id: userId },
          data: { 
            phone: formattedPhone,
            phoneVerified: false 
          }
        });
      }

      // Track attempt
      const currentAttempt = existingAttempt || { 
        phoneNumber: formattedPhone, 
        userId, 
        attemptCount: 0,
        lastAttempt: new Date(),
        pendingVerificationSid: undefined
      };

      VerificationStore.set(key, {
        ...currentAttempt,
        lastAttempt: new Date(),
        attemptCount: currentAttempt.attemptCount + 1,
        pendingVerificationSid: verificationResult.sid
      });

      console.log(`Verification code sent to user ${userId} at ${formattedPhone}. Status: ${verificationResult.status}`);

      return {
        success: true,
        message: 'Doğrulama kodu gönderildi. Lütfen telefonunuzu kontrol edin.'
      };

    } catch (error: any) {
      console.error('Phone verification send error:', error);
      return {
        success: false,
        message: error.message || 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.'
      };
    }
  }

  /**
   * Verify the code using Twilio Verify API
   * @param userId - User ID
   * @param phoneNumber - Phone number being verified
   * @param code - Verification code entered by user
   * @returns Promise with verification result
   */
  static async verifyCode(userId: string, phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      // Format phone number
      const formattedPhone = TwilioService.formatPhoneNumber(phoneNumber);

      // Verify code using Twilio Verify API
      const verificationCheck = await TwilioService.verifyCode(formattedPhone, code);

      if (verificationCheck.valid && verificationCheck.status === 'approved') {
        // Code is correct - update user
        const user = await prisma.user.update({
          where: { id: userId },
          data: {
            phone: formattedPhone,
            phoneVerified: true
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            phoneVerified: true
          }
        });

        // Clear verification tracking
        const key = this.generateKey(userId, formattedPhone);
        VerificationStore.delete(key);

        // Send welcome message (optional, won't fail if it doesn't work)
        try {
          await TwilioService.sendWelcomeMessage(formattedPhone, user.firstName);
        } catch (error) {
          console.error('Failed to send welcome message:', error);
          // Don't fail the verification if welcome message fails
        }

        console.log(`Phone verification successful for user ${userId}`);

        return {
          success: true,
          message: 'Telefon numaranız başarıyla doğrulandı!'
        };
      } else {
        // Code is incorrect
        return {
          success: false,
          message: 'Geçersiz doğrulama kodu. Lütfen tekrar deneyin.'
        };
      }

    } catch (error: any) {
      console.error('Phone verification verify error:', error);
      
      // Handle specific error messages from Twilio
      if (error.message.includes('Geçersiz doğrulama kodu')) {
        return {
          success: false,
          message: 'Geçersiz doğrulama kodu. Lütfen doğru kodu giriniz.'
        };
      }
      
      return {
        success: false,
        message: error.message || 'Doğrulama işlemi sırasında hata oluştu. Lütfen tekrar deneyin.'
      };
    }
  }

  /**
   * Get verification status for a user
   * @param userId - User ID
   * @returns Promise with verification status
   */
  static async getVerificationStatus(userId: string): Promise<{
    phoneNumber?: string;
    isVerified: boolean;
    hasPendingVerification: boolean;
    canRequestNew: boolean;
    timeUntilNewRequest?: number;
    attemptCount?: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, phoneVerified: true }
      });

      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      let hasPendingVerification = false;
      let canRequestNew = true;
      let timeUntilNewRequest: number | undefined;
      let attemptCount: number | undefined;

      if (user.phone) {
        const key = this.generateKey(userId, user.phone);
        const verificationAttempt = VerificationStore.get(key);

        if (verificationAttempt) {
          attemptCount = verificationAttempt.attemptCount;
          hasPendingVerification = !!verificationAttempt.pendingVerificationSid;
          
          const timeSinceLastAttempt = Date.now() - verificationAttempt.lastAttempt.getTime();
          const oneMinute = 60 * 1000;
          
          if (timeSinceLastAttempt < oneMinute) {
            canRequestNew = false;
            timeUntilNewRequest = Math.ceil((oneMinute - timeSinceLastAttempt) / 1000);
          }
          
          if (verificationAttempt.attemptCount >= 5) {
            canRequestNew = false;
            const oneHour = 60 * 60 * 1000;
            const timeUntilReset = oneHour - timeSinceLastAttempt;
            if (timeUntilReset > 0) {
              timeUntilNewRequest = Math.ceil(timeUntilReset / 60000); // in minutes
            }
          }
        }
      }

      return {
        phoneNumber: user.phone || undefined,
        isVerified: user.phoneVerified,
        hasPendingVerification,
        canRequestNew,
        timeUntilNewRequest,
        attemptCount
      };

    } catch (error: any) {
      console.error('Get verification status error:', error);
      throw new Error('Doğrulama durumu alınamadı');
    }
  }

  /**
   * Cancel pending verification for a user
   * @param userId - User ID
   * @param phoneNumber - Phone number
   */
  static async cancelVerification(userId: string, phoneNumber: string): Promise<void> {
    const formattedPhone = TwilioService.formatPhoneNumber(phoneNumber);
    const key = this.generateKey(userId, formattedPhone);
    VerificationStore.delete(key);
  }

  /**
   * Resend verification code
   * @param userId - User ID
   * @returns Promise with result
   */
  static async resendVerificationCode(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, phoneVerified: true }
      });

      if (!user || !user.phone) {
        return {
          success: false,
          message: 'Telefon numarası bulunamadı'
        };
      }

      if (user.phoneVerified) {
        return {
          success: false,
          message: 'Telefon numarası zaten doğrulanmış'
        };
      }

      // Send new verification code
      return this.sendVerificationCode(userId, user.phone);

    } catch (error: any) {
      console.error('Resend verification error:', error);
      return {
        success: false,
        message: 'Doğrulama kodu tekrar gönderilemedi'
      };
    }
  }

  /**
   * Get verification service info (for debugging)
   * @returns Promise with service information
   */
  static async getServiceInfo(): Promise<any> {
    try {
      return await TwilioService.getVerifyServiceInfo();
    } catch (error: any) {
      console.error('Get service info error:', error);
      throw new Error('Servis bilgileri alınamadı');
    }
  }

  // ================= ORGANIZER VARIANTS =================
  /**
   * Send verification code for organizers
   */
  static async sendVerificationCodeForOrganizer(organizerId: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!TwilioService.isConfigured()) {
        throw new Error('SMS doğrulama servisi yapılandırılmamış');
      }

      if (!TwilioService.validatePhoneNumber(phoneNumber)) {
        throw new Error('Geçersiz telefon numarası formatı. Lütfen +90XXXXXXXXXX formatında giriniz.');
      }

      const formattedPhone = TwilioService.formatPhoneNumber(phoneNumber);

      const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: { id: true, firstName: true, phone: true, phoneVerified: true }
      });
      if (!organizer) throw new Error('Organizatör bulunamadı');

      if (organizer.phoneVerified && organizer.phone === formattedPhone) {
        return { success: false, message: 'Bu telefon numarası zaten doğrulanmış.' };
      }

      // Ensure phone not used by another organizer or any user
      const existingOrganizer = await prisma.organizer.findFirst({
        where: { phone: formattedPhone, NOT: { id: organizerId } }, select: { id: true }
      });
      const existingUser = await prisma.user.findFirst({ where: { phone: formattedPhone }, select: { id: true } });
      if (existingOrganizer || existingUser) {
        return { success: false, message: 'Bu telefon numarası başka bir hesapta kayıtlı.' };
      }

      const key = this.generateKey(organizerId, formattedPhone);
      const existingAttempt = VerificationStore.get(key);
      if (existingAttempt) {
        const timeSinceLastAttempt = Date.now() - existingAttempt.lastAttempt.getTime();
        const oneMinute = 60 * 1000;
        if (timeSinceLastAttempt < oneMinute) {
          const waitTime = Math.ceil((oneMinute - timeSinceLastAttempt) / 1000);
          return { success: false, message: `Lütfen ${waitTime} saniye bekleyin ve tekrar deneyin.` };
        }
        if (existingAttempt.attemptCount >= 5) {
          return { success: false, message: 'Çok fazla deneme yapıldı. 1 saat sonra tekrar deneyin.' };
        }
      }

      const verificationResult = await TwilioService.sendVerificationCode(formattedPhone);

      if (organizer.phone !== formattedPhone) {
        await prisma.organizer.update({
          where: { id: organizerId },
          data: { phone: formattedPhone, phoneVerified: false }
        });
      }

      const currentAttempt = existingAttempt || {
        phoneNumber: formattedPhone, userId: organizerId, attemptCount: 0, lastAttempt: new Date(), pendingVerificationSid: undefined
      };
      VerificationStore.set(key, {
        ...currentAttempt, lastAttempt: new Date(), attemptCount: currentAttempt.attemptCount + 1, pendingVerificationSid: verificationResult.sid
      });

      return { success: true, message: 'Doğrulama kodu gönderildi. Lütfen telefonunuzu kontrol edin.' };

    } catch (error: any) {
      console.error('Organizer phone verification send error:', error);
      return { success: false, message: error.message || 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.' };
    }
  }

  /**
   * Verify organizer code
   */
  static async verifyCodeForOrganizer(organizerId: string, phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = TwilioService.formatPhoneNumber(phoneNumber);
      const verificationCheck = await TwilioService.verifyCode(formattedPhone, code);
      if (verificationCheck.valid && verificationCheck.status === 'approved') {
        await prisma.organizer.update({
          where: { id: organizerId },
          data: { phone: formattedPhone, phoneVerified: true }
        });
        const key = this.generateKey(organizerId, formattedPhone);
        VerificationStore.delete(key);
        return { success: true, message: 'Telefon numaranız başarıyla doğrulandı!' };
      }
      return { success: false, message: 'Geçersiz doğrulama kodu. Lütfen tekrar deneyin.' };
    } catch (error: any) {
      console.error('Organizer phone verification verify error:', error);
      return { success: false, message: error.message || 'Doğrulama işlemi sırasında hata oluştu. Lütfen tekrar deneyin.' };
    }
  }

  /**
   * Get organizer verification status
   */
  static async getVerificationStatusForOrganizer(organizerId: string) {
    try {
      const org = await prisma.organizer.findUnique({ where: { id: organizerId }, select: { phone: true, phoneVerified: true } });
      if (!org) throw new Error('Organizatör bulunamadı');
      let hasPendingVerification = false;
      let canRequestNew = true;
      let timeUntilNewRequest: number | undefined;
      let attemptCount: number | undefined;
      if (org.phone) {
        const key = this.generateKey(organizerId, org.phone);
        const attempt = VerificationStore.get(key);
        if (attempt) {
          attemptCount = attempt.attemptCount;
          hasPendingVerification = !!attempt.pendingVerificationSid;
          const timeSinceLastAttempt = Date.now() - attempt.lastAttempt.getTime();
          const oneMinute = 60 * 1000;
          if (timeSinceLastAttempt < oneMinute) {
            canRequestNew = false;
            timeUntilNewRequest = Math.ceil((oneMinute - timeSinceLastAttempt) / 1000);
          }
          if (attempt.attemptCount >= 5) {
            canRequestNew = false;
            const oneHour = 60 * 60 * 1000;
            const timeUntilReset = oneHour - timeSinceLastAttempt;
            if (timeUntilReset > 0) timeUntilNewRequest = Math.ceil(timeUntilReset / 60000);
          }
        }
      }
      return { phoneNumber: org.phone || undefined, isVerified: org.phoneVerified, hasPendingVerification, canRequestNew, timeUntilNewRequest, attemptCount };
    } catch (error: any) {
      console.error('Organizer get verification status error:', error);
      throw new Error('Doğrulama durumu alınamadı');
    }
  }

  /**
   * Resend organizer verification code
   */
  static async resendVerificationCodeForOrganizer(organizerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const org = await prisma.organizer.findUnique({ where: { id: organizerId }, select: { phone: true, phoneVerified: true } });
      if (!org || !org.phone) return { success: false, message: 'Telefon numarası bulunamadı' };
      if (org.phoneVerified) return { success: false, message: 'Telefon numarası zaten doğrulanmış' };
      return this.sendVerificationCodeForOrganizer(organizerId, org.phone);
    } catch (error: any) {
      console.error('Organizer resend verification error:', error);
      return { success: false, message: 'Doğrulama kodu tekrar gönderilemedi' };
    }
  }
}