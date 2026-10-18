import { z } from 'zod';

/**
 * Environment variable schema for MediCloud backend.
 *
 * In development/test mode, all AWS-related variables have safe defaults
 * so the application can run without real AWS credentials by using mock adapters.
 * In production, these must be set to real values.
 */
export const envSchema = z.object({
  // ── Server ──
  PORT: z.coerce
    .number()
    .int()
    .min(1024, { message: 'PORT must be an integer >= 1024' })
    .max(65535, { message: 'PORT must be <= 65535' })
    .default(5000),

  NODE_ENV: z
    .enum(['development', 'production', 'test'], {
      errorMap: () => ({ message: "NODE_ENV must be 'development', 'production', or 'test'" }),
    })
    .default('development'),

  // Renamed from FRONTEND_URL for clarity, but keep backward compatibility
  FRONTEND_URL: z
    .string()
    .url({ message: 'FRONTEND_URL must be a valid URL (e.g. http://localhost:5173)' })
    .default('http://localhost:5173'),

  FRONTEND_ORIGIN: z
    .string()
    .url({ message: 'FRONTEND_ORIGIN must be a valid URL' })
    .default('http://localhost:5173'),

  // ── Logging ──
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'verbose'])
    .default('info'),

  // ── AWS ──
  AWS_REGION: z
    .string()
    .default('ap-south-1'),

  // ── DynamoDB ──
  DYNAMODB_TABLE_NAME: z
    .string()
    .default('medicloud-local'),

  // ── Cognito ──
  COGNITO_USER_POOL_ID: z
    .string()
    .default(''), // empty in dev → mock auth adapter is used
  COGNITO_CLIENT_ID: z
    .string()
    .default(''),
  COGNITO_CLIENT_SECRET: z
    .string()
    .default(''),
  COGNITO_DOMAIN: z
    .string()
    .default(''),

  // ── S3 ──
  S3_BUCKET_NAME: z
    .string()
    .default('medicloud-medical-files-0234'),

  // ── Brevo ──
  BREVO_API_KEY: z
    .string()
    .default(''), // empty in dev → mock email adapter is used
  BREVO_SENDER_EMAIL: z
    .string()
    .email({ message: 'BREVO_SENDER_EMAIL must be a valid email' })
    .default('noreply@medicloud.local'),
  BREVO_SENDER_NAME: z
    .string()
    .default('MediCloud Notifications'),

  // ── Feature flags ──
  // When 'mock', the app uses in-memory/local adapters instead of real AWS services.
  // When 'aws', real AWS SDK calls are made (requires valid credentials).
  DB_PROVIDER: z
    .enum(['mock', 'dynamodb'])
    .default('mock'),
  AUTH_PROVIDER: z
    .enum(['mock', 'cognito'])
    .default('mock'),
  STORAGE_PROVIDER: z
    .enum(['mock', 's3'])
    .default('mock'),
  EMAIL_PROVIDER: z
    .enum(['mock', 'brevo'])
    .default('mock'),
}).superRefine((config, context) => {
  if (config.AUTH_PROVIDER === 'cognito' && !config.COGNITO_CLIENT_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['COGNITO_CLIENT_SECRET'],
      message: 'COGNITO_CLIENT_SECRET is required when AUTH_PROVIDER=cognito',
    });
  }

  if (config.NODE_ENV !== 'production') return;
  const requiredProductionValues = [
    ['DB_PROVIDER', config.DB_PROVIDER, 'dynamodb'],
    ['AUTH_PROVIDER', config.AUTH_PROVIDER, 'cognito'],
    ['STORAGE_PROVIDER', config.STORAGE_PROVIDER, 's3'],
    ['EMAIL_PROVIDER', config.EMAIL_PROVIDER, 'brevo'],
    ['COGNITO_USER_POOL_ID', config.COGNITO_USER_POOL_ID],
    ['COGNITO_CLIENT_ID', config.COGNITO_CLIENT_ID],
    ['DYNAMODB_TABLE_NAME', config.DYNAMODB_TABLE_NAME],
    ['S3_BUCKET_NAME', config.S3_BUCKET_NAME],
    ['BREVO_API_KEY', config.BREVO_API_KEY],
    ['FRONTEND_ORIGIN', config.FRONTEND_ORIGIN, 'non-local configured origin'],
  ];
  for (const [key, value, expected] of requiredProductionValues) {
    const invalidOrigin = key === 'FRONTEND_ORIGIN' && value === 'http://localhost:5173';
    if (!value || invalidOrigin || (expected && expected !== 'non-local configured origin' && value !== expected)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: expected && expected !== 'non-local configured origin' ? `must be ${expected} in production` : 'must be configured for production',
      });
    }
  }
});

/**
 * Validates environment variables against the schema.
 * Throws a clean descriptive error if validation fails.
 * @param {object} config - Configuration object (defaults to process.env)
 * @returns {object} Validated and typed configuration object
 */
export const validateEnv = (config = process.env) => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.format();
    const errorDetails = Object.entries(formattedErrors)
      .filter(([key]) => key !== '_errors')
      .map(([key, val]) => `  - ${key}: ${val?._errors?.join(', ')}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }

  return result.data;
};
