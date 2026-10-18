import { z } from 'zod';

export const envSchema = z.object({
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
  FRONTEND_URL: z
    .string()
    .url({ message: 'FRONTEND_URL must be a valid URL (e.g. http://localhost:5173)' })
    .default('http://localhost:5173'),
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
