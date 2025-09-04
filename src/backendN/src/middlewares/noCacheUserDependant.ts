import { Request, Response, NextFunction } from 'express';

export function noCacheUserDependent(req: Request, res: Response, next: NextFunction) {
  // Only apply to GET requests (or any method that returns user-specific data)
  if (req.method === 'GET') {
    // Prevent caching in browser, proxies, and service workers
    res.setHeader('Cache-Control', 'no-store'); // never store this response
    res.setHeader('Pragma', 'no-cache');        // for older HTTP/1.0 caches
    res.setHeader('Expires', '0');              // immediately expire
    // Tell caches that responses vary by Authorization header
    res.setHeader('Vary', 'Authorization');
  }
  next();
}