import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Layout from '../../components/layout/Layout'
import { validateFullName, validatePhone, validatePassword } from '../../lib/validators'

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
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirm: '',
    general: ''
  })

  const validate = () => {
    const newErrors = { fullName: '', phone: '', password: '', confirm: '', general: '' }
    let isValid = true

    // Full Name: Alphanumeric (letters and numbers)
    if (!form.fullName.trim()) {
      newErrors.fullName = 'errors.required'
      isValid = false
    } else if (!validateFullName(form.fullName.trim())) {
      newErrors.fullName = 'errors.alphanumeric'
      isValid = false
    }

    // Phone: Numbers only
    if (!form.phone.trim()) {
      newErrors.phone = 'errors.required'
      isValid = false
    } else if (!validatePhone(form.phone)) {
      newErrors.phone = 'errors.invalidMauritanianPhone'
      isValid = false
    }

    // Password: Min 8, at least one letter and one number
    if (!form.password) {
      newErrors.password = 'errors.required'
      isValid = false
    } else {
      const passVal = validatePassword(form.password)
      if (!passVal.isLongEnough) {
        newErrors.password = 'errors.minPassword8'
        isValid = false
      } else if (!passVal.hasLetter || !passVal.hasNumber) {
        newErrors.password = 'errors.passwordComplexity'
        isValid = false
      }
    }

    // Confirm Password
    if (form.password !== form.confirm) {
      newErrors.confirm = 'errors.passwordMismatch'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setErrors(errs => ({ ...errs, [key]: '', general: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await authApi.register({
        username: form.fullName,
        phone: form.phone,
        password: form.password
      })
      navigate('/verify-otp', { state: { phone: form.phone, registerData: form, mode: 'register' } })
    } catch (err) {
      const errorMsg = err.response?.data?.message || ''
      let msg = errorMsg || t('errors.serverError')
      
      if (err.response?.status === 409 || msg.toLowerCase().includes('conflict')) {
        setErrors(prev => ({ ...prev, general: 'errors.conflict' }))
      } else if (msg.toLowerCase().includes('password')) {
        setErrors(prev => ({ ...prev, password: 'errors.passwordComplexity' }))
      } else if (msg.toLowerCase().includes('mauritanian')) {
        setErrors(prev => ({ ...prev, phone: 'errors.invalidMauritanianPhone' }))
      } else if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('name')) {
        setErrors(prev => ({ ...prev, fullName: 'errors.alphanumeric' }))
      } else {
        if (msg.includes(': ')) msg = msg.split(': ')[1]
        setErrors(prev => ({ ...prev, general: msg }))
      }
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
              <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md overflow-hidden">
                <img src="/logo.svg" alt="3ommalek" className="w-14 h-14" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.register.title')}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('auth.register.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label={t('auth.register.name')}
                placeholder="Ahmed Mohamed"
                value={form.fullName}
                onChange={set('fullName')}
                error={errors.fullName ? t(errors.fullName) : ''}
                required
              />
              <Input
                label={t('auth.register.phone')}
                type="tel"
                placeholder="+222 XX XX XX XX"
                value={form.phone}
                onChange={set('phone')}
                error={errors.phone ? t(errors.phone) : ''}
                required
              />

              <Input
                label={t('auth.register.password')}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                error={errors.password ? t(errors.password) : ''}
                required
              />

              <Input
                label={t('auth.register.confirmPassword')}
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={set('confirm')}
                error={errors.confirm ? t(errors.confirm) : ''}
                required
              />

              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
                >
                  {errors.general.includes('.') ? t(errors.general) : errors.general}
                </motion.div>
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
