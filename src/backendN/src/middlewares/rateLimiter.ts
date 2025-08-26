import rateLimit from 'express-rate-limit';

// Generic rate limiter function
export const rateLimiter = (options?: any) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes default
    max: 100, // 100 requests per window default
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    ...options,
  });
};

export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
});

export const adminExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 export requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many export requests, please try again later.' },
});
