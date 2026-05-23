import api from './api';

const inventoryService = {
  getMovements: (params = {}) => api.get('/inventory/movements', { params }),
  adjustStock: (payload) => api.post('/inventory/adjustments', payload),
};

export default inventoryService;
