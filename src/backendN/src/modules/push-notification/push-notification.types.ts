import { Browser, OS, DeviceType, SegmentSource } from '@prisma/client';

// OneSignal API Types
export interface OneSignalCreateNotificationRequest {
  app_id: string;
  include_aliases?: {
    external_id?: string[];
    onesignal_id?: string[];
  };
  include_subscription_ids?: string[];
  filters?: Array<{
    field: string;
    key?: string;
    relation: string;
    value: string;
    operator?: 'AND' | 'OR';
    filters?: Array<{
      field: string;
      key?: string;
      relation: string;
      value: string;
    }>;
  }>;
  target_channel?: 'push';
  headings?: Record<string, string>;
  contents?: Record<string, string>;
  url?: string;
  web_url?: string;
  app_url?: string;
  data?: Record<string, any>;
  web_push_topic?: string;
  priority?: number;
  ttl?: number;
  delay_option?: 'timezone' | 'immediate';
  send_after?: string;
  custom_data?: Record<string, any>;
  chrome_web_icon?: string;
  chrome_web_badge?: string;
  ios_badgeType?: string;
  ios_badgeCount?: number;
  android_channel_id?: string;
  small_icon?: string;
  large_icon?: string;
}

export interface OneSignalNotificationResponse {
  id: string;
  recipients: number;
  external_id_recipients?: number;
  errors?: {
    type: string;
    message: string;
  }[];
}

export interface OneSignalPlayerResponse {
  id: string;
  external_user_id?: string;
  app_id: string;
  device_type: number;
  browser?: string;
  browser_version?: string;
  device_os?: string;
  device_model?: string;
  timezone?: number;
  language?: string;
  tags?: Record<string, string>;
  last_active?: number;
  playtime?: number;
  badge_count?: number;
  notification_types?: number;
  session_count?: number;
  web_auth?: string;
  web_p256dh?: string;
  created_at?: number;
  invalid_identifier?: boolean;
}

// Internal API Types
export interface SyncSubscriptionRequest {
  onesignalUserId: string;      // OneSignal player_id
  browser: Browser;             // CHROME, SAFARI, FIREFOX, EDGE, OTHER
  os: OS;                       // IOS, ANDROID, MACOS, WINDOWS, LINUX, OTHER
  deviceType: DeviceType;       // DESKTOP, MOBILE, TABLET
  pwa: boolean;                 // Is PWA installation
  subscriptionHash?: string;    // Optional: hash of subscription endpoint
}

export interface UpdateTagsRequest {
  tags: Record<string, string>; // Key-value pairs for user segmentation
}

export interface AdminSendRequest {
  target: {
    userId?: string;            // Send to specific user
    externalId?: string;        // Send to external ID
    tags?: Record<string, string>; // Send to users with tags
    eventId?: string;           // Send to event ticket holders
    ticketType?: string;        // Target specific ticket type
    eventCategory?: string;     // Target by event category
    eventCity?: string;         // Target by event city
  };
  notification: {
    title: string;
    body: string;
    url?: string;               // Click action URL
    icon?: string;              // Notification icon
    badge?: string;             // Badge icon
    data?: Record<string, any>; // Custom data
  };
}

export interface OneSignalWebhookEvent {
  app_id: string;
  player_id: string;
  user_id?: string;             // External ID if set
  timestamp: number;
  notification: {
    id: string;
    title: string;
    body: string;
    url?: string;
    icon?: string;
    data?: Record<string, any>;
  };
  custom_data?: Record<string, any>;
}

export interface SubscriptionResponse {
  id: string;
  userId: string;
  onesignalUserId: string;
  browser: Browser;
  os: OS;
  deviceType: DeviceType;
  pwa: boolean;
  subscribed: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStatsResponse {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalSent: number;
  totalDelivered: number;
  totalClicked: number;
  clickThroughRate: number;
  byPlatform: {
    web: number;
    pwa: number;
  };
  byBrowser: Record<Browser, number>;
  byOS: Record<OS, number>;
}

export interface DeviceInfo {
  browser: Browser;
  os: OS;
  deviceType: DeviceType;
  pwa: boolean;
  userAgent?: string;
}

// Ticket holder specific notification types
export interface TicketHolderNotificationRequest {
  eventId: string;
  ticketType?: string;        // Optional: target specific ticket types
  notification: {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
  };
}

export interface EventReminderRequest {
  eventId: string;
  eventName: string;
  hoursBeforeEvent: number;   // 24, 2, etc.
  venue?: string;
  startTime?: string;
  url?: string;
  data?: Record<string, any>;
}

export interface SegmentNotificationRequest {
  segment: {
    ticketHolders?: boolean;    // Target all ticket holders
    eventCategory?: string;     // Target by event category
    eventCity?: string;         // Target by event city
    customTags?: Record<string, string>; // Custom tag filters
  };
  notification: {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
  };
}

// Ticket holder tag structure
export interface TicketHolderTags {
  ticket_holder: 'true';
  event_id: string;
  ticket_type: string;        // Normalized ticket type
  event_category: string;     // Event category in lowercase
  event_city: string;         // Event city in lowercase
  ticket_reference: string;   // Ticket reference code
  purchase_date: string;      // YYYY-MM-DD
  event_month: string;        // YYYY-MM
  has_ticket: 'true';
  customer_type: 'ticket_buyer';
}

// OneSignal device types mapping
export const ONESIGNAL_DEVICE_TYPES = {
  IOS: 0,
  ANDROID: 1,
  AMAZON: 2,
  WINDOWS_PHONE: 3,
  CHROME_APP: 4,
  CHROME_WEB: 5,
  WINDOWS_PHONE_MPNS: 6,
  TIZEN: 7,
  ADS: 8,
  XBOX: 9,
  ALEXA: 10,
  DISCORD: 11,
  FIREFOX: 12,
  MACOS: 13,
  HARMONY_OS: 14,
  EDGE: 15,
  SAFARI: 17,
} as const;

// Default notification options
export const DEFAULT_NOTIFICATION_OPTIONS = {
  priority: 5,
  ttl: 259200, // 3 days
  web_push_topic: 'bilet-demo',
} as const;