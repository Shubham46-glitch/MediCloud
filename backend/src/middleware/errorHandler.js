/**
 * Centralized application error handling middleware.
 * Prevents leaking stack traces or sensitive internals in production.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    success: false,
    status: statusCode,
    error: {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      message: err.message || 'An unexpected internal error occurred.',
      ...(isProduction ? {} : { stack: err.stack }),
    },
  };

  // Only log detailed errors to server console when not in production or when >= 500
  if (!isProduction && statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(response);
};
