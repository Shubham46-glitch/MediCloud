/**
 * Auth Controller — HTTP handlers for authentication endpoints.
 *
 * All responses use the standard format:
 *   { success: boolean, status: number, ...data, error?: {...} }
 */

import {
  register,
  login,
  confirmSignUp,
  resendConfirmationCode,
  getProfile,
  updateProfile,
  logout,
} from '../services/auth.service.js';
import logger from '../utils/logger.js';

/**
 * POST /api/auth/register
 * Register a new patient account.
 */
export const handleRegister = async (req, res) => {
  const result = await register(req.body);

  if (!result.success) {
    const status = result.status || 400;
    return res.status(status).json({
      success: false,
      status,
      error: { code: result.error, message: result.message || 'Registration failed' },
      ...(result.details ? { details: result.details } : {}),
    });
  }

  return res.status(result.status || 201).json({
    success: true,
    status: result.status || 201,
    message: result.message || 'Account created successfully',
    ...(result.needsConfirmation !== undefined ? { needsConfirmation: result.needsConfirmation } : {}),
    ...(result.deliveryDestination ? { deliveryDestination: result.deliveryDestination } : {}),
    ...(result.user ? { user: result.user } : {}),
    ...(result.token ? { token: result.token } : {}),
  });
};

/** POST /api/auth/confirm — confirm a Cognito sign-up code. */
export const handleConfirmSignUp = async (req, res) => {
  const result = await confirmSignUp(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({
      success: false,
      status: result.status || 400,
      error: { code: result.error, message: result.message || 'Account confirmation failed.' },
    });
  }
  return res.status(200).json({ success: true, status: 200, confirmed: true, message: 'Email confirmed. Sign in to continue.' });
};

/** POST /api/auth/resend-confirmation — request a new Cognito confirmation code. */
export const handleResendConfirmationCode = async (req, res) => {
  const result = await resendConfirmationCode(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({
      success: false,
      status: result.status || 400,
      error: { code: result.error, message: result.message || 'A confirmation code could not be sent.' },
    });
  }
  return res.status(200).json({
    success: true,
    status: 200,
    message: result.message,
    ...(result.deliveryDestination ? { deliveryDestination: result.deliveryDestination } : {}),
  });
};

/**
 * POST /api/auth/login
 * Login and receive an access token.
 */
export const handleLogin = async (req, res) => {
  const result = await login(req.body);

  if (!result.success) {
    const status = result.status || 401;
    return res.status(status).json({
      success: false,
      status,
      error: { code: result.error, message: result.message || 'Login failed' },
    });
  }

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Login successful',
    user: result.user,
    token: result.token,
  });
};

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile.
 * Requires authentication (req.user is set by auth middleware).
 */
export const handleGetProfile = async (req, res) => {
  const result = await getProfile(req.user.userId);

  if (!result.success) {
    return res.status(result.status).json({
      success: false,
      status: result.status,
      error: { code: result.error, message: 'User profile not found' },
    });
  }

  return res.status(200).json({
    success: true,
    status: 200,
    user: result.user,
  });
};

/**
 * PUT /api/auth/me
 * Update the current authenticated user's profile.
 * Does not allow role changes.
 */
export const handleUpdateProfile = async (req, res) => {
  const result = await updateProfile(req.user.userId, req.body);

  if (!result.success) {
    return res.status(result.status || 400).json({
      success: false,
      status: result.status || 400,
      error: { code: result.error, message: 'Profile update failed' },
      ...(result.details ? { details: result.details } : {}),
    });
  }

  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Profile updated successfully',
    user: result.user,
  });
};

/**
 * POST /api/auth/logout
 * Logout endpoint. With JWT, logout is handled client-side by discarding the token.
 * This endpoint exists for API completeness and to log the event.
 */
export const handleLogout = async (req, res) => {
  const accessToken = req.headers.authorization?.slice(7);
  await logout(accessToken);
  logger.info('User logged out', { userId: req.user?.userId, requestId: req.id });
  return res.status(200).json({
    success: true,
    status: 200,
    message: 'Logged out successfully. Discard the access token on the client.',
  });
};
