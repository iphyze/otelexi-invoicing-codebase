// services/userService.js
import api from './api';

const userService = {
  getUsers:       (params)      => api.get('/users', { params }),
  getSingleUser:  (id)          => api.get(`/user`, { params: { id } }),
  searchUsers:    (search)      => api.get('/users/search', { params: { search } }),
  createUser:     (data)        => api.post('/users/create', data),
  editUser:       (data)        => api.put('/users/edit', data),
  updateProfile:  (data)        => api.put('/users/update', data),
  deleteUsers:    (userIds)     => api.delete('/users/delete', { data: { userIds } }),
  deactivateUsers:(userIds)     => api.put('/users/deactivate', { userIds }),
};

export default userService;
