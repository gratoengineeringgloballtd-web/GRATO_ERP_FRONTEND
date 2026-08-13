// services/engineeringIncidentAPI.js
// ─────────────────────────────────────────────────────────────────────────────
// All API calls for Engineering Incident Reports
// ─────────────────────────────────────────────────────────────────────────────
import api from './api';

const BASE = '/engineering-incidents';

const engineeringIncidentAPI = {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  create: (formData) =>
    api.post(BASE, formData, {
      headers: { 'Content-Type': undefined }
    }),

  getAll: (params = {}) =>
    api.get(BASE, { params }),

  getById: (id) =>
    api.get(`${BASE}/${id}`),

  deleteReport: (id) =>
    api.delete(`${BASE}/${id}`),

  // ── Approval ──────────────────────────────────────────────────────────────
  approve: (id, payload) =>                    // { decision, comments }
    api.post(`${BASE}/${id}/approve`, payload),

  // ── Share link ────────────────────────────────────────────────────────────
  generateShareLink: (id) =>
    api.post(`${BASE}/${id}/share-link`),

  // ── Export ────────────────────────────────────────────────────────────────
  exportPDF: async (id, reportNumber) => {
    const response = await api.get(`${BASE}/${id}/export/pdf`, {
      responseType: 'blob'
    });
    const url  = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', `EIR_${reportNumber || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  exportExcel: async (params = {}) => {
    const response = await api.get(`${BASE}/export/excel`, {
      params,
      responseType: 'blob'
    });
    const url  = window.URL.createObjectURL(
      new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', `Engineering_Incidents_${new Date().toISOString().slice(0,10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Dashboard stats ───────────────────────────────────────────────────────
  getDashboardStats: () =>
    api.get(`${BASE}/dashboard-stats`),

  downloadAttachment: async (reportId, attachmentIndex, fileName) => {
  const response = await api.get(
    `${BASE}/${reportId}/attachments/${attachmentIndex}`,
    { responseType: 'blob' }
  );
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', fileName || 'attachment');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
},

  // ── Public (no-auth) ──────────────────────────────────────────────────────
  getPublicReport: (token) =>
    api.get(`${BASE}/public/${token}`)
};

export default engineeringIncidentAPI;