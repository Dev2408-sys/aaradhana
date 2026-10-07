import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateTemporaryPassword(length = 12) {
  return crypto.randomBytes(Math.ceil((length * 3) / 4)).toString('base64url').slice(0, length);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
