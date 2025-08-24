import { prisma } from '../../lib/prisma';

interface AuditLogData {
  actorId: string;
  entity: string;
  entityId: string;
  action: string;
  meta?: object;
}

export class AuditLogService {
  static async createLog(data: AuditLogData) {
    return prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        entity: data.entity,
        entityId: data.entityId,
        action: data.action,
        meta: data.meta || {},
      },
    });
  }
}

export default new AuditLogService();
