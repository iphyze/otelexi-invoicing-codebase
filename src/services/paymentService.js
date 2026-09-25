// services/paymentService.js
import api from './api';

const paymentService = {
  getPayments:      (params)  => api.get('/payments', { params }),
  getSinglePayment: (id)      => api.get(`/payments/${id}`),
  recordPayment:    (data)    => api.post('/payments/record', data),
  issueReceipt:     (id)      => api.post(`/payments/${id}/receipt`),
  deletePayment:    (id)      => api.delete(`/payments/${id}/delete`),

  // Payment requests / online checkout links
  getPaymentLinks:      (params)          => api.get('/payment-links', { params }),
  getSinglePaymentLink: (id)              => api.get(`/payment-links/${id}`),
  createPaymentLink:    (invoiceId, data) => api.post(`/invoices/${invoiceId}/payment-links`, data),
  sendPaymentLink:      (id, mailProvider = 'system') => api.post(`/payment-links/${id}/send`, { mail_provider: mailProvider }),
  cancelPaymentLink:    (id)              => api.post(`/payment-links/${id}/cancel`),
  verifyPaymentLink:    (id)              => api.post(`/payment-links/${id}/verify`),

  // Customer-facing payment request page. This must stay public and must not trigger auth refresh.
  getPublicPaymentRequest: (reference) => api.get('/public/payment-request', {
    params: { reference },
    skipAuthRefresh: true,
  }),
};

export default paymentService;
