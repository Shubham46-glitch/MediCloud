import React, { useEffect, useState } from 'react';
import { Download, FileText, Upload, Trash2 } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { Button } from '../../components/common/Button';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const formatSize = (size) => `${Math.max(1, Math.round(size / 1024))} KB`;
const formatUploadedAt = (timestamp) => new Date(timestamp).toLocaleDateString();

export const PatientDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    const result = await apiRequest('/documents');
    setDocuments(result.documents || []);
  };

  useEffect(() => {
    let active = true;
    apiRequest('/documents')
      .then((result) => { if (active) setDocuments(result.documents || []); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upload = async (event) => {
    event.preventDefault();
    if (!file) return setError('Choose a file to upload.');
    if (!ALLOWED_TYPES.includes(file.type)) return setError('Choose a PDF, JPEG, PNG, or WebP file.');
    if (file.size > MAX_FILE_BYTES) return setError('Files must be 10 MB or smaller.');
    setError('');
    setNotice('');
    setUploading(true);
    let uploadId = null;
    try {
      const request = await apiRequest('/documents/upload-url', {
        method: 'POST',
        body: { fileName: file.name, fileType: file.type, fileSizeBytes: file.size, description: description || undefined },
      });
      uploadId = request.uploadId;
      const url = new URL(request.uploadUrl);
      const isLocalMock = import.meta.env.VITE_APP_ENV !== 'production' && url.hostname === 'localhost' && url.port === '9090';
      if (isLocalMock) {
        setNotice('Local mock storage simulated this upload. No file was sent to AWS.');
      } else {
        const uploadResponse = await fetch(request.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type, 'x-amz-server-side-encryption': 'AES256' },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error('The secure file upload failed. Request a new upload link and try again.');
      }
      await apiRequest('/documents/confirm-upload', { method: 'POST', body: { uploadId: request.uploadId } });
      await refresh();
      setFile(null);
      setDescription('');
    } catch (failure) {
      if (uploadId) await apiRequest(`/documents/upload-intent/${encodeURIComponent(uploadId)}`, { method: 'DELETE' }).catch(() => {});
      setError(failure.message || 'The document could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const download = async (documentId) => {
    try {
      const result = await apiRequest(`/documents/${encodeURIComponent(documentId)}/download-url`);
      window.location.assign(result.downloadUrl);
    } catch (failure) { setError(failure.message); }
  };

  const remove = async (documentId) => {
    try {
      await apiRequest(`/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
      await refresh();
    } catch (failure) { setError(failure.message); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Medical Documents</h2>
        <p className="text-sm text-slate-600 mt-1">Files are private and available only to your account.</p>
      </div>
      <form onSubmit={upload} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Choose a file (PDF, JPEG, PNG, WebP; up to 10 MB)
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block mt-2 w-full text-sm" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Description (optional)
          <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className="block mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-amber-800">{notice}</p>}
        <Button type="submit" variant="primary" isLoading={uploading} leftIcon={Upload}>Upload document</Button>
      </form>
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <h3 className="px-5 py-4 border-b border-slate-100 font-bold text-slate-800">Your documents</h3>
        {loading ? <p className="p-5 text-sm text-slate-600">Loading documents…</p> : documents.length === 0 ? <p className="p-5 text-sm text-slate-600">No documents have been uploaded.</p> : (
          <ul className="divide-y divide-slate-100">
            {documents.map((document) => <li key={document.documentId} className="p-4 flex flex-wrap items-center gap-3">
              <FileText className="w-5 h-5 text-teal-700" />
              <div className="min-w-0 flex-1"><p className="font-semibold text-sm text-slate-900 truncate">{document.fileName}</p><p className="text-xs text-slate-500">{formatSize(document.fileSizeBytes || 0)} · {formatUploadedAt(document.uploadedAt)}</p></div>
              <button type="button" onClick={() => download(document.documentId)} aria-label={`Download ${document.fileName}`} className="p-2 text-teal-700 hover:bg-teal-50 rounded-lg"><Download className="w-4 h-4" /></button>
              <button type="button" onClick={() => remove(document.documentId)} aria-label={`Delete ${document.fileName}`} className="p-2 text-rose-700 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </li>)}
          </ul>
        )}
      </section>
    </div>
  );
};
