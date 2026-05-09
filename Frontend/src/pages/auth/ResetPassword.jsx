import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Layout from '../../components/layout/Layout'

export default function ResetPassword() {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state?.phone || !state?.code) navigate('/forgot-password', { replace: true })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return setError(t('errors.passwordMismatch'))
    setLoading(true)
    setError('')
    try {
      await authApi.resetPassword(state?.phone, state?.code, form.newPassword)
      navigate('/login')
    } catch (err) {
      let msg = err.response?.data?.message || t('errors.serverError')
      
      // Map common backend validation errors
      if (msg.includes('at least one letter and one digit')) {
        msg = t('errors.passwordComplexity')
      }
      
      // Clean up field prefixes (e.g., "newPassword: ...")
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
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="card p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.resetPassword.title')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('auth.resetPassword.subtitle')}</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label={t('auth.resetPassword.newPassword')}
                type="password"
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                required
              />
              <Input
                label={t('auth.resetPassword.confirmPassword')}
                type="password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                {t('auth.resetPassword.submit')}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
