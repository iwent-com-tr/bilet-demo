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
import adminUserRoutes from './modules/admin/users.routes';
import { adminApiLimiter } from './middlewares/rateLimiter';
dotenv.config();

const args = process.argv.slice(2);
const EVENT_POPULATE_COUNT = parseInt(process.env.POPULATOR_EVENT_COUNT ?? '100');

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3001';

// Support multiple origins for HTTPS development
const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'https://localhost:5173',
  
  'https://192.168.1.46:5173'
];

app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
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
app.use(`${API_PREFIX}/admin/users`, adminApiLimiter, adminUserRoutes);

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

// Populate if ran with --populate
if (args.includes('--populate')) {
  await populateEvents(EVENT_POPULATE_COUNT);
  console.log(`Database populated with ${EVENT_POPULATE_COUNT} random events.`);
  process.exit(0);
}

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