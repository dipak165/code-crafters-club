import api from './api';

export const registrationApi = {
  register: (slug) => api.post(`/events/${slug}/register`).then((r) => r.data),
  cancel: (slug) => api.delete(`/events/${slug}/register`).then((r) => r.data),
  mine: () => api.get('/registrations/me').then((r) => r.data),
  forEvent: (eventId, params) => api.get(`/events/${eventId}/registrations`, { params }).then((r) => r.data),
};
