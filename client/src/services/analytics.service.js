import api from './api';

export const analyticsApi = {
  overview: () => api.get('/analytics/overview').then((r) => r.data),
  registrationsByMonth: (months = 6) => api.get('/analytics/registrations-by-month', { params: { months } }).then((r) => r.data),
  eventsByCategory: () => api.get('/analytics/events-by-category').then((r) => r.data),
  revenueByEvent: () => api.get('/analytics/revenue-by-event').then((r) => r.data),
  studentsByGraduationYear: () => api.get('/analytics/students-by-graduation-year').then((r) => r.data),
};
