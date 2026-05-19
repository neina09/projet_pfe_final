import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../api/auth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Layout from '../../components/layout/Layout'
import { validatePhone } from '../../lib/validators'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone.trim()) return
    if (!validatePhone(phone)) {
      setError('errors.invalidMauritanianPhone')
      return
    }

    setLoading(true)
    setError('')
    try {
      await authApi.forgotPassword(phone)
      navigate('/verify-otp', { state: { phone, mode: 'reset' } })
    } catch (err) {
      const errorMsg = err.response?.data?.message || ''
      let msg = errorMsg || t('errors.serverError')
      
      // Clean up field prefixes first
      if (msg.includes(': ')) msg = msg.split(': ')[1]

      // Map to localized keys
      if (msg.toLowerCase().includes('mauritanian') || msg.toLowerCase().includes('phone')) {
        msg = 'errors.invalidMauritanianPhone'
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
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.forgotPassword.title')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('auth.forgotPassword.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label={t('auth.forgotPassword.phone')}
                type="tel"
                placeholder="+222 XX XX XX XX"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value)
                  setError('')
                }}
                error={error.includes('.') ? t(error) : error}
                required
              />
              <Button type="submit" loading={loading} className="w-full">
                {t('auth.forgotPassword.submit')}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center justify-center gap-1">
                <span className="inline-block rtl-flip">←</span>
                <span>{t('auth.forgotPassword.backToLogin')}</span>
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
