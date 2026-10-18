import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * 15-minute window, max 100 requests per IP address.
 * Gracefully disabled or relaxed during automated tests.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // higher limit in tests
  standardHeaders: true, // Return standard RateLimit headers in response
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    status: 429,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
  },
});
