#!/usr/bin/env node

/**
 * Standalone notification worker process
 * This can be run as a separate process for better scalability
 */

import { PrismaClient } from '@prisma/client';
import { createNotificationWorker } from '../lib/queue/notification.worker.js';
import { closeQueue } from '../lib/queue/index.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create and start the notification worker
const worker = createNotificationWorker(prisma);

console.log('🚀 Notification worker started');
console.log(`📊 Worker concurrency: ${process.env.NOTIFICATION_WORKER_CONCURRENCY || '200'}`);
console.log(`🔗 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close worker
    await worker.close();
    
    // Close queue connections
    await closeQueue();
    
    // Close Prisma connection
    await prisma.$disconnect();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Keep the process alive
process.on('exit', (code) => {
  console.log(`📴 Worker process exiting with code ${code}`);
});