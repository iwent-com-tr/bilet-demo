import { z } from 'zod';

// Push subscription data validation schema with enhanced security
export const PushSubscriptionDataSchema = z.object({
  endpoint: z.string()
    .url('Invalid endpoint URL')
    .refine((url) => {
      // Validate that endpoint is from known push services
      const allowedDomains = [
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'web.push.apple.com',
        'wns2-*.notify.windows.com',
        'notify.windows.com'
      ];
      
      try {
        const urlObj = new URL(url);
        return allowedDomains.some(domain => 
          urlObj.hostname === domain || 
          (domain.includes('*') && urlObj.hostname.match(domain.replace('*', '.*')))
        );
      } catch {
        return false;
      }
    }, 'Endpoint must be from a recognized push service'),
  keys: z.object({
    p256dh: z.string()
      .min(1, 'p256dh key is required')
      .max(200, 'p256dh key too long')
      .regex(/^[A-Za-z0-9+/=_-]+$/, 'Invalid p256dh key format'),
    auth: z.string()
      .min(1, 'auth key is required')
      .max(200, 'auth key too long')
      .regex(/^[A-Za-z0-9+/=_-]+$/, 'Invalid auth key format'),
  }),
  expirationTime: z.number().nullable().optional(),
});

// Subscribe request schema with enhanced validation
export const SubscribeRequestSchema = z.object({
  subscription: PushSubscriptionDataSchema,
  userAgent: z.string()
    .max(500, 'User agent too long')
    .regex(/^[a-zA-Z0-9\s\(\)\/\.\-_,;:]+$/, 'Invalid user agent format')
    .optional(),
});

// Unsubscribe request schema
export const UnsubscribeRequestSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
});

// Notification payload schema with enhanced security validation
export const NotificationPayloadSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title too long')
    .regex(/^[^<>]*$/, 'Title cannot contain HTML tags'),
  body: z.string()
    .min(1, 'Body is required')
    .max(200, 'Body too long')
    .regex(/^[^<>]*$/, 'Body cannot contain HTML tags'),
  url: z.string()
    .url('Invalid URL')
    .refine((url) => {
      // Only allow relative URLs or URLs from the same origin
      try {
        const urlObj = new URL(url);
        const allowedOrigins = [
          process.env.CLIENT_ORIGIN || 'http://localhost:3001',
          ...(process.env.ADDITIONAL_ORIGINS?.split(',') || [])
        ].filter(Boolean);
        
        return allowedOrigins.includes(urlObj.origin);
      } catch {
        // If URL parsing fails, check if it's a relative URL
        return url.startsWith('/') && !url.startsWith('//');
      }
    }, 'URL must be relative or from allowed origin')
    .optional(),
  icon: z.string()
    .url('Invalid icon URL')
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }, 'Icon must be a valid HTTP/HTTPS URL')
    .optional(),
  badge: z.string()
    .url('Invalid badge URL')
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }, 'Badge must be a valid HTTP/HTTPS URL')
    .optional(),
  actions: z.array(z.object({
    action: z.string()
      .min(1, 'Action is required')
      .max(50, 'Action too long')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Action must contain only alphanumeric characters, underscores, and hyphens'),
    title: z.string()
      .min(1, 'Action title is required')
      .max(50, 'Action title too long')
      .regex(/^[^<>]*$/, 'Action title cannot contain HTML tags'),
    icon: z.string()
      .url('Invalid action icon URL')
      .refine((url) => {
        try {
          const urlObj = new URL(url);
          return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
          return false;
        }
      }, 'Action icon must be a valid HTTP/HTTPS URL')
      .optional(),
  })).max(2, 'Maximum 2 actions allowed').optional(),
});

// Event notification options schema
export const EventNotificationOptionsSchema = z.object({
  notificationType: z.enum(['event_update', 'event_reminder', 'manual_test']).default('manual_test'),
  urgency: z.enum(['very-low', 'low', 'normal', 'high']).default('normal'),
  ttl: z.number().min(0).max(2419200).default(86400), // Max 28 days, default 24 hours
});

