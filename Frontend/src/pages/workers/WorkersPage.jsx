import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, Users, ShieldCheck, Eye, Pencil, Trash2, Plus, CheckCircle2, XCircle, UserSquare2, Phone, MapPin, LocateFixed, X, CreditCard } from 'lucide-react'
import { workersApi } from '../../api/workers'
import { adminApi } from '../../api/admin'
import { authApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import WorkerCard from '../../components/workers/WorkerCard'
import Layout from '../../components/layout/Layout'
import { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input, { Select } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Input'
import { normalizeWorker } from '../../lib/normalizers'
import { endpoint } from '../../api/endpoints'
import { formatAddress } from '../../lib/utils'

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

// Profession labels are handled via t() in the component

function resolveAsset(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : endpoint(url)
}

const workerStatusVariant = {
  VERIFIED: 'green',
  PENDING: 'yellow',
  REJECTED: 'red',
}

// Status labels are handled via t() in the component

const emptyWorkerForm = {
  userId: '',
  name: '',
  phoneNumber: '',
  job: '',
  address: '',
  nationalIdNumber: '',
}

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

function FileUploadField({ label, hint, file, onChange, accept, capture }) {
  const { t } = useTranslation()
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-primary-400 hover:bg-primary-50/60 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-primary-500 dark:hover:bg-primary-900/10">
      <div className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
      <p className="mb-3 text-xs leading-6 text-gray-500 dark:text-gray-400">{hint}</p>
      <div className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 dark:bg-gray-950/60 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
        {file?.name || t('common.select')}
      </div>
      <input type="file" accept={accept} capture={capture} className="hidden" onChange={(event) => onChange(event.target.files?.[0] || null)} />
    </label>
  )
}

export default function WorkersPage() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [workers, setWorkers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('profession') || '')
  const [locationSearch, setLocationSearch] = useState('')
  const [locatingSearch, setLocatingSearch] = useState(false)

  const handleDetectLocationSearch = () => {
    if (!navigator.geolocation) return
    setLocatingSearch(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ar`,
            { headers: { 'Accept-Language': 'ar' } }
          )
          if (!response.ok) throw new Error()
          const data = await response.json()
          const address = data?.address || {}
          const readableName = [
            address.suburb,
            address.neighbourhood,
            address.quarter,
            address.city_district,
            address.city,
            address.town,
            address.village,
            address.state,
          ].find(Boolean)
          
          if (readableName) {
            setLocationSearch(readableName)
          } else if (data?.display_name) {
             setLocationSearch(data.display_name.split(',')[0])
          }
        } catch {}
        setLocatingSearch(false)
      },
      () => setLocatingSearch(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const [filterAvailable, setFilterAvailable] = useState(false)

  // Admin states
  const [actioning, setActioning] = useState('')
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [workerFormOpen, setWorkerFormOpen] = useState(false)
  const [workerFormMode, setWorkerFormMode] = useState('create')
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm)
  const [workerFormError, setWorkerFormError] = useState('')
  const [workerImageFile, setWorkerImageFile] = useState(null)
  const [workerIdentityFrontFile, setWorkerIdentityFrontFile] = useState(null)
  const [workerIdentityBackFile, setWorkerIdentityBackFile] = useState(null)
  const [identityDocBlob, setIdentityDocBlob] = useState(null)
  const [identityModalOpen, setIdentityModalOpen] = useState(false)
  const [viewingIdentity, setViewingIdentity] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [wRes, uRes] = await Promise.all([
        workersApi.getAll(),
        isAdmin ? adminApi.getUsers() : Promise.resolve({ data: [] })
      ])
      setWorkers((wRes.data?.content || wRes.data || []).map(normalizeWorker))
      if (isAdmin) setUsers(uRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [isAdmin])

  useEffect(() => {
    const p = searchParams.get('profession')
    if (p) setSearch(p)
  }, [searchParams])

  const filtered = workers.filter(w => {
    const name = (w.name || w.fullName || w.user?.name || '').toLowerCase()
    const profId = (w.job || w.profession || '').toLowerCase()
    const profLabel = t(`home.categories.${profId}`).toLowerCase()
    const address = (w.address || w.location || '').toLowerCase()
    const q = search.toLowerCase()
    const locQ = locationSearch.toLowerCase()
    
    const matchSearch = !q || name.includes(q) || profId.includes(q) || profLabel.includes(q) || address.includes(q)
    const matchLocation = !locQ || address.includes(locQ)
    const matchAvail = !filterAvailable || w.available || w.availability === 'AVAILABLE'
    return matchSearch && matchLocation && matchAvail
  })

  // Admin Logic
  const workerUserIds = new Set(workers.map(w => w.userId).filter(Boolean))
  const availableUsers = users.filter(u => u.role === 'USER' && !workerUserIds.has(u.id))

  const resetWorkerForm = () => {
    setWorkerForm(emptyWorkerForm)
    setWorkerImageFile(null)
    setWorkerIdentityFrontFile(null)
    setWorkerIdentityBackFile(null)
    setWorkerFormError('')
  }

  const openWorkerModal = async (worker) => {
    setSelectedWorker(worker)
    setWorkerModalOpen(true)
    try {
      const res = await adminApi.getWorkerDetails(worker.id)
      setSelectedWorker(res.data)
    } catch {}
  }

  const startCreateWorker = () => {
    resetWorkerForm()
    setWorkerFormMode('create')
    setWorkerFormOpen(true)
  }

  const startEditWorker = async (worker) => {
    setWorkerFormMode('edit')
    setWorkerFormError('')
    setWorkerImageFile(null)
    setWorkerIdentityFrontFile(null)
    setWorkerIdentityBackFile(null)
    try {
      const res = await adminApi.getWorkerDetails(worker.id)
      const data = res.data
      setWorkerForm({
        userId: data.userId ? String(data.userId) : '',
        name: data.name || '',
        phoneNumber: data.phoneNumber || '',
        job: data.job || '',
        address: data.address || '',
        nationalIdNumber: data.nationalIdNumber || '',
      })
      setSelectedWorker(data)
      setWorkerFormOpen(true)
    } catch (error) {
      setWorkerFormError(t('common.error'))
    }
  }

  const handleUserSelection = (e) => {
    const selectedId = e.target.value
    const selectedUser = users.find(u => String(u.id) === selectedId)
    setWorkerForm(prev => ({
      ...prev,
      userId: selectedId,
      name: prev.name || selectedUser?.username || '',
      phoneNumber: prev.phoneNumber || selectedUser?.phone || '',
    }))
  }

  const handleWorkerAction = async (id, action) => {
    setActioning(`worker-${id}-${action}`)
    try {
      if (action === 'approve') await adminApi.approveWorker(id)
      else await adminApi.rejectWorker(id)
      setWorkerModalOpen(false)
      await loadAll()
    } catch {} finally { setActioning('') }
  }

  const handleDeleteWorker = async (id) => {
    if (!window.confirm(t('common.confirm'))) return
    setActioning(`worker-${id}-delete`)
    try {
      await adminApi.deleteWorker(id)
      await loadAll()
    } catch {} finally { setActioning('') }
  }

  const handleShowIdentity = async (workerId) => {
    setViewingIdentity(true)
    try {
      const res = await workersApi.getIdentityDocument(workerId)
      const url = URL.createObjectURL(res.data)
      setIdentityDocBlob(url)
      setIdentityModalOpen(true)
    } catch {
      alert(t('common.error'))
    } finally {
      setViewingIdentity(false)
    }
  }

  const handleWorkerSave = async (e) => {
    e.preventDefault()
    setWorkerFormError('')
    setActioning(`worker-form-${workerFormMode}`)
    try {
      const payload = {
        name: workerForm.name.trim(),
        phoneNumber: workerForm.phoneNumber.trim(),
        job: workerForm.job.trim(),
        address: workerForm.address.trim(),
        nationalIdNumber: workerForm.nationalIdNumber.trim(),
      }
      let workerId = selectedWorker?.id
      if (workerFormMode === 'create') {
        const created = await adminApi.createWorker(workerForm.userId, payload)
        workerId = created.data?.id
      } else {
        await adminApi.updateWorker(selectedWorker.id, payload)
      }
      if (workerImageFile && workerId) await workersApi.uploadImage(workerId, workerImageFile)
      
      const identityFile = await combineImages(workerIdentityFrontFile, workerIdentityBackFile)
      if (identityFile && workerId) await workersApi.uploadIdentityDocument(workerId, identityFile)

      // Refresh profile if we edited ourselves
      const editedUserId = workerFormMode === 'create' ? workerForm.userId : selectedWorker?.userId
      if (String(editedUserId) === String(user?.id)) {
        try { await refreshProfile() } catch {}
      }
      
      setWorkerFormOpen(false)
      resetWorkerForm()
      await loadAll()
    } catch (error) {
      setWorkerFormError(error.response?.data?.message || t('common.error'))
    } finally { setActioning('') }
  }

  return (
    <Layout>
      <div className="page-container py-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-8 rounded-[28px] border border-emerald-100 dark:border-gray-800 bg-[linear-gradient(135deg,#ffffff_0%,#f3fbf5_100%)] dark:bg-none dark:bg-gray-800/50 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="section-title">{t('workers.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('workers.subtitle')}</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/admin')}
                className="rounded-2xl"
              >
                {t('admin.manageWorkers')}
              </Button>
              <Button onClick={startCreateWorker} className="rounded-2xl shadow-lg shadow-primary-500/20">
                <Plus size={18} />
                {t('worker.add')}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('workers.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base ps-10"
            />
          </div>
          <button
            onClick={locationSearch ? undefined : handleDetectLocationSearch}
            disabled={locatingSearch}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
              locationSearch 
                ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            {locatingSearch ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <LocateFixed size={16} className={locationSearch ? 'text-emerald-500' : 'text-gray-400'} />
            )}
            <span className="max-w-[120px] sm:max-w-[200px] truncate">
              {locationSearch || t('workers.profile.location', { defaultValue: 'Localisation' })}
            </span>
            {locationSearch && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setLocationSearch('');
                }}
                className="ms-1.5 p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full transition-colors inline-flex items-center justify-center text-emerald-600 dark:text-emerald-400 cursor-pointer"
              >
                <X size={12} className="stroke-[2.5]" />
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterAvailable(f => !f)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all whitespace-nowrap ${
              filterAvailable
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <SlidersHorizontal size={16} />
            {t('workers.filter.available')}
          </button>
        </motion.div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('workers.empty.title')}
            description={t('workers.empty.description')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((worker, index) => (
              <div key={worker.id} className="relative group">
                <WorkerCard worker={worker} index={index} />
                {isAdmin && (
                  <div className="absolute top-4 start-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => openWorkerModal(worker)}
                      className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-blue-500 hover:scale-110 transition-transform"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => startEditWorker(worker)}
                      className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteWorker(worker.id)}
                      disabled={actioning === `worker-${worker.id}-delete`}
                      className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-red-500 hover:scale-110 transition-transform disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

        {/* Admin Modals */}
        <Modal open={workerModalOpen} onClose={() => setWorkerModalOpen(false)} title={t('worker.profile.viewProfile')} size="lg">
          {selectedWorker && (
            <div className="flex flex-col gap-6">
              <div className="w-full">
                <div className="rounded-3xl border border-gray-100 p-4 text-center dark:border-gray-800">
                  <div className="mx-auto mb-3 h-28 w-28 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-600 border-2 border-primary-50">
                    {selectedWorker.imageUrl ? (
                      <>
                        <img 
                          src={resolveAsset(selectedWorker.imageUrl)} 
                          alt={selectedWorker.name} 
                          className="h-full w-full object-cover" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <span style={{ display: 'none' }}>{(selectedWorker.name || '?').slice(0, 1).toUpperCase()}</span>
                      </>
                    ) : (
                      <span>{(selectedWorker.name || '?').slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedWorker.name}</h3>
                  <p className="text-sm text-gray-500">{t(`home.categories.${selectedWorker.job}`, { defaultValue: selectedWorker.job })}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50">
                    <p className="mb-1 text-xs text-gray-500">{t('admin.workerTable.status')}</p>
                    <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      <ShieldCheck size={14} className="text-primary-500" />
                      {t(`workerStatusLabel.${selectedWorker.verificationStatus}`) || selectedWorker.verificationStatus || '-'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50">
                    <p className="mb-1 text-xs text-gray-500">{t('worker.phone')}</p>
                    <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      <Phone size={14} className="text-primary-500" />
                      <span dir="ltr">{selectedWorker.phoneNumber || selectedWorker.userPhone || '-'}</span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50">
                    <p className="mb-1 text-xs text-gray-500">{t('worker.address')}</p>
                    <p className="flex items-start gap-2 font-medium text-gray-900 dark:text-white">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0 text-primary-500" />
                      <span className="leading-relaxed">{formatAddress(selectedWorker.address) || '-'}</span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50">
                    <p className="mb-1 text-xs text-gray-500">{t('worker.nationalId')}</p>
                    <p className="flex items-center gap-2 font-medium tracking-wider text-gray-900 dark:text-white">
                      <CreditCard size={14} className="text-primary-500" />
                      {selectedWorker.nationalIdNumber || '-'}
                    </p>
                  </div>
                </div>
                {selectedWorker.identityDocumentUrl && (
                  <button
                    type="button"
                    onClick={() => handleShowIdentity(selectedWorker.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:border-gray-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
                  >
                    <Eye size={15} />
                    {viewingIdentity ? t('common.loading') : t('admin.workerTable.viewIdentity')}
                  </button>
                )}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 mt-4">
                  <Button className="flex-1" loading={actioning === `worker-${selectedWorker.id}-approve`} onClick={() => handleWorkerAction(selectedWorker.id, 'approve')}>
                    <CheckCircle2 size={16} />
                    {t('admin.approve')}
                  </Button>
                  <Button variant="secondary" className="flex-1" loading={actioning === `worker-${selectedWorker.id}-reject`} onClick={() => handleWorkerAction(selectedWorker.id, 'reject')}>
                    <XCircle size={16} />
                    {t('admin.reject')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={workerFormOpen} onClose={() => setWorkerFormOpen(false)} title={workerFormMode === 'create' ? t('worker.add') : t('worker.edit')} size="lg">
          <form onSubmit={handleWorkerSave} className="space-y-4">
            {workerFormMode === 'create' && (
              <Select label={t('worker.user')} value={workerForm.userId} onChange={handleUserSelection} required>
                <option value="">{t('common.select')}</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.username} - {u.phone}</option>)}
              </Select>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('worker.name')} value={workerForm.name} onChange={e => setWorkerForm(p => ({ ...p, name: e.target.value }))} required />
              <Input label={t('worker.phone')} value={workerForm.phoneNumber} onChange={e => setWorkerForm(p => ({ ...p, phoneNumber: e.target.value }))} required />
              <Select label={t('worker.job')} value={workerForm.job} onChange={e => setWorkerForm(p => ({ ...p, job: e.target.value }))} required>
                <option value="">{t('common.select')}</option>
                {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{t(p.labelKey)}</option>)}
              </Select>
              <Input label={t('worker.address')} value={workerForm.address} onChange={e => setWorkerForm(p => ({ ...p, address: e.target.value }))} required />
              <Input label={t('worker.nationalId')} value={workerForm.nationalIdNumber} onChange={e => setWorkerForm(p => ({ ...p, nationalIdNumber: e.target.value }))} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FileUploadField label={t('worker.photo')} hint={t('worker.facePhoto')} file={workerImageFile} onChange={setWorkerImageFile} accept="image/*" capture="user" />
              <FileUploadField label={t('worker.identityFront')} hint={t('worker.frontSide')} file={workerIdentityFrontFile} onChange={setWorkerIdentityFrontFile} accept="image/*" capture="environment" />
              <FileUploadField label={t('worker.identityBack')} hint={t('worker.backSide')} file={workerIdentityBackFile} onChange={setWorkerIdentityBackFile} accept="image/*" capture="environment" />
            </div>
            {workerFormError && <p className="text-sm text-red-500">{workerFormError}</p>}
            <Button type="submit" loading={!!actioning} className="w-full">{t('common.save')}</Button>
          </form>
        </Modal>

        <Modal open={identityModalOpen} onClose={() => setIdentityModalOpen(false)} title={t('admin.workerTable.viewIdentity')} size="xl">
          <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl min-h-[400px]">
            {identityDocBlob?.includes('application/pdf') || identityDocBlob?.startsWith('blob:') && selectedWorker?.identityDocumentUrl?.endsWith('.pdf') ? (
              <iframe src={identityDocBlob} className="w-full h-[600px] rounded-xl" title="PDF Document" />
            ) : (
              <img src={identityDocBlob} alt="Identity Document" className="max-w-full max-h-[70vh] rounded-xl shadow-2xl" />
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIdentityModalOpen(false)}>{t('common.close')}</Button>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
