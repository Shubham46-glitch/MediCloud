import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  handleRegister,
  handleLogin,
  handleConfirmSignUp,
  handleResendConfirmationCode,
  handleGetProfile,
  handleUpdateProfile,
  handleLogout,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
const confirmationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many confirmation attempts. Wait a while and try again.' },
  },
});
const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many code requests. Wait a while and try again.' },
  },
});

/** POST /api/auth/register — public */
router.post('/register', asyncHandler(handleRegister));

/** POST /api/auth/confirm — public, rate limited */
router.post('/confirm', confirmationLimiter, asyncHandler(handleConfirmSignUp));

/** POST /api/auth/resend-confirmation — public, rate limited */
router.post('/resend-confirmation', resendLimiter, asyncHandler(handleResendConfirmationCode));

/** POST /api/auth/login — public */
router.post('/login', asyncHandler(handleLogin));

/** GET /api/auth/me — authenticated */
router.get('/me', authenticate, asyncHandler(handleGetProfile));

/** PUT /api/auth/me — authenticated */
router.put('/me', authenticate, asyncHandler(handleUpdateProfile));

/** POST /api/auth/logout — authenticated (logs the event; client discards token) */
router.post('/logout', authenticate, asyncHandler(handleLogout));

export default router;
