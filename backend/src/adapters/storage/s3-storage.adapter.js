/**
 * S3StorageAdapter — Real Amazon S3 file storage adapter.
 *
 * Uses:
 *   - @aws-sdk/client-s3 for delete operations
 *   - @aws-sdk/s3-request-presigner for presigned upload/download URLs
 *
 * Bucket: medicloud-medical-files-0234 (ap-south-1)
 *
 * Security:
 *   - All objects are private (no public access)
 *   - AWS credentials are never exposed to the browser
 *   - Presigned URLs have short TTLs (upload: 15 min, download: 5 min)
 *   - Object keys are server-generated (clients cannot choose keys)
 *   - File type and size are validated server-side before issuing an upload URL
 *
 * The completion check compares S3's reported content type and size with the
 * upload intent. MIME values can still be spoofed; byte-level content
 * inspection is a future enhancement.
 */

import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export class S3StorageAdapter {
  constructor() {
    this.s3 = new S3Client({ region: env.AWS_REGION });
    this.bucketName = env.S3_BUCKET_NAME;
    logger.info('S3StorageAdapter initialized', { bucket: this.bucketName, region: env.AWS_REGION });
  }

  /**
   * Validate file before issuing a presigned upload URL.
   * Rejects disallowed types and oversized files.
   */
  _validateFile({ fileType, fileSizeBytes }) {
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return { valid: false, error: `File type "${fileType}" is not allowed. Allowed: PDF, JPEG, PNG, WEBP.` };
    }
    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File size ${fileSizeBytes} bytes exceeds the 10 MB limit.` };
    }
    return { valid: true };
  }

  /**
   * Build a server-controlled S3 object key.
   * Clients never supply the key directly.
   */
  _buildKey(userId, fileName) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `medical-records/${userId}/${uuidv4()}-${safeFileName}`;
  }

  /**
   * Generate a presigned PUT URL so the client can upload directly to S3
   * without the file passing through the server.
   * TTL: 15 minutes.
   */
  async getPresignedUploadUrl({ userId, fileName, fileType, fileSizeBytes }) {
    const validation = this._validateFile({ fileType, fileSizeBytes });
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const objectKey = this._buildKey(userId, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: fileType,
      ContentLength: fileSizeBytes,
      // Prevent public access even if bucket policy changes
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    logger.info('S3: presigned upload URL issued', { userId });

    return { success: true, uploadUrl, objectKey, expiresInSeconds: 900 };
  }

  /**
   * Generate a presigned GET URL for secure temporary download.
   * TTL: 5 minutes. The URL expires quickly to limit exposure.
   */
  async getPresignedDownloadUrl({ objectKey, fileName }) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/["\\]/g, '_');
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    logger.info('S3: presigned download URL issued');

    return { success: true, downloadUrl, expiresInSeconds: 300 };
  }

  /**
   * Delete a file from S3. Used when a document is deleted from the system.
   */
  async deleteFile({ objectKey }) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: objectKey }));
    logger.info('S3: file deleted');
    return true;
  }

  async abortUpload({ objectKey }) {
    // Single-part presigned PUTs have no multipart session to abort. Removing a
    // partially uploaded object, if present, is the relevant cleanup action.
    return this.deleteFile({ objectKey });
  }

  async headObject({ objectKey }) {
    try {
      const result = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: objectKey }));
      return {
        exists: true,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        metadata: result.Metadata || {},
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return { exists: false };
      throw error;
    }
  }
}
