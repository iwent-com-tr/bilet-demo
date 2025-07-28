const { createClient } = require('redis');
const winston = require('winston');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  winston.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  winston.info('Redis Client Connected');
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    winston.error('Redis Connection Error:', error);
    process.exit(1);
  }
};

module.exports = { redisClient, connectRedis }; 