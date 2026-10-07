import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    mobile: z
      .string()
      .trim()
      .min(10, 'Mobile must be at least 10 digits')
      .max(15, 'Mobile must be at most 15 digits')
      .regex(/^[0-9+\- ]+$/, 'Mobile contains invalid characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const logoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .default({}),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(72, 'Password is too long'),
  }),
});
