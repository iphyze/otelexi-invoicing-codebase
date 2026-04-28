// services/reportService.js
import api from './api';

const reportService = {
  getSalesSummary:     (params) => api.get('/reports/sales-summary',       { params }),
  getTopProducts:      (params) => api.get('/reports/top-products',        { params }),
  getVatReport:        (params) => api.get('/reports/vat',                 { params }),
  getSalesByStaff:     (params) => api.get('/reports/sales-by-staff',      { params }),
  getInvoiceAging:     (params) => api.get('/reports/invoice-aging',       { params }),
  getRevenueByCategory:(params) => api.get('/reports/revenue-by-category', { params }),
  getDocumentFlow:     (params) => api.get('/reports/document-flow',       { params }),
  getClientStatement:  (params) => api.get('/reports/client-statement',    { params }),
  getStockLevels:      (params) => api.get('/reports/stock-levels',        { params }),
};

export default reportService;
