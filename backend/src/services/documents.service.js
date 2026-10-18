/**
 * Documents Service — Medical document upload/download authorization.
 *
 * The server never handles the actual file bytes. Instead:
 *   1. Client requests a presigned upload URL from the server.
 *   2. Server validates file type/size, generates an S3 key, and returns the URL.
 *   3. Client uploads directly to S3 using the presigned URL.
 *   4. Client notifies the server that the upload is complete.
 *   5. Server stores the document metadata in the repository.
 *
 * For downloads, the server generates a short-lived presigned GET URL
 * and verifies ownership before returning it.
 *
 * AWS credentials are never exposed to the client.
 */

import { getStorageAdapter } from '../adapters/storage/index.js';
import { getRepository } from '../repository/index.js';
import logger from '../utils/logger.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const uploadRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileSizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  description: z.string().max(500).optional(),
});

/**
 * Request a presigned URL for a new document upload.
 * Does NOT store metadata yet — that happens after the upload completes.
 */
export async function requestUploadUrl(userId, input) {
  const validation = uploadRequestSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }

  const { fileName, fileType, fileSizeBytes, description } = validation.data;
  const adapter = getStorageAdapter();
  const result = await adapter.getPresignedUploadUrl({ userId, fileName, fileType, fileSizeBytes });

  if (result.success === false) {
    return { success: false, status: 400, error: 'UPLOAD_URL_FAILED', message: result.error };
  }

  const uploadId = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + result.expiresInSeconds;
  try {
    await getRepository().createUploadIntent({
      uploadId, userId, objectKey: result.objectKey,
      fileName, fileType, fileSizeBytes, description, expiresAt,
    });
  } catch (error) {
    await adapter.deleteFile({ objectKey: result.objectKey }).catch(() => {});
    throw error;
  }
  if (process.env.NODE_ENV !== 'production' && typeof adapter.simulateUpload === 'function') {
    await adapter.simulateUpload({ objectKey: result.objectKey, fileType, fileSizeBytes });
  }
  logger.info('Upload URL issued', { userId, expiresInSeconds: result.expiresInSeconds });
  return {
    success: true,
    uploadUrl: result.uploadUrl,
    uploadId,
    expiresInSeconds: result.expiresInSeconds,
  };
}

/**
 * Confirm a completed upload and store metadata in the repository.
 * Called after the client successfully uploads to S3.
 */
