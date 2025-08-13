// src/modules/users/verification.dto.ts
import { z } from 'zod';

// Phone number validation regex
const phoneRegex = /^\+?[0-9]{10,15}$/;
const turkishPhoneRegex = /^\+90[0-9]{10}$/;

// Send verification code DTO
export const SendVerificationCodeDTO = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { 
      message: 'Geçersiz telefon numarası formatı. Lütfen +90XXXXXXXXXX formatında giriniz.' 
    })
    .transform((phone) => {
      // Auto-format Turkish phone numbers
      const cleanNumber = phone.replace(/\D/g, '');
      
      if (cleanNumber.startsWith('90')) {
        return '+' + cleanNumber;
      }
      
      if (cleanNumber.startsWith('0')) {
        return '+90' + cleanNumber.substring(1);
      }
      
      if (cleanNumber.length === 10) {
        return '+90' + cleanNumber;
      }
      
      return phone;
    })
});

export type SendVerificationCodeInput = z.infer<typeof SendVerificationCodeDTO>;

// Verify code DTO
export const VerifyCodeDTO = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { 
      message: 'Geçersiz telefon numarası formatı.' 
    }),
  code: z
    .string()
    .length(6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
    .regex(/^[0-9]{6}$/, { message: 'Doğrulama kodu sadece rakam içermelidir.' })
});

export type VerifyCodeInput = z.infer<typeof VerifyCodeDTO>;

// Update phone number DTO
export const UpdatePhoneNumberDTO = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, { 
      message: 'Geçersiz telefon numarası formatı. Lütfen +90XXXXXXXXXX formatında giriniz.' 
    })
    .transform((phone) => {
      // Auto-format Turkish phone numbers
      const cleanNumber = phone.replace(/\D/g, '');
      
      if (cleanNumber.startsWith('90')) {
        return '+' + cleanNumber;
      }
      
      if (cleanNumber.startsWith('0')) {
        return '+90' + cleanNumber.substring(1);
      }
      
      if (cleanNumber.length === 10) {
        return '+90' + cleanNumber;
      }
      
      return phone;
    })
});

export type UpdatePhoneNumberInput = z.infer<typeof UpdatePhoneNumberDTO>;

// Response DTOs for type safety
export interface VerificationResponse {
  success: boolean;
  message: string;
}

export interface VerificationStatusResponse {
  phoneNumber?: string;
  isVerified: boolean;
  hasPendingVerification: boolean;
  canRequestNew: boolean;
  timeUntilNewRequest?: number;
}

// Helper function to validate Turkish phone numbers specifically
export const validateTurkishPhone = (phone: string): boolean => {
  return turkishPhoneRegex.test(phone);
};

// Helper function to format phone display
export const formatPhoneDisplay = (phone: string): string => {
  if (phone.startsWith('+90')) {
    const number = phone.substring(3);
    return `+90 (${number.substring(0, 3)}) ${number.substring(3, 6)} ${number.substring(6, 8)} ${number.substring(8)}`;
  }
  return phone;
};

// Helper function to mask phone number for display
export const maskPhoneNumber = (phone: string): string => {
  if (phone.startsWith('+90') && phone.length === 13) {
    return `+90 (***) *** ** ${phone.substring(11)}`;
  }
  
  if (phone.length > 4) {
    return '*'.repeat(phone.length - 4) + phone.substring(phone.length - 4);
  }
  
  return phone;
};
