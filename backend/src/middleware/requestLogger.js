import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import { performance } from 'node:perf_hooks';

/**
 * Attaches a unique request ID to every request for log correlation.
 * If the client sends an `X-Request-ID` header, it is reused; otherwise a
 * new UUID is generated. The ID is attached to `req.id` and included in
 * the response header `X-Request-ID`.
 *
 * This is especially useful in production when correlating logs in
 * Amazon CloudWatch across a multi-step request flow.
 */
export const requestLogger = (req, res, next) => {
  const suppliedId = req.headers['x-request-id'];
  req.id = typeof suppliedId === 'string' && /^[0-9a-f-]{36}$/i.test(suppliedId) ? suppliedId : randomUUID();
  res.setHeader('X-Request-ID', req.id);
  const startedAt = performance.now();

  // Log the incoming request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
  });

  // Log response when it finishes
  res.on('finish', () => {
    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      path: req.route ? `${req.baseUrl}${req.route.path}` : req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });

  next();
};
