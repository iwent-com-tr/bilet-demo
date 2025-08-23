import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import http from 'http';
import path from 'path';
import { validateEnvironmentOrExit } from './lib/push/environment-validator.js';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import organizerRoutes from './modules/organizer/organizer.routes';
import eventRoutes from './modules/event/event.routes';
import ticketRoutes from './modules/tickets/ticket.routes';
import friendshipRoutes from './modules/friendship/friendship.routes';
import { prisma } from './lib/prisma';
import { setupChat } from './chat';
import { initMeili } from './lib/meili';
import { populateEvents } from './lib/event-populator';
import settingsRoutes from './modules/settings/settings.routes';
import pushRoutes from './modules/push/push.routes';
import notificationRoutes from './modules/push/notification.routes';
import queueRoutes from './modules/queue/queue.routes';
import { createNotificationWorker } from './lib/queue/notification.worker';
import { closeQueue } from './lib/queue/index';
dotenv.config();

// Validate environment configuration on startup
validateEnvironmentOrExit();

const args = process.argv.slice(2);
const EVENT_POPULATE_COUNT = parseInt(process.env.POPULATOR_EVENT_COUNT ?? '100');

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3001';
app.use(helmet());
app.use(cors({
  origin: [CLIENT_ORIGIN],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
// Serve uploaded assets
app.use('/uploads', (req, res, next) => {
  if (req.url.includes('..')) return res.status(400).end();
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/organizers`, organizerRoutes);
app.use(`${API_PREFIX}/events`, eventRoutes);
app.use(`${API_PREFIX}/tickets`, ticketRoutes);
app.use(`${API_PREFIX}/friendships`, friendshipRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/push`, pushRoutes);
app.use(`${API_PREFIX}/events`, notificationRoutes);
app.use(`${API_PREFIX}/queue`, queueRoutes);

// Server status check
app.get(`${API_PREFIX}/health`, (_req, res) => res.json({ status: 'ok' }));
app.get(`${API_PREFIX}/db-check`, async (_req, res) => {
  try {
    await prisma.$connect();
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});


const server = http.createServer(app);
// Initialize Socket.IO chat server (namespace: /chat)
setupChat(server);

// Initialize MeiliSearch indexes
initMeili();

// Populate if ran with --populate
if (args.includes('--populate')) {
  await populateEvents(EVENT_POPULATE_COUNT);
  console.log(`Database populated with ${EVENT_POPULATE_COUNT} random events.`);
  process.exit(0);
}

// Optionally start the notification worker in the same process
let notificationWorker: any = null;
if (process.env.START_WORKER === 'true') {
  notificationWorker = createNotificationWorker(prisma);
  console.log('🚀 Notification worker started in main process');
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Socket.IO chat listening at path /chat`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close HTTP server
    server.close();
    
    // Close notification worker if running
    if (notificationWorker) {
      await notificationWorker.close();
    }
    
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