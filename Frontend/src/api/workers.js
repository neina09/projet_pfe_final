import api from './axios'

export const workersApi = {
  getAll:             (params)                  => api.get('/api/workers', { params }),
  getPaged:           (params)                  => api.get('/api/workers/paged', { params }),
  getById:            (id)                      => api.get(`/api/workers/${id}`),
  getMine:            ()                        => api.get('/api/workers/me'),
  getSubscription:    ()                        => api.get('/api/workers/me/subscription'),
  getIdentityDocument:(id)                      => api.get(`/api/workers/${id}/identity-document`, { responseType: 'blob' }),
  getSubscriptionReceipt:(id)                   => api.get(`/api/workers/${id}/subscription-receipt`, { responseType: 'blob' }),
  register:           (data)                    => api.post('/api/workers/register', data),
  updateProfile:      (id, data)                => api.put(`/api/workers/${id}`, data),
  deleteProfile:      (id)                      => api.delete(`/api/workers/${id}`),
  updateAvailability: (id, availability)        => api.patch(`/api/workers/${id}/availability`, null, { params: { availability } }),
  uploadImage:        (id, file)                => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/workers/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadIdentityDocument: (id, file)            => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/api/workers/${id}/upload-identity-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  submitSubscriptionReceipt: (id, file, transferReference) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('transferReference', transferReference)
    return api.post(`/api/workers/${id}/subscription-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
