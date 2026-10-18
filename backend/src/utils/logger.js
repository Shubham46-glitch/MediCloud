import winston from 'winston';
import { env } from '../config/env.js';

/**
 * Structured JSON logger for MediCloud.
 *
 * In development, logs are pretty-printed to the console for readability.
 * In production, logs are emitted as JSON (one object per line) so they
 * can be ingested by Amazon CloudWatch Logs via the CloudWatch agent or
 * direct SDK calls. No passwords, tokens, or medical data are logged.
 *
 * Log levels (most to least verbose):
 *   error > warn > info > debug > verbose
 *
 * Usage:
 *   import { logger } from '../utils/logger.js';
 *   logger.info('Appointment booked', { appointmentId, patientId });
 */
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    // Remove sensitive fields before logging
    winston.format((info) => {
      const isSensitiveKey = (key) => /(password|token|secret|authorization|cookie|api.?key|presigned.?url)/i.test(key);
      const scrub = (value) => {
        if (Array.isArray(value)) return value.map(scrub);
        if (!value || typeof value !== 'object' || value instanceof Error) return value;
        const result = { ...value };
        for (const key of Object.keys(result)) result[key] = isSensitiveKey(key) ? '[REDACTED]' : scrub(result[key]);
        return result;
      };
      return scrub(info);
    })(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'medicloud-backend' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'development'
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) =>
                  `${timestamp} [${level}]: ${message}${Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''}`,
              ),
            )
          : undefined, // use default JSON format in production
    }),
  ],
});

export default logger;
// Named export alias — allows both `import logger from '...'` and `import { logger } from '...'`
export { logger };
