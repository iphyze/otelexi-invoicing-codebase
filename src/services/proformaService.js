// services/proformaService.js
import api from './api';

const proformaService = {
  // ── List / Single ──────────────────────────────────────────────
  getProformas:       (params)     => api.get('/proformas', { params }),
  getSingleProforma:  (id)         => api.get(`/proformas/${id}`),

  // ── CRUD ───────────────────────────────────────────────────────
  createProforma:     (data)       => api.post('/proformas/create', data),
  editProforma:       (id, data)   => api.put(`/proformas/edit/${id}`, data),
  deleteProformas:    (proformaIds)=> api.delete('/proformas/delete', { data: { proformaIds } }),

  // ── Status transitions ─────────────────────────────────────────
  sendProforma:       (id)         => api.post(`/proforma/${id}/send`),
  approveProforma:    (id)         => api.post(`/proforma/${id}/approve`),
  rejectProforma:     (id, reason) => api.post(`/proforma/${id}/reject`, { reason }),
  expireProformas:    ()           => api.post('/proformas/expire'),

  // ── Conversion ─────────────────────────────────────────────────
  convertToInvoice:   (id, data)   => api.post(`/proforma/${id}/convert-invoice`, data || {}),
};

export default proformaService;
