import {
  Prisma,
  SellerActivationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { AuthUser } from '../types/auth-user';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from '../utils/errors';
import { generateTemporaryPassword, hashPassword } from '../utils/password';
import { createAuditLog } from './audit.service';
import {
  assertValidParentSeller,
  getDescendantSellerIds,
  getSellerLevelForParent,
  getTeamSellerIdsIncludingSelf,
  isInSellerTeam,
  isSellerRole,
  recountSubtreeLevels,
} from './hierarchy.service';
import { generateUniqueSellerCode } from './seller-code.service';

const sellerInclude = {
  user: {
    select: {
      id: true,
      name: true,
      mobile: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  },
  parentSeller: {
    select: {
      id: true,
      sellerCode: true,
      user: { select: { name: true, mobile: true, role: true } },
    },
  },
} satisfies Prisma.SellerProfileInclude;

export type SellerListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  status?: SellerActivationStatus;
  city?: string;
  parentSellerId?: string;
  sortBy?: 'createdAt' | 'expectedSales' | 'joinedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

function mapSeller(profile: Prisma.SellerProfileGetPayload<{ include: typeof sellerInclude }>) {
  return {
    id: profile.id,
    userId: profile.userId,
    sellerCode: profile.sellerCode,
    name: profile.user.name,
    mobile: profile.user.mobile,
    email: profile.user.email,
    role: profile.user.role,
    userStatus: profile.user.status,
    parentSellerId: profile.parentSellerId,
    parentSeller: profile.parentSeller
      ? {
          id: profile.parentSeller.id,
          sellerCode: profile.parentSeller.sellerCode,
          name: profile.parentSeller.user.name,
          mobile: profile.parentSeller.user.mobile,
          role: profile.parentSeller.user.role,
        }
      : null,
    level: profile.level,
    city: profile.city,
    area: profile.area,
    instagramHandle: profile.instagramHandle,
    expectedSales: profile.expectedSales,
    activationStatus: profile.activationStatus,
    joinedAt: profile.joinedAt,
    lastLoginAt: profile.user.lastLoginAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function assertCanAccessSeller(actor: AuthUser, sellerId: string) {
  if (isAdmin(actor)) return;

  if (!actor.sellerProfileId) {
    throw new ForbiddenError();
  }

  const allowed = await isInSellerTeam(prisma, actor.sellerProfileId, sellerId);
  if (!allowed) {
    throw new ForbiddenError('You cannot access this seller resource');
  }
}

async function getSellerOrThrow(id: string) {
  const profile = await prisma.sellerProfile.findUnique({
    where: { id },
    include: sellerInclude,
  });
  if (!profile) {
    throw new NotFoundError('Seller not found');
  }
  return profile;
}

export async function listSellers(actor: AuthUser, query: SellerListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.SellerProfileWhereInput = {};

  if (!isAdmin(actor)) {
    if (!actor.sellerProfileId) {
      throw new ForbiddenError();
    }
    const teamIds = await getTeamSellerIdsIncludingSelf(prisma, actor.sellerProfileId);
    where.id = { in: teamIds };
  }

  if (query.status) where.activationStatus = query.status;
  if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
  if (query.parentSellerId) where.parentSellerId = query.parentSellerId;

  if (query.role) {
    where.user = { ...(where.user as Prisma.UserWhereInput), role: query.role };
  }

  if (query.search?.trim()) {
    const q = query.search.trim();
    where.OR = [
      { sellerCode: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { area: { contains: q, mode: 'insensitive' } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { mobile: { contains: q } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const sortBy = query.sortBy ?? 'createdAt';
  const sortOrder = query.sortOrder ?? 'desc';

  let orderBy: Prisma.SellerProfileOrderByWithRelationInput;
  if (sortBy === 'name') {
    orderBy = { user: { name: sortOrder } };
  } else if (sortBy === 'expectedSales') {
    orderBy = { expectedSales: sortOrder };
  } else if (sortBy === 'joinedAt') {
    orderBy = { joinedAt: sortOrder };
  } else {
    orderBy = { createdAt: sortOrder };
  }

  const [total, rows] = await Promise.all([
    prisma.sellerProfile.count({ where }),
    prisma.sellerProfile.findMany({
      where,
      include: sellerInclude,
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapSeller),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getSellerById(actor: AuthUser, id: string) {
  await assertCanAccessSeller(actor, id);
  const profile = await getSellerOrThrow(id);

  const directChildren = await prisma.sellerProfile.count({
    where: { parentSellerId: id },
  });
  const descendants = await getDescendantSellerIds(prisma, id);

  return {
    ...mapSeller(profile),
    teamSummary: {
      directSellers: directChildren,
      totalTeamSellers: descendants.length,
    },
    performanceNote: 'Sales module coming in Phase 9',
  };
}

export async function createSeller(
  actor: AuthUser,
  input: {
    name: string;
    mobile: string;
    email?: string | null;
    role: UserRole;
    parentSellerId?: string | null;
    city?: string | null;
    area?: string | null;
    instagramHandle?: string | null;
    expectedSales?: number | null;
    activationStatus?: SellerActivationStatus;
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError('Only admins can create sellers');
  }

  if (!isSellerRole(input.role)) {
    throw new ValidationAppError('Role must be MASTER_SELLER or SELLER');
  }

  const existingMobile = await prisma.user.findUnique({ where: { mobile: input.mobile } });
  if (existingMobile) {
    throw new ConflictError('A user with this mobile already exists', 'MOBILE_EXISTS');
  }

  if (input.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) {
      throw new ConflictError('A user with this email already exists', 'EMAIL_EXISTS');
    }
  }

  const temporaryPassword = generateTemporaryPassword(12);
  const passwordHash = await hashPassword(temporaryPassword);

  const result = await prisma.$transaction(async (tx) => {
    await assertValidParentSeller(tx, input.parentSellerId ?? null);
    const level = await getSellerLevelForParent(tx, input.parentSellerId ?? null);
    const sellerCode = await generateUniqueSellerCode(tx);

    const user = await tx.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        email: input.email || null,
        role: input.role,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    const profile = await tx.sellerProfile.create({
      data: {
        userId: user.id,
        sellerCode,
        parentSellerId: input.parentSellerId ?? null,
        level,
        city: input.city ?? null,
        area: input.area ?? null,
        instagramHandle: input.instagramHandle ?? null,
        expectedSales: input.expectedSales ?? null,
        activationStatus: input.activationStatus ?? SellerActivationStatus.ACTIVE,
      },
      include: sellerInclude,
    });

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SELLER_CREATED',
        entityType: 'seller_profile',
        entityId: profile.id,
        newValue: {
          sellerCode: profile.sellerCode,
          role: input.role,
          parentSellerId: profile.parentSellerId,
          mobile: input.mobile,
        },
        ipAddress,
      },
      tx,
    );

    return profile;
  });

  return {
    seller: mapSeller(result),
    temporaryPassword,
  };
}

export async function updateSeller(
  actor: AuthUser,
  id: string,
  input: {
    name?: string;
    email?: string | null;
    city?: string | null;
    area?: string | null;
    instagramHandle?: string | null;
    expectedSales?: number | null;
  },
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError('Only admins can update sellers via this endpoint');
  }

  const existing = await getSellerOrThrow(id);

  if (input.email) {
    const clash = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: existing.userId } },
    });
    if (clash) {
      throw new ConflictError('A user with this email already exists', 'EMAIL_EXISTS');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
      },
    });

    const profile = await tx.sellerProfile.update({
      where: { id },
      data: {
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.area !== undefined ? { area: input.area } : {}),
        ...(input.instagramHandle !== undefined
          ? { instagramHandle: input.instagramHandle }
          : {}),
        ...(input.expectedSales !== undefined ? { expectedSales: input.expectedSales } : {}),
      },
      include: sellerInclude,
    });

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SELLER_UPDATED',
        entityType: 'seller_profile',
        entityId: id,
        oldValue: {
          name: existing.user.name,
          email: existing.user.email,
          city: existing.city,
          area: existing.area,
          instagramHandle: existing.instagramHandle,
          expectedSales: existing.expectedSales,
        },
        newValue: input,
        ipAddress,
      },
      tx,
    );

    return profile;
  });

  return mapSeller(updated);
}

