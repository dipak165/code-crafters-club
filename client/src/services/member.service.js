import api from './api';

export const memberApi = {
  years: () => api.get('/members/years').then((r) => r.data),
  byYear: (year) => api.get(`/members/year/${year}`).then((r) => r.data),
  add: (formData) => api.post('/members', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  update: (id, formData) => api.put(`/members/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  remove: (id) => api.delete(`/members/${id}`).then((r) => r.data),
  // The CV route requires a Bearer token, so a plain <a href> won't
  // carry auth on browser navigation — same pattern as certificate
  // downloads: fetch as an authenticated blob, then trigger the save.
  downloadCv: async (memberId, studentName) => {
    const response = await api.get(`/members/${memberId}/cv`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studentName.replace(/\s+/g, '_')}_CV.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
