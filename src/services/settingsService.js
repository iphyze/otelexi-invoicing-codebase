// services/settingsService.js
import api from './api';

const settingsService = {
  getSettings:  ()       => api.get('/settings'),
  updateSettings: (data) => api.put('/settings/update', data),
  uploadLogo:   (file)   => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default settingsService;
