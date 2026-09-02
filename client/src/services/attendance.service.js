import api from './api';

export const attendanceApi = {
  checkIn: (eventId, qrToken) => api.post(`/events/${eventId}/checkin`, { qrToken }).then((r) => r.data),
  summary: (eventId) => api.get(`/events/${eventId}/checkin/summary`).then((r) => r.data),
};
