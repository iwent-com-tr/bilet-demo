import { z } from 'zod';
import { Browser, OS, DeviceType, SegmentSource } from '@prisma/client';

// Enum validators
export const BrowserSchema = z.nativeEnum(Browser);
export const OSSchema = z.nativeEnum(OS);
export const DeviceTypeSchema = z.nativeEnum(DeviceType);
export const SegmentSourceSchema = z.nativeEnum(SegmentSource);

// Subscription sync validation
export const SyncSubscriptionSchema = z.object({
  onesignalUserId: z.string().min(1, 'OneSignal user ID is required'),
  browser: BrowserSchema,
  os: OSSchema,
  deviceType: DeviceTypeSchema,
  pwa: z.boolean(),
  subscriptionHash: z.string().optional(),
});

// Tag update validation
export const UpdateTagsSchema = z.object({
  tags: z.record(z.string(), z.string())
    .refine(
      (tags) => Object.keys(tags).length > 0,
      'At least one tag must be provided'
    )
    .refine(
      (tags) => Object.keys(tags).every(key => key.length <= 128),
      'Tag keys must be 128 characters or less'
    )
    .refine(
      (tags) => Object.values(tags).every(value => value.length <= 256),
      'Tag values must be 256 characters or less'
    ),
});

// Admin send notification validation
export const AdminSendSchema = z.object({
  target: z.object({
    userId: z.string().optional(),
    externalId: z.string().optional(),
    tags: z.record(z.string(), z.string()).optional(),
  }).refine(
    (target) => target.userId || target.externalId || target.tags,
    'At least one target must be specified (userId, externalId, or tags)'
  ),
  notification: z.object({
    title: z.string().min(1, 'Title is required').max(64, 'Title must be 64 characters or less'),
    body: z.string().min(1, 'Body is required').max(178, 'Body must be 178 characters or less'),
    url: z.string().url().optional(),
    icon: z.string().url().optional(),
    badge: z.string().url().optional(),
    data: z.record(z.string(), z.any()).optional(),
  }),
});

// OneSignal webhook validation
export const OneSignalWebhookSchema = z.object({
  app_id: z.string(),
  player_id: z.string(),
  user_id: z.string().optional(),
  timestamp: z.number(),
  notification: z.object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    url: z.string().optional(),
    icon: z.string().optional(),
    data: z.record(z.string(), z.any()).optional(),
  }),
  custom_data: z.record(z.string(), z.any()).optional(),
});

// Device sync validation
export const DeviceSyncSchema = z.object({
  onesignalUserId: z.string().min(1, 'OneSignal user ID is required'),
  deviceInfo: z.object({
    browser: BrowserSchema,
    os: OSSchema,
    deviceType: DeviceTypeSchema,
    pwa: z.boolean(),
    userAgent: z.string().optional(),
  }),
});

// Query parameter validation
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const SubscriptionQuerySchema = z.object({
  browser: BrowserSchema.optional(),
  os: OSSchema.optional(),
  deviceType: DeviceTypeSchema.optional(),
  pwa: z.coerce.boolean().optional(),
  subscribed: z.coerce.boolean().optional(),
}).merge(PaginationSchema);

// Stats query validation
export const StatsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['browser', 'os', 'deviceType', 'pwa']).optional(),
});

// Test notification validation
export const TestNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(64),
  body: z.string().min(1, 'Body is required').max(178),
  url: z.string().url().optional(),
  userId: z.string().optional(),
  testMode: z.boolean().default(true),
});

// Segment tag validation
export const SegmentTagSchema = z.object({
  key: z.string().min(1).max(128),
  value: z.string().min(1).max(256),
  source: SegmentSourceSchema.default(SegmentSource.INTERNAL),
});

export const BulkSegmentTagsSchema = z.object({
  tags: z.array(SegmentTagSchema).min(1).max(50),
});

// Response schemas for type inference
export const SubscriptionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  onesignalUserId: z.string(),
  browser: BrowserSchema,
  os: OSSchema,
  deviceType: DeviceTypeSchema,
  pwa: z.boolean(),
  subscribed: z.boolean(),
  lastSeen: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const NotificationStatsResponseSchema = z.object({
  totalSubscriptions: z.number(),
  activeSubscriptions: z.number(),
  totalSent: z.number(),
  totalDelivered: z.number(),
  totalClicked: z.number(),
  clickThroughRate: z.number(),
  byPlatform: z.object({
    web: z.number(),
    pwa: z.number(),
  }),
  byBrowser: z.record(z.string(), z.number()),
  byOS: z.record(z.string(), z.number()),
});

// Health check response
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  version: z.string(),
  services: z.object({
    onesignal: z.object({
      status: z.enum(['up', 'down']),
      responseTime: z.number().optional(),
      lastCheck: z.string(),
    }),
    database: z.object({
      status: z.enum(['up', 'down']),
      activeConnections: z.number().optional(),
      lastCheck: z.string(),
    }),
  }),
  metrics: z.object({
    totalSubscriptions: z.number(),
    recentEvents: z.number(),
    lastNotificationSent: z.string().optional(),
  }),
});

// Export type definitions for TypeScript inference
export type SyncSubscriptionRequest = z.infer<typeof SyncSubscriptionSchema>;
export type UpdateTagsRequest = z.infer<typeof UpdateTagsSchema>;
export type AdminSendRequest = z.infer<typeof AdminSendSchema>;
export type OneSignalWebhookEvent = z.infer<typeof OneSignalWebhookSchema>;
export type DeviceSyncRequest = z.infer<typeof DeviceSyncSchema>;
export type SubscriptionQuery = z.infer<typeof SubscriptionQuerySchema>;
export type StatsQuery = z.infer<typeof StatsQuerySchema>;
export type TestNotificationRequest = z.infer<typeof TestNotificationSchema>;
export type SegmentTag = z.infer<typeof SegmentTagSchema>;
export type BulkSegmentTagsRequest = z.infer<typeof BulkSegmentTagsSchema>;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;
export type NotificationStatsResponse = z.infer<typeof NotificationStatsResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;