import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventService } from '../modules/event/event.service';
import { EventChangeDetector } from './event-change-detector';
import { notificationService } from './queue/notification.service';

// Mock the notification service
vi.mock('./queue/notification.service', () => ({
  notificationService: {
    queueEventUpdateNotification: vi.fn(),
    queueNewEventNotification: vi.fn(),
  },
}));

// Mock the prisma client
vi.mock('./prisma', () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock other dependencies
vi.mock('../chat', () => ({
  notifyEventCreated: vi.fn(),
  notifyEventPublished: vi.fn(),
}));

vi.mock('./meili', () => ({
  eventIndex: {
    updateDocuments: vi.fn(),
    addDocuments: vi.fn(),
  },
}));

describe('Event Notification Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EventChangeDetector', () => {
    it('should detect time changes correctly', () => {
      const oldEvent = {
        id: 'event1',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T12:00:00Z'),
        venue: 'Old Venue',
        status: 'ACTIVE',
      };

      const newEvent = {
        startDate: new Date('2024-01-01T11:00:00Z'),
        endDate: new Date('2024-01-01T13:00:00Z'),
      };

      const result = EventChangeDetector.detectChanges(oldEvent, newEvent);

      expect(result.hasChanges).toBe(true);
      expect(result.changeType).toBe('time_change');
      expect(result.requiresNotification).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(result.changes[0].field).toBe('startDate');
      expect(result.changes[1].field).toBe('endDate');
    });

    it('should detect venue changes correctly', () => {
      const oldEvent = {
        id: 'event1',
        venue: 'Old Venue',
        address: 'Old Address',
        status: 'ACTIVE',
      };

      const newEvent = {
        venue: 'New Venue',
        address: 'New Address',
      };

      const result = EventChangeDetector.detectChanges(oldEvent, newEvent);

      expect(result.hasChanges).toBe(true);
      expect(result.changeType).toBe('venue_change');
      expect(result.requiresNotification).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(result.changes[0].field).toBe('venue');
      expect(result.changes[1].field).toBe('address');
    });

    it('should detect cancellation correctly', () => {
      const oldEvent = {
        id: 'event1',
        status: 'ACTIVE',
      };

      const newEvent = {
        status: 'CANCELLED',
      };

      const result = EventChangeDetector.detectChanges(oldEvent, newEvent);

      expect(result.hasChanges).toBe(true);
      expect(result.changeType).toBe('cancellation');
      expect(result.requiresNotification).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].field).toBe('status');
    });

    it('should not require notification for minor changes', () => {
      const oldEvent = {
        id: 'event1',
        description: 'Old description',
        status: 'ACTIVE',
      };

      const newEvent = {
        description: 'New description',
      };

      const result = EventChangeDetector.detectChanges(oldEvent, newEvent);

      expect(result.hasChanges).toBe(false);
      expect(result.requiresNotification).toBe(false);
    });

    it('should detect publication correctly', () => {
      const shouldNotify = EventChangeDetector.shouldNotifyForPublication('DRAFT', 'ACTIVE');
      expect(shouldNotify).toBe(true);

      const shouldNotNotify = EventChangeDetector.shouldNotifyForPublication('ACTIVE', 'ACTIVE');
      expect(shouldNotNotify).toBe(false);
    });

    it('should generate change descriptions correctly', () => {
      const changes = [
        {
          field: 'startDate',
          oldValue: new Date('2024-01-01T10:00:00Z'),
          newValue: new Date('2024-01-01T11:00:00Z'),
        },
        {
          field: 'venue',
          oldValue: 'Old Venue',
          newValue: 'New Venue',
        },
      ];

      const description = EventChangeDetector.generateChangeDescription(changes);
      
      expect(description).toContain('Start time changed');
      expect(description).toContain('Venue changed from "Old Venue" to "New Venue"');
    });
  });

  describe('Event Service Integration', () => {
    it('should queue notification when updating published event with significant changes', async () => {
      // Mock existing event
      const existingEvent = {
        id: 'event1',
        name: 'Test Event',
        startDate: new Date('2024-01-01T10:00:00Z'),
        venue: 'Old Venue',
        status: 'ACTIVE',
        category: 'CONCERT',
        organizerId: 'org1',
        deletedAt: null,
      };

      // Mock updated event
      const updatedEvent = {
        ...existingEvent,
        startDate: new Date('2024-01-01T11:00:00Z'),
        venue: 'New Venue',
      };

      // Mock prisma calls
      const { prisma } = await import('./prisma');
      (prisma.event.findFirst as any).mockResolvedValue(existingEvent);
      (prisma.event.update as any).mockResolvedValue(updatedEvent);

      // Mock the update input
      const updateInput = {
        startDate: new Date('2024-01-01T11:00:00Z'),
        venue: 'New Venue',
      };

      // Call the service method
      await EventService.update('event1', updateInput);

      // Verify notification was queued
      expect(notificationService.queueEventUpdateNotification).toHaveBeenCalledWith({
        eventId: 'event1',
        changeType: 'time_change',
        changes: expect.arrayContaining([
          expect.objectContaining({
            field: 'startDate',
            oldValue: existingEvent.startDate,
            newValue: updateInput.startDate,
          }),
          expect.objectContaining({
            field: 'venue',
            oldValue: existingEvent.venue,
            newValue: updateInput.venue,
          }),
        ]),
      });
    });

    it('should not queue notification when updating draft event', async () => {
      // Mock existing draft event
      const existingEvent = {
        id: 'event1',
        name: 'Test Event',
        startDate: new Date('2024-01-01T10:00:00Z'),
        venue: 'Old Venue',
        status: 'DRAFT', // Draft status
        category: 'CONCERT',
        organizerId: 'org1',
        deletedAt: null,
      };

      const updatedEvent = {
        ...existingEvent,
        startDate: new Date('2024-01-01T11:00:00Z'),
      };

      const { prisma } = await import('./prisma');
      (prisma.event.findFirst as any).mockResolvedValue(existingEvent);
      (prisma.event.update as any).mockResolvedValue(updatedEvent);

      const updateInput = {
        startDate: new Date('2024-01-01T11:00:00Z'),
      };

      await EventService.update('event1', updateInput);

      // Verify notification was NOT queued for draft event
      expect(notificationService.queueEventUpdateNotification).not.toHaveBeenCalled();
    });

    it('should queue new event notification when publishing for first time', async () => {
      // Mock existing draft event
      const existingEvent = {
        id: 'event1',
        name: 'Test Event',
        status: 'DRAFT',
        category: 'CONCERT',
        organizerId: 'org1',
        deletedAt: null,
      };

      const publishedEvent = {
        ...existingEvent,
        status: 'ACTIVE',
      };

      const { prisma } = await import('./prisma');
      (prisma.event.findFirst as any).mockResolvedValue(existingEvent);
      (prisma.event.update as any).mockResolvedValue(publishedEvent);

      await EventService.publish('event1');

      // Verify new event notification was queued
      expect(notificationService.queueNewEventNotification).toHaveBeenCalledWith({
        eventId: 'event1',
      });
    });

    it('should not queue new event notification when republishing', async () => {
      // Mock existing active event
      const existingEvent = {
        id: 'event1',
        name: 'Test Event',
        status: 'ACTIVE', // Already active
        category: 'CONCERT',
        organizerId: 'org1',
        deletedAt: null,
      };

      const { prisma } = await import('./prisma');
      (prisma.event.findFirst as any).mockResolvedValue(existingEvent);
      (prisma.event.update as any).mockResolvedValue(existingEvent);

      await EventService.publish('event1');

      // Verify new event notification was NOT queued
      expect(notificationService.queueNewEventNotification).not.toHaveBeenCalled();
    });

    it('should handle notification service errors gracefully', async () => {
      // Mock existing event
      const existingEvent = {
        id: 'event1',
        name: 'Test Event',
        startDate: new Date('2024-01-01T10:00:00Z'),
        status: 'ACTIVE',
        category: 'CONCERT',
        organizerId: 'org1',
        deletedAt: null,
      };

      const updatedEvent = {
        ...existingEvent,
        startDate: new Date('2024-01-01T11:00:00Z'),
      };

      const { prisma } = await import('./prisma');
      (prisma.event.findFirst as any).mockResolvedValue(existingEvent);
      (prisma.event.update as any).mockResolvedValue(updatedEvent);

      // Mock notification service to throw error
      (notificationService.queueEventUpdateNotification as any).mockRejectedValue(
        new Error('Queue service unavailable')
      );

      const updateInput = {
        startDate: new Date('2024-01-01T11:00:00Z'),
      };

      // Should not throw error even if notification fails
      await expect(EventService.update('event1', updateInput)).resolves.toBeDefined();

      // Verify notification was attempted
      expect(notificationService.queueEventUpdateNotification).toHaveBeenCalled();
    });
  });
});