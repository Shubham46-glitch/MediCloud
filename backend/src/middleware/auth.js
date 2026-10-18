/**
 * Authentication Middleware
 *
 * Verifies the access token from the Authorization header (Bearer token)
 * and attaches the decoded user info to req.user.
 *
 * Usage:
 *   import { authenticate } from '../middleware/auth.js';
 *   router.get('/protected', authenticate, controller);
 *
 *   router.get('/doctors-only', authenticate, requireRole('doctor'), controller);
 */

import { getAuthAdapter } from '../adapters/auth/index.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

const resolveVerifiedUser = async (payload, adapter) => {
  const userId = payload.userId || payload.sub;
  if (!userId) return null;
  if (env.AUTH_PROVIDER === 'cognito') {
    // The signed token proves identity; the server-side profile controls role.
    const profile = await adapter.getUserProfile(userId);
    if (!profile || profile.status === 'inactive') return null;
    if (!['patient', 'doctor', 'admin'].includes(profile.role)) return null;
    return {
      userId, email: profile.email, role: profile.role, name: profile.name,
      ...(profile.doctorId ? { doctorId: profile.doctorId } : {}),
    };
  }
  const mockProfile = await adapter.getUserProfile(userId);
  if (!mockProfile || mockProfile.status === 'inactive') return null;
  return {
    userId,
    email: mockProfile.email || payload.email,
    role: mockProfile.role,
    name: mockProfile.name,
    ...(mockProfile.doctorId ? { doctorId: mockProfile.doctorId } : {}),
  };
};

/**
 * Verify the Bearer token and attach user to req.user.
 * If no token is provided, returns 401.
 * If the token is invalid/expired, returns 401.
 */
export const authenticate = async (req, res, next) => {
  try {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      status: 401,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Provide a valid Bearer token.' },
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  if (!token || token.length > 8192) {
    return res.status(401).json({ success: false, status: 401, error: { code: 'INVALID_TOKEN', message: 'Your session has expired or the token is invalid. Please log in again.' } });
  }

  const authAdapter = getAuthAdapter();
  const result = await authAdapter.verifyToken(token);

  if (!result.valid) {
    logger.warn('Authentication failed', { error: result.error, requestId: req.id });
    return res.status(401).json({
      success: false,
      status: 401,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired or the token is invalid. Please log in again.',
      },
    });
  }

  // Attach user info to request for downstream use
  req.user = await resolveVerifiedUser(result.payload, authAdapter);
  if (!req.user) {
    return res.status(401).json({ success: false, status: 401, error: { code: 'INVALID_TOKEN', message: 'Your session is invalid. Please sign in again.' } });
  }

  return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticate.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, requireRole('admin'), controller);
 *
 * @param {...string} roles — Allowed roles (e.g., 'patient', 'doctor', 'admin')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        status: 401,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization denied', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        requestId: req.id,
      });
      return res.status(403).json({
        success: false,
        status: 403,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }

    next();
  };
};

/**
 * Optional authentication — attaches user if token is present,
 * but does not return 401 if no token is provided.
 * Useful for public endpoints that show different data for logged-in users.
 */
export const optionalAuth = async (req, res, next) => {
  try {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  if (!token || token.length > 8192) return next();
  const authAdapter = getAuthAdapter();
  const result = await authAdapter.verifyToken(token);

  if (result.valid) {
    req.user = await resolveVerifiedUser(result.payload, authAdapter);
  }

  return next();
  } catch (error) {
    return next(error);
  }
};
