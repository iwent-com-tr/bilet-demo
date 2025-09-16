import { Event } from '@prisma/client';

export interface EventChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export type EventChangeType = 'time_change' | 'venue_change' | 'cancellation' | 'status_change' | 'other';

export interface EventChangeDetectionResult {
  hasChanges: boolean;
  changeType: EventChangeType;
  changes: EventChange[];
  requiresNotification: boolean;
}

/**
 * Service for detecting significant changes in events that require notifications
 */
export class EventChangeDetector {
  /**
   * Detect changes between old and new event data
   */
  static detectChanges(
    oldEvent: Partial<Event>,
    newEvent: Partial<Event>
  ): EventChangeDetectionResult {
    const changes: EventChange[] = [];
    let changeType: EventChangeType = 'other';
    let requiresNotification = false;

    // Check for time changes (startDate, endDate)
    if (newEvent.startDate && oldEvent.startDate && 
        newEvent.startDate.getTime() !== oldEvent.startDate.getTime()) {
      changes.push({
        field: 'startDate',
        oldValue: oldEvent.startDate,
        newValue: newEvent.startDate,
      });
      changeType = 'time_change';
      requiresNotification = true;
    }

    if (newEvent.endDate && oldEvent.endDate && 
        newEvent.endDate.getTime() !== oldEvent.endDate.getTime()) {
      changes.push({
        field: 'endDate',
        oldValue: oldEvent.endDate,
        newValue: newEvent.endDate,
      });
      if (changeType === 'other') {
        changeType = 'time_change';
        requiresNotification = true;
      }
    }

    // Check for venue changes
    if (newEvent.venue !== undefined && oldEvent.venue !== newEvent.venue) {
      changes.push({
        field: 'venue',
        oldValue: oldEvent.venue,
        newValue: newEvent.venue,
      });
      if (changeType === 'other') {
        changeType = 'venue_change';
        requiresNotification = true;
      }
    }

    if (newEvent.address !== undefined && oldEvent.address !== newEvent.address) {
      changes.push({
        field: 'address',
        oldValue: oldEvent.address,
        newValue: newEvent.address,
      });
      if (changeType === 'other') {
        changeType = 'venue_change';
        requiresNotification = true;
      }
    }

    // Check for status changes (especially cancellation)
    if (newEvent.status !== undefined && oldEvent.status !== newEvent.status) {
      changes.push({
        field: 'status',
        oldValue: oldEvent.status,
        newValue: newEvent.status,
      });
      
      if (newEvent.status === 'CANCELLED') {
        changeType = 'cancellation';
        requiresNotification = true;
      } else if (changeType === 'other') {
        changeType = 'status_change';
        // Only notify for cancellation status changes
        requiresNotification = false;
      }
    }

    // Check for other significant changes that might require notification
    const significantFields = ['name', 'city'];
    for (const field of significantFields) {
      if (newEvent[field as keyof Event] !== undefined && 
          oldEvent[field as keyof Event] !== newEvent[field as keyof Event]) {
        changes.push({
          field,
          oldValue: oldEvent[field as keyof Event],
          newValue: newEvent[field as keyof Event],
        });
        if (changeType === 'other' && !requiresNotification) {
          requiresNotification = true; // These changes are worth notifying about
        }
      }
    }

    return {
      hasChanges: changes.length > 0,
      changeType,
      changes,
      requiresNotification,
    };
  }

  /**
   * Check if an event publication requires notification
   */
  static shouldNotifyForPublication(oldStatus: string, newStatus: string): boolean {
    return oldStatus === 'DRAFT' && newStatus === 'ACTIVE';
  }

  /**
   * Generate a human-readable description of changes
   */
  static generateChangeDescription(changes: EventChange[]): string {
    if (changes.length === 0) return 'No changes detected';

    const descriptions: string[] = [];

    for (const change of changes) {
      switch (change.field) {
        case 'startDate':
          descriptions.push(`Start time changed from ${new Date(change.oldValue).toLocaleString()} to ${new Date(change.newValue).toLocaleString()}`);
          break;
        case 'endDate':
          descriptions.push(`End time changed from ${new Date(change.oldValue).toLocaleString()} to ${new Date(change.newValue).toLocaleString()}`);
          break;
        case 'venue':
          descriptions.push(`Venue changed from "${change.oldValue}" to "${change.newValue}"`);
          break;
        case 'address':
          descriptions.push(`Address changed from "${change.oldValue}" to "${change.newValue}"`);
          break;
        case 'status':
          descriptions.push(`Status changed from ${change.oldValue} to ${change.newValue}`);
          break;
        case 'name':
          descriptions.push(`Event name changed from "${change.oldValue}" to "${change.newValue}"`);
          break;
        case 'city':
          descriptions.push(`City changed from "${change.oldValue}" to "${change.newValue}"`);
          break;
        default:
          descriptions.push(`${change.field} changed`);
      }
    }

    return descriptions.join(', ');
  }
}