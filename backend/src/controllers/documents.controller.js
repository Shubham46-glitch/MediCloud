/**
 * Documents Controller — HTTP handlers for medical document management.
 */

import {
  requestUploadUrl,
  confirmUpload,
  getDownloadUrl,
  listUserDocuments,
  deleteDocument,
  cancelUploadIntent,
} from '../services/documents.service.js';

/** GET /api/documents — list current user's documents */
export const handleListDocuments = async (req, res) => {
  const result = await listUserDocuments(req.user.userId);
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** POST /api/documents/upload-url — request a presigned upload URL */
export const handleRequestUploadUrl = async (req, res) => {
  const result = await requestUploadUrl(req.user.userId, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error, message: result.message }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** POST /api/documents/confirm-upload — save metadata after upload completes */
export const handleConfirmUpload = async (req, res) => {
  const result = await confirmUpload(req.user.userId, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(201).json({ success: true, status: 201, message: 'Document saved', document: result.document });
};

/** DELETE /api/documents/upload-intent/:uploadId â€” abandon a pending upload */
export const handleCancelUploadIntent = async (req, res) => {
  const result = await cancelUploadIntent(req.user.userId, req.params.uploadId);
  return res.status(result.status || 200).json({ success: result.success, status: result.status || 200, ...(result.error ? { error: { code: result.error } } : {}) });
};

/** GET /api/documents/:id/download-url — get a presigned download URL */
export const handleGetDownloadUrl = async (req, res) => {
  const result = await getDownloadUrl(req.params.id, req.user.userId);
  if (!result.success) {
    return res.status(result.status || 404).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** DELETE /api/documents/:id — delete a document */
export const handleDeleteDocument = async (req, res) => {
  const result = await deleteDocument(req.params.id, req.user.userId);
  if (!result.success) {
    return res.status(result.status || 404).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, message: 'Document deleted' });
};
