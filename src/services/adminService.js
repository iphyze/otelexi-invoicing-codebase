import api from './api';

const adminService = {
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
  getOverview: () => api.get('/admin/overview'),
};

export default adminService;
