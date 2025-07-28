const { redisClient } = require('../config/redis');

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 100;

const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const key = `ratelimit:${ip}`;

    const requests = await redisClient.incr(key);

    if (requests === 1) {
      await redisClient.expire(key, WINDOW_SIZE_IN_SECONDS);
    }

    if (requests > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        durum: 0,
        message: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.'
      });
    }

    next();
  } catch (error) {
    // Redis hatası durumunda isteği engelleme
    next();
  }
};

module.exports = { rateLimiter }; 