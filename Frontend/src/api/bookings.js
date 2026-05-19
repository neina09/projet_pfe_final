import api from './axios'

export const bookingsApi = {
  create:     (data)               => api.post('/api/bookings', data),
  update:     (id, data)           => api.put(`/api/bookings/${id}`, data),
  getMy:      ()                   => api.get('/api/bookings/my-bookings'),
  getWorker:  ()                   => api.get('/api/bookings/my-requests'),
  cancel:     (id)                 => api.patch(`/api/bookings/${id}/cancel`),
  respond:    (id, status)         => api.patch(`/api/bookings/${id}/${status === 'ACCEPTED' ? 'accept' : 'reject'}`),
  complete:   (id)                 => api.patch(`/api/bookings/${id}/complete`),
  delete:     (id)                 => api.delete(`/api/bookings/${id}`),
}
