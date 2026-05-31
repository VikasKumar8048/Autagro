import { z } from 'zod';
import { OtpPurpose, UserRole } from '../enums';

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

export const requestOtpSchema = z.object({
  phone: z.string().regex(phoneRegex, 'Invalid phone number (E.164 format recommended)'),
  purpose: z.nativeEnum(OtpPurpose).default(OtpPurpose.LOGIN),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(phoneRegex),
  code: z.string().length(6).regex(/^\d{6}$/),
  purpose: z.nativeEnum(OtpPurpose).default(OtpPurpose.LOGIN),
});

export const registerSchema = z.object({
  phone: z.string().regex(phoneRegex),
  role: z.nativeEnum(UserRole),
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must include upper, lower, and number')
    .optional(),
  state: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
});

export const passwordLoginSchema = z.object({
  identifier: z.string().min(3).max(255),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32),
});

export const forgotPasswordSchema = z.object({
  phone: z.string().regex(phoneRegex),
});

export const resetPasswordSchema = z.object({
  phone: z.string().regex(phoneRegex),
  code: z.string().length(6).regex(/^\d{6}$/),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  state: z.string().min(2).max(80).optional(),
  district: z.string().min(2).max(80).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  businessName: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
