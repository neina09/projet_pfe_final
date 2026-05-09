import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Layout from '../../components/layout/Layout'

export default function Login() {
  const { t } = useTranslation()
  const { login, user: currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'ADMIN' || currentUser.roles?.includes('ADMIN')) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [currentUser, navigate])
  const [form, setForm] = useState({ phone: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.phone, form.password)
      setSuccess(true)
      await new Promise(r => setTimeout(r, 700))
      if (user?.role === 'ADMIN' || user?.roles?.includes('ADMIN')) navigate('/admin')
      else navigate('/dashboard')
    } catch (err) {
      let msg = err.response?.data?.message || t('errors.serverError')
      if (msg.includes(': ')) msg = msg.split(': ')[1]
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <Layout noFooter>
      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center shadow-2xl shadow-primary-500/40 mb-4"
            >
              <motion.svg
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round"
                className="w-10 h-10"
              >
                <motion.path d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-700 dark:text-gray-300 font-medium"
            >
              {t('auth.loggingIn')}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-primary-50/30 dark:from-gray-950 dark:to-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">ع</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.login.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('auth.login.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="relative">
                <Input
                  label={t('auth.login.phone')}
                  type="tel"
                  placeholder="+222 XX XX XX XX"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>

              <div className="relative">
                <Input
                  label={t('auth.login.password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute end-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="text-end">
                <Link to="/forgot-password" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-1">
                {t('auth.login.submit')}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                {t('auth.login.register')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
