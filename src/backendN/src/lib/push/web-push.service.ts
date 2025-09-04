import webpush from 'web-push';
import pLimit from 'p-limit';
import { getVapidConfig, type VapidConfig } from './vapid-config.js';
import { ErrorTrackingService } from './error-tracking.service.js';
import { PrismaClient } from '@prisma/client';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface NotificationPayload {
  type: string;
  eventId: string;
  title: string;
  body: string;
  url: string;
  icon?: string;
  badge?: string;
  actions?: NotificationAction[];
  change?: ChangeDetails;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ChangeDetails {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface PushOptions {
  ttl?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  topic?: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  invalidEndpoints: string[];
  errors: Array<{
    endpoint: string;
    error: string;
    statusCode?: number;
  }>;
}

export interface PushError extends Error {
  statusCode?: number;
  endpoint?: string;
}

/**
 * Service for sending Web Push notifications using VAPID protocol
 */
export class WebPushService {
  private vapidConfig: VapidConfig;
  private concurrencyLimit: ReturnType<typeof pLimit>;
  private errorTracker?: ErrorTrackingService;

  constructor(concurrency: number = 10, prisma?: PrismaClient) {
    this.vapidConfig = getVapidConfig();
    this.concurrencyLimit = pLimit(concurrency);
    
    if (prisma) {
      this.errorTracker = new ErrorTrackingService(prisma);
    }
    
    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      this.vapidConfig.subject,
      this.vapidConfig.publicKey,
      this.vapidConfig.privateKey
    );
  }

  /**
   * Send a push notification to a single subscription
   */
  async sendNotification(
    subscription: PushSubscriptionData,
    payload: NotificationPayload,
    options: PushOptions = {},
    jobId?: string,
    eventId?: string
  ): Promise<void> {
    try {
      const pushOptions = {
        TTL: options.ttl || 86400, // 24 hours default
        urgency: options.urgency || 'normal',
        topic: options.topic,
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        pushOptions
      );
    } catch (error) {
      const pushError = this.handlePushError(error, subscription.endpoint);
      
      // Track error if error tracker is available
      if (this.errorTracker) {
        await this.errorTracker.trackError(
          subscription.endpoint,
          pushError,
          jobId,
          eventId
        );
      }
      
      throw pushError;
    }
  }

  /**
   * Send push notifications to multiple subscriptions with concurrency control
   */
  async sendBulkNotifications(
    subscriptions: PushSubscriptionData[],
    payload: NotificationPayload,
    options: PushOptions = {},
    jobId?: string,
    eventId?: string
  ): Promise<BulkSendResult> {
    const result: BulkSendResult = {
      sent: 0,
      failed: 0,
      invalidEndpoints: [],
      errors: [],
    };

    const sendPromises = subscriptions.map(subscription =>
      this.concurrencyLimit(async () => {
        try {
          await this.sendNotification(subscription, payload, options, jobId, eventId);
          result.sent++;
        } catch (error) {
          result.failed++;
          
          const pushError = error as PushError;
          
          // Track invalid endpoints for cleanup
          if (this.isInvalidEndpointError(pushError)) {
            result.invalidEndpoints.push(subscription.endpoint);
          }
          
          result.errors.push({
            endpoint: subscription.endpoint,
            error: pushError.message,
            statusCode: pushError.statusCode,
          });
        }
      })
    );

    await Promise.all(sendPromises);
    return result;
  }

  /**
   * Get the VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string {
    return this.vapidConfig.publicKey;
  }

  /**
   * Handle and categorize push service errors
   */
  private handlePushError(error: any, endpoint: string): PushError {
    const pushError = new Error(error.message || 'Push notification failed') as PushError;
    pushError.endpoint = endpoint;
    pushError.statusCode = error.statusCode;

    // Handle specific error codes
    switch (error.statusCode) {
      case 404:
      case 410:
        pushError.message = `Push subscription no longer valid: ${error.statusCode}`;
        break;
      case 413:
        pushError.message = 'Push notification payload too large';
        break;
      case 429:
        pushError.message = 'Push service rate limit exceeded';
        break;
      case 400:
        pushError.message = 'Invalid push notification request';
        break;
      case 500:
      case 502:
      case 503:
        pushError.message = 'Push service temporarily unavailable';
        break;
      default:
        pushError.message = error.message || 'Unknown push service error';
    }

    return pushError;
  }

  /**
   * Check if error indicates an invalid endpoint that should be cleaned up
   */
  private isInvalidEndpointError(error: PushError): boolean {
    return error.statusCode === 404 || error.statusCode === 410;
  }

  /**
   * Validate notification payload size and structure
   */
  validatePayload(payload: NotificationPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const payloadString = JSON.stringify(payload);
    
    // Check payload size (most push services have ~4KB limit)
    if (payloadString.length > 4000) {
      errors.push('Payload size exceeds 4KB limit');
    }

    // Validate required fields
    if (!payload.title || payload.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!payload.body || payload.body.trim().length === 0) {
      errors.push('Body is required');
    }

    if (!payload.url || payload.url.trim().length === 0) {
      errors.push('URL is required');
    }

    // Validate title and body length
    if (payload.title && payload.title.length > 100) {
      errors.push('Title should not exceed 100 characters');
    }

    if (payload.body && payload.body.length > 200) {
      errors.push('Body should not exceed 200 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Trim payload to fit size constraints
   */
  trimPayload(payload: NotificationPayload): NotificationPayload {
    const trimmed = { ...payload };
    
    // Trim title and body if too long
    if (trimmed.title && trimmed.title.length > 100) {
      trimmed.title = trimmed.title.substring(0, 97) + '...';
    }
    
    if (trimmed.body && trimmed.body.length > 200) {
      trimmed.body = trimmed.body.substring(0, 197) + '...';
    }
    
    // Remove optional fields if payload is still too large
    let payloadString = JSON.stringify(trimmed);
    if (payloadString.length > 4000) {
      const result: NotificationPayload = {
        type: trimmed.type,
        eventId: trimmed.eventId,
        title: trimmed.title,
        body: trimmed.body,
        url: trimmed.url,
      };
      return result;
    }
    
    return trimmed;
  }
}