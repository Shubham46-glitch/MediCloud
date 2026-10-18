import logger from '../utils/logger.js';

/**
 * Centralized application error handling middleware.
 * Prevents leaking stack traces or sensitive internals in production.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);
  const requestedStatus = err.statusCode || err.status || 500;
  const statusCode = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500;
  const safeMessage = statusCode >= 500
    ? 'An unexpected internal error occurred.'
    : (err.message || 'Request could not be processed.');
  const response = {
    success: false,
    status: statusCode,
    error: {
      code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : (err.code || 'BAD_REQUEST'),
      message: safeMessage,
    },
  };

  // Log only operational fields; omit raw error messages and stack traces.
  if (statusCode >= 500) {
    logger.error('Request failed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode,
      code: err.code || 'UNEXPECTED_ERROR',
    });
  }

  res.status(statusCode).json(response);
};
