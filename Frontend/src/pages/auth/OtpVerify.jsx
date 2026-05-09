import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Layout from '../../components/layout/Layout'

export default function OtpVerify() {
  const { t } = useTranslation()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef([])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) return setError(t('auth.otp.lengthError'))
    setLoading(true)
    setError('')
    try {
      const phone = state?.phone
      if (state?.mode === 'register') {
        await authApi.verifyOtp(phone, code)
        await login(phone, state.registerData.password)
        navigate('/dashboard')
      } else if (state?.mode === 'reset') {
        navigate('/reset-password', { state: { phone, code } })
      } else {
        await authApi.verifyOtp(phone, code)
        navigate('/login')
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    try { await authApi.sendOtp(state?.phone) } catch {}
  }

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-primary-50/30 dark:from-gray-950 dark:to-gray-900">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.otp.title')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('auth.otp.subtitle')}</p>
              {state?.phone && <p className="text-primary-600 dark:text-primary-400 font-medium mt-1">{state.phone}</p>}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex gap-2 justify-center" dir="ltr">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {error && <p className="text-center text-sm text-red-500">{error}</p>}

              <Button type="submit" loading={loading} className="w-full">
                {t('auth.otp.submit')}
              </Button>

              <button type="button" onClick={resend} className="text-sm text-center text-primary-600 dark:text-primary-400 hover:underline">
                {t('auth.otp.resend')}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
