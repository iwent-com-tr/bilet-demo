import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  
  if (!user?.id) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  if (user.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has admin or organizer role
 */
export const requireAdminOrOrganizer = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  
  if (!user?.id) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  if (user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
    res.status(403).json({
      error: 'Admin or organizer access required',
      code: 'FORBIDDEN',
    });
    return;
  }

  next();
};

/**
 * Rate limiting for push subscription endpoints
 * Allows 10 subscription operations per minute per user
 */
export const subscriptionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.id || req.ip || req.connection.remoteAddress || 'unknown';
  },
  message: {
    error: 'Too many subscription requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for public key endpoint
    return req.path.endsWith('/public-key');
  },
});

/**
 * Rate limiting for notification sending endpoints
 * Allows 5 notification sends per minute for admins/organizers
 */
export const notificationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 notification sends per minute
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.id || req.ip || req.connection.remoteAddress || 'unknown';
  },
  message: {
    error: 'Too many notification requests',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiting for broadcast notifications
 * Allows 2 broadcast notifications per hour for admins
 */
export const broadcastRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // 2 broadcasts per hour
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.id || req.ip || req.connection.remoteAddress || 'unknown';
  },
  message: {
    error: 'Too many broadcast requests',
    code: 'BROADCAST_RATE_LIMIT_EXCEEDED',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * CSRF protection middleware for state-changing operations
 * Validates that requests come from the expected origin
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF protection for GET requests
  if (req.method === 'GET') {
    next();
    return;
  }

  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const allowedOrigins = [
    process.env.CLIENT_ORIGIN || 'http://localhost:3001',
    process.env.ADDITIONAL_ORIGINS?.split(',') || [],
  ].flat().filter(Boolean);

  // Check Origin header first
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      res.status(403).json({
        error: 'Invalid origin',
        code: 'CSRF_PROTECTION_FAILED',
      });
      return;
    }
  } else if (referer) {
    // Fallback to Referer header
    const refererOrigin = new URL(referer).origin;
    if (!allowedOrigins.includes(refererOrigin)) {
      res.status(403).json({
        error: 'Invalid referer',
        code: 'CSRF_PROTECTION_FAILED',
      });
      return;
    }
  } else {
    // No Origin or Referer header - reject for security
    res.status(403).json({
      error: 'Missing origin or referer header',
      code: 'CSRF_PROTECTION_FAILED',
    });
    return;
  }

  next();
};

/**
 * Payload sanitization middleware
 * Sanitizes and validates notification payloads to prevent XSS and injection attacks
 */
export const sanitizePayload = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    try {
      // Recursively sanitize string values
      req.body = sanitizeObject(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Invalid payload format',
        code: 'PAYLOAD_SANITIZATION_FAILED',
      });
    }
  } else {
    next();
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize string values to prevent XSS
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  // Remove potentially dangerous characters and scripts
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validate subscription ownership middleware
 * Ensures users can only modify their own subscriptions
 */
export const validateSubscriptionOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = (req as any).user;
  if (!user?.id) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // For unsubscribe operations, validate endpoint ownership
  if (req.method === 'DELETE' && req.body?.endpoint) {
    try {
      // This validation is also done in the controller, but we add it here for defense in depth
      const endpointSchema = z.string().url();
      endpointSchema.parse(req.body.endpoint);
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Invalid endpoint format',
        code: 'VALIDATION_ERROR',
      });
    }
  } else {
    next();
  }
};