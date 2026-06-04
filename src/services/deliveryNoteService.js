// services/deliveryNoteService.js
import api from './api';

const deliveryNoteService = {
  // ── List / Single ──────────────────────────────────────────────
  getDeliveryNotes:       (params)   => api.get('/delivery-notes', { params }),
  getSingleDeliveryNote:  (id)       => api.get(`/delivery-notes/${id}`),

  // ── Lifecycle ──────────────────────────────────────────────────
  createDeliveryNote:     (data)     => api.post('/delivery-notes/create', data),
  updateDeliveryNoteStatus: (id, data) => api.put(`/delivery-notes/${id}/status`, data),
};

export default deliveryNoteService;
