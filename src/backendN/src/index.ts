import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { validateEnvironmentOrExit } from './lib/runtime-environment-validator';
import ServiceIntegrationManager from './lib/service-integration-manager';
import { closeQueue } from './lib/queue/index';
import healthRoutes from './routes/health.routes';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import organizerRoutes from './modules/organizer/organizer.routes';
import eventRoutes from './modules/event/event.routes';
import ticketRoutes from './modules/tickets/ticket.routes';
import friendshipRoutes from './modules/friendship/friendship.routes';
import searchRoutes from './modules/search/search.routes';
import artistRoutes from './modules/artists/artists.routes';
import venueRoutes from './modules/venues/venues.routes';
import { prisma } from './lib/prisma';
import { setupChat } from './chat';
import { initMeili } from './lib/meili';
// Development-only import (excluded in production)
// import { populateDB } from './lib/utils/populators/populator';


import chatRoutes from './modules/chat/chat.routes';
import adminUserRoutes from './modules/admin/users.routes';
import adminEventRoutes from './modules/admin/event.routes';
import pushNotificationRoutes from './modules/push-notification/push-notification.routes';
import { adminApiLimiter } from './middlewares/rateLimiter';
import pushRoutes from './modules/push/push.routes';
import notificationRoutes from './modules/push/notification.routes';
import queueRoutes from './modules/queue/queue.routes';
import settingsRoutes from './modules/settings/settings.routes';

dotenv.config();

// Validate environment configuration on startup
validateEnvironmentOrExit();

// Initialize service integration manager
const serviceManager = new ServiceIntegrationManager(prisma);

// Function to initialize services
async function initializeServices() {
  try {
    await serviceManager.initializeServices();
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    process.exit(1);
  }
}

const args = process.argv.slice(2);

const EVENT_POPULATE_COUNT = parseInt(process.env.POPULATOR_EVENT_COUNT ?? '10');
const ARTIST_POPULATE_COUNT = parseInt(process.env.POPULATOR_ARTIST_COUNT ?? '50');
const VENUE_POPULATE_COUNT = parseInt(process.env.POPULATOR_VENUE_COUNT ?? '50');

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3001';

// Support multiple origins for HTTPS development
const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://localhost:3000',  // Frontend port
  'http://localhost:5173',
  'https://localhost:5173',
  'https://192.168.1.46:5173'
];

app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control', 
    'Pragma', 
    'Expires',
    'X-Requested-With'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
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
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/artists`, artistRoutes);
app.use(`${API_PREFIX}/venues`, venueRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);

// Push notification routes
app.use(`${API_PREFIX}/push`, pushRoutes);
app.use(`${API_PREFIX}/events`, notificationRoutes);
app.use(`${API_PREFIX}/queue`, queueRoutes);

// Chat routes
app.use(`${API_PREFIX}/chat`, chatRoutes);

// OneSignal push notification routes
app.use(`${API_PREFIX}/push`, pushNotificationRoutes);
app.use(`${API_PREFIX}`, pushNotificationRoutes); // For webhook endpoints

// Admin routes with rate limiting
app.use(`${API_PREFIX}/admin/users`, adminApiLimiter, adminUserRoutes);
app.use(`${API_PREFIX}/admin/events`, adminApiLimiter, adminEventRoutes);

// Health monitoring routes
app.use(`${API_PREFIX}/health`, healthRoutes);

// Database connection check
app.get(`${API_PREFIX}/db-check`, async (_req, res) => {
  try {
    await prisma.$connect();
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Error handling middleware (must be after all routes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.issues
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'UNKNOWN_ERROR'
  });
});

// Create server (HTTP or HTTPS based on environment)
let server;

if (process.env.HTTPS === 'true') {
  try {
    const privateKey = fs.readFileSync(process.env.SSL_KEY_FILE || 'server.key', 'utf8');
    const certificate = fs.readFileSync(process.env.SSL_CRT_FILE || 'server.crt', 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);
    console.log('HTTPS server configured');
  } catch (error) {
    console.warn('HTTPS certificates not found, falling back to HTTP:', error instanceof Error ? error.message : String(error));
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}
// Initialize Socket.IO chat server (namespace: /chat)
setupChat(server);

// Initialize MeiliSearch indexes
initMeili();

// Initialize services (database, Redis, push notifications, worker)
initializeServices();

const port = process.env.PORT || 3000;
server.listen(port, () => {
  const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
  const host = process.env.HTTPS === 'true' ? '192.168.1.40' : 'localhost';
  console.log(`Server running on ${protocol}://${host}:${port}`);
  console.log(`Socket.IO chat listening at path /chat`);
  if (process.env.HTTPS === 'true') {
    console.log('HTTPS mode: Make sure SSL certificates (server.crt, server.key) are present');
  }
});


// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close HTTP server
    server.close();
    
    // Close service manager (includes worker and other services)
    await serviceManager.shutdown();
    
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