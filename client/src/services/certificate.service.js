import api from './api';

export const certificateApi = {
  mine: () => api.get('/certificates/me').then((r) => r.data),
  verify: (code) => api.get(`/certificates/verify/${code}`).then((r) => r.data),
  generateForEvent: (eventId) => api.post(`/events/${eventId}/certificates/generate`).then((r) => r.data),
  // Downloads need the Authorization header, so this can't be a plain <a href>
  // link — fetch as a blob and trigger the save manually.
  download: async (code) => {
    const response = await api.get(`/certificates/${code}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${code}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
