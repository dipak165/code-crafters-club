import api from './api';

export const leaderboardApi = {
  top: (limit) => api.get('/leaderboard/top', { params: { limit } }).then((r) => r.data),
  rules: () => api.get('/leaderboard/rules').then((r) => r.data),
  mine: () => api.get('/leaderboard/me').then((r) => r.data),
  updateRule: (action, points) => api.put(`/leaderboard/rules/${action}`, { points }).then((r) => r.data),
  award: (payload) => api.post('/leaderboard/award', payload).then((r) => r.data),
};
