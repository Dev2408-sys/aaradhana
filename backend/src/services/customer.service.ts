import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { normalizeMobile } from '../utils/mobile';
import { createAuditLog } from './audit.service';

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function mapCustomer(c: {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    email: c.email,
    city: c.city,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function sellerCustomerWhere(sellerProfileId: string): Promise<Prisma.CustomerWhereInput> {
  return {
    sales: { some: { sellerId: sellerProfileId } },
  };
}

export async function listCustomers(
  actor: AuthUser,
  query: { page?: number; pageSize?: number; search?: string },
) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.CustomerWhereInput = {};

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    Object.assign(where, await sellerCustomerWhere(actor.sellerProfileId));
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    const mobileQ = normalizeMobile(q);
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { mobile: { contains: mobileQ || q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapCustomer),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function searchCustomers(actor: AuthUser, q: string) {
  if (!q.trim()) {
    throw new ValidationAppError('Search query is required');
  }
  return listCustomers(actor, { page: 1, pageSize: 20, search: q });
}

export async function getCustomerById(actor: AuthUser, id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFoundError('Customer not found');

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) throw new ForbiddenError();
    const linked = await prisma.sale.findFirst({
      where: { customerId: id, sellerId: actor.sellerProfileId },
      select: { id: true },
    });
    if (!linked) throw new ForbiddenError('You cannot access this customer');
  }

  return mapCustomer(customer);
}

export async function createCustomer(
  actor: AuthUser,
  input: {
    name: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
    notes?: string | null;
  },
  ipAddress?: string,
) {
  const mobile = normalizeMobile(input.mobile);
  if (mobile.length < 10) {
    throw new ValidationAppError('Mobile must be at least 10 digits');
  }

  const existing = await prisma.customer.findUnique({ where: { mobile } });
  if (existing) {
    throw new ConflictError('A customer with this mobile already exists', 'MOBILE_EXISTS');
  }

  const customer = await prisma.customer.create({
    data: {
      name: input.name.trim(),
      mobile,
      email: input.email || null,
      city: input.city || null,
      notes: input.notes || null,
    },
  });

  await createAuditLog({
    userId: actor.id,
    action: 'CUSTOMER_CREATED',
    entityType: 'customer',
    entityId: customer.id,
    newValue: { name: customer.name, mobile: customer.mobile },
    ipAddress,
  });

  return mapCustomer(customer);
}

export async function updateCustomer(
  actor: AuthUser,
  id: string,
  input: {
    name?: string;
    email?: string | null;
    city?: string | null;
    notes?: string | null;
  },
  ipAddress?: string,
) {
  await getCustomerById(actor, id);

  if (!isAdmin(actor) && !actor.sellerProfileId) {
    throw new ForbiddenError();
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  await createAuditLog({
    userId: actor.id,
    action: 'CUSTOMER_UPDATED',
    entityType: 'customer',
    entityId: id,
    newValue: input,
    ipAddress,
  });

  return mapCustomer(customer);
}

/** Find or create by normalized mobile inside a transaction. */
export async function findOrCreateCustomerInTx(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
  },
  actorUserId: string,
) {
  const mobile = normalizeMobile(input.mobile);
  if (mobile.length < 10) {
    throw new ValidationAppError('Mobile must be at least 10 digits');
  }

  const existing = await tx.customer.findUnique({ where: { mobile } });
  if (existing) {
    const updated = await tx.customer.update({
      where: { id: existing.id },
      data: {
        name: input.name.trim() || existing.name,
        email: input.email !== undefined ? input.email || null : existing.email,
        city: input.city !== undefined ? input.city || null : existing.city,
      },
    });
    return { customer: updated, created: false };
  }

  const created = await tx.customer.create({
    data: {
      name: input.name.trim(),
      mobile,
      email: input.email || null,
      city: input.city || null,
    },
  });

  await createAuditLog(
    {
      userId: actorUserId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: created.id,
      newValue: { name: created.name, mobile: created.mobile },
    },
    tx,
  );

  return { customer: created, created: true };
}
