import { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/jwt';
import { prisma } from '../lib/prisma';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

async function attachUser(req: Request): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) return;
  const payload = verifyAccess(token); // throws if invalid/expired
  const userId = payload.sub;
  if (!userId) return;

  // Try to resolve a regular User first
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (dbUser) {
    const fullName = [
      (dbUser as any).firstName,
      (dbUser as any).lastName,
    ].filter(Boolean).join(' ');
    const resolvedRole =
      ((payload as any).role as string | undefined) ||
      ((payload as any).userType as string | undefined) ||
      ((dbUser as any).userType as string | undefined) ||
      'USER';
    
    // Fallback: if adminRole is null but userType is 'ADMIN', use 'ADMIN' as adminRole
    let adminRole = (dbUser as any).adminRole;
    if (!adminRole && (dbUser as any).userType === 'ADMIN') {
      adminRole = 'ADMIN';
    }
    
    (req as any).user = {
      id: (dbUser as any).id,
      email: (dbUser as any).email,
      name: (dbUser as any).name ?? (fullName || undefined),
      role: resolvedRole as any,
      adminRole: adminRole,
      avatarUrl: (dbUser as any).avatarUrl ?? (dbUser as any).avatar ?? undefined,
    };
    return;
  }

  // Fall back to Organizer principal
  const dbOrganizer = await prisma.organizer.findUnique({ where: { id: userId } });
  if (dbOrganizer) {
    const fullName = [
      (dbOrganizer as any).firstName,
      (dbOrganizer as any).lastName,
    ].filter(Boolean).join(' ');
    (req as any).user = {
      id: (dbOrganizer as any).id,
      email: (dbOrganizer as any).email,
      name: fullName || undefined,
      role: ((payload as any).role as string | undefined) || ((payload as any).userType as string | undefined) || 'ORGANIZER',
      avatarUrl: (dbOrganizer as any).avatar ?? undefined,
    };
    return;
  }

  // Unknown principal — keep minimal context from token
  (req as any).user = {
    id: userId,
    role: ((payload as any).role as string | undefined) || ((payload as any).userType as string | undefined) || 'USER',
  };
}

async function optional(req: Request, _res: Response, next: NextFunction) {
  try {
    await attachUser(req);
  } catch {
    // ignore errors, proceed without user context
  } finally {
    next();
  }
}

async function required(req: Request, res: Response, next: NextFunction) {
  try {
    await attachUser(req);
    if (!(req as any).user) {
      return res.status(401).json({ error: 'unauthorized', code: 'UNAUTHORIZED' });
    }
    next();
  } catch (err: any) {
    const status = err?.status ?? 401;
    const code = err?.code ?? 'UNAUTHORIZED';
    return res.status(status).json({ error: 'unauthorized', code });
  }
}

export const authGuard = { optional, required };


