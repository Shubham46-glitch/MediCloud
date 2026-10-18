/**
 * Storage Adapter Factory
 * Returns MockStorageAdapter or S3StorageAdapter based on STORAGE_PROVIDER.
 */

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { MockStorageAdapter } from './mock-storage.adapter.js';
import { S3StorageAdapter } from './s3-storage.adapter.js';

let storageAdapterInstance = null;

export function getStorageAdapter() {
  if (storageAdapterInstance) return storageAdapterInstance;

  switch (env.STORAGE_PROVIDER) {
    case 's3':
      logger.info('Using S3 storage adapter');
      storageAdapterInstance = new S3StorageAdapter();
      break;
    default:
      logger.info('Using mock storage adapter (development mode)');
      storageAdapterInstance = new MockStorageAdapter();
  }
  return storageAdapterInstance;
}

export function resetStorageAdapter() {
  storageAdapterInstance = null;
}

export default getStorageAdapter();
