import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UnauthorizedError } from '../utils/errors';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

export function signAccessToken(userId: string, role: UserRole) {
  const payload: AccessTokenPayload = { sub: userId, role, type: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new UnauthorizedError('Invalid access token');
  }
  return decoded;
}

export async function issueRefreshToken(userId: string) {
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = { sub: userId, type: 'refresh', jti };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return token;
}

export async function rotateRefreshToken(refreshToken: string) {
  let decoded: RefreshTokenPayload;

  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: decoded.jti },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token is no longer valid');
  }

  if (stored.tokenHash !== hashToken(refreshToken)) {
    throw new UnauthorizedError('Refresh token mismatch');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Account is inactive or not found');
  }

  const accessToken = signAccessToken(user.id, user.role);
  const newRefreshToken = await issueRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken, user };
}

export async function revokeRefreshToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return;

    await prisma.refreshToken.updateMany({
      where: { id: decoded.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Idempotent logout — ignore invalid tokens
  }
}
