// ═══════════════════════════════════════════════════════════════════════════
// FILE: services/documentSigningAPI.js
// Mirrors the conventions of sharePointAPI.js
// ═══════════════════════════════════════════════════════════════════════════

import api from './api';

const documentSigningAPI = {
  // ── Upload & draft lifecycle ─────────────────────────────────────────────
  uploadDocument: (formData) =>
    api.post('/document-signing/documents', formData, {
      headers: { 'Content-Type': undefined }
    }),

  saveFields: (documentId, fields) =>
    api.put(`/document-signing/documents/${documentId}/fields`, { fields }),

  configureChain: (documentId, { chainMode, signers }) =>
    api.put(`/document-signing/documents/${documentId}/chain`, { chainMode, signers }),

  submitDocument: (documentId) =>
    api.post(`/document-signing/documents/${documentId}/submit`),

  resubmitDocument: (documentId, payload = {}) =>
    api.post(`/document-signing/documents/${documentId}/resubmit`, payload),

  cancelDocument: (documentId, reason) =>
    api.post(`/document-signing/documents/${documentId}/cancel`, { reason }),

  // ── Listing / detail ─────────────────────────────────────────────────────
  getMyDocuments: (params) =>
    api.get('/document-signing/documents', { params }),

  getDocumentDetails: (documentId) =>
    api.get(`/document-signing/documents/${documentId}`),

  getMySigningLink: (documentId) =>
    api.get(`/document-signing/documents/${documentId}/my-signing-link`),

  downloadFinalDocument: (documentId) =>
    api.get(`/document-signing/documents/${documentId}/download`, { responseType: 'blob' }),

  getChainPreview: () =>
    api.get('/document-signing/chain-preview'),

  // ── Admin overrides ───────────────────────────────────────────────────────
  forceAdvance: (documentId, reason) =>
    api.post(`/document-signing/documents/${documentId}/force-advance`, { reason }),

  reassignSigner: (documentId, newUserId) =>
    api.post(`/document-signing/documents/${documentId}/reassign`, { newUserId }),

  // ── Public no-login signing (token-based, no auth header needed) ─────────
  getPublicSigningSession: (documentId, token) =>
    api.get(`/document-signing/public/sign/${documentId}/${token}`),

  submitSignature: (documentId, token, filledFields) =>
    api.post(`/document-signing/public/sign/${documentId}/${token}`, { filledFields }),

  rejectAsSigner: (documentId, token, reason) =>
    api.post(`/document-signing/public/sign/${documentId}/${token}/reject`, { reason }),

  // ── Helper: trigger browser download of returned blob ────────────────────
  openFinalDownload: async (documentId, filename) => {
    const res = await documentSigningAPI.downloadFinalDocument(documentId);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'signed-document.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default documentSigningAPI;