import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../services/token.service';
import { prisma } from '../config/prisma';
import { isInSellerTeam } from '../services/hierarchy.service';
import { AppError, ForbiddenError, UnauthorizedError } from '../utils/errors';

function assertSellerActivation(
  role: UserRole,
  activationStatus: string | null | undefined,
) {
  if (role === 'MASTER_SELLER' || role === 'SELLER') {
    if (activationStatus !== 'ACTIVE') {
      throw new UnauthorizedError('Seller account is not active');
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        sellerProfile: { select: { id: true, activationStatus: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive or not found');
    }

    assertSellerActivation(user.role, user.sellerProfile?.activationStatus);

    req.user = {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      status: user.status,
      sellerProfileId: user.sellerProfile?.id ?? null,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }

    return next();
  };
}

/**
 * Ensures the authenticated seller can only access their own seller resource
 * or members of their downline team. Admins bypass ownership checks.
 */
export function requireSellerOwnership(paramKey = 'id') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
        return next();
      }

      const targetSellerId = req.params[paramKey];
      if (!targetSellerId) {
        throw new ForbiddenError('Seller resource not specified');
      }

      if (!req.user.sellerProfileId) {
        throw new ForbiddenError();
      }

      const allowed = await isInSellerTeam(
        prisma,
        req.user.sellerProfileId,
        targetSellerId,
      );

      if (!allowed) {
        throw new ForbiddenError('You cannot access this seller resource');
      }

      return next();
    } catch (error) {
      next(error);
    }
  };
}