// Manual notification request schema with enhanced validation
export const ManualNotificationRequestSchema = z.object({
  payload: NotificationPayloadSchema,
  targetUserIds: z.array(z.string().uuid('Invalid user ID format'))
    .max(1000, 'Too many target users (max 1000)')
    .optional(),
  options: EventNotificationOptionsSchema.optional(),
});

// Broadcast notification payload schema with enhanced security
const BroadcastNotificationPayloadSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title too long')
    .regex(/^[^<>]*$/, 'Title cannot contain HTML tags'),
  body: z.string()
    .min(1, 'Body is required')
    .max(200, 'Body too long')
    .regex(/^[^<>]*$/, 'Body cannot contain HTML tags'),
  url: z.string()
    .default('/')
    .refine((val) => {
      if (val === '/') return true;
      
      try {
        const urlObj = new URL(val);
        const allowedOrigins = [
          process.env.CLIENT_ORIGIN || 'http://localhost:3001',
          ...(process.env.ADDITIONAL_ORIGINS?.split(',') || [])
        ].filter(Boolean);
        
        return allowedOrigins.includes(urlObj.origin);
      } catch {
        // Check if it's a relative URL
        return val.startsWith('/') && !val.startsWith('//');
      }
    }, 'URL must be relative or from allowed origin'),
  icon: z.string()
    .url('Invalid icon URL')
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }, 'Icon must be a valid HTTP/HTTPS URL')
    .optional(),
  badge: z.string()
    .url('Invalid badge URL')
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }, 'Badge must be a valid HTTP/HTTPS URL')
    .optional(),
  actions: z.array(z.object({
    action: z.string()
      .min(1, 'Action is required')
      .max(50, 'Action too long')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Action must contain only alphanumeric characters, underscores, and hyphens'),
    title: z.string()
      .min(1, 'Action title is required')
      .max(50, 'Action title too long')
      .regex(/^[^<>]*$/, 'Action title cannot contain HTML tags'),
    icon: z.string()
      .url('Invalid action icon URL')
      .refine((url) => {
        try {
          const urlObj = new URL(url);
          return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
          return false;
        }
      }, 'Action icon must be a valid HTTP/HTTPS URL')
      .optional(),
  })).max(2, 'Maximum 2 actions allowed').optional(),
});

// Broadcast notification request schema (admin only)
export const BroadcastNotificationRequestSchema = z.object({
  payload: BroadcastNotificationPayloadSchema,
});

// Test notification to all subscribers request schema (admin only)
export const TestNotificationToAllRequestSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title too long')
    .regex(/^[^<>]*$/, 'Title cannot contain HTML tags')
    .optional(),
  body: z.string()
    .min(1, 'Body is required')
    .max(200, 'Body too long')
    .regex(/^[^<>]*$/, 'Body cannot contain HTML tags')
    .optional(),
  url: z.string()
    .refine((val) => {
      if (!val || val === '/') return true;
      
      try {
        const urlObj = new URL(val);
        const allowedOrigins = [
          process.env.CLIENT_ORIGIN || 'http://localhost:3001',
          ...(process.env.ADDITIONAL_ORIGINS?.split(',') || [])
        ].filter(Boolean);
        
        return allowedOrigins.includes(urlObj.origin);
      } catch {
        // Check if it's a relative URL
        return val.startsWith('/') && !val.startsWith('//');
      }
    }, 'URL must be relative or from allowed origin')
    .optional(),
  icon: z.string()
    .url('Invalid icon URL')
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }, 'Icon must be a valid HTTP/HTTPS URL')
    .optional(),
  badge: z.string()
    .url('Invalid badge URL')
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }, 'Badge must be a valid HTTP/HTTPS URL')
    .optional(),
});

export type PushSubscriptionData = z.infer<typeof PushSubscriptionDataSchema>;
export type SubscribeRequest = z.infer<typeof SubscribeRequestSchema>;
export type UnsubscribeRequest = z.infer<typeof UnsubscribeRequestSchema>;
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
export type ManualNotificationRequest = z.infer<typeof ManualNotificationRequestSchema>;
export type BroadcastNotificationRequest = z.infer<typeof BroadcastNotificationRequestSchema>;
export type TestNotificationToAllRequest = z.infer<typeof TestNotificationToAllRequestSchema>;
export type EventNotificationOptions = z.infer<typeof EventNotificationOptionsSchema>;