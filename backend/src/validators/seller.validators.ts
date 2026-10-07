import { SellerActivationStatus, UserRole } from '@prisma/client';
import { z } from 'zod';

const mobileSchema = z
  .string()
  .trim()
  .min(10, 'Mobile must be at least 10 digits')
  .max(15, 'Mobile must be at most 15 digits')
  .regex(/^[0-9+\- ]+$/, 'Mobile contains invalid characters');

const optionalEmail = z
  .union([z.string().trim().email('Invalid email'), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const listSellersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    role: z.enum([UserRole.MASTER_SELLER, UserRole.SELLER]).optional(),
    status: z.nativeEnum(SellerActivationStatus).optional(),
    city: z.string().optional(),
    parentSellerId: z.string().uuid().optional(),
    sortBy: z.enum(['createdAt', 'expectedSales', 'joinedAt', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const createSellerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name is required'),
    mobile: mobileSchema,
    email: optionalEmail,
    role: z.enum([UserRole.MASTER_SELLER, UserRole.SELLER]),
    parentSellerId: z.union([z.string().uuid(), z.null()]).optional(),
    city: z.string().trim().optional().nullable(),
    area: z.string().trim().optional().nullable(),
    instagramHandle: z.string().trim().optional().nullable(),
    expectedSales: z.coerce.number().int().nonnegative().optional().nullable(),
    activationStatus: z.nativeEnum(SellerActivationStatus).optional(),
  }),
});

export const updateSellerSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      email: optionalEmail,
      city: z.string().trim().optional().nullable(),
      area: z.string().trim().optional().nullable(),
      instagramHandle: z.string().trim().optional().nullable(),
      expectedSales: z.coerce.number().int().nonnegative().optional().nullable(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' }),
});

export const updateSellerStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    activationStatus: z.nativeEnum(SellerActivationStatus),
  }),
});

export const updateSellerParentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    parentSellerId: z.union([z.string().uuid(), z.null()]),
  }),
});

export const sellerIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const referralCodeParamSchema = z.object({
  params: z.object({
    sellerCode: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid seller code'),
  }),
});

export const registerSellerSchema = z.object({
  body: z.object({
    referralCode: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid referral code'),
    name: z.string().trim().min(2, 'Name is required'),
    mobile: mobileSchema,
    email: optionalEmail,
    city: z.string().trim().optional().nullable(),
    area: z.string().trim().optional().nullable(),
    instagramHandle: z.string().trim().optional().nullable(),
    expectedSales: z.coerce.number().int().nonnegative().optional().nullable(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72)
      .optional(),
  }),
});

export const updateMyProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      email: optionalEmail,
      city: z.string().trim().optional().nullable(),
      area: z.string().trim().optional().nullable(),
      instagramHandle: z.string().trim().optional().nullable(),
      expectedSales: z.coerce.number().int().nonnegative().optional().nullable(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' }),
});
