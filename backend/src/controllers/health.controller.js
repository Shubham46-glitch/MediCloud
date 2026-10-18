import { getHealthStatus } from '../services/health.service.js';

/**
 * Controller for GET /api/health
 */
export const getHealth = (req, res) => {
  const health = getHealthStatus();
  return res.status(200).json({
    success: true,
    ...health,
  });
};
