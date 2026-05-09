import api from './axios'

export const adminApi = {
  getDashboard:          ()                 => api.get('/api/admin/dashboard'),
  getStats:              (period)           => api.get('/api/admin/stats', { params: { period } }),
  getPendingWorkers:     ()                 => api.get('/api/workers/admin/pending'),
  getAllWorkers:         ()                 => api.get('/api/workers/admin/all'),
  getUsers:              ()                 => api.get('/users'),
  promoteToAdmin:        (id)               => api.patch(`/users/${id}/promote-admin`),
  createWorker:          (userId, data)     => api.post(`/api/workers/admin/create/${userId}`, data),
  updateWorker:          (id, data)         => api.put(`/api/workers/${id}`, data),
  deleteWorker:          (id)               => api.delete(`/api/workers/admin/${id}`),
  approveWorker:         (id, notes = '')   => api.patch(`/api/workers/admin/${id}/verify`, null, { params: { notes } }),
  rejectWorker:          (id, notes = '')   => api.patch(`/api/workers/admin/${id}/reject`, null, { params: { notes } }),
  getWorkerDetails:      (id)               => api.get(`/api/workers/${id}/manage`),
  approveTask:           (id)               => api.patch(`/api/tasks/${id}/approve`),
  rejectTask:            (id)               => api.patch(`/api/tasks/${id}/reject`),
  getPendingTasks:       ()                 => api.get('/api/tasks/pending'),
  getAllTasks:           (params)           => api.get('/api/tasks', { params }),
  deleteTask:            (id)               => api.delete(`/api/tasks/${id}`),
}
