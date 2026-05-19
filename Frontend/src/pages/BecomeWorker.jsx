import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Shield, Upload, CreditCard, Receipt } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { workersApi } from '../api/workers'
import { Select } from '../components/ui/Input'
import MapPicker from '../components/ui/MapPicker'
import { formatAddress } from '../lib/utils'
import { MapPin } from 'lucide-react'

const PROFESSIONS = [
  { id: 'plumber', labelKey: 'home.categories.plumber' },
  { id: 'electrician', labelKey: 'home.categories.electrician' },
  { id: 'carpenter', labelKey: 'home.categories.carpenter' },
  { id: 'painter', labelKey: 'home.categories.painter' },
  { id: 'mason', labelKey: 'home.categories.mason' },
  { id: 'cleaner', labelKey: 'home.categories.cleaner' },
  { id: 'mechanic', labelKey: 'home.categories.mechanic' },
  { id: 'gardener', labelKey: 'home.categories.gardener' },
  { id: 'tailor', labelKey: 'home.categories.tailor' },
  { id: 'driver', labelKey: 'home.categories.driver' },
  { id: 'chef', labelKey: 'home.categories.chef' },
  { id: 'security', labelKey: 'home.categories.security' },
]

async function combineImages(frontFile, backFile) {
  if (!frontFile && !backFile) return null
  if (frontFile && !backFile) return frontFile
  if (!frontFile && backFile) return backFile
  const loadImage = (src) => new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
  try {
    const frontUrl = URL.createObjectURL(frontFile)
    const backUrl = URL.createObjectURL(backFile)
    const imgF = await loadImage(frontUrl)
    const imgB = await loadImage(backUrl)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = Math.max(imgF.width, imgB.width)
    canvas.height = imgF.height + imgB.height + 40
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgF, (canvas.width - imgF.width) / 2, 0)
    ctx.drawImage(imgB, (canvas.width - imgB.width) / 2, imgF.height + 40)
    URL.revokeObjectURL(frontUrl)
    URL.revokeObjectURL(backUrl)
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        resolve(new File([blob], 'id-combined.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.8)
    })
  } catch (err) {
    console.error('Failed to combine images', err)
    return frontFile
  }
}

