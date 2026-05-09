import api from './axios'

export const notificationsApi = {
  getAll:         () => api.get('/api/notifications'),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markAsRead:     (id) => api.patch(`/api/notifications/${id}/read`),
  markAllAsRead:  () => api.patch('/api/notifications/read-all'),
  deleteOne:      (id) => api.delete(`/api/notifications/${id}`),
  deleteAll:      () => api.delete('/api/notifications/all'),
}
