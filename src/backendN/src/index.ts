import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import http from 'http';
import path from 'path';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import organizerRoutes from './modules/organizer/organizer.routes';
import eventRoutes from './modules/event/event.routes';
import ticketRoutes from './modules/tickets/ticket.routes';
import friendshipRoutes from './modules/friendship/friendship.routes';
import { prisma } from './lib/prisma';
import { setupChat } from './chat';

dotenv.config();

const app = express();
const API_PREFIX = process.env.API_PREFIX;
app.use(helmet());
app.use(cors());
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

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Socket.IO chat listening at path /chat`);
});