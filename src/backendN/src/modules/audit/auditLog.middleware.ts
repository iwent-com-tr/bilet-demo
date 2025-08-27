import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './auditLog.service';

function getRoundedIp(req: Request): string | undefined {
  const ip = req.ip;
  if (!ip) return undefined;
  if (ip.includes(':')) { // IPv6
    // Simple truncation for IPv6, not a perfect /56 mask but good enough for logging
    return ip.split(':').slice(0, 4).join(':') + '::';
  }
  // IPv4
  return ip.split('.').slice(0, 3).join('.') + '.0';
}

export function auditLog(entity: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actorId = (req as any).user?.id;
    const entityId = req.params.id || 'all';

    if (actorId) {
      await AuditLogService.createLog({
        actorId,
        entity,
        entityId,
        action,
        meta: {
          path: req.path,
          method: req.method,
          params: req.params,
          query: req.query,
          ip: getRoundedIp(req),
          userAgent: req.get('User-Agent'),
        },
      });
    }

    next();
  };
}
