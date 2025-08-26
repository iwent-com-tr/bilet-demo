import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import {
  OneSignalCreateNotificationRequest,
  OneSignalNotificationResponse,
  OneSignalPlayerResponse,
  ONESIGNAL_DEVICE_TYPES,
  DEFAULT_NOTIFICATION_OPTIONS,
} from './push-notification.types';

export class OneSignalService {
  private readonly client: AxiosInstance;
  private readonly appId: string;
  private readonly apiKey: string;
  private readonly webhookSecret?: string;

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || '';
    this.apiKey = process.env.ONESIGNAL_API_KEY || '';
    this.webhookSecret = process.env.ONESIGNAL_WEBHOOK_SECRET;

    if (!this.appId || !this.apiKey) {
      throw new Error('OneSignal configuration missing: ONESIGNAL_APP_ID and ONESIGNAL_API_KEY are required');
    }

    this.client = axios.create({
      baseURL: 'https://api.onesignal.com/v1',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[OneSignal] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data ? 'present' : 'none',
          timestamp: new Date().toISOString(),
        });
        return config;
      },
      (error) => {
        console.error('[OneSignal] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[OneSignal] Response ${response.status}`, {
          url: response.config.url,
          data: response.data ? 'received' : 'empty',
          timestamp: new Date().toISOString(),
        });
        return response;
      },
      (error) => {
        console.error('[OneSignal] Response error:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
          timestamp: new Date().toISOString(),
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send notification to users
   */
  async sendNotification(
    request: Partial<OneSignalCreateNotificationRequest>
  ): Promise<OneSignalNotificationResponse> {
    // Ensure required fields are present
    if (!request.headings || !request.contents) {
      throw new Error('headings and contents are required for notifications');
    }

    const payload: OneSignalCreateNotificationRequest = {
      app_id: this.appId,
      ...DEFAULT_NOTIFICATION_OPTIONS,
      ...request,
      headings: request.headings,
      contents: request.contents,
    };

    const response: AxiosResponse<OneSignalNotificationResponse> = await this.client.post(
      '/notifications',
      payload
    );

    return response.data;
  }

  /**
   * Send notification to specific user by external ID
   */
  async sendToUser(
    externalId: string,
    title: string,
    body: string,
    options: {
      url?: string;
      data?: Record<string, any>;
      icon?: string;
      badge?: string;
    } = {}
  ): Promise<OneSignalNotificationResponse> {
    return this.sendNotification({
      include_aliases: {
        external_id: [externalId],
      },
      headings: { en: title },
      contents: { en: body },
      url: options.url,
      data: options.data,
      chrome_web_icon: options.icon,
      chrome_web_badge: options.badge,
    });
  }

  /**
   * Send notification to users with specific tags
   */
  async sendToSegment(
    tags: Record<string, string>,
    title: string,
    body: string,
    options: {
      url?: string;
      data?: Record<string, any>;
      icon?: string;
      badge?: string;
    } = {}
  ): Promise<OneSignalNotificationResponse> {
    // Convert tags to OneSignal filter format
    const filters = Object.entries(tags).map(([key, value], index) => {
      const filter = {
        field: 'tag',
        key,
        relation: '=',
        value,
      };
      
      // Add AND operator between filters (except for the first one)
      return index > 0 ? { operator: 'AND' as const, ...filter } : filter;
    });

    return this.sendNotification({
      filters,
      headings: { en: title },
      contents: { en: body },
      url: options.url,
      data: options.data,
      chrome_web_icon: options.icon,
      chrome_web_badge: options.badge,
    });
  }

  /**
   * Get player (device) information
   */
  async getPlayer(playerId: string): Promise<OneSignalPlayerResponse> {
    const response: AxiosResponse<OneSignalPlayerResponse> = await this.client.get(
      `/players/${playerId}?app_id=${this.appId}`
    );

    return response.data;
  }

  /**
   * Update player tags
   */
  async updatePlayerTags(
    playerId: string,
    tags: Record<string, string>
  ): Promise<{ success: boolean }> {
    const response = await this.client.put(`/players/${playerId}`, {
      app_id: this.appId,
      tags,
    });

    return { success: response.status === 200 };
  }

  /**
   * Delete player tags
   */
  async deletePlayerTags(
    playerId: string,
    tagKeys: string[]
  ): Promise<{ success: boolean }> {
    const tags = tagKeys.reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {} as Record<string, string>);

    return this.updatePlayerTags(playerId, tags);
  }

  /**
   * Set external user ID for a player
   */
  async setExternalUserId(
    playerId: string,
    externalUserId: string
  ): Promise<{ success: boolean }> {
    const response = await this.client.put(`/players/${playerId}`, {
      app_id: this.appId,
      external_user_id: externalUserId,
    });

    return { success: response.status === 200 };
  }

  /**
   * Get notification delivery status
   */
  async getNotificationHistory(
    notificationId: string
  ): Promise<{
    success: boolean;
    id: string;
    recipients: number;
    platform_delivery_stats: Record<string, any>;
  }> {
    const response = await this.client.get(`/notifications/${notificationId}?app_id=${this.appId}`);
    return response.data;
  }

  /**
   * Get app information and statistics
   */
  async getAppInfo(): Promise<{
    id: string;
    name: string;
    players: number;
    messageable_players: number;
    updated_at: string;
  }> {
    const response = await this.client.get(`/apps/${this.appId}`);
    return response.data;
  }

  /**
   * Create a segment for targeted messaging
   */
  async createSegment(
    name: string,
    filters: Array<{
      field: string;
      key?: string;
      relation: string;
      value: string;
      operator?: 'AND' | 'OR';
    }>
  ): Promise<{ id: string; name: string }> {
    const response = await this.client.post('/segments', {
      app_id: this.appId,
      name,
      filters,
    });

    return response.data;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    if (!this.webhookSecret) {
      console.warn('[OneSignal] Webhook signature verification skipped - no secret configured');
      return true; // Allow in development if no secret is set
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('[OneSignal] Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Health check - verify OneSignal API connectivity
   */
  async healthCheck(): Promise<{
    status: 'up' | 'down';
    responseTime: number;
    lastCheck: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      await this.getAppInfo();
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        lastCheck: timestamp,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'down',
        responseTime,
        lastCheck: timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send test notification for development
   */
  async sendTestNotification(
    playerId: string,
    title: string = 'Test Notification',
    body: string = 'This is a test notification from bilet-demo'
  ): Promise<OneSignalNotificationResponse> {
    return this.sendNotification({
      include_subscription_ids: [playerId],
      headings: { en: `[DEV] ${title}` },
      contents: { en: body },
      data: {
        test: true,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  }

  /**
   * Get device type for OneSignal based on browser and OS
   */
  static getDeviceType(browser: string, os: string): number {
    const browserLower = browser.toLowerCase();
    const osLower = os.toLowerCase();

    if (osLower.includes('ios')) {
      return ONESIGNAL_DEVICE_TYPES.IOS;
    }

    if (osLower.includes('android')) {
      return ONESIGNAL_DEVICE_TYPES.ANDROID;
    }

    if (browserLower.includes('chrome')) {
      return ONESIGNAL_DEVICE_TYPES.CHROME_WEB;
    }

    if (browserLower.includes('firefox')) {
      return ONESIGNAL_DEVICE_TYPES.FIREFOX;
    }

    if (browserLower.includes('safari')) {
      return ONESIGNAL_DEVICE_TYPES.SAFARI;
    }

    if (browserLower.includes('edge')) {
      return ONESIGNAL_DEVICE_TYPES.EDGE;
    }

    // Default to Chrome Web for unknown browsers
    return ONESIGNAL_DEVICE_TYPES.CHROME_WEB;
  }
}

// Singleton instance
export const oneSignalService = new OneSignalService();