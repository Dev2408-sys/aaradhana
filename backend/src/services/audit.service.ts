import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';

type Db = Prisma.TransactionClient | PrismaClient;

interface AuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export async function createAuditLog(input: AuditInput, db: Db = prisma) {
  return db.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