export async function confirmUpload(userId, input) {
  const validation = z.object({ uploadId: z.string().uuid() }).safeParse(input);
  if (!validation.success) return { success: false, status: 400, error: 'VALIDATION_ERROR', message: 'A valid upload request ID is required.' };
  const repo = getRepository();
  const intent = await repo.getUploadIntent(userId, validation.data.uploadId);
  if (!intent) return { success: false, status: 404, error: 'UPLOAD_REQUEST_NOT_FOUND', message: 'Upload request not found or already confirmed.' };
  if (intent.expiresAt <= Math.floor(Date.now() / 1000)) {
    await repo.deleteUploadIntent(userId, intent.uploadId);
    return { success: false, status: 410, error: 'UPLOAD_REQUEST_EXPIRED', message: 'The upload request expired. Request a new upload link.' };
  }
  const expectedPrefix = intent.objectKey.startsWith(`medical-records/${userId}/`)
    ? `medical-records/${userId}/`
    : `uploads/${userId}/`;
  if (!intent.objectKey.startsWith(expectedPrefix) || intent.objectKey.slice(expectedPrefix.length).includes('/')) {
    await repo.deleteUploadIntent(userId, intent.uploadId);
    return { success: false, status: 400, error: 'INVALID_UPLOAD_KEY', message: 'The stored upload request is invalid.' };
  }
  const adapter = getStorageAdapter();
  const object = await adapter.headObject({ objectKey: intent.objectKey });
  if (!object.exists) {
    await repo.deleteUploadIntent(userId, intent.uploadId);
    return { success: false, status: 400, error: 'UPLOADED_OBJECT_NOT_FOUND', message: 'The uploaded file was not found. Upload it before confirming.' };
  }
  if (object.contentLength !== intent.fileSizeBytes || object.contentType !== intent.fileType) {
    await adapter.deleteFile({ objectKey: intent.objectKey });
    await repo.deleteUploadIntent(userId, intent.uploadId);
    return { success: false, status: 400, error: 'UPLOAD_METADATA_MISMATCH', message: 'The uploaded file does not match the approved upload request.' };
  }
  let document;
  try {
    document = await repo.completeUploadIntent(userId, intent.uploadId, {
      objectKey: intent.objectKey, fileName: intent.fileName, fileType: intent.fileType,
      fileSizeBytes: intent.fileSizeBytes, description: intent.description,
    });
  } catch (error) {
    logger.error('Document metadata save failed', { userId, errorType: error.name || 'UnknownError' });
    return { success: false, status: 500, error: 'DOCUMENT_SAVE_FAILED', message: 'The upload could not be recorded. Please retry or contact support.' };
  }
  if (!document) {
    const latestIntent = await repo.getUploadIntent(userId, intent.uploadId);
    if (!latestIntent || latestIntent.expiresAt <= Math.floor(Date.now() / 1000)) {
      await adapter.deleteFile({ objectKey: intent.objectKey });
      await repo.deleteUploadIntent(userId, intent.uploadId);
    }
    return { success: false, status: 410, error: 'UPLOAD_REQUEST_EXPIRED', message: 'The upload request expired or was already confirmed.' };
  }
  logger.info('Document metadata saved', { documentId: document.documentId, userId });
  return { success: true, document };
}

export async function cancelUploadIntent(userId, uploadId) {
  const validation = z.string().uuid().safeParse(uploadId);
  if (!validation.success) return { success: false, status: 400, error: 'VALIDATION_ERROR' };
  const repo = getRepository();
  const intent = await repo.getUploadIntent(userId, uploadId);
  if (!intent) return { success: true };
  const adapter = getStorageAdapter();
  const object = await adapter.headObject({ objectKey: intent.objectKey });
  if (object.exists) await adapter.deleteFile({ objectKey: intent.objectKey });
  await repo.deleteUploadIntent(userId, uploadId);
  return { success: true };
}

/**
 * Get presigned download URL. Verifies ownership before issuing.
 */
export async function getDownloadUrl(documentId, userId) {
  const repo = getRepository();
  const doc = await repo.getDocumentById(documentId, userId);
  if (!doc) {
    return { success: false, status: 404, error: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' };
  }

  const adapter = getStorageAdapter();
  const object = await adapter.headObject({ objectKey: doc.objectKey });
  if (!object.exists) return { success: false, status: 404, error: 'DOCUMENT_FILE_NOT_FOUND', message: 'The stored file is unavailable.' };
  const result = await adapter.getPresignedDownloadUrl({ objectKey: doc.objectKey, fileName: doc.fileName });
  return { success: true, downloadUrl: result.downloadUrl, expiresInSeconds: result.expiresInSeconds };
}

/**
 * List a user's documents.
 */
export async function listUserDocuments(userId) {
  const repo = getRepository();
  const documents = await repo.getDocumentsByUser(userId);
  return { success: true, documents: documents.map(({ PK, SK, objectKey, ...safeDocument }) => safeDocument) };
}

/**
 * Delete a document (metadata + S3 file). Verifies ownership.
 */
export async function deleteDocument(documentId, userId) {
  const repo = getRepository();
  const doc = await repo.getDocumentById(documentId, userId);
  if (!doc) {
    return { success: false, status: 404, error: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' };
  }

  const adapter = getStorageAdapter();
  await adapter.deleteFile({ objectKey: doc.objectKey });
  await repo.deleteDocument(documentId, userId);
  logger.info('Document deleted', { documentId, userId });
  return { success: true };
}
