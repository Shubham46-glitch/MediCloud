/**
 * Service to aggregate system health telemetry.
 */
export const getHealthStatus = () => {
  return {
    service: 'MediCloud Healthcare API',
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };
};
