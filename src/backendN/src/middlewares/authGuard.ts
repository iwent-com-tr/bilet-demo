import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthService } from '../lib/unified-auth.service';
import { UserService } from '../modules/users/user.service';

// Endpoints that indicate active user activity (not background processes)
const ACTIVE_ENDPOINTS = [
  '/chat/',
  '/messages',
  '/events',
  '/users/me',
  '/users/search',
  '/friendships',
  '/tickets'
];

// Check if the request path indicates active user activity
function isActiveEndpoint(path: string): boolean {
  return ACTIVE_ENDPOINTS.some(endpoint => path.includes(endpoint));
}

class AuthGuard {
  required = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const authResult = await UnifiedAuthService.authenticateByToken(token);
      
      if (!authResult) {
        return res.status(401).json({ error: 'Authentication failed' });
      }

      // Set user info on request using unified format
      req.user = UnifiedAuthService.createRequestUser(authResult);

      // Update lastSeenAt timestamp only for active endpoints (non-blocking)
      // Only for users, not organizers
      if (isActiveEndpoint(req.path) && authResult.entity.type === 'USER') {
        UserService.updateLastSeen(authResult.entity.id).catch(err => {
          console.error('Failed to update lastSeenAt:', err);
        });
      }

      next();
    } catch (error) {
      console.error('Auth guard error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };

  optional = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // No token, continue without user
      }

      const token = authHeader.split(' ')[1];
      const authResult = await UnifiedAuthService.authenticateByToken(token);
      
      if (authResult) {
        // Set user info on request using unified format
        req.user = UnifiedAuthService.createRequestUser(authResult);

        // Update lastSeenAt timestamp only for active endpoints (non-blocking)
        // Only for users, not organizers
        if (isActiveEndpoint(req.path) && authResult.entity.type === 'USER') {
          UserService.updateLastSeen(authResult.entity.id).catch(err => {
            console.error('Failed to update lastSeenAt:', err);
          });
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth guard error:', error);
      next(); // Continue without user on error
    }
  };
}

export const authGuard = new AuthGuard();


