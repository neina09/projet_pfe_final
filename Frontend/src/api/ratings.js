import api from './axios'

export const ratingsApi = {
  rateBooking:        (bookingId, data) => api.post(`/api/ratings/booking/${bookingId}`, data),
  rateTask:           (taskId, data)    => api.post(`/api/ratings/task/${taskId}`, data),
  getWorkerRatings:   async (workerId) => {
    const endpoints = [
      `/api/ratings/worker/${workerId}`,
      `/api/ratings/worker/${workerId}/received`,
      `/api/workers/${workerId}/ratings`,
      `/api/workers/${workerId}/reviews`,
    ]

    for (const endpoint of endpoints) {
      try {
        return await api.get(endpoint)
      } catch {}
    }

    return { data: [] }
  },
  getReceivedRatings: async () => {
    const endpoints = [
      '/api/ratings/received',
      '/api/ratings/my-received-ratings',
      '/api/ratings/worker/received',
      '/api/ratings/worker/my-ratings',
    ]

    for (const endpoint of endpoints) {
      try {
        return await api.get(endpoint)
      } catch {}
    }

    return { data: [] }
  },
}
