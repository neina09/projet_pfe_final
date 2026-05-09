import api from './axios'

export const tasksApi = {
  getAll:        (params)               => api.get('/api/tasks/open', { params }),
  search:        (params)               => api.get('/api/tasks/open/search', { params }),
  getMy:         (params)               => api.get('/api/tasks/my-tasks', { params }),
  getAssigned:   ()                     => api.get('/api/tasks/assigned-to-me'),
  getMyOffers:   ()                     => api.get('/api/tasks/my-offers'),
  getById:       (id, params)           => api.get(`/api/tasks/${id}`, { params }),
  create:        (data)                 => api.post('/api/tasks', data),
  update:        (id, data)             => api.put(`/api/tasks/${id}`, data),
  delete:        (id)                   => api.delete(`/api/tasks/${id}`),
  submitOffer:   (taskId, data)         => api.post(`/api/tasks/${taskId}/offer`, data),
  getOffers:     (taskId)               => api.get(`/api/tasks/${taskId}/offers`),
  acceptOffer:   (_taskId, offerId)     => api.patch(`/api/tasks/offers/${offerId}/select`),
  rejectOffer:   (_taskId, offerId)     => api.patch(`/api/tasks/offers/${offerId}/reject`),
  workerAccept:  (offerId)              => api.patch(`/api/tasks/offers/${offerId}/worker-accept`),
  workerRefuse:  (offerId)              => api.patch(`/api/tasks/offers/${offerId}/worker-refuse`),
  deleteOffer:   (offerId)              => api.delete(`/api/tasks/offers/${offerId}`),
  markDone:      (taskId)               => api.patch(`/api/tasks/${taskId}/done`),
  cancel:        (taskId)               => api.patch(`/api/tasks/${taskId}/cancel`),
  addComment:    (taskId, data)         => api.post(`/api/tasks/${taskId}/comments`, data),
}
