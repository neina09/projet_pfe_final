import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Layout from '../../components/layout/Layout'

export default function Register() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
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
  const [form, setForm] = useState({ fullName: '', phone: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) return setError(t('errors.required'))
    if (!form.phone.trim()) return setError(t('errors.required'))
    if (form.password !== form.confirm) return setError(t('errors.passwordMismatch'))
    if (form.password.length < 8) return setError(t('errors.minPassword'))
    setError('')
    setLoading(true)
    try {
      await authApi.register({
        username: form.fullName,
        phone: form.phone,
        password: form.password
      })
      navigate('/verify-otp', { state: { phone: form.phone, registerData: form, mode: 'register' } })
    } catch (err) {
      let msg = err.response?.data?.message || t('errors.serverError')
      if (msg.includes('at least one letter and one digit')) {
        msg = t('errors.passwordComplexity')
      }
      if (msg.includes(': ')) {
        msg = msg.split(': ')[1]
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-primary-50/30 dark:from-gray-950 dark:to-gray-900">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">ع</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.register.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('auth.register.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input label={t('auth.register.name')} placeholder="Ahmed Mohamed" value={form.fullName} onChange={set('fullName')} required />
              <Input label={t('auth.register.phone')} type="tel" placeholder="+222 XX XX XX XX" value={form.phone} onChange={set('phone')} required />

              <div className="relative">
                <Input
                  label={t('auth.register.password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute end-3 top-9 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Input
                label={t('auth.register.confirmPassword')}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-1">
                {t('auth.register.submit')}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {t('auth.register.hasAccount')}{' '}
              <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                {t('auth.register.login')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
