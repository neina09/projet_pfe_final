import api from './axios'

export const authApi = {
  sendOtp:        (phone)                          => api.post('/auth/resend', null, { params: { phone } }),
  verifyOtp:      (phone, code)                    => api.post('/auth/verify', { phone, verificationCode: code }),
  register:       (data)                           => api.post('/auth/signup', data),
  login:          (phone, password)                => api.post('/auth/login', { phone, password }),
  logout:         async ()                         => Promise.resolve(),
  getProfile:     ()                               => api.get('/users/me'),
  updateProfile:  (data)                           => api.put('/users/update-profile', data),
  changePassword: (data)                           => api.put('/users/change-password', data),
  uploadImage:    (file)                           => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  forgotPassword: (phone)                          => api.post('/auth/forgot-password', { phone }),
  resetPassword:  (_phone, code, newPassword)      => api.post('/auth/reset-password', { token: code, newPassword }),
  deleteAccount:  ()                               => api.delete('/users/me'),
}
