// services/customerPortalService.js
import api from './api';

const customerPortalService = {
  getCustomerPortalLinks: (params) => api.get('/customer-portal-links', { params }),
  createCustomerPortalLink: (invoiceId, data = {}) => api.post(`/invoices/${invoiceId}/customer-portal-link`, data),
  sendCustomerPortalLink: (id) => api.post(`/customer-portal-links/${id}/send`),
  revokeCustomerPortalLink: (id) => api.post(`/customer-portal-links/${id}/revoke`),

  // Public customer-facing portal. This must not trigger auth refresh.
  getPublicCustomerPortal: (token) => api.get('/public/customer-portal', {
    params: { token },
    skipAuthRefresh: true,
  }),
};

export default customerPortalService;
