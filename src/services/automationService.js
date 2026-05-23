// services/automationService.js
import api from './api';

const automationService = {
  getDocumentMaintenanceStatus: () => api.get('/automation/document-maintenance/status'),
  runDocumentMaintenance: () => api.post('/automation/document-maintenance/run'),
};

export default automationService;
