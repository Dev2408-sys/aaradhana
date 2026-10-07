import { Prisma, PrismaClient, UserRole } from '@prisma/client';
import { AppError, NotFoundError, ValidationAppError } from '../utils/errors';

type Tx = Prisma.TransactionClient | PrismaClient;

const SELLER_ROLES: UserRole[] = [UserRole.MASTER_SELLER, UserRole.SELLER];

export function isSellerRole(role: UserRole) {
  return SELLER_ROLES.includes(role);
}

export async function getSellerLevelForParent(
  tx: Tx,
  parentSellerId: string | null | undefined,
): Promise<number> {
  if (!parentSellerId) return 0;

  const parent = await tx.sellerProfile.findUnique({
    where: { id: parentSellerId },
    select: { level: true },
  });

  if (!parent) {
    throw new NotFoundError('Parent seller not found');
  }

  return parent.level + 1;
}

/**
 * Walks the parent chain from `proposedParentId` upward.
 * Throws if `sellerId` appears in that chain (would create a cycle).
 */
export async function assertNoCircularHierarchy(
  tx: Tx,
  sellerId: string,
  proposedParentId: string | null,
) {
  if (!proposedParentId) return;

  if (proposedParentId === sellerId) {
    throw new AppError(
      'This parent assignment would create a circular seller hierarchy.',
      400,
      'SELLER_HIERARCHY_CYCLE',
    );
  }

  let currentId: string | null = proposedParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === sellerId) {
      throw new AppError(
        'This parent assignment would create a circular seller hierarchy.',
        400,
        'SELLER_HIERARCHY_CYCLE',
      );
    }

    if (visited.has(currentId)) {
      throw new AppError(
        'This parent assignment would create a circular seller hierarchy.',
        400,
        'SELLER_HIERARCHY_CYCLE',
      );
    }
    visited.add(currentId);

    const parent: { parentSellerId: string | null } | null =
      await tx.sellerProfile.findUnique({
        where: { id: currentId },
        select: { parentSellerId: true },
      });

    currentId = parent?.parentSellerId ?? null;
  }
}

export async function assertValidParentSeller(
  tx: Tx,
  parentSellerId: string | null | undefined,
  childSellerId?: string,
) {
  if (!parentSellerId) return null;

  const parent = await tx.sellerProfile.findUnique({
    where: { id: parentSellerId },
    include: {
      user: { select: { id: true, role: true, status: true, name: true } },
    },
  });

  if (!parent) {
    throw new NotFoundError('Parent seller not found');
  }

  if (!isSellerRole(parent.user.role)) {
    throw new ValidationAppError('Parent must be a Master Seller or Seller');
  }

  if (childSellerId) {
    await assertNoCircularHierarchy(tx, childSellerId, parentSellerId);
  }

  return parent;
}

/** Returns seller IDs in the downline (excluding root), using recursive CTE. */
export async function getDescendantSellerIds(
  tx: Tx,
  rootSellerId: string,
): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE team AS (
      SELECT id
      FROM seller_profiles
      WHERE parent_seller_id = ${rootSellerId}::uuid
      UNION ALL
      SELECT sp.id
      FROM seller_profiles sp
      INNER JOIN team t ON sp.parent_seller_id = t.id
    )
    SELECT id FROM team
  `;

  return rows.map((r) => r.id);
}

export async function getTeamSellerIdsIncludingSelf(
  tx: Tx,
  rootSellerId: string,
): Promise<string[]> {
  const descendants = await getDescendantSellerIds(tx, rootSellerId);
  return [rootSellerId, ...descendants];
}

export async function isInSellerTeam(
  tx: Tx,
  viewerSellerId: string,
  targetSellerId: string,
): Promise<boolean> {
  if (viewerSellerId === targetSellerId) return true;
  const descendants = await getDescendantSellerIds(tx, viewerSellerId);
  return descendants.includes(targetSellerId);
}

export async function recountSubtreeLevels(tx: Tx, rootSellerId: string) {
  const root = await tx.sellerProfile.findUnique({
    where: { id: rootSellerId },
    select: { id: true, level: true },
  });
  if (!root) return;

  const queue: Array<{ id: string; level: number }> = [
    { id: root.id, level: root.level },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await tx.sellerProfile.findMany({
      where: { parentSellerId: current.id },
      select: { id: true },
    });

    for (const child of children) {
      const nextLevel = current.level + 1;
      await tx.sellerProfile.update({
        where: { id: child.id },
        data: { level: nextLevel },
      });
      queue.push({ id: child.id, level: nextLevel });
    }
  }
}
