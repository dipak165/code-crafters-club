import api from './api';

export const announcementApi = {
  list: (limit) => api.get('/announcements', { params: { limit } }).then((r) => r.data),
  getById: (id) => api.get(`/announcements/${id}`).then((r) => r.data),
  listAll: () => api.get('/announcements-admin/all').then((r) => r.data),
  create: (payload) => api.post('/announcements', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/announcements/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/announcements/${id}`).then((r) => r.data),
};
