import api from './api';

export const eventApi = {
  list: (params) => api.get('/events', { params }).then((r) => r.data),
  getBySlug: (slug) => api.get(`/events/${slug}`).then((r) => r.data),
  stats: () => api.get('/events/stats/summary').then((r) => r.data),
  create: (payload) => api.post('/events', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/events/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/events/${id}`).then((r) => r.data),
};
