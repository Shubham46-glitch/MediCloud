/**
 * Repository Factory
 *
 * Returns the appropriate repository implementation based on the DB_PROVIDER
 * environment variable:
 *   - "mock"    → MockRepository (in-memory, development/test only)
 *   - "dynamodb" → DynamoRepository (real AWS DynamoDB)
 *
 * This is the single entry point for all data access. Controllers and services
 * should import `repository` from this module rather than directly instantiating
 * a repository class.
 */

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { MockRepository } from './mock.repository.js';
import { DynamoRepository } from './dynamo.repository.js';

let repositoryInstance = null;

/**
 * Get the singleton repository instance.
 * The repository is created once on first call and reused.
 */
export function getRepository() {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  switch (env.DB_PROVIDER) {
    case 'dynamodb':
      logger.info('Using DynamoDB repository (production mode)');
      repositoryInstance = new DynamoRepository();
      break;
    case 'mock':
    default:
      logger.info('Using mock repository (development/test mode)');
      repositoryInstance = new MockRepository();
      break;
  }

  return repositoryInstance;
}

/**
 * Reset the repository singleton. Used in tests to get a fresh instance
 * with re-seeded data between test suites.
 */
export function resetRepository() {
  repositoryInstance = null;
}

export default getRepository();
