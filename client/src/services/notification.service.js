import api from './api';

export const notificationApi = {
  mine: (unreadOnly) => api.get('/notifications/me', { params: { unreadOnly } }).then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
};
