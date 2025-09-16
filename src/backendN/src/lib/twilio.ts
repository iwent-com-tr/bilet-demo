// src/lib/twilio.ts
import Twilio from "twilio";

type TwilioClient = Twilio.Twilio;

// Env
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SERVICE_SID_ENV = process.env.TWILIO_VERIFY_SERVICE_SID;

// Internal state
let CLIENT: TwilioClient | null = null;
let VERIFY_SERVICE_SID: string | null = null;

// lazy init (bir kez)
function initOnce() {
  if (CLIENT || VERIFY_SERVICE_SID) return;

  if (ACCOUNT_SID && AUTH_TOKEN && VERIFY_SERVICE_SID_ENV) {
    try {
      CLIENT = Twilio(ACCOUNT_SID, AUTH_TOKEN);
      VERIFY_SERVICE_SID = VERIFY_SERVICE_SID_ENV;
      // console.log("Twilio initialized");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Twilio initialization failed:", err);
      CLIENT = null;
      VERIFY_SERVICE_SID = null;
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "Twilio config missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID."
    );
  }
}

function ensureClient(): TwilioClient {
  initOnce();
  if (!CLIENT) {
    throw new Error(
      "Twilio yapılandırması yok veya başlatılamadı. Lütfen ortam değişkenlerini kontrol edin."
    );
  }
  return CLIENT;
}

function ensureServiceSid(): string {
  initOnce();
  if (!VERIFY_SERVICE_SID) {
    throw new Error(
      "Twilio Verify Service SID bulunamadı. TWILIO_VERIFY_SERVICE_SID ayarlayın."
    );
  }
  return VERIFY_SERVICE_SID;
}

export class TwilioService {
  /**
   * Doğrulama kodu gönder (Twilio Verify)
   */
  static async sendVerificationCode(phoneNumber: string): Promise<{
    sid: string;
    status: string;
    channel: string | null;
    to: string | null;
  }> {
    const client = ensureClient();
    const serviceSid = ensureServiceSid();

    const v = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: "sms" as const });

    return {
      sid: v.sid,
      status: v.status,
      channel: (v as any).channel ?? null,
      to: (v as any).to ?? null,
    };
  }

  /**
   * Doğrulama kodunu kontrol et (Twilio Verify)
   */
  static async verifyCode(phoneNumber: string, code: string): Promise<{
    sid: string;
    status: string;
    valid: boolean | null;
    channel: string | null;
    to: string | null;
  }> {
    const client = ensureClient();
    const serviceSid = ensureServiceSid();

    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    return {
      sid: check.sid,
      status: check.status,
      valid: (check as any).valid ?? null,
      channel: (check as any).channel ?? null,
      to: (check as any).to ?? null,
    };
    // Hata kodu bazlı mesaj üretmek istiyorsan burada catch blok açıp error.code ile mapleyebilirsin.
  }

  /**
   * Karşılama SMS'i (opsiyonel)
   * Doğrudan SMS için gönderen numarasını ENV’den alır.
   * Yapılandırma yoksa açıklayıcı hata verir.
   */
  static async sendSMS(to: string, message: string): Promise<string> {
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) {
      // İstersen burada throw yerine 'SMS_SKIPPED' döndür.
      throw new Error("TWILIO_PHONE_NUMBER ayarlı değil.");
    }

    const client = ensureClient();
    const msg = await client.messages.create({ to, from, body: message });
    return msg.sid;
  }

  static async sendWelcomeMessage(
    phoneNumber: string,
    firstName: string
  ): Promise<string> {
    const text = `Merhaba ${firstName}! 🎉\n\niWent'e hoş geldiniz! Telefon numaranız başarıyla doğrulandı.`;
    return this.sendSMS(phoneNumber, text);
  }

  static validatePhoneNumber(phone: string): boolean {
    const tr = /^\+90[0-9]{10}$/;
    const intl = /^\+[1-9]\d{1,14}$/;
    return tr.test(phone) || intl.test(phone);
  }

  static formatPhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, "");
    if (clean.startsWith("90")) return "+" + clean;
    if (clean.startsWith("0")) return "+90" + clean.slice(1);
    if (clean.length === 10) return "+90" + clean;
    return phone;
  }

  static isConfigured(): boolean {
    initOnce();
    return Boolean(CLIENT && VERIFY_SERVICE_SID);
  }

  static async getVerifyServiceInfo(): Promise<{
    sid: string;
    friendlyName: string;
    codeLength: number;
    lookupEnabled: boolean;
    skipSmsToLandlines: boolean;
  }> {
    const client = ensureClient();
    const serviceSid = ensureServiceSid();
    const svc = await client.verify.v2.services(serviceSid).fetch();
    return {
      sid: svc.sid,
      friendlyName: (svc as any).friendlyName,
      codeLength: (svc as any).codeLength,
      lookupEnabled: (svc as any).lookupEnabled,
      skipSmsToLandlines: (svc as any).skipSmsToLandlines,
    };
  }
}

export default TwilioService;
