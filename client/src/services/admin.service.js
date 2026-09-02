import api from './api';

export const userAdminApi = {
  search: (q, page) => api.get('/users', { params: { q, page } }).then((r) => r.data),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }).then((r) => r.data),
};

export const auditLogApi = {
  list: (params) => api.get('/audit-logs', { params }).then((r) => r.data),
};