export async function updateSellerStatus(
  actor: AuthUser,
  id: string,
  activationStatus: SellerActivationStatus,
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError();
  }

  const existing = await getSellerOrThrow(id);

  const updated = await prisma.sellerProfile.update({
    where: { id },
    data: { activationStatus },
    include: sellerInclude,
  });

  await createAuditLog({
    userId: actor.id,
    action: 'SELLER_STATUS_CHANGED',
    entityType: 'seller_profile',
    entityId: id,
    oldValue: { activationStatus: existing.activationStatus },
    newValue: { activationStatus },
    ipAddress,
  });

  return mapSeller(updated);
}

export async function updateSellerParent(
  actor: AuthUser,
  id: string,
  parentSellerId: string | null,
  ipAddress?: string,
) {
  if (!isAdmin(actor)) {
    throw new ForbiddenError();
  }

  const existing = await getSellerOrThrow(id);

  const updated = await prisma.$transaction(async (tx) => {
    await assertValidParentSeller(tx, parentSellerId, id);
    const level = await getSellerLevelForParent(tx, parentSellerId);

    const profile = await tx.sellerProfile.update({
      where: { id },
      data: {
        parentSellerId,
        level,
      },
      include: sellerInclude,
    });

    await recountSubtreeLevels(tx, id);

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SELLER_PARENT_CHANGED',
        entityType: 'seller_profile',
        entityId: id,
        oldValue: { parentSellerId: existing.parentSellerId, level: existing.level },
        newValue: { parentSellerId, level },
        ipAddress,
      },
      tx,
    );

    return profile;
  });

  return mapSeller(updated);
}

