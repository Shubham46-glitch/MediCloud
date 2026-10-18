/**
 * Standardized success response helper.
 */
export const successResponse = (res, data = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    status: statusCode,
    message,
    data,
  });
};

/**
 * Standardized placeholder response helper for modules deferred to Phase 2.
 */
export const placeholderResponse = (res, moduleName, description = '') => {
  return res.status(501).json({
    success: false,
    status: 501,
    module: moduleName,
    message: `${moduleName} endpoints are not implemented yet. Scheduled for Phase 2.`,
    details: description || 'This endpoint is currently a placeholder. Database integration, authentication, and business logic are not connected yet.',
    phase: 'Phase 2',
  });
};
