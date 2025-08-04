require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/event');
const ticketRoutes = require('./routes/ticket');
const chatRoutes = require('./routes/chat');
const organizerRoutes = require('./routes/organizer');

// Middleware
const { authMiddleware } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');

// Database
const { sequelize } = require('./config/database');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/ticket', authMiddleware, ticketRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/organizer', authMiddleware, organizerRoutes);

// Socket.IO
require('./sockets/chat')(io);

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    durum: 0,
    message: 'Bir hata oluştu'
  });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection successful');
    
    await sequelize.sync();
    logger.info('Database sync completed');

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer(); 