export async function getSellerTeam(actor: AuthUser, id: string) {
  await assertCanAccessSeller(actor, id);
  await getSellerOrThrow(id);

  const direct = await prisma.sellerProfile.findMany({
    where: { parentSellerId: id },
    include: sellerInclude,
    orderBy: { createdAt: 'asc' },
  });

  const descendantIds = await getDescendantSellerIds(prisma, id);
  const activeCount = await prisma.sellerProfile.count({
    where: { id: { in: descendantIds }, activationStatus: 'ACTIVE' },
  });
  const pendingCount = await prisma.sellerProfile.count({
    where: { id: { in: descendantIds }, activationStatus: 'PENDING' },
  });

  const treeMembers = await prisma.sellerProfile.findMany({
    where: { id: { in: [id, ...descendantIds] } },
    include: sellerInclude,
    orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
  });

  return {
    summary: {
      directSellers: direct.length,
      totalTeamSellers: descendantIds.length,
      activeSellers: activeCount,
      pendingSellers: pendingCount,
    },
    directSellers: direct.map(mapSeller),
    tree: treeMembers.map((m) => ({
      id: m.id,
      name: m.user.name,
      sellerCode: m.sellerCode,
      parentSellerId: m.parentSellerId,
      level: m.level,
      activationStatus: m.activationStatus,
      joinedAt: m.joinedAt,
      expectedSales: m.expectedSales,
      role: m.user.role,
      city: m.city,
    })),
  };
}

export async function getReferralByCode(sellerCode: string) {
  const profile = await prisma.sellerProfile.findUnique({
    where: { sellerCode: sellerCode.toUpperCase() },
    include: {
      user: { select: { name: true, role: true } },
    },
  });

  if (!profile || !isSellerRole(profile.user.role)) {
    throw new NotFoundError('Referral code not found');
  }

  const event = await prisma.event.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'asc' },
  });

  return {
    sellerCode: profile.sellerCode,
    sellerName: profile.user.name,
    role: profile.user.role,
    city: profile.city,
    activationStatus: profile.activationStatus,
    canAcceptReferrals: profile.activationStatus === 'ACTIVE',
    event: event
      ? {
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          venue: event.venue,
          dailyTarget: event.dailyTarget,
        }
      : null,
  };
}

