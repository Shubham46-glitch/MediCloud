import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/validators/env.validator.js';

describe('environment validation', () => {
  it('requires live providers and their settings in production', () => {
    assert.throws(() => validateEnv({ NODE_ENV: 'production' }), /DB_PROVIDER|AUTH_PROVIDER|COGNITO_USER_POOL_ID|BREVO_API_KEY/);
  });

  it('accepts a configured production profile with placeholder test values', () => {
    const config = validateEnv({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://portal.example.invalid',
      FRONTEND_ORIGIN: 'https://portal.example.invalid',
      DB_PROVIDER: 'dynamodb',
      AUTH_PROVIDER: 'cognito',
      STORAGE_PROVIDER: 's3',
      EMAIL_PROVIDER: 'brevo',
      COGNITO_USER_POOL_ID: 'region_testPool',
      COGNITO_CLIENT_ID: 'synthetic-client-id',
      COGNITO_CLIENT_SECRET: 'synthetic-test-client-secret',
      DYNAMODB_TABLE_NAME: 'synthetic-table',
      S3_BUCKET_NAME: 'synthetic-bucket',
      BREVO_API_KEY: 'synthetic-test-key',
    });
    assert.equal(config.DB_PROVIDER, 'dynamodb');
    assert.equal(config.AUTH_PROVIDER, 'cognito');
  });

  it('requires a client secret when Cognito auth is enabled', () => {
    assert.throws(() => validateEnv({ AUTH_PROVIDER: 'cognito' }), /COGNITO_CLIENT_SECRET/);
    assert.equal(validateEnv({ AUTH_PROVIDER: 'mock' }).COGNITO_CLIENT_SECRET, '');
  });
});
