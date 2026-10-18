import { Router } from 'express';
import {
  handleListDocuments,
  handleRequestUploadUrl,
  handleConfirmUpload,
  handleGetDownloadUrl,
  handleDeleteDocument,
  handleCancelUploadIntent,
} from '../controllers/documents.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// All document routes require authentication
router.use(authenticate);

/** GET /api/documents — list user's documents */
router.get('/', asyncHandler(handleListDocuments));

/** POST /api/documents/upload-url — request presigned upload URL */
router.post('/upload-url', asyncHandler(handleRequestUploadUrl));

/** POST /api/documents/confirm-upload — save metadata after S3 upload */
router.post('/confirm-upload', asyncHandler(handleConfirmUpload));
router.delete('/upload-intent/:uploadId', asyncHandler(handleCancelUploadIntent));

/** GET /api/documents/:id/download-url — get presigned download URL */
router.get('/:id/download-url', asyncHandler(handleGetDownloadUrl));

/** DELETE /api/documents/:id — delete a document */
router.delete('/:id', asyncHandler(handleDeleteDocument));

export default router;
