// services/invoiceService.js
import api from './api';

const invoiceService = {
  // ── List / Single ──────────────────────────────────────────────
  getInvoices:       (params)        => api.get('/invoices', { params }),
  getSingleInvoice:  (id)            => api.get(`/invoices/${id}`),

  // ── CRUD ───────────────────────────────────────────────────────
  createInvoice:     (data)          => api.post('/invoices/create', data),
  editInvoice:       (id, data)      => api.put(`/invoices/edit/${id}`, data),
  deleteInvoices:    (invoiceIds)    => api.delete('/invoices/delete', { data: { invoiceIds } }),

  // ── Lifecycle ──────────────────────────────────────────────────
  finalizeInvoice:   (id)            => api.post(`/invoices/${id}/finalize`),
  cancelInvoice:     (id, reason)    => api.post(`/invoices/${id}/cancel`, { reason }),
  markOverdue:       ()              => api.post('/invoices/mark-overdue'),
};

export default invoiceService;
