import api from './api';

export const recruitmentApi = {
  apply: (formData) => api.post('/recruitment', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  listAll: (params) => api.get('/recruitment', { params }).then((r) => r.data),
  getById: (id) => api.get(`/recruitment/${id}`).then((r) => r.data),
  updateStatus: (id, status) => api.put(`/recruitment/${id}/status`, { status }).then((r) => r.data),
  downloadResume: async (id, applicantName) => {
    const response = await api.get(`/recruitment/${id}/resume`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${applicantName.replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
