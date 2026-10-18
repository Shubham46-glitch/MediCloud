/**
 * Auth Service — Business logic for authentication operations.
 *
 * Delegates token verification and user management to the auth adapter,
 * and data persistence to the repository. Controllers call this service
 * rather than directly using adapters or repositories.
 */

import { getAuthAdapter } from '../adapters/auth/index.js';
import { z } from 'zod';

// ── Validation schemas ──

export const registerSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  bloodGroup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).optional(),
  bloodGroup: z.string().max(20).optional(),
  dateOfBirth: z.string().max(20).optional(),
  gender: z.string().max(40).optional(),
});

export const confirmSignUpSchema = z.object({
  email: z.string().email('Valid email required'),
  code: z.string().trim().min(1, 'Verification code is required').max(128),
});

export const resendConfirmationCodeSchema = z.object({
  email: z.string().email('Valid email required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  allergies: z.array(z.string()).optional(),
  insuranceProvider: z.string().optional(),
  policyNumber: z.string().optional(),
});

/**
 * Register a new patient account.
 * Public registration is restricted to 'patient' role only.
 */
export async function register(input) {
  const validation = registerSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      status: 400,
      error: 'VALIDATION_ERROR',
      details: validation.error.flatten().fieldErrors,
    };
  }

  const authAdapter = getAuthAdapter();
  return authAdapter.register(validation.data);
}

/**
 * Login with email and password.
 */
export async function login(input) {
  const validation = loginSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      status: 400,
      error: 'VALIDATION_ERROR',
      details: validation.error.flatten().fieldErrors,
    };
  }

  const authAdapter = getAuthAdapter();
  const { email, password, ...profileDraft } = validation.data;
  return authAdapter.login({ email, password, profileDraft });
}

export async function confirmSignUp(input) {
  const validation = confirmSignUpSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', message: 'Enter a valid email and verification code.' };
  }
  return getAuthAdapter().confirmSignUp(validation.data);
}

export async function resendConfirmationCode(input) {
  const validation = resendConfirmationCodeSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', message: 'Enter a valid email address.' };
  }
  return getAuthAdapter().resendConfirmationCode(validation.data);
}

/**
 * Get the current user's profile.
 */
export async function getProfile(userId) {
  const authAdapter = getAuthAdapter();
  const user = await authAdapter.getUserProfile(userId);
  if (!user) {
    return { success: false, status: 404, error: 'USER_NOT_FOUND' };
  }
  return { success: true, user };
}

/**
 * Update the current user's profile.
 * Role changes are not allowed through this function.
 */
export async function updateProfile(userId, input) {
  const validation = updateProfileSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      status: 400,
      error: 'VALIDATION_ERROR',
      details: validation.error.flatten().fieldErrors,
    };
  }

  const authAdapter = getAuthAdapter();
  const user = await authAdapter.updateProfile(userId, validation.data);
  if (!user) {
    return { success: false, status: 404, error: 'USER_NOT_FOUND' };
  }
  return { success: true, user };
}

export async function logout(accessToken) {
  const authAdapter = getAuthAdapter();
  if (typeof authAdapter.logout === 'function') await authAdapter.logout(accessToken);
  return { success: true };
}
