import api from './api';

export const paymentApi = {
  createOrder: (eventSlug) => api.post('/payments/create-order', { eventSlug }).then((r) => r.data),
  verify: (payload) => api.post('/payments/verify', payload).then((r) => r.data),
};
