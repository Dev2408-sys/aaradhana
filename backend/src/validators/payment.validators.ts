import { z } from 'zod';

const paymentMethod = z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']);

export const createCustomerPaymentSchema = z.object({
  body: z.object({
    saleId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMethod,
    paymentReference: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    idempotencyKey: z.string().trim().max(120).optional().nullable(),
  }),
});

export const createSellerPaymentSchema = z.object({
  body: z.object({
    sellerId: z.string().uuid().optional(),
    amount: z.number().positive(),
    paymentMethod,
    paymentReference: z.string().trim().max(120).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    idempotencyKey: z.string().trim().max(120).optional().nullable(),
    paymentDate: z.string().datetime().optional(),
  }),
});

export const listCustomerPaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    saleId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    eventDay: z.coerce.number().int().min(1).max(10).optional(),
    status: z.enum(['RECORDED', 'REVERSED']).optional(),
  }),
});

export const receivablesQuerySchema = z.object({
  query: z.object({
    eventDay: z.coerce.number().int().min(1).max(10).optional(),
  }),
});

export const listSellerPaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
    sellerId: z.string().uuid().optional(),
    status: z.enum(['RECORDED', 'REVERSED']).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const sellerIdParamSchema = z.object({
  params: z.object({ sellerId: z.string().uuid() }),
});

export const customerIdParamSchema = z.object({
  params: z.object({ customerId: z.string().uuid() }),
});

export const saleIdParamSchema = z.object({
  params: z.object({ saleId: z.string().uuid() }),
});

export const listLedgerSchema = z.object({
  params: z.object({ sellerId: z.string().uuid() }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const listSellerAccountingSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(50).optional(),
    search: z.string().optional(),
  }),
});
