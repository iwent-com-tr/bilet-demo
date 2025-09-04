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
  private readonly client: AxiosInstance | null = null;
  private readonly appId: string;
  private readonly apiKey: string;
  private readonly webhookSecret?: string;

  constructor() {
    // Use standard environment variables
    this.appId = process.env.ONESIGNAL_APP_ID || '';
    this.apiKey = process.env.ONESIGNAL_API_KEY || '';
    this.webhookSecret = process.env.ONESIGNAL_WEBHOOK_SECRET;

    if (!this.appId) {
      console.warn(`⚠️  OneSignal configuration missing: ONESIGNAL_APP_ID is required. Push notifications will be disabled.`);
      return; // Don't initialize client if config is missing
    }

    if (!this.apiKey) {
      console.warn(`⚠️  OneSignal configuration missing: ONESIGNAL_API_KEY is required. Push notifications will be disabled.`);
      return; // Don't initialize client if config is missing
    }

    (this as any).client = axios.create({
      baseURL: 'https://api.onesignal.com/v1',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request/response interceptors for logging
    (this as any).client.interceptors.request.use(
      (config: any) => {
        console.log(`[OneSignal] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data ? 'present' : 'none',
          timestamp: new Date().toISOString(),
        });
        return config;
      },
      (error: any) => {
        console.error('[OneSignal] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    (this as any).client.interceptors.response.use(
      (response: any) => {
        console.log(`[OneSignal] Response ${response.status}`, {
          url: response.config.url,
          data: response.data ? 'received' : 'empty',
          timestamp: new Date().toISOString(),
        });
        return response;
      },
      (error: any) => {
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
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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

    const response: AxiosResponse<OneSignalNotificationResponse> = await this.client!.post(
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
   * Send notification to ticket holders of a specific event
   */
  async sendToEventTicketHolders(
    eventId: string,
    title: string,
    body: string,
    options: {
      url?: string;
      data?: Record<string, any>;
      icon?: string;
      badge?: string;
      ticketType?: string; // Optional: target specific ticket types
    } = {}
  ): Promise<OneSignalNotificationResponse> {
    const filters: any[] = [
      {
        field: 'tag',
        key: 'ticket_holder',
        relation: '=',
        value: 'true'
      },
      {
        operator: 'AND',
        field: 'tag',
        key: 'event_id',
        relation: '=',
        value: eventId
      }
    ];

    // Add ticket type filter if specified
    if (options.ticketType) {
      filters.push({
        operator: 'AND',
        field: 'tag',
        key: 'ticket_type',
        relation: '=',
        value: options.ticketType.toLowerCase().replace(/\s+/g, '_')
      });
    }

    return this.sendNotification({
      filters,
      headings: { en: title },
      contents: { en: body },
      url: options.url,
      data: {
        ...options.data,
        notification_type: 'event_ticket_holder',
        event_id: eventId,
        ticket_type: options.ticketType
      },
      chrome_web_icon: options.icon,
      chrome_web_badge: options.badge,
    });
  }

  /**
   * Send notification to all ticket holders (across all events)
   */
  async sendToAllTicketHolders(
    title: string,
    body: string,
    options: {
      url?: string;
      data?: Record<string, any>;
      icon?: string;
      badge?: string;
      eventCategory?: string; // Optional: target by event category
      eventCity?: string; // Optional: target by event city
    } = {}
  ): Promise<OneSignalNotificationResponse> {
    const filters: any[] = [
      {
        field: 'tag',
        key: 'ticket_holder',
        relation: '=',
        value: 'true'
      }
    ];

    // Add event category filter if specified
    if (options.eventCategory) {
      filters.push({
        operator: 'AND',
        field: 'tag',
        key: 'event_category',
        relation: '=',
        value: options.eventCategory.toLowerCase()
      });
    }

    // Add event city filter if specified
    if (options.eventCity) {
      filters.push({
        operator: 'AND',
        field: 'tag',
        key: 'event_city',
        relation: '=',
        value: options.eventCity.toLowerCase()
      });
    }

    return this.sendNotification({
      filters,
      headings: { en: title },
      contents: { en: body },
      url: options.url,
      data: {
        ...options.data,
        notification_type: 'all_ticket_holders',
        event_category: options.eventCategory,
        event_city: options.eventCity
      },
      chrome_web_icon: options.icon,
      chrome_web_badge: options.badge,
    });
  }

  /**
   * Send reminder notification before event starts
   */
  async sendEventReminder(
    eventId: string,
    eventName: string,
    hoursBeforeEvent: number,
    options: {
      venue?: string;
      startTime?: string;
      url?: string;
      data?: Record<string, any>;
    } = {}
  ): Promise<OneSignalNotificationResponse> {
    const title = `Etkinlik Hatırlatması: ${eventName}`;
    const body = hoursBeforeEvent === 24 
      ? `${eventName} etkinliği yarın başlıyor! ${options.venue ? `Konum: ${options.venue}` : ''}`
      : `${eventName} etkinliği ${hoursBeforeEvent} saat sonra başlıyor!`;

    return this.sendToEventTicketHolders(eventId, title, body, {
      url: options.url,
      data: {
        ...options.data,
        notification_type: 'event_reminder',
        hours_before: hoursBeforeEvent,
        event_name: eventName
      }
    });
  }

  /**
   * Get segment statistics for ticket holders
   */
  async getTicketHolderStats(): Promise<{
    totalTicketHolders: number;
    byEventCategory: Record<string, number>;
    byEventCity: Record<string, number>;
    recentPurchases: number; // Last 7 days
  }> {
    try {
      // This would require OneSignal's View apps API
      // For now, return placeholder data - in production you'd call:
      // const response = await this.client.get(`/apps/${this.appId}/segments`)
      
      return {
        totalTicketHolders: 0,
        byEventCategory: {},
        byEventCity: {},
        recentPurchases: 0
      };
    } catch (error) {
      console.error('Failed to get ticket holder stats:', error);
      throw error;
    }
  }

  /**
   * Get player (device) information
   */
  async getPlayer(playerId: string): Promise<OneSignalPlayerResponse> {
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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
    if (!this.client) {
      throw new Error('OneSignal client not initialized');
    }

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

  /**
   * Send friend request notification
   */
  async sendFriendRequestNotification(fromUserId: string, toUserId: string): Promise<void> {
    if (!this.client || !this.appId) {
      console.warn('OneSignal not configured, skipping friend request notification');
      return;
    }
    
    try {
      // Get sender user info
      const { prisma } = await import('../../lib/prisma');
      const fromUser = await prisma.user.findUnique({
        where: { id: fromUserId },
        select: { firstName: true, lastName: true, avatar: true }
      });

      if (!fromUser) {
        throw new Error('Sender user not found');
      }

      const senderName = `${fromUser.firstName} ${fromUser.lastName}`;

      await this.sendNotification({
        app_id: this.appId,
        filters: [
          { field: 'tag', key: 'user_id', relation: '=', value: toUserId }
        ],
        headings: { en: 'Yeni Arkadaşlık İsteği' },
        contents: { en: `${senderName} size arkadaşlık isteği gönderdi` },
        data: {
          type: 'FRIEND_REQUEST',
          fromUserId,
          toUserId,
          senderName
        },
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'friend_requests',
        small_icon: 'ic_notification',
        large_icon: fromUser.avatar || undefined,
        ...DEFAULT_NOTIFICATION_OPTIONS,
      });

      console.log(`[OneSignal] Friend request notification sent from ${senderName} to user ${toUserId}`);
    } catch (error) {
      console.error('[OneSignal] Failed to send friend request notification:', error);
      throw error;
    }
  }

  /**
   * Send friend request accepted notification
   */
  async sendFriendRequestAcceptedNotification(acceptedByUserId: string, originalSenderUserId: string): Promise<void> {
    if (!this.client || !this.appId) {
      console.warn('OneSignal not configured, skipping friend request accepted notification');
      return;
    }
    
    try {
      // Get accepter user info
      const { prisma } = await import('../../lib/prisma');
      const acceptedByUser = await prisma.user.findUnique({
        where: { id: acceptedByUserId },
        select: { firstName: true, lastName: true, avatar: true }
      });

      if (!acceptedByUser) {
        throw new Error('Accepter user not found');
      }

      const accepterName = `${acceptedByUser.firstName} ${acceptedByUser.lastName}`;

      await this.sendNotification({
        app_id: this.appId,
        filters: [
          { field: 'tag', key: 'user_id', relation: '=', value: originalSenderUserId }
        ],
        headings: { en: 'Arkadaşlık İsteği Kabul Edildi' },
        contents: { en: `${accepterName} arkadaşlık isteğinizi kabul etti` },
        data: {
          type: 'FRIEND_REQUEST_ACCEPTED',
          acceptedByUserId,
          originalSenderUserId,
          accepterName
        },
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'friend_requests',
        small_icon: 'ic_notification',
        large_icon: acceptedByUser.avatar || undefined,
        ...DEFAULT_NOTIFICATION_OPTIONS,
      });

      console.log(`[OneSignal] Friend request accepted notification sent from ${accepterName} to user ${originalSenderUserId}`);
    } catch (error) {
      console.error('[OneSignal] Failed to send friend request accepted notification:', error);
      throw error;
    }
  }

  /**
   * Send private message notification
   */
  async sendPrivateMessageNotification(senderId: string, receiverId: string, message: string): Promise<void> {
    if (!this.client || !this.appId) {
      console.warn('OneSignal not configured, skipping private message notification');
      return;
    }
    
    try {
      // Get sender user info
      const { prisma } = await import('../../lib/prisma');
      const senderUser = await prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true, avatar: true }
      });

      if (!senderUser) {
        throw new Error('Sender user not found');
      }

      const senderName = `${senderUser.firstName} ${senderUser.lastName}`;
      
      // Truncate message if too long
      const truncatedMessage = message.length > 100 ? `${message.substring(0, 100)}...` : message;

      await this.sendNotification({
        app_id: this.appId,
        filters: [
          { field: 'tag', key: 'user_id', relation: '=', value: receiverId }
        ],
        headings: { en: `${senderName}` },
        contents: { en: truncatedMessage },
        data: {
          type: 'PRIVATE_MESSAGE',
          senderId,
          receiverId,
          senderName,
          messagePreview: truncatedMessage
        },
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'messages',
        small_icon: 'ic_notification',
        large_icon: senderUser.avatar || undefined,
        ...DEFAULT_NOTIFICATION_OPTIONS,
      });

      console.log(`[OneSignal] Private message notification sent from ${senderName} to user ${receiverId}`);
    } catch (error) {
      console.error('[OneSignal] Failed to send private message notification:', error);
      throw error;
    }
  }

  /**
   * Send event message notification
   */
  async sendEventMessageNotification(senderId: string, eventId: string, message: string, senderType: 'USER' | 'ORGANIZER'): Promise<void> {
    if (!this.client || !this.appId) {
      console.warn('OneSignal not configured, skipping event message notification');
      return;
    }
    
    try {
      const { prisma } = await import('../../lib/prisma');
      
      // Get event info
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { 
          name: true, 
          banner: true,
          organizer: {
            select: { id: true }
          }
        }
      });

      if (!event) {
        throw new Error('Event not found');
      }

      // Get sender info
      let senderName = 'Bilinmeyen';
      let senderAvatar = null;

      if (senderType === 'USER') {
        const user = await prisma.user.findUnique({
          where: { id: senderId },
          select: { firstName: true, lastName: true, avatar: true }
        });
        if (user) {
          senderName = `${user.firstName} ${user.lastName}`;
          senderAvatar = user.avatar;
        }
      } else if (senderType === 'ORGANIZER') {
        const organizer = await prisma.organizer.findUnique({
          where: { id: senderId },
          select: { firstName: true, lastName: true, avatar: true }
        });
        if (organizer) {
          senderName = `${organizer.firstName} ${organizer.lastName}`;
          senderAvatar = organizer.avatar;
        }
      }

      // Get all ticket holders for this event (excluding the sender)
      const ticketHolders = await prisma.ticket.findMany({
        where: { 
          eventId,
          userId: { not: senderType === 'USER' ? senderId : undefined },
          status: 'ACTIVE'
        },
        select: { userId: true },
        distinct: ['userId']
      });

      if (ticketHolders.length === 0) {
        console.log(`No ticket holders found for event ${eventId}, skipping notification`);
        return;
      }

      // Create user ID filters for all ticket holders
      const userFilters = ticketHolders.map(ticket => ({
        field: 'tag' as const,
        key: 'user_id',
        relation: '=' as const,
        value: ticket.userId
      }));

      // Truncate message if too long
      const truncatedMessage = message.length > 100 ? `${message.substring(0, 100)}...` : message;

      await this.sendNotification({
        app_id: this.appId,
        filters: userFilters,
        headings: { en: `${event.name}` },
        contents: { en: `${senderName}: ${truncatedMessage}` },
        data: {
          type: 'EVENT_MESSAGE',
          eventId,
          senderId,
          senderType,
          senderName,
          eventName: event.name,
          messagePreview: truncatedMessage
        },
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'event_messages',
        small_icon: 'ic_notification',
        large_icon: senderAvatar || event.banner || undefined,
        ...DEFAULT_NOTIFICATION_OPTIONS,
      });

      console.log(`[OneSignal] Event message notification sent for event ${event.name} to ${ticketHolders.length} users`);
    } catch (error) {
      console.error('[OneSignal] Failed to send event message notification:', error);
      throw error;
    }
  }
}

// Singleton instance
export const oneSignalService = new OneSignalService();