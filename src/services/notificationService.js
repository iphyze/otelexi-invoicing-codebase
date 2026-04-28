// services/notificationService.js
import api from './api';

const notificationService = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markRead:         (data)   => api.post('/notifications/mark-read', data),
  markAllRead:      ()       => api.post('/notifications/mark-read', { all: true }),
};

export default notificationService;
