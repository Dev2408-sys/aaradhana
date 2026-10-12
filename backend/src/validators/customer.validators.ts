import { z } from 'zod';
import { normalizeMobile } from '../utils/mobile';

const mobileSchema = z
  .string()
  .trim()
  .transform((value) => {
    let digits = normalizeMobile(value);
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  })
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile'));

const optionalEmail = z
  .union([z.string().trim().email(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

export const listCustomersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
  }),
});

export const searchCustomersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
  }),
});

export const customerIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    mobile: mobileSchema,
    email: optionalEmail,
    city: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      email: optionalEmail,
      city: z.string().trim().optional().nullable(),
      notes: z.string().trim().optional().nullable(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' }),
});
