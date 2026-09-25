import api from './api';

const adminService = {
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
  getOverview: () => api.get('/admin/overview'),
  getMailDiagnostics: () => api.get('/admin/mail-diagnostics'),
  testMailConnection: () => api.post('/admin/mail-diagnostics/connection'),
  sendTestEmail: (formData) => api.post('/admin/mail-diagnostics/send', formData),
  getMailSettings: () => api.get('/admin/mail-settings'),
  updateMailSettings: (data) => api.put('/admin/mail-settings', data),
  testMailProvider: (provider) => api.post('/admin/mail-settings/test', { provider }),
  getMailDeliveryHistory: (params = {}) => api.get('/admin/mail-delivery-history', { params }),
  getSecuritySettings: () => api.get('/admin/security-settings'),
  updateSecuritySettings: (data) => api.put('/admin/security-settings', data),
  getSecuritySessions: (params = {}) => api.get('/admin/security-sessions', { params }),
  revokeSecuritySession: (sessionKey) => api.post('/admin/security-sessions/revoke', { session_key: sessionKey }),
  revokeUserSessions: (userId) => api.post('/admin/security-sessions/revoke-user', { user_id: userId }),
  resetUserMfa: (userId) => api.post('/admin/security/mfa/reset', { user_id: userId }),
};

export default adminService;
