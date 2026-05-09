import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'
import { normalizeUser } from '../lib/normalizers'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [appReady, setAppReady]       = useState(false)
  const [loggingIn, setLoggingIn]     = useState(false)
  const [loggingOut, setLoggingOut]   = useState(false)

  useEffect(() => {
    // State is already rehydrated from localStorage in initial state
    // but we keep this to ensure consistency if needed
    const stored = localStorage.getItem('user')
    if (stored && !user) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    // Minimum splash display of 1.5 s
    const timer = setTimeout(() => setAppReady(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const login = async (phone, password) => {
    setLoggingIn(true)
    try {
      const res = await authApi.login(phone, password)
      const { token } = res.data
      localStorage.setItem('token', token)
      const profile = await authApi.getProfile()
      const userData = normalizeUser(profile.data)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } finally {
      setLoggingIn(false)
    }
  }

  const register = async (data) => {
    const res = await authApi.register(data)
    return res.data
  }

  const logout = async () => {
    setLoggingOut(true)
    try { await authApi.logout() } catch {}
    await new Promise(r => setTimeout(r, 600))
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setLoggingOut(false)
  }

  const refreshProfile = async () => {
    try {
      const res = await authApi.getProfile()
      const nextUser = normalizeUser(res.data)
      setUser(nextUser)
      localStorage.setItem('user', JSON.stringify(nextUser))
    } catch {}
  }

  const isWorker = user?.role === 'WORKER' || user?.roles?.includes?.('WORKER')
  const isAdmin  = user?.role === 'ADMIN'  || user?.roles?.includes?.('ADMIN')

  return (
    <AuthContext.Provider value={{
      user, appReady, loggingIn, loggingOut,
      login, register, logout, refreshProfile,
      isWorker, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
