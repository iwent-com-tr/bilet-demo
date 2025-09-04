-- Database indexes for efficient user targeting and push notification queries
-- These indexes optimize the performance of user targeting queries

-- Index for finding users with tickets for specific events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_event_user_status 
ON "Ticket" ("eventId", "userId", "status") 
WHERE "status" = 'ACTIVE';

-- Index for finding users by city with push subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_city_deleted 
ON "User" ("city", "deletedAt") 
WHERE "deletedAt" IS NULL;

-- Index for notification preferences by category and enabled status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_prefs_category_enabled 
ON "UserNotificationPreference" ("category", "enabled", "userId") 
WHERE "enabled" = true;

-- Composite index for push subscriptions with user relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_push_subscriptions_user_enabled 
ON "PushSubscription" ("userId", "enabled", "lastSeenAt") 
WHERE "enabled" = true;

-- Index for finding active tickets by event (for counting ticket holders)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_event_active 
ON "Ticket" ("eventId") 
WHERE "status" = 'ACTIVE';

-- Index for user targeting by multiple user IDs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id_deleted 
ON "User" ("id", "deletedAt") 
WHERE "deletedAt" IS NULL;

-- Index for push subscription cleanup by endpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_push_subscriptions_endpoint_enabled 
ON "PushSubscription" ("endpoint", "enabled");

-- Index for finding users with any active push subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_push_subscriptions_enabled_user 
ON "PushSubscription" ("enabled", "userId") 
WHERE "enabled" = true;

-- Partial index for active events (for new event notifications)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_status_created 
ON "Event" ("status", "createdAt", "deletedAt") 
WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;

-- Index for user settings by user and item (for notification preferences)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_item 
ON "UserSetting" ("userId", "itemId");

-- Comments explaining the purpose of each index:

-- idx_tickets_event_user_status: Optimizes queries to find users with active tickets for specific events
-- idx_users_city_deleted: Optimizes city-based user targeting queries
-- idx_notification_prefs_category_enabled: Optimizes notification preference filtering
-- idx_push_subscriptions_user_enabled: Optimizes push subscription queries by user
-- idx_tickets_event_active: Optimizes counting active tickets per event
-- idx_users_id_deleted: Optimizes user lookup by ID arrays
-- idx_push_subscriptions_endpoint_enabled: Optimizes subscription cleanup operations
-- idx_push_subscriptions_enabled_user: Optimizes finding users with active subscriptions
-- idx_events_status_created: Optimizes new event notification queries
-- idx_user_settings_user_item: Optimizes user settings lookup