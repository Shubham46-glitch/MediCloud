/**
 * MockStorageAdapter — Local no-op storage adapter for development.
 *
 * DEVELOPMENT/TEST ONLY. Generates fake presigned URLs and stores
 * document metadata in the mock repository. No files are actually uploaded.
 *
 * In production, use S3StorageAdapter with the real medicloud-medical-files-0234 bucket.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

export class MockStorageAdapter {
  constructor() {
    this.objects = new Map();
    logger.info('MockStorageAdapter initialized (development mode — no real files stored)');
  }

  /**
   * Generate a fake presigned upload URL.
   * In production, this would call S3.getSignedUrlPromise('putObject', ...).
   * Returns a URL that the client would PUT the file to.
   */
  async getPresignedUploadUrl({ userId, fileName, fileType, fileSizeBytes }) {
    const objectKey = this._buildKey(userId, fileName);
    const fakeUrl = `http://localhost:9090/mock-s3/${objectKey}?mock=true&expires=900`;
    logger.debug('MockStorage: generated local simulated upload URL');
    return {
      uploadUrl: fakeUrl,
      objectKey,
      expiresInSeconds: 900,
    };
  }

  async simulateUpload({ objectKey, fileType, fileSizeBytes }) {
    this.objects.set(objectKey, { contentType: fileType, contentLength: fileSizeBytes });
    return true;
  }

  /**
   * Generate a fake presigned download URL.
   * In production, this calls S3 getSignedUrl('getObject', ...) with a short TTL.
   */
  async getPresignedDownloadUrl({ objectKey, fileName }) {
    const fakeUrl = `http://localhost:9090/mock-s3/${objectKey}?mock=true&expires=300&filename=${encodeURIComponent(fileName)}`;
    logger.debug('MockStorage: generated fake download URL');
    return {
      downloadUrl: fakeUrl,
      expiresInSeconds: 300,
    };
  }

  /**
   * "Delete" a file — in mock mode, just log it.
   * In production, calls S3 DeleteObject.
   */
  async deleteFile({ objectKey }) {
    this.objects.delete(objectKey);
    logger.debug('MockStorage: simulated file delete');
    return true;
  }

  async abortUpload({ objectKey }) {
    return this.deleteFile({ objectKey });
  }

  async headObject({ objectKey }) {
    const object = this.objects.get(objectKey);
    return object ? { exists: true, ...object, metadata: {} } : { exists: false };
  }

  _buildKey(userId, fileName) {
    // Sanitize filename to prevent path traversal
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `uploads/${userId}/${uuidv4()}-${safeFileName}`;
  }
}
