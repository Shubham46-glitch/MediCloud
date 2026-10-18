/**
 * Auth Adapter Factory
 *
 * Returns the appropriate authentication adapter based on AUTH_PROVIDER:
 *   - "mock"    → MockAuthAdapter (local development, no AWS needed)
 *   - "cognito" → CognitoAuthAdapter (real Amazon Cognito)
 */

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { MockAuthAdapter } from './mock-auth.adapter.js';
import { CognitoAuthAdapter } from './cognito-auth.adapter.js';

let authAdapterInstance = null;

export function getAuthAdapter() {
  if (authAdapterInstance) {
    return authAdapterInstance;
  }

  switch (env.AUTH_PROVIDER) {
    case 'cognito':
      logger.info('Using Cognito auth adapter (production mode)');
      authAdapterInstance = new CognitoAuthAdapter();
      break;
    case 'mock':
    default:
      logger.info('Using mock auth adapter (development mode)');
      authAdapterInstance = new MockAuthAdapter();
      break;
  }

  return authAdapterInstance;
}

export function resetAuthAdapter() {
  authAdapterInstance = null;
}

export default getAuthAdapter();
