import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ImagePlus, Shield, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Input from '../components/ui/Input'
import { Textarea } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { workersApi } from '../api/workers'
import { Select } from '../components/ui/Input'

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

function FileField({ label, hint, file, onChange, accept, capture }) {
  const { t } = useTranslation()
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-primary-400 hover:bg-primary-50/60 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-primary-500 dark:hover:bg-primary-900/10">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        <Upload size={16} className="text-primary-500" />
        {label}
      </div>
      <p className="mb-3 text-xs leading-6 text-gray-500 dark:text-gray-400">{hint}</p>
      <div className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 dark:bg-gray-950/60 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
        {file?.name || t('worker.selectFile')}
      </div>
      <input
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
  )
}

export default function BecomeWorker() {
  const { t } = useTranslation()
  const { user, refreshProfile, isAdmin, isWorker } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ profession: '', bio: '', location: '', salary: '', skills: '', idDocument: '' })
  const [profileImage, setProfileImage] = useState(null)
  const [identityFront, setIdentityFront] = useState(null)
  const [identityBack, setIdentityBack] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingWorker, setCheckingWorker] = useState(true)
  const [existingWorker, setExistingWorker] = useState(null)
  const [deletingWorker, setDeletingWorker] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (!profileImage) {
      setProfilePreview('')
      return undefined
    }

    const nextPreview = URL.createObjectURL(profileImage)
    setProfilePreview(nextPreview)

    return () => URL.revokeObjectURL(nextPreview)
  }, [profileImage])

  useEffect(() => {
    if (!user || !isWorker) {
      setExistingWorker(null)
      setCheckingWorker(false)
      return
    }

    setCheckingWorker(true)
    workersApi.getMine()
      .then((response) => setExistingWorker(response.data))
      .catch(() => setExistingWorker(null))
      .finally(() => setCheckingWorker(false))
  }, [user, isWorker])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/login')

    if (!profileImage) {
      setError(t('errors.workerPhotoRequired'))
      return
    }

    if (!identityFront) {
      setError(t('errors.identityRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const registration = await workersApi.register({
        name: user?.name || user?.username || '',
        phoneNumber: user?.phone || '',
        job: form.profession,
        address: form.location,
        salary: Number(form.salary || 0),
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
      await refreshProfile()
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWorkerProfile = async () => {
    if (!existingWorker?.id) {
      return
    }
    if (!window.confirm(t('common.confirm'))) {
      return
    }

    setDeletingWorker(true)
    setError('')
    try {
      await workersApi.deleteProfile(existingWorker.id)
      await refreshProfile()
      setExistingWorker(null)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || t('errors.workerProfileDeleteError'))
    } finally {
      setDeletingWorker(false)
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
    return (
      <Layout>
        <div className="page-container max-w-2xl py-10">
          <div className="card p-8 text-center">
            <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('becomeWorker.alreadyWorker')}</h1>
            <p className="mb-2 text-gray-600 dark:text-gray-300">{existingWorker.name || user?.name}</p>
            <p className="mb-6 text-gray-500 dark:text-gray-400">{t('becomeWorker.alreadyWorkerHint')}</p>
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</Button>
              <Button variant="danger" loading={deletingWorker} onClick={handleDeleteWorkerProfile}>{t('admin.delete')}</Button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-container max-w-2xl py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
              <Shield size={28} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="section-title">{t('becomeWorker.title')}</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('becomeWorker.subtitle')}</p>
          </div>

          <div className="card p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Select
                label={t('becomeWorker.form.profession')}
                value={form.profession}
                onChange={set('profession')}
                required
              >
                <option value="">{t('common.select')}</option>
                {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{t(p.labelKey)}</option>)}
              </Select>
              <Input
                label={t('becomeWorker.form.skills')}
                placeholder={t('becomeWorker.form.skillsPlaceholder')}
                value={form.skills}
                onChange={set('skills')}
              />
              <Textarea
                label={t('becomeWorker.form.bio')}
                placeholder={t('becomeWorker.form.bioPlaceholder')}
                value={form.bio}
                onChange={set('bio')}
                rows={4}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label={t('becomeWorker.form.location')}
                  placeholder={t('becomeWorker.form.locationPlaceholder')}
                  value={form.location}
                  onChange={set('location')}
                  required
                />
                <Input
                  label={t('becomeWorker.form.salary')}
                  type="number"
                  placeholder="500"
                  value={form.salary}
                  onChange={set('salary')}
                  required
                />
              </div>

              <Input
                label={t('becomeWorker.form.idDocument')}
                placeholder={t('becomeWorker.form.idDocumentPlaceholder')}
                value={form.idDocument}
                onChange={set('idDocument')}
                required
              />

              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm leading-7 text-primary-800 dark:border-primary-900/40 dark:bg-primary-900/10 dark:text-primary-200">
                {t('becomeWorker.verificationHint')}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FileField
                  label={t('worker.photo')}
                  hint={t('worker.facePhoto')}
                  file={profileImage}
                  onChange={setProfileImage}
                  accept="image/*"
                  capture="user"
                />
                <FileField
                  label={t('worker.identityFront')}
                  hint={t('worker.frontSide')}
                  file={identityFront}
                  onChange={setIdentityFront}
                  accept="image/*"
                  capture="environment"
                />
                <FileField
                  label={t('worker.identityBack')}
                  hint={t('worker.backSide')}
                  file={identityBack}
                  onChange={setIdentityBack}
                  accept="image/*"
                  capture="environment"
                />
              </div>

              {profilePreview && (
                <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <ImagePlus size={16} className="text-primary-500" />
                    {t('becomeWorker.form.preview')}
                  </div>
                  <img
                    src={profilePreview}
                    alt="worker-preview"
                    className="h-40 w-40 rounded-2xl object-cover"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                {t('becomeWorker.form.submit')}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
