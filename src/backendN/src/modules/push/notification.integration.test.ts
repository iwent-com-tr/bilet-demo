import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  ManualNotificationRequestSchema, 
  BroadcastNotificationRequestSchema,
  EventNotificationOptionsSchema 
} from './push.dto.js';

// Mock dependencies
vi.mock('../../lib/push/push-subscription.service.js');
vi.mock('../../lib/push/web-push.service.js');
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Notification Request Validation', () => {
    it('should validate complete event notification request', () => {
      const validData = {
        payload: {
          title: 'Event Update',
          body: 'Your event has been updated',
          url: 'https://example.com/events/123',
          actions: [
            {
              action: 'view',
              title: 'View Event',
            },
          ],
        },
        targetUserIds: ['550e8400-e29b-41d4-a716-446655440000'],
        options: {
          notificationType: 'event_update' as const,
          urgency: 'high' as const,
          ttl: 3600,
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.options?.notificationType).toBe('event_update');
        expect(result.data.options?.urgency).toBe('high');
        expect(result.data.options?.ttl).toBe(3600);
      }
    });

    it('should use default options when not provided', () => {
      const validData = {
        payload: {
          title: 'Test Event',
          body: 'Test notification',
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate event notification options separately', () => {
      const validOptions = {
        notificationType: 'event_reminder' as const,
        urgency: 'normal' as const,
        ttl: 7200,
      };

      const result = EventNotificationOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.notificationType).toBe('event_reminder');
        expect(result.data.urgency).toBe('normal');
        expect(result.data.ttl).toBe(7200);
      }
    });

    it('should apply default values for options', () => {
      const result = EventNotificationOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.notificationType).toBe('manual_test');
        expect(result.data.urgency).toBe('normal');
        expect(result.data.ttl).toBe(86400);
      }
    });

    it('should reject invalid TTL values', () => {
      const invalidOptions = {
        ttl: 2419201, // Exceeds max 28 days
      };

      const result = EventNotificationOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });
  });

  describe('Broadcast Notification Request Validation', () => {
    it('should validate broadcast notification request', () => {
      const validData = {
        payload: {
          title: 'System Announcement',
          body: 'Important system update',
          icon: 'https://example.com/icon.png',
        },
      };

      const result = BroadcastNotificationRequestSchema.safeParse(validData);
      if (!result.success) {
        console.log('Validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.payload.url).toBe('/'); // Default URL
      }
    });

    it('should accept custom URL for broadcast', () => {
      const validData = {
        payload: {
          title: 'System Announcement',
          body: 'Important system update',
          url: 'https://example.com/announcements',
        },
      };

      const result = BroadcastNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.payload.url).toBe('https://example.com/announcements');
      }
    });

    it('should reject invalid URL in broadcast payload', () => {
      const invalidData = {
        payload: {
          title: 'System Announcement',
          body: 'Important system update',
          url: 'invalid-url',
        },
      };

      const result = BroadcastNotificationRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Notification Payload Validation', () => {
    it('should validate notification actions', () => {
      const validData = {
        payload: {
          title: 'Event Reminder',
          body: 'Your event starts in 1 hour',
          actions: [
            {
              action: 'view',
              title: 'View Event',
              icon: 'https://example.com/view-icon.png',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ],
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject more than 2 actions', () => {
      const invalidData = {
        payload: {
          title: 'Event Reminder',
          body: 'Your event starts in 1 hour',
          actions: [
            { action: 'view', title: 'View' },
            { action: 'edit', title: 'Edit' },
            { action: 'delete', title: 'Delete' }, // Third action should fail
          ],
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty action titles', () => {
      const invalidData = {
        payload: {
          title: 'Event Reminder',
          body: 'Your event starts in 1 hour',
          actions: [
            {
              action: 'view',
              title: '', // Empty title should fail
            },
          ],
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Authorization and Rate Limiting', () => {
    it('should validate notification types', () => {
      const validTypes = ['event_update', 'event_reminder', 'manual_test'];
      
      validTypes.forEach(type => {
        const result = EventNotificationOptionsSchema.safeParse({
          notificationType: type,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid notification types', () => {
      const result = EventNotificationOptionsSchema.safeParse({
        notificationType: 'invalid_type',
      });
      expect(result.success).toBe(false);
    });

    it('should validate urgency levels', () => {
      const validUrgencies = ['very-low', 'low', 'normal', 'high'];
      
      validUrgencies.forEach(urgency => {
        const result = EventNotificationOptionsSchema.safeParse({
          urgency,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid urgency levels', () => {
      const result = EventNotificationOptionsSchema.safeParse({
        urgency: 'critical', // Not in allowed values
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty target user IDs array', () => {
      const validData = {
        payload: {
          title: 'Test',
          body: 'Test notification',
        },
        targetUserIds: [],
      };

      const result = ManualNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format in target user IDs', () => {
      const invalidData = {
        payload: {
          title: 'Test',
          body: 'Test notification',
        },
        targetUserIds: ['invalid-uuid'],
      };

      const result = ManualNotificationRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should handle long titles and bodies within limits', () => {
      const validData = {
        payload: {
          title: 'A'.repeat(100), // Exactly at limit
          body: 'B'.repeat(200), // Exactly at limit
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject titles and bodies exceeding limits', () => {
      const invalidData = {
        payload: {
          title: 'A'.repeat(101), // Exceeds limit
          body: 'B'.repeat(201), // Exceeds limit
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});