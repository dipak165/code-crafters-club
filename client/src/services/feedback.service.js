import api from './api';

export const feedbackApi = {
  submit: (slug, payload) => api.post(`/events/${slug}/feedback`, payload).then((r) => r.data),
  mine: (slug) => api.get(`/events/${slug}/feedback/me`).then((r) => r.data),
  publicSummary: (slug) => api.get(`/events/${slug}/feedback/summary`).then((r) => r.data),
  staffDetail: (eventId) => api.get(`/events/${eventId}/feedback`).then((r) => r.data),
};
