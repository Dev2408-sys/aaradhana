import { prisma } from '../config/prisma';
import { UnauthorizedError, ValidationAppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../utils/password';
import { createAuditLog } from './audit.service';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './token.service';

function sanitizeUser(user: {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  sellerProfile?: {
    id: string;
    sellerCode: string;
    parentSellerId: string | null;
    level: number;
    city: string | null;
    area: string | null;
    activationStatus: string;
  } | null;
}) {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    sellerProfile: user.sellerProfile
      ? {
          id: user.sellerProfile.id,
          sellerCode: user.sellerProfile.sellerCode,
          parentSellerId: user.sellerProfile.parentSellerId,
          level: user.sellerProfile.level,
          city: user.sellerProfile.city,
          area: user.sellerProfile.area,
          activationStatus: user.sellerProfile.activationStatus,
        }
      : null,
  };
}

export async function login(mobile: string, password: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({
    where: { mobile },
    include: {
      sellerProfile: {
        select: {
          id: true,
          sellerCode: true,
          parentSellerId: true,
          level: true,
          city: true,
          area: true,
          activationStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid mobile or password');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Account is inactive');
  }

  if (
    (user.role === 'MASTER_SELLER' || user.role === 'SELLER') &&
    user.sellerProfile?.activationStatus !== 'ACTIVE'
  ) {
    throw new UnauthorizedError('Seller account is not active');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid mobile or password');
  }

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = await issueRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    ipAddress,
    metadata: { mobile: user.mobile, role: user.role },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) {
    throw new ValidationAppError('Refresh token is required');
  }

  const result = await rotateRefreshToken(refreshToken);
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: sanitizeUser({
      ...result.user,
      sellerProfile: null,
    }),
  };
}

export async function logout(userId: string | undefined, refreshToken?: string, ipAddress?: string) {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  if (userId) {
    await createAuditLog({
      userId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sellerProfile: {
        select: {
          id: true,
          sellerCode: true,
          parentSellerId: true,
          level: true,
          city: true,
          area: true,
          activationStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return sanitizeUser(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new ValidationAppError('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new ValidationAppError('New password must be different from current password');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await createAuditLog({
    userId,
    action: 'PASSWORD_CHANGED',
    entityType: 'user',
    entityId: userId,
    ipAddress,
  });

  return { changed: true };
}
