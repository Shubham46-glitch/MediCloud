/**
 * Catch-all 404 handler for undefined routes.
 * Returns a consistent JSON error response.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path} - Route not found on this server`,
    },
  });
};