export async function registerViaReferral(
  input: {
    referralCode: string;
    name: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
    area?: string | null;
    instagramHandle?: string | null;
    expectedSales?: number | null;
    password?: string;
  },
  ipAddress?: string,
) {
  const parent = await prisma.sellerProfile.findUnique({
    where: { sellerCode: input.referralCode.toUpperCase() },
    include: { user: { select: { id: true, role: true, name: true } } },
  });

  if (!parent || !isSellerRole(parent.user.role)) {
    throw new NotFoundError('Invalid referral code');
  }

  if (parent.activationStatus !== 'ACTIVE') {
    throw new AppError(
      'This seller is not currently accepting referrals',
      400,
      'REFERRAL_PARENT_INACTIVE',
    );
  }

  const existingMobile = await prisma.user.findUnique({ where: { mobile: input.mobile } });
  if (existingMobile) {
    throw new ConflictError('A user with this mobile already exists', 'MOBILE_EXISTS');
  }

  if (input.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) {
      throw new ConflictError('A user with this email already exists', 'EMAIL_EXISTS');
    }
  }

  const chosePassword = Boolean(input.password && input.password.length >= 8);
  const temporaryPassword = chosePassword
    ? input.password!
    : generateTemporaryPassword(12);
  const passwordHash = await hashPassword(temporaryPassword);
  const activationStatus =
    env.PUBLIC_REGISTRATION_STATUS === 'ACTIVE'
      ? SellerActivationStatus.ACTIVE
      : SellerActivationStatus.PENDING;

  const profile = await prisma.$transaction(async (tx) => {
    const level = await getSellerLevelForParent(tx, parent.id);
    const sellerCode = await generateUniqueSellerCode(tx);

    const user = await tx.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        email: input.email || null,
        role: UserRole.SELLER,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    const created = await tx.sellerProfile.create({
      data: {
        userId: user.id,
        sellerCode,
        parentSellerId: parent.id,
        level,
        city: input.city ?? null,
        area: input.area ?? null,
        instagramHandle: input.instagramHandle ?? null,
        expectedSales: input.expectedSales ?? null,
        activationStatus,
      },
      include: sellerInclude,
    });

    await createAuditLog(
      {
        userId: user.id,
        action: 'SELLER_REGISTERED',
        entityType: 'seller_profile',
        entityId: created.id,
        newValue: {
          sellerCode: created.sellerCode,
          parentSellerId: parent.id,
          referralCode: parent.sellerCode,
          activationStatus,
        },
        ipAddress,
      },
      tx,
    );

    return created;
  });

  return {
    seller: mapSeller(profile),
    temporaryPassword: chosePassword ? null : temporaryPassword,
    passwordSetByUser: chosePassword,
    activationStatus,
    message:
      activationStatus === 'PENDING'
        ? chosePassword
          ? 'Registration received. Save your password — an admin will activate your account, then you can sign in.'
          : 'Registration received. An admin will activate your account shortly. Use the temporary password below after activation.'
        : chosePassword
          ? 'Registration successful. Sign in with your mobile and password.'
          : 'Registration successful. Sign in with your mobile and the temporary password below.',
  };
}

export async function getMySellerProfile(actor: AuthUser) {
  if (!actor.sellerProfileId) {
    throw new ForbiddenError('No seller profile linked to this account');
  }
  return getSellerById(actor, actor.sellerProfileId);
}

export async function updateMySellerProfile(
  actor: AuthUser,
  input: {
    name?: string;
    email?: string | null;
    city?: string | null;
    area?: string | null;
    instagramHandle?: string | null;
    expectedSales?: number | null;
  },
  ipAddress?: string,
) {
  if (!actor.sellerProfileId) {
    throw new ForbiddenError('No seller profile linked to this account');
  }

  // Sellers cannot change role, parent, status, or seller code via this endpoint.
  const existing = await getSellerOrThrow(actor.sellerProfileId);

  if (input.email) {
    const clash = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: existing.userId } },
    });
    if (clash) {
      throw new ConflictError('A user with this email already exists', 'EMAIL_EXISTS');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
      },
    });

    const profile = await tx.sellerProfile.update({
      where: { id: actor.sellerProfileId! },
      data: {
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.area !== undefined ? { area: input.area } : {}),
        ...(input.instagramHandle !== undefined
          ? { instagramHandle: input.instagramHandle }
          : {}),
        ...(input.expectedSales !== undefined ? { expectedSales: input.expectedSales } : {}),
      },
      include: sellerInclude,
    });

    await createAuditLog(
      {
        userId: actor.id,
        action: 'SELLER_PROFILE_UPDATED',
        entityType: 'seller_profile',
        entityId: actor.sellerProfileId!,
        oldValue: {
          name: existing.user.name,
          email: existing.user.email,
          city: existing.city,
          area: existing.area,
          instagramHandle: existing.instagramHandle,
          expectedSales: existing.expectedSales,
        },
        newValue: input,
        ipAddress,
      },
      tx,
    );

    return profile;
  });

  return mapSeller(updated);
}

export async function getReferralLink(actor: AuthUser, id: string) {
  await assertCanAccessSeller(actor, id);
  const profile = await getSellerOrThrow(id);
  const path = `/seller/join/${profile.sellerCode}`;
  return {
    sellerCode: profile.sellerCode,
    path,
    url: `${env.FRONTEND_URL}${path}`,
  };
}
