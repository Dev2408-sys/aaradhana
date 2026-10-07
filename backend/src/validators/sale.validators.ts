import { z } from 'zod';

const mobileSchema = z
  .string()
  .trim()
  .min(10)
  .max(15)
  .regex(/^[0-9+\- ]+$/);

export const createSaleSchema = z.object({
  body: z.object({
    sellerId: z.string().uuid().optional(),
    /** Navratri night 1–10 (11–20 Oct 2026). Required for operational sales. */
    eventDay: z.number().int().min(1).max(10).optional(),
    customer: z.object({
      name: z.string().trim().min(2),
      mobile: mobileSchema,
      email: z
        .union([z.string().trim().email(), z.literal(''), z.null()])
        .optional()
        .transform((v) => (v === '' || v === undefined ? null : v)),
      city: z.string().trim().optional().nullable(),
    }),
    items: z
      .array(
        z.object({
          ticketTypeId: z.string().uuid(),
          quantity: z.number().int().positive().max(1000),
          sellingPrice: z.number().positive(),
        }),
      )
      .min(1)
      .max(20),
    customerPaymentStatus: z.enum(['PENDING', 'PAID']).optional(),
    /** @deprecated UTR no longer used for sell flow */
    adminPaymentUtr: z
      .string()
      .trim()
      .min(6)
      .max(80)
      .optional()
      .nullable(),
    /** Payment screenshot URL after upload (required for seller sales) */
    adminPaymentProofUrl: z
      .string()
      .trim()
      .min(8)
      .max(500)
      .optional()
      .nullable(),
  }),
});

export const listSalesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    sellerId: z.string().uuid().optional(),
    saleStatus: z.string().optional(),
    deliveryStatus: z
      .enum(['AWAITING_APPROVAL', 'AWAITING_PAYMENT', 'READY_TO_SEND', 'SENT'])
      .optional(),
    eventDay: z.coerce.number().int().min(1).max(10).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    period: z.enum(['today', 'yesterday', 'week', 'month']).optional(),
  }),
});

export const saleIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const approveSaleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    confirmCustomerName: z.string().trim().min(2),
    confirmCustomerMobile: z
      .string()
      .trim()
      .min(10)
      .max(15)
      .regex(/^[0-9+\- ]+$/),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
});

export const rejectSaleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    reason: z.string().trim().max(500).optional().nullable(),
  }),
});

export const listTicketsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    ticketTypeCode: z.string().optional(),
    sellerId: z.string().uuid().optional(),
    status: z.string().optional(),
    eventDay: z.coerce.number().int().min(1).max(10).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

export const ticketIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
