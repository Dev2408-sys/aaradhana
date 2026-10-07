import type { AuthUser } from '../types/auth-user';
import { ForbiddenError } from '../utils/errors';

export function isAdmin(user: AuthUser) {
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

/** Seller may only access own profile id; masters do not get cross-seller finance unless admin. */
export function assertSellerFinanceAccess(actor: AuthUser, sellerId: string) {
  if (isAdmin(actor)) return;
  if (!actor.sellerProfileId || actor.sellerProfileId !== sellerId) {
    throw new ForbiddenError('You cannot access this seller financial data');
  }
}

export function resolveSellerIdForActor(actor: AuthUser, requestedSellerId?: string) {
  if (isAdmin(actor)) {
    if (!requestedSellerId) {
      throw new ForbiddenError('sellerId is required');
    }
    return requestedSellerId;
  }
  if (!actor.sellerProfileId) {
    throw new ForbiddenError('No seller profile linked to this account');
  }
  if (requestedSellerId && requestedSellerId !== actor.sellerProfileId) {
    throw new ForbiddenError('You cannot act for another seller');
  }
  return actor.sellerProfileId;
}
