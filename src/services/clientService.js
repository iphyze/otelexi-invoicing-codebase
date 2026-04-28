// services/clientService.js
import api from './api';

const clientService = {
  // ── Clients ──────────────────────────────────────────────
  getClients:        (params)      => api.get('/clients', { params }),
  searchClients:     (search)      => api.get('/clients/search', { params: { search } }),
  getSingleClient:   (id)          => api.get('/client', { params: { id } }),
  createClient:      (data)        => api.post('/clients/create', data),
  editClient:        (data)        => api.put('/clients/edit', data),
  deleteClients:     (clientIds)   => api.delete('/clients/delete', { data: { clientIds } }),
  deactivateClients: (clientIds)   => api.put('/clients/deactivate', { clientIds }),
  reactivateClients: (clientIds)   => api.put('/clients/reactivate', { clientIds }),

  // ── Client Contacts ───────────────────────────────────────
  getClientContacts:   (clientId)    => api.get(`/clients/${clientId}/contacts`),
  getFilteredContacts: (params)      => api.get('/clients/contacts', { params }),
  getSingleContact:    (id)          => api.get(`/clients/contact/${id}`),
  createContact:       (data)        => api.post('/clients/contacts/create', data),
  editContact:         (id, data)    => api.put(`/clients/contacts/edit/${id}`, data),
  deleteContacts:      (contactIds)  => api.delete('/clients/contacts/delete', { data: { contactIds } }),
  searchContacts:      (search)      => api.get('/clients/contacts/search', { params: { search } }),
};

export default clientService;