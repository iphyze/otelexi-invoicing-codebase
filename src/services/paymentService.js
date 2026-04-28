// services/paymentService.js
import api from './api';

const paymentService = {
  getPayments:      (params)  => api.get('/payments', { params }),
  getSinglePayment: (id)      => api.get(`/payments/${id}`),
  recordPayment:    (data)    => api.post('/payments/record', data),
  deletePayment:    (id)      => api.delete(`/payments/${id}/delete`),
};

export default paymentService;
