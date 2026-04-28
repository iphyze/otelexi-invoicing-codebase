// services/quotationService.js
import api from './api';

const quotationService = {
  // ── List / Single ─────────────────────────────────────────────
  getQuotations:    (params)      => api.get('/quotations', { params }),
  getSingleQuotation: (id)        => api.get(`/quotations/${id}`),
  searchQuotations: (search)      => api.get('/quotations/search', { params: { search } }),

  // ── CRUD ──────────────────────────────────────────────────────
  createQuotation:  (data)        => api.post('/quotations/create', data),
  editQuotation:    (id, data)    => api.put(`/quotations/edit/${id}`, data),
  deleteQuotations: (quotationIds)=> api.delete('/quotations/delete', { data: { quotationIds } }),

  // ── Status transitions ─────────────────────────────────────────
  sendQuotation:    (id)          => api.post(`/quotation/${id}/send`),
  acceptQuotation:  (id)          => api.post(`/quotation/${id}/accept`),
  rejectQuotation:  (id, reason)  => api.post(`/quotation/${id}/reject`, { reason }),
  reopenQuotation:  (id)          => api.post(`/quotation/${id}/reopen`),
  expireQuotations: ()            => api.post('/quotation/expire'),

  // ── Conversions ────────────────────────────────────────────────
  convertToProforma: (id, data)   => api.post(`/quotation/${id}/convert-proforma`, data || {}),
  convertToInvoice:  (id, data)   => api.post(`/quotation/${id}/convert-invoice`,  data || {}),
};

export default quotationService;