function FileField({ label, hint, file, onChange, accept, capture, error }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="flex flex-col gap-1.5">
      <label className={`group relative block aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all 
        ${error ? 'border-red-400 bg-red-50/30' : 'border-gray-200 bg-gray-50 hover:border-primary-500 hover:bg-primary-50 dark:border-gray-800 dark:bg-gray-900/40'}`}>
        {preview ? (
          <div className="h-full w-full">
            <img src={preview} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/20 p-2 text-white backdrop-blur-md">
                <Upload size={20} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur-sm transition-colors 
              ${error ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30'}`}>
              <Upload size={20} />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">{label}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">{hint}</p>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          capture={capture}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
      {error && <p className="text-[10px] text-red-500 font-medium px-1">{error}</p>}
    </div>
  )
}

export default function BecomeWorker() {
  const { t } = useTranslation()
  const { user, refreshProfile, isAdmin, isWorker } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ profession: '', bio: '', location: '', idDocument: '' })
  const [profileImage, setProfileImage] = useState(null)
  const [identityFront, setIdentityFront] = useState(null)
  const [identityBack, setIdentityBack] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkingWorker, setCheckingWorker] = useState(true)
  const [existingWorker, setExistingWorker] = useState(null)
  const [deletingWorker, setDeletingWorker] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [showMap, setShowMap] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [subscriptionSubmitting, setSubscriptionSubmitting] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState('')
  const requiresSubscription = Boolean(existingWorker?.subscriptionRequired)

  const subscriptionPreview = subscription || {
    amount: 200,
    recipientName: 'neina med vall',
    accountNumber: '48995086',
    qrImageUrl: '/payment-qr.svg',
  }

  const set = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const setFile = (key, val, fileSetter) => {
    fileSetter(val)
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleIdChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(f => ({ ...f, idDocument: val }))
    
    if (val.length > 0 && val.length < 10) {
      setErrors(prev => ({ ...prev, idDocument: t('errors.invalidNationalId') }))
    } else {
      setErrors(prev => {
        const next = { ...prev }
        delete next.idDocument
        return next
      })
    }
  }

  useEffect(() => {
    if (!user) {
      setExistingWorker(null)
      setCheckingWorker(false)
      setSubscription(null)
      return
    }

    setCheckingWorker(true)
    workersApi.getMine()
      .then((response) => setExistingWorker(response.data))
      .catch(() => setExistingWorker(null))
      .finally(() => setCheckingWorker(false))
  }, [user, isWorker])

  useEffect(() => {
    const currentStatus = (existingWorker?.verificationStatus || existingWorker?.status || '').toUpperCase()
    if (currentStatus !== 'VERIFIED' || !existingWorker?.subscriptionRequired) {
      setSubscription(null)
      return
    }

    setSubscriptionLoading(true)
    workersApi.getSubscription()
      .then((response) => {
        setSubscription(response.data)
        setPaymentReference(response.data?.transferReference || '')
      })
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [existingWorker?.id, existingWorker?.verificationStatus, existingWorker?.status, existingWorker?.subscriptionRequired])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/login')

    const newErrors = {}
    if (!profileImage) newErrors.profileImage = t('errors.workerPhotoRequired')
    if (!identityFront) newErrors.identityFront = t('errors.identityRequired')
    if (!form.profession) newErrors.profession = t('errors.fieldRequired')
    if (!form.location) newErrors.location = t('errors.fieldRequired')
    if (!form.idDocument) {
      newErrors.idDocument = t('errors.fieldRequired')
    } else if (form.idDocument.length !== 10) {
      newErrors.idDocument = t('errors.invalidNationalId')
    }
    if (!paymentReference.trim()) {
      newErrors.paymentReference = t('errors.fieldRequired')
    }
    if (!receiptFile) {
      newErrors.receiptFile = t('workerDashboard.subscription.receiptRequired', { defaultValue: 'يرجى رفع وصل الدفع أولاً.' })
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const registration = await workersApi.register({
        name: user?.name || user?.username || '',
        phoneNumber: user?.phone || '',
        job: form.profession,
        address: form.location,
        nationalIdNumber: form.idDocument,
      })

      const worker = registration.data?.worker
      const token = registration.data?.token

      if (!worker?.id) {
        throw new Error(t('errors.serverError'))
      }

      if (token) {
        localStorage.setItem('token', token)
      }

      await workersApi.uploadImage(worker.id, profileImage)

      const combinedId = await combineImages(identityFront, identityBack)
      if (combinedId) {
        await workersApi.uploadIdentityDocument(worker.id, combinedId)
      }
      await workersApi.submitSubscriptionReceipt(worker.id, receiptFile, paymentReference.trim())
      await refreshProfile()
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || ''

      if (msg.includes('nationalIdNumber')) {
        setErrors({ idDocument: t('errors.invalidNationalId') })
      } else if (msg.toLowerCase().includes('verified before activating the subscription')) {
        setErrors({ general: 'تم تحديث النظام بحيث يمكن إكمال الاشتراك قبل قبول التوثيق، لكن الخادم الحالي يحتاج إلى إعادة تشغيل لتطبيق التعديل.' })
      } else if (msg.toLowerCase().includes('already registered')) {
        setErrors({ general: t('errors.alreadyRegistered') })
      } else if (msg.toLowerCase().includes('phone')) {
        setErrors({ general: msg })
      } else {
        setErrors({ general: msg || t('errors.serverError') })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWorkerProfile = async () => {
    if (!existingWorker?.id) return
    if (!window.confirm(t('common.confirm'))) return

    setDeletingWorker(true)
    setErrors({})
    try {
      await workersApi.deleteProfile(existingWorker.id)
      await refreshProfile()
      setExistingWorker(null)
      navigate('/dashboard')
    } catch (err) {
      setErrors({ general: err.response?.data?.message || t('errors.workerProfileDeleteError') })
    } finally {
      setDeletingWorker(false)
    }
  }

  const handleSubscriptionSubmit = async (e) => {
    e.preventDefault()
    if (!existingWorker?.id) return
    if (!receiptFile) {
      setSubscriptionError(t('workerDashboard.subscription.receiptRequired', { defaultValue: 'يرجى رفع وصل الدفع أولاً.' }))
      return
    }

    setSubscriptionSubmitting(true)
    setSubscriptionError('')
    try {
      const response = await workersApi.submitSubscriptionReceipt(existingWorker.id, receiptFile, paymentReference.trim())
      setSubscription(response.data)
      setReceiptFile(null)
      const status = response.data?.paymentStatus
      if (status === 'AUTO_APPROVED') {
        setSubscriptionError('')
        // Show success as a special note via verificationNotes displayed in UI
      } else {
        setSubscriptionError('')
      }
    } catch (err) {
      setSubscriptionError(err.response?.data?.message || t('common.error'))
    } finally {
      setSubscriptionSubmitting(false)
    }
  }


  if (checkingWorker) {
    return <Layout><div className="page-container py-10"><div className="card p-8 text-center">{t('common.loading')}</div></div></Layout>
  }

  if (success) {
    return (
      <Layout>
        <div className="page-container flex flex-col items-center py-20 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
          </motion.div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t('becomeWorker.success')}</h1>
          <p className="mb-6 text-gray-500 dark:text-gray-400">{t('becomeWorker.pending')}</p>
          <Button onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</Button>
        </div>
      </Layout>
    )
  }

  if (isAdmin) {
    return (
      <Layout>
        <div className="page-container max-w-2xl py-10">
          <div className="card p-8 text-center">
            <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('admin.adminBecomeWorkerError')}</h1>
            <p className="mb-6 text-gray-500 dark:text-gray-400">{t('admin.adminBecomeWorkerErrorHint')}</p>
            <Button onClick={() => navigate('/admin')}>{t('admin.goToAdmin')}</Button>
          </div>
        </div>
      </Layout>
    )
  }

  if (existingWorker) {
    const currentStatus = (existingWorker.verificationStatus || existingWorker.status || '').toUpperCase()
    const isRejected = currentStatus === 'REJECTED'
    const canManageSubscription = currentStatus === 'VERIFIED' && requiresSubscription
    const subscriptionStatusLabel = subscription?.active
      ? t('workerDashboard.subscription.active', { defaultValue: 'نشط' })
      : subscription?.paymentStatus === 'EXPIRED'
        ? t('workerDashboard.subscription.expired', { defaultValue: 'منتهي' })
        : subscription?.paymentStatus === 'APPROVED'
          ? 'تم التحقق (إدارة)'
          : subscription?.paymentStatus === 'AUTO_APPROVED'
            ? 'تم التحقق (OCR)'
            : subscription?.paymentStatus === 'PENDING'
              ? 'قيد المراجعة'
              : subscription?.paymentStatus === 'REJECTED'
                ? 'مرفوض'
                : t('workerDashboard.subscription.notPaid', { defaultValue: 'غير مدفوع' })

    return (
      <Layout>
        <div className="page-container max-w-4xl py-10">
          <div className="card p-8 text-center mb-6">
            <h1 className={`mb-3 text-2xl font-bold ${isRejected ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {isRejected ? t('becomeWorker.verificationRejected') : t('becomeWorker.alreadyWorker')}
            </h1>
            <p className="mb-2 text-gray-600 dark:text-gray-300 font-medium">{existingWorker.name || user?.name}</p>

            <div className="mb-6 flex justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                ${currentStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                  currentStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'}`}>
                {t(`workerStatusLabel.${currentStatus || 'PENDING'}`)}
              </span>
            </div>

            <p className="mb-6 text-gray-500 dark:text-gray-400">
              {isRejected ? t('becomeWorker.rejectedHint') : t('becomeWorker.alreadyWorkerHint')}
            </p>
            {errors.general && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{errors.general}</div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {isRejected ? (
                <Button
                  variant="primary"
                  loading={deletingWorker}
                  onClick={handleDeleteWorkerProfile}
                  className="min-w-[200px]"
                >
                  {t('becomeWorker.retryRegistration')}
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</Button>
                  <Button variant="danger" loading={deletingWorker} onClick={handleDeleteWorkerProfile}>{t('admin.delete')}</Button>
                </>
              )}
            </div>
          </div>

          {canManageSubscription && (
            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard size={18} className="text-primary-500" />
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {t('workerDashboard.subscription.title', { defaultValue: 'اشتراك المنصة' })}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('workerDashboard.subscription.subtitle', { defaultValue: 'فعّل اشتراكك لمدة 6 أشهر ليظهر ملفك المهني داخل المنصة.' })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${subscription?.active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {subscriptionStatusLabel}
                  </span>
                </div>

                {subscriptionLoading ? (
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                    {t('common.loading')}
                  </div>
                ) : (
                  <form onSubmit={handleSubscriptionSubmit} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="text-xs text-gray-500 mb-1">{t('workerDashboard.subscription.amount', { defaultValue: 'قيمة الاشتراك' })}</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{subscription?.amount ?? 200} MRU</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="text-xs text-gray-500 mb-1">{t('workerDashboard.subscription.recipient', { defaultValue: 'اسم المستفيد' })}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{subscription?.recipientName || 'neina med vall'}</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="text-xs text-gray-500 mb-1">{t('workerDashboard.subscription.account', { defaultValue: 'رقم الحساب' })}</div>
                        <div className="text-lg font-bold tracking-wide text-gray-900 dark:text-white">{subscription?.accountNumber || '48995086'}</div>
                      </div>
                    </div>

                    <Input
                      label={t('workerDashboard.subscription.reference', { defaultValue: 'رقم العملية أو المرجع' })}
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={t('workerDashboard.subscription.referencePlaceholder', { defaultValue: 'أدخل رقم العملية بعد التحويل' })}
                      required
                    />

                    <label className="block rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 hover:border-primary-400 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        <Receipt size={16} />
                        {t('workerDashboard.subscription.receipt', { defaultValue: 'وصل الدفع' })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {t('workerDashboard.subscription.receiptHint', { defaultValue: 'ارفع صورة أو PDF لوصل التحويل، وسيتم التحقق من بياناته عبر OCR أو مراجعته من الإدارة قبل تفعيل الاشتراك.' })}
                      </p>
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {receiptFile?.name || subscription?.receiptUrl || t('workerDashboard.subscription.receiptSelect', { defaultValue: 'اختر ملف الوصل' })}
                      </div>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    {subscription?.endsAt && (
                      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {subscription?.active
                          ? t('workerDashboard.subscription.endsAt', {
                              date: new Date(subscription.endsAt).toLocaleDateString(),
                              defaultValue: `الاشتراك نشط حتى ${new Date(subscription.endsAt).toLocaleDateString()}`
                            })
                          : t('workerDashboard.subscription.lastEndsAt', {
                              date: new Date(subscription.endsAt).toLocaleDateString(),
                              defaultValue: `آخر تاريخ انتهاء كان ${new Date(subscription.endsAt).toLocaleDateString()}`
                            })}
                      </div>
                    )}

                    {/* Status result after submission */}
                    {subscription?.paymentStatus && subscription.paymentStatus !== 'NOT_SUBMITTED' && (
                      <div className={`rounded-2xl px-4 py-3 text-sm font-medium
                        ${subscription.paymentStatus === 'AUTO_APPROVED' || subscription.paymentStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : subscription.paymentStatus === 'REJECTED'
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                        }`}>
                        {subscription.paymentStatus === 'AUTO_APPROVED'
                          ? `✅ ${t('workerDashboard.subscription.statusAutoApproved', { defaultValue: 'تم التحقق من الوصل تلقائياً عبر OCR — في انتظار تأكيد المدير لتفعيل الاشتراك.' })}`
                          : subscription.paymentStatus === 'APPROVED'
                            ? `✅ ${t('workerDashboard.subscription.statusApproved', { defaultValue: 'تم التحقق من الدفع من قبل الإدارة — اشتراكك نشط.' })}`
                            : subscription.paymentStatus === 'REJECTED'
                              ? `❌ ${t('workerDashboard.subscription.statusRejected', { defaultValue: 'تم رفض وصل الدفع. يرجى رفع وصل صحيح مع رقم العملية الصحيح.' })}`
                              : `⏳ ${t('workerDashboard.subscription.statusPending', { defaultValue: 'تم رفع الوصل وهو قيد مراجعة الإدارة. سيتم إخطارك عند التحقق.' })}`}
                      </div>
                    )}



                    {subscriptionError && (
                      <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                        {subscriptionError}
                      </div>
                    )}

                    <Button type="submit" loading={subscriptionSubmitting} className="w-full sm:w-auto">
                      {t('workerDashboard.subscription.submit', { defaultValue: 'رفع الوصل وإرسال التحقق' })}
                    </Button>
                  </form>
                )}
              </div>

              <div className="card p-6 flex flex-col items-center justify-center text-center">
                <img
                  src={subscription?.qrImageUrl || '/payment-qr.svg'}
                  alt="Payment QR"
                  className="w-52 h-52 object-contain rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm"
                />
                <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                  {t('workerDashboard.subscription.qrTitle', { defaultValue: 'امسح رمز QR للتحويل' })}
                </p>
                <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                  {t('workerDashboard.subscription.qrHint', { defaultValue: 'بعد الدفع، أدخل رقم العملية وارفع الوصل حتى يتم تفعيل ظهورك في المنصة.' })}
                </p>
              </div>
            </div>
          )}

          {!canManageSubscription && !isRejected && requiresSubscription && (
            <div className="card p-6 text-center text-sm text-gray-600 dark:text-gray-300">
              سيتم إظهار واجهة الاشتراك هنا مباشرة بعد قبول توثيق العامل من الإدارة.
            </div>
          )}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-container max-w-5xl py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
              <Shield size={28} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="section-title">{t('becomeWorker.title')}</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('becomeWorker.subtitle')}</p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="flex flex-col gap-5">
              <Select
                label={t('becomeWorker.form.profession')}
                value={form.profession}
                onChange={set('profession')}
                error={errors.profession}
                required
              >
                <option value="">{t('common.select')}</option>
                {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{t(p.labelKey)}</option>)}
              </Select>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {t('becomeWorker.form.location')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    <MapPin size={14} />
                    {showMap ? t('becomeWorker.form.typeAddress') : t('becomeWorker.form.selectOnMap')}
                  </button>
                </div>

                {showMap ? (
                  <div className="flex flex-col gap-3">
                    <MapPicker 
                      onLocationSelect={({ address }) => {
                        setForm(f => ({ ...f, location: formatAddress(address) }))
                        if (errors.location) {
                          setErrors(prev => {
                            const next = { ...prev }
                            delete next.location
                            return next
                          })
                        }
                        setShowMap(false)
                      }} 
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {form.location || t('becomeWorker.form.locationPlaceholder')}
                    </div>
                  </div>
                ) : (
                  <Input
                    placeholder={t('becomeWorker.form.locationPlaceholder')}
                    value={form.location}
                    onChange={set('location')}
                    error={errors.location}
                    required
                  />
                )}
              </div>

              <Input
                label={t('becomeWorker.form.idDocument')}
                placeholder={t('becomeWorker.form.idDocumentPlaceholder')}
                value={form.idDocument}
                onChange={handleIdChange}
                error={errors.idDocument}
                required
                maxLength={10}
              />

              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm leading-7 text-primary-800 dark:border-primary-900/40 dark:bg-primary-900/10 dark:text-primary-200">
                {t('becomeWorker.verificationHint')}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FileField
                  label={t('worker.photo')}
                  hint={t('worker.facePhoto')}
                  file={profileImage}
                  onChange={(val) => setFile('profileImage', val, setProfileImage)}
                  error={errors.profileImage}
                  accept="image/*"
                  capture="user"
                />
                <FileField
                  label={t('worker.identityFront')}
                  hint={t('worker.frontSide')}
                  file={identityFront}
                  onChange={(val) => setFile('identityFront', val, setIdentityFront)}
                  error={errors.identityFront}
                  accept="image/*"
                  capture="environment"
                />
                <FileField
                  label={t('worker.identityBack')}
                  hint={t('worker.backSide')}
                  file={identityBack}
                  onChange={(val) => setFile('identityBack', val, setIdentityBack)}
                  error={errors.identityBack}
                  accept="image/*"
                  capture="environment"
                />
              </div>

              </div>

              <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/30 dark:bg-gray-950/40">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-primary-500" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('workerDashboard.subscription.title', { defaultValue: 'اشتراك المنصة' })}
                  </h2>
                </div>
                <p className="mb-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                  {t('becomeWorker.subscriptionSubmitRule', { defaultValue: 'لا يتم إرسال طلب العامل إلا بعد إكمال الاشتراك: أدخل رقم العملية وارفع وصل الدفع ثم قدّم الطلب.' })}
                </p>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
                    <img
                      src={subscriptionPreview.qrImageUrl}
                      alt="Payment QR"
                      className="mb-4 w-44 h-44 rounded-3xl border border-emerald-200 bg-white p-3 object-contain"
                    />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('workerDashboard.subscription.qrTitle', { defaultValue: 'الدفع عبر QR أو رقم الحساب' })}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                      {t('becomeWorker.subscriptionQrRequired', { defaultValue: 'يمكنك الدفع بمسح رمز QR أو بالتحويل إلى رقم الحساب، ثم ارفع الوصل وأكمل الطلب.' })}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="text-xs text-gray-500 mb-1">{t('workerDashboard.subscription.amount', { defaultValue: 'قيمة الاشتراك' })}</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{subscriptionPreview.amount} MRU</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="text-xs text-gray-500 mb-1">{t('workerDashboard.subscription.recipient', { defaultValue: 'اسم المستفيد' })}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{subscriptionPreview.recipientName}</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4">
                        <div className="text-xs text-gray-500 mb-1">{t('workerDashboard.subscription.account', { defaultValue: 'رقم الحساب' })}</div>
                        <div className="text-lg font-bold tracking-wide text-gray-900 dark:text-white">{subscriptionPreview.accountNumber}</div>
                      </div>
                    </div>

                    <Input
                      label={t('workerDashboard.subscription.reference', { defaultValue: 'رقم العملية أو المرجع' })}
                      value={paymentReference}
                      onChange={(e) => {
                        setPaymentReference(e.target.value)
                        if (errors.paymentReference) {
                          setErrors(prev => {
                            const next = { ...prev }
                            delete next.paymentReference
                            return next
                          })
                        }
                      }}
                      error={errors.paymentReference}
                      placeholder={t('workerDashboard.subscription.referencePlaceholder', { defaultValue: 'أدخل رقم العملية بعد الدفع' })}
                      required
                    />

                    <label className={`block cursor-pointer rounded-2xl border border-dashed p-4 transition-colors ${
                      errors.receiptFile ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/60 hover:border-primary-400 dark:border-gray-700 dark:bg-gray-900/40'
                    }`}>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        <Receipt size={16} />
                        {t('workerDashboard.subscription.receipt', { defaultValue: 'وصل الدفع' })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {t('workerDashboard.subscription.receiptHint', { defaultValue: 'ارفع صورة أو PDF لوصل الدفع سواء تم عبر QR أو عبر رقم الحساب.' })}
                      </p>
                      <div className="rounded-xl bg-white dark:bg-gray-950/50 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {receiptFile?.name || t('workerDashboard.subscription.receiptSelect', { defaultValue: 'اختر ملف الوصل' })}
                      </div>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          setReceiptFile(e.target.files?.[0] || null)
                          if (errors.receiptFile) {
                            setErrors(prev => {
                              const next = { ...prev }
                              delete next.receiptFile
                              return next
                            })
                          }
                        }}
                      />
                    </label>
                    {errors.receiptFile && <p className="text-[10px] text-red-500 font-medium px-1">{errors.receiptFile}</p>}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
              {errors.general && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{errors.general}</div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                {t('becomeWorker.submitWithSubscription', { defaultValue: 'إرسال الوصل وتقديم الطلب' })}
              </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
