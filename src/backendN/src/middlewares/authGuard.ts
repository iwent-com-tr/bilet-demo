import { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { UserService } from '../modules/users/user.service';

class AuthGuard {
  required = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyAccess(token);
      
      if (!payload || !payload.sub) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { 
          id: true, 
          userType: true, 
          adminRole: true,
          deletedAt: true 
        }
      });

      if (!user || user.deletedAt) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Set user info on request
      req.user = {
        id: user.id,
        role: user.userType as 'USER' | 'ADMIN' | 'ORGANIZER',
        adminRole: user.adminRole as 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY'
      };

      // Update lastSeenAt timestamp (non-blocking)
      UserService.updateLastSeen(user.id).catch(err => {
        console.error('Failed to update lastSeenAt:', err);
      });

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
      const payload = verifyAccess(token);
      
      if (!payload || !payload.sub) {
        return next(); // Invalid token, continue without user
      }

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { 
          id: true, 
          userType: true, 
          adminRole: true,
          deletedAt: true 
        }
      });

      if (user && !user.deletedAt) {
        req.user = {
          id: user.id,
          role: user.userType as 'USER' | 'ADMIN' | 'ORGANIZER',
          adminRole: user.adminRole as 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY'
        };

        // Update lastSeenAt timestamp (non-blocking)
        UserService.updateLastSeen(user.id).catch(err => {
          console.error('Failed to update lastSeenAt:', err);
        });
      }

      next();
    } catch (error) {
      console.error('Optional auth guard error:', error);
      next(); // Continue without user on error
    }
  };
}

export const authGuard = new AuthGuard();


