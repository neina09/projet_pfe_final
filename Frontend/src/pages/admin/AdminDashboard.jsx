import { useEffect, useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Eye,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserSquare2,
  Users,
  User,
  Search,
  XCircle,
  ChevronDown,
  LogOut,
} from 'lucide-react'
import { adminApi } from '../../api/admin'
import { authApi } from '../../api/auth'
import { workersApi } from '../../api/workers'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input, { Select } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import { endpoint } from '../../api/endpoints'
import AdminCharts from '../../components/Admincharts'

const taskStatusVariant = {
  PENDING_REVIEW: 'yellow',
  OPEN: 'blue',
  IN_PROGRESS: 'primary',
  COMPLETED: 'green',
  CLOSED: 'gray',
  CANCELLED: 'red',
}

// Status labels are handled via t() in the component

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
  salary: '',
  nationalIdNumber: '',
  bio: '',
}

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

function resolveAsset(url) {
  if (!url) return ''
  return url.startsWith('http') ? url : endpoint(url)
}

function FileUploadField({ label, hint, file, onChange, accept }) {
  const { t } = useTranslation()
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4 transition-colors hover:border-primary-400 hover:bg-primary-50/60 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-primary-500 dark:hover:bg-primary-900/10">
      <div className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
      <p className="mb-3 text-xs leading-6 text-gray-500 dark:text-gray-400">{hint}</p>
      <div className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 dark:bg-gray-950/60 dark:text-gray-300">
        {file?.name || t('common.select')}
      </div>
      <input 
        type="file" 
        accept={accept} 
        capture="environment"
        className="hidden" 
        onChange={(event) => onChange(event.target.files?.[0] || null)} 
      />
    </label>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { user, refreshProfile, logout } = useAuth()
  
  const formatJob = (job) => {
    if (!job) return '-'
    const trimmedJob = String(job).trim()
    return t(`home.categories.${trimmedJob}`, { defaultValue: trimmedJob })
  }

  const [dashboard, setDashboard] = useState(null)
  const [workers, setWorkers] = useState([])
  const [users, setUsers] = useState([])
  const [adminTasks, setAdminTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [workerFilter, setWorkerFilter] = useState('ALL') // 'ALL' or 'PENDING'
  const [taskFilter, setTaskFilter] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState('')
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [adminProfileImagePreview, setAdminProfileImagePreview] = useState(null)
  const fileRef = useRef(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [workerFormOpen, setWorkerFormOpen] = useState(false)
  const [workerFormMode, setWorkerFormMode] = useState('create')
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm)
  const [workerFormError, setWorkerFormError] = useState('')
  const [workerImageFile, setWorkerImageFile] = useState(null)
  const [workerIdentityFront, setWorkerIdentityFront] = useState(null)
  const [workerIdentityBack, setWorkerIdentityBack] = useState(null)
  const [viewingIdentityDocument, setViewingIdentityDocument] = useState(false)
  const [identityPreviewUrl, setIdentityPreviewUrl] = useState(null)
  const [identityPreviewOpen, setIdentityPreviewOpen] = useState(false)
  const [adminProfileOpen, setAdminProfileOpen] = useState(false)
  const [adminPromotionOpen, setAdminPromotionOpen] = useState(false)
  const [adminCandidateId, setAdminCandidateId] = useState('')
  const [adminProfileImageFile, setAdminProfileImageFile] = useState(null)
  const [adminProfileError, setAdminProfileError] = useState('')
  const [adminProfileSaving, setAdminProfileSaving] = useState(false)
  const [promotingAdmin, setPromotingAdmin] = useState(false)
  const [activeSection, setActiveSection] = useState('DASHBOARD') // 'DASHBOARD' or 'WORKERS'
  const [searchQuery, setSearchQuery] = useState('')
  const [adminProfileForm, setAdminProfileForm] = useState({
    username: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const loadDashboard = async () => {
    const res = await adminApi.getDashboard()
    setDashboard(res.data)
  }

  const loadWorkers = async () => {
    const res = await adminApi.getAllWorkers()
    setWorkers(res.data || [])
  }

  const loadUsers = async () => {
    const res = await adminApi.getUsers()
    setUsers(res.data || [])
  }

  const reloadAll = async () => {
    await Promise.all([loadDashboard(), loadWorkers(), loadUsers(), loadTasks()])
  }

  const loadTasks = async () => {
    setLoadingTasks(true)
    try {
      // Try to get all tasks if specific pending endpoint fails
      const res = await adminApi.getAllTasks()
      const data = res.data?.content || res.data || []
      setAdminTasks(data)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setAdminTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'TASKS') {
      loadTasks()
    }
  }, [activeSection])

  useEffect(() => {
    reloadAll().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setAdminProfileForm({
      confirmPassword: '',
    })
    setAdminProfileImagePreview(user?.profilePictureUrl || null)
  }, [user?.name, user?.fullName, user?.phone, user?.profilePictureUrl])

  const workerUserIds = useMemo(() => new Set(workers.map(worker => worker.userId).filter(Boolean)), [workers])
  const availableUsers = useMemo(
    () => users.filter(user => user.role === 'USER' && !workerUserIds.has(user.id)),
    [users, workerUserIds]
  )
  const adminCandidates = useMemo(
    () => users.filter(user => user.role === 'USER' && !workerUserIds.has(user.id)),
    [users, workerUserIds]
  )
  const filteredWorkers = useMemo(() => {
    let result = workerFilter === 'ALL' ? workers : workers.filter((worker) => worker.verificationStatus === workerFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(w => 
        w.name?.toLowerCase().includes(q) || 
        w.phoneNumber?.toLowerCase().includes(q) || 
        w.job?.toLowerCase().includes(q) ||
        w.address?.toLowerCase().includes(q)
      )
    }
    return result
  }, [workers, workerFilter, searchQuery])

  const allFilteredTasks = useMemo(() => {
    // Priority: 1. adminTasks (full list), 2. dashboard.latestPendingTasks (summary list)
    const tasks = adminTasks.length > 0 ? adminTasks : (dashboard?.latestPendingTasks || [])
    
    // Admin only sees Pending tasks as per request
    return tasks.filter((task) => {
      const normalizedStatus = (task.status === 'PENDING_REVIEW' || task.status === 'PENDING') ? 'PENDING' : task.status
      return normalizedStatus === 'PENDING'
    })
  }, [adminTasks, dashboard?.latestPendingTasks])

  const setFormValue = (key) => (event) => {
    const value = event.target.value
    setWorkerForm((current) => ({ ...current, [key]: value }))
  }

  const resetWorkerForm = () => {
    setWorkerForm(emptyWorkerForm)
    setWorkerImageFile(null)
    setWorkerIdentityFront(null)
    setWorkerIdentityBack(null)
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

  const openTaskModal = (task) => {
    setSelectedTask(task)
    setTaskModalOpen(true)
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

    try {
      const res = await adminApi.getWorkerDetails(worker.id)
      const data = res.data
      setWorkerForm({
        userId: data.userId ? String(data.userId) : '',
        name: data.name || '',
        phoneNumber: data.phoneNumber || '',
        job: data.job || '',
        address: data.address || '',
        salary: String(data.salary ?? ''),
        nationalIdNumber: data.nationalIdNumber || '',
        bio: data.bio || '',
      })
      setSelectedWorker(data)
      setWorkerFormOpen(true)
    } catch (error) {
      setWorkerFormError(error.response?.data?.message || t('errors.workerDataLoadError'))
    }
  }

  const handleUserSelection = (event) => {
    const selectedId = event.target.value
    const selectedUser = users.find(user => String(user.id) === selectedId)

    setWorkerForm((current) => ({
      ...current,
      userId: selectedId,
      name: current.name || selectedUser?.username || '',
      phoneNumber: current.phoneNumber || selectedUser?.phone || '',
    }))
  }

  const handleWorkerAction = async (workerId, action) => {
    setActioning(`worker-${workerId}-${action}`)
    try {
      if (action === 'approve') {
        await adminApi.approveWorker(workerId)
      } else {
        await adminApi.rejectWorker(workerId)
      }
      setWorkerModalOpen(false)
      await reloadAll()
    } finally {
      setActioning('')
    }
  }

  const handleTaskAction = async (taskId, action) => {
    setActioning(`task-${taskId}-${action}`)
    try {
      if (action === 'approve') {
        await adminApi.approveTask(taskId)
      } else {
        await adminApi.rejectTask(taskId)
      }
      setTaskModalOpen(false)
      await reloadAll()
    } finally {
      setActioning('')
    }
  }

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm(t('common.confirm'))) return
    setActioning(`worker-${workerId}-delete`)
    try {
      await adminApi.deleteWorker(workerId)
      if (selectedWorker?.id === workerId) {
        setWorkerModalOpen(false)
      }
      await reloadAll()
    } catch (err) {
      console.error('Delete worker error:', err)
      alert(t('common.error'))
    } finally {
      setActioning('')
    }
  }
  
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(t('common.confirm'))) return
    setActioning(`task-${taskId}-delete`)
    try {
      await adminApi.deleteTask(taskId)
      if (selectedTask?.id === taskId) {
        setTaskModalOpen(false)
      }
      await reloadAll()
    } catch (err) {
      console.error('Delete task error:', err)
      alert(t('common.error'))
    } finally {
      setActioning('')
    }
  }

  const handleOpenIdentityDocument = async () => {
    if (!selectedWorker?.id) return
    setWorkerFormError('')
    setViewingIdentityDocument(true)

    try {
      const response = await workersApi.getIdentityDocument(selectedWorker.id)
      const blobUrl = window.URL.createObjectURL(response.data)
      setIdentityPreviewUrl(blobUrl)
      setIdentityPreviewOpen(true)
    } catch (error) {
      setWorkerFormError(error.response?.data?.message || t('errors.identityOpenError'))
    } finally {
      setViewingIdentityDocument(false)
    }
  }

  const mergeIdentityImages = async (frontFile, backFile) => {
    if (!frontFile && !backFile) return null
    if (!frontFile || !backFile) return frontFile || backFile

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const imgFront = new Image()
      const imgBack = new Image()

      let loaded = 0
      const onLoad = () => {
        loaded++
        if (loaded === 2) {
          const maxWidth = Math.max(imgFront.width, imgBack.width)
          const totalHeight = imgFront.height + imgBack.height + 40
          canvas.width = maxWidth
          canvas.height = totalHeight

          ctx.fillStyle = '#f8fafc'
          ctx.fillRect(0, 0, maxWidth, totalHeight)

          ctx.drawImage(imgFront, (maxWidth - imgFront.width) / 2, 0)
          ctx.drawImage(imgBack, (maxWidth - imgBack.width) / 2, imgFront.height + 40)

          canvas.toBlob((blob) => {
            resolve(new File([blob], 'identity_merged.jpg', { type: 'image/jpeg' }))
          }, 'image/jpeg', 0.9)
        }
      }

      imgFront.onload = onLoad
      imgBack.onload = onLoad
      imgFront.src = URL.createObjectURL(frontFile)
      imgBack.src = URL.createObjectURL(backFile)
    })
  }

  const handleWorkerSave = async (event) => {
    event.preventDefault()
    setWorkerFormError('')
    setActioning(`worker-form-${workerFormMode}`)

    try {
      const payload = {
        name: workerForm.name.trim(),
        phoneNumber: workerForm.phoneNumber.trim(),
        job: workerForm.job.trim(),
        address: workerForm.address.trim(),
        salary: Number(workerForm.salary || 0),
        nationalIdNumber: workerForm.nationalIdNumber.trim(),
        bio: workerForm.bio?.trim() || '',
      }

      let workerId = selectedWorker?.id

      if (workerFormMode === 'create') {
        if (!workerForm.userId) {
          throw new Error(t('errors.required'))
        }

        const created = await adminApi.createWorker(workerForm.userId, payload)
        workerId = created.data?.id
      } else {
        await adminApi.updateWorker(selectedWorker.id, payload)
      }

      if (workerImageFile && workerId) {
        await workersApi.uploadImage(workerId, workerImageFile)
      }

      const identityFile = await mergeIdentityImages(workerIdentityFront, workerIdentityBack)
      if (identityFile && workerId) {
        await workersApi.uploadIdentityDocument(workerId, identityFile)
      }

      setWorkerFormOpen(false)
      resetWorkerForm()
      await reloadAll()
    } catch (error) {
      setWorkerFormError(error.response?.data?.message || error.message || t('errors.serverError'))
    } finally {
      setActioning('')
    }
  }

  const handleAdminImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAdminProfileImageFile(file)
    setAdminProfileImagePreview(URL.createObjectURL(file))
  }

  const handleSaveAdminProfile = async (event) => {
    event.preventDefault()
    setAdminProfileError('')
    setAdminProfileSaving(true)

    try {
      await authApi.updateProfile({
        username: adminProfileForm.username,
        phone: adminProfileForm.phone,
      })

      if (adminProfileImageFile) {
        await authApi.uploadImage(adminProfileImageFile)
      }

      if (adminProfileForm.currentPassword || adminProfileForm.newPassword || adminProfileForm.confirmPassword) {
        if (!adminProfileForm.currentPassword || !adminProfileForm.newPassword) {
          throw new Error(t('errors.required'))
        }
        if (adminProfileForm.newPassword !== adminProfileForm.confirmPassword) {
          throw new Error(t('errors.passwordMismatch'))
        }

        await authApi.changePassword({
          currentPassword: adminProfileForm.currentPassword,
          newPassword: adminProfileForm.newPassword,
        })
      }

      await refreshProfile()
      setAdminProfileImageFile(null)
      setAdminProfileImagePreview(null)
      setShowPassword(false)
      setAdminProfileOpen(false)
    } catch (error) {
      setAdminProfileError(error.response?.data?.message || error.message || t('errors.serverError'))
    } finally {
      setAdminProfileSaving(false)
    }
  }

  const handlePromoteToAdmin = async (event) => {
    event.preventDefault()
    if (!adminCandidateId) {
      setAdminProfileError(t('errors.required'))
      return
    }

    setAdminProfileError('')
    setPromotingAdmin(true)
    try {
      await adminApi.promoteToAdmin(adminCandidateId)
      setAdminPromotionOpen(false)
      setAdminCandidateId('')
      await reloadAll()
    } catch (error) {
      setAdminProfileError(error.response?.data?.message || error.message || t('errors.serverError'))
    } finally {
      setPromotingAdmin(false)
    }
  }

  if (loading) {
    return <Layout><PageLoader /></Layout>
  }

  const cards = [
    { icon: Users, label: t('admin.stats.users'), value: dashboard?.totalUsers ?? 0, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { icon: ShieldCheck, label: t('admin.stats.workers'), value: dashboard?.verifiedWorkers ?? 0, color: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' },
    { icon: Briefcase, label: t('admin.stats.tasks'), value: dashboard?.pendingTasks ?? 0, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { icon: CalendarCheck, label: t('admin.stats.bookings'), value: dashboard?.completedBookings ?? 0, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  ]

  const workerImage = resolveAsset(selectedWorker?.imageUrl)
  const workerIdentityDocument = resolveAsset(selectedWorker?.identityDocumentUrl)
  const taskLatitude = selectedTask?.latitude
  const taskLongitude = selectedTask?.longitude
  const hasTaskCoordinates = Number.isFinite(Number(taskLatitude)) && Number.isFinite(Number(taskLongitude))
  const formattedCoordinates = hasTaskCoordinates
    ? `${Number(taskLatitude).toFixed(6)}, ${Number(taskLongitude).toFixed(6)}`
    : ''
  const taskMapEmbedUrl = hasTaskCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(taskLongitude) - 0.01}%2C${Number(taskLatitude) - 0.01}%2C${Number(taskLongitude) + 0.01}%2C${Number(taskLatitude) + 0.01}&layer=mapnik&marker=${Number(taskLatitude)}%2C${Number(taskLongitude)}`
    : ''
  const taskMapOpenUrl = hasTaskCoordinates
    ? `https://www.openstreetmap.org/?mlat=${Number(taskLatitude)}&mlon=${Number(taskLongitude)}#map=15/${Number(taskLatitude)}/${Number(taskLongitude)}`
    : ''

  return (
    <Layout>
      <div className="page-container py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="section-title">{t('admin.title')}</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeSection === 'WORKERS' ? 'primary' : 'secondary'}
              onClick={() => setActiveSection('WORKERS')}
            >
              {t('admin.manageWorkers')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAdminProfileError('')
                setAdminProfileOpen(true)
              }}
            >
              {t('admin.adminProfile')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveSection('DASHBOARD')
                setAdminProfileError('')
                setAdminPromotionOpen(true)
              }}
            >
              {t('admin.addAdmin')}
            </Button>
          </div>
        </motion.div>

        {activeSection === 'DASHBOARD' ? (
          <>

            {/* ======= ANALYTICS CHARTS ======= */}
            <div className="mb-8">
              <AdminCharts dashboard={dashboard} />
            </div>
            
            <div className="flex justify-center mt-10 gap-3">
               <Button variant="outline" onClick={() => setActiveSection('WORKERS')}>
                  {t('admin.manageWorkers')}
               </Button>
               <Button variant="outline" onClick={() => setActiveSection('TASKS')}>
                  {t('admin.tasks')}
               </Button>
            </div>
          </>
        ) : activeSection === 'WORKERS' ? (
          <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="card overflow-hidden">
            <div className="bg-gray-50/50 p-6 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveSection('DASHBOARD')} 
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                     <ChevronDown className="-rotate-90" size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.manageWorkers')}</h2>
                    <p className="text-sm text-gray-500">{t('admin.workerTable.pendingHint')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={startCreateWorker} size="sm" className="shadow-lg shadow-primary-500/20">
                    <Plus size={16} /> {t('worker.add')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setWorkerFilter(filter)}
                      className={`px-4 py-2 text-sm font-medium transition-all relative whitespace-nowrap ${
                        workerFilter === filter
                          ? 'text-primary-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t(`workerStatusLabel.${filter}`)}
                      {workerFilter === filter && (
                        <motion.div layoutId="workerTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="relative w-full sm:max-w-xs">
                  <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('admin.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 ps-9 text-xs focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900/40"
                  />
                </div>
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/60">
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t('admin.workerTable.worker')}</th>
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t('admin.workerTable.job')}</th>
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t('admin.workerTable.phone')}</th>
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t('admin.workerTable.address')}</th>
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t('admin.workerTable.salary')}</th>
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">{t('admin.workerTable.status')}</th>
                    <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-center">{t('admin.workerTable.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-10 text-center text-gray-400">
                        {t('admin.noData')}
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker) => (
                      <tr
                        key={worker.id}
                        className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {resolveAsset(worker.imageUrl) ? (
                              <img
                                src={resolveAsset(worker.imageUrl)}
                                alt={worker.name}
                                className="h-10 w-10 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                                {(worker.name || '?').slice(0, 1)}
                              </div>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {worker.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatJob(worker.job)}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {worker.phoneNumber || worker.userPhone || '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">
                          {worker.address || '-'}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {worker.salary || 0} <span className="text-[10px] text-gray-400 font-normal">MRU</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={workerStatusVariant[worker.verificationStatus] || 'gray'}>
                            {t(`workerStatusLabel.${worker.verificationStatus}`) || worker.verificationStatus}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openWorkerModal(worker)}
                              className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                              title={t('common.view')}
                            >
                              <Eye size={18} />
                            </button>
                            
                            {worker.verificationStatus !== 'PENDING' && worker.verificationStatus !== 'REJECTED' && (
                              <button
                                onClick={() => startEditWorker(worker)}
                                className="rounded-lg p-2 text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                                title={t('common.edit')}
                              >
                                <Pencil size={18} />
                              </button>
                            )}

                            {worker.verificationStatus !== 'PENDING' && (
                              <button
                                onClick={() => handleDeleteWorker(worker.id)}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                title={t('common.delete')}
                                disabled={actioning === `worker-${worker.id}-delete`}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden grid grid-cols-1 gap-4 p-4">
              {filteredWorkers.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  {t('admin.noData')}
                </div>
              ) : (
                filteredWorkers.map((worker) => (
                  <div key={worker.id} className="card p-4 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {resolveAsset(worker.imageUrl) ? (
                          <img
                            src={resolveAsset(worker.imageUrl)}
                            alt={worker.name}
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                            {(worker.name || '?').slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{worker.name}</p>
                          <p className="text-xs text-gray-500">{formatJob(worker.job)}</p>
                        </div>
                      </div>
                      <Badge variant={workerStatusVariant[worker.verificationStatus] || 'gray'}>
                        {t(`workerStatusLabel.${worker.verificationStatus}`) || worker.verificationStatus}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.workerTable.phone')}</span>
                        <span className="text-gray-900 dark:text-white" dir="ltr">{worker.phoneNumber || worker.userPhone || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.workerTable.address')}</span>
                        <span className="text-gray-900 dark:text-white truncate max-w-[150px]">{worker.address || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('admin.workerTable.salary')}</span>
                        <span className="font-bold text-primary-600">{worker.salary || 0} MRU</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                      <button
                        onClick={() => openWorkerModal(worker)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-medium"
                      >
                        <Eye size={14} /> {t('common.view')}
                      </button>
                      {worker.verificationStatus !== 'PENDING' && worker.verificationStatus !== 'REJECTED' && (
                        <button
                          onClick={() => startEditWorker(worker)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 text-xs font-medium"
                        >
                          <Pencil size={14} /> {t('common.edit')}
                        </button>
                      )}
                      {worker.verificationStatus !== 'PENDING' && (
                        <button
                          onClick={() => handleDeleteWorker(worker.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-xs font-medium"
                          disabled={actioning === `worker-${worker.id}-delete`}
                        >
                          <Trash2 size={14} /> {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} className="card overflow-hidden">
            <div className="bg-gray-50/50 p-6 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveSection('DASHBOARD')} 
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                     <ChevronDown className="-rotate-90" size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.tasks')}</h2>
                    <p className="text-sm text-gray-500">{t('tasks.subtitle')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Task filter removed as per admin request - only pending tasks shown */}

              {loadingTasks ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">{t('common.loading')}</p>
                </div>
              ) : allFilteredTasks.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t('admin.noData')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allFilteredTasks.map((task) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={task.id}
                      className="card p-5 group hover:border-primary-200 dark:hover:border-primary-900/50 transition-all border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant={taskStatusVariant[task.status] || 'gray'}>
                          {task.status === 'PENDING_REVIEW' ? t('tasks.status.PENDING') : t(`tasks.status.${task.status}`)}
                        </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openTaskModal(task)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{task.title}</h3>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User size={14} className="text-gray-400" />
                          <span className="truncate">{task.userName || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Briefcase size={14} className="text-gray-400" />
                          <span className="truncate">{formatJob(task.profession)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="truncate line-clamp-1">{task.address || '-'}</span>
                        </div>
                      </div>

                      {(task.status === 'PENDING' || task.status === 'PENDING_REVIEW') && (
                        <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                          <button
                            onClick={() => handleTaskAction(task.id, 'approve')}
                            className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            {t('admin.approve')}
                          </button>
                          <button
                            onClick={() => handleTaskAction(task.id, 'reject')}
                            className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <XCircle size={12} />
                            {t('admin.reject')}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Modal open={workerModalOpen} onClose={() => setWorkerModalOpen(false)} title={t('worker.profile.viewProfile')} size="lg">
        {selectedWorker && (
          <div className="grid gap-6 md:grid-cols-[220px,1fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-100 p-4 text-center dark:border-gray-800">
                {workerImage ? (
                  <img src={workerImage} alt={selectedWorker.name} className="mx-auto mb-3 h-28 w-28 rounded-full object-cover" />
                ) : (
                  <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-full bg-primary-100 text-3xl font-bold text-primary-600">
                    {(selectedWorker.name || '?').slice(0, 1)}
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedWorker.name}</h3>
                <p className="text-sm text-gray-500">{formatJob(selectedWorker.job)}</p>
              </div>
              {false && null}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('worker.user')}</p>
                  <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white"><UserSquare2 size={14} /> {selectedWorker.username || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('admin.workerTable.status')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{t(`workerStatusLabel.${selectedWorker.verificationStatus}`) || selectedWorker.verificationStatus || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('worker.phone')}</p>
                  <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white"><Phone size={14} /> {selectedWorker.phoneNumber || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('auth.login.phone')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedWorker.userPhone || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('worker.address')}</p>
                  <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white"><MapPin size={14} /> {selectedWorker.address || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('worker.dailySalary')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedWorker.salary || 0} MRU</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('worker.nationalId')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedWorker.nationalIdNumber || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('worker.user')} ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedWorker.userId || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-1 text-xs text-gray-500">{t('workerDashboard.availability')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedWorker.availability === 'AVAILABLE' ? t('workerDashboard.available') : t('workerDashboard.busy')}</p>
                </div>
              </div>

              {selectedWorker.bio && (
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <p className="mb-2 text-xs text-gray-500">{t('becomeWorker.form.bio')}</p>
                  <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">{selectedWorker.bio}</p>
                </div>
              )}

              {workerIdentityDocument && (
                <button
                  type="button"
                  onClick={handleOpenIdentityDocument}
                  disabled={viewingIdentityDocument}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  <Eye size={15} />
                  {viewingIdentityDocument && <span>{t('common.loading')}</span>}
                  {t('admin.workerTable.viewIdentity')}
                </button>
              )}

              {selectedWorker.verificationNotes && (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  {selectedWorker.verificationNotes}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button className="flex-1" loading={actioning === `worker-${selectedWorker.id}-approve`} onClick={() => handleWorkerAction(selectedWorker.id, 'approve')}>
                  <CheckCircle2 size={16} />
                  {t('admin.approve')}
                </Button>
                <Button variant="secondary" className="flex-1" loading={actioning === `worker-${selectedWorker.id}-reject`} onClick={() => handleWorkerAction(selectedWorker.id, 'reject')}>
                  <XCircle size={16} />
                  {t('admin.reject')}
                </Button>
                {selectedWorker.verificationStatus !== 'PENDING' && selectedWorker.verificationStatus !== 'REJECTED' && (
                  <Button variant="secondary" className="flex-1" onClick={() => startEditWorker(selectedWorker)}>
                    <Pencil size={16} />
                    {t('common.edit')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={t('admin.tasks')} size="lg">
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedTask.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{selectedTask.userName || t('worker.user')}</p>
              </div>
              <Badge variant={taskStatusVariant[selectedTask.status] || 'gray'}>
                {t(`tasks.status.${selectedTask.status}`) || selectedTask.status}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                <p className="mb-1 text-xs text-gray-500">{t('tasks.form.profession')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatJob(selectedTask.profession)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                <p className="mb-1 text-xs text-gray-500">{t('tasks.form.location')}</p>
                <p className="font-medium leading-7 text-gray-900 dark:text-white">{selectedTask.address || t('common.noData')}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
              <p className="mb-2 text-xs text-gray-500">{t('tasks.form.description')}</p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">{selectedTask.description || '-'}</p>
            </div>

            {hasTaskCoordinates && (
              <div className="space-y-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs text-gray-500">{t('tasks.form.location')}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formattedCoordinates}</p>
                  </div>
                  <a
                    href={taskMapOpenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:border-gray-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
                  >
                    <Navigation size={15} />
                    {t('common.viewMore')}
                  </a>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                  <iframe
                    title="admin-task-location"
                    src={taskMapEmbedUrl}
                    className="h-64 w-full"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" loading={actioning === `task-${selectedTask.id}-approve`} onClick={() => handleTaskAction(selectedTask.id, 'approve')}>
                <CheckCircle2 size={16} />
                {t('admin.approve')}
              </Button>
              <Button variant="secondary" className="flex-1" loading={actioning === `task-${selectedTask.id}-reject`} onClick={() => handleTaskAction(selectedTask.id, 'reject')}>
                <XCircle size={16} />
                {t('admin.reject')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={workerFormOpen}
        onClose={() => {
          setWorkerFormOpen(false)
          resetWorkerForm()
        }}
        title={workerFormMode === 'create' ? t('worker.add') : t('worker.edit')}
        size="lg"
      >
        <form onSubmit={handleWorkerSave} className="space-y-4">
          {workerFormMode === 'create' && (
            <Select label={t('worker.user')} value={workerForm.userId} onChange={handleUserSelection} required>
              <option value="">{t('common.select')}</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} - {user.phone}
                </option>
              ))}
            </Select>
          )}

          {workerFormMode === 'create' && availableUsers.length === 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {t('worker.noUsers')}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('worker.name')} value={workerForm.name} onChange={setFormValue('name')} required />
            <Input label={t('worker.phone')} value={workerForm.phoneNumber} onChange={setFormValue('phoneNumber')} required />
            <Select label={t('worker.job')} value={workerForm.job} onChange={setFormValue('job')} required>
              <option value="">{t('worker.selectProfession')}</option>
              {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{t(p.labelKey)}</option>)}
            </Select>
            <Input label={t('worker.address')} value={workerForm.address} onChange={setFormValue('address')} required />
            <Input label={t('worker.dailySalary')} type="number" value={workerForm.salary} onChange={setFormValue('salary')} required />
            <Input label={t('worker.nationalId')} value={workerForm.nationalIdNumber} onChange={setFormValue('nationalIdNumber')} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('becomeWorker.form.bio')}
            </label>
            <textarea
              value={workerForm.bio}
              onChange={setFormValue('bio')}
              placeholder={t('becomeWorker.form.bioPlaceholder')}
              rows={3}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-4 text-sm transition-all focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900/40"
            />
          </div>

          <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm leading-7 text-primary-800 dark:border-primary-900/40 dark:bg-primary-900/10 dark:text-primary-200">
            {t('worker.identityInfo')}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploadField
              label={t('worker.photo')}
              hint={t('common.optional')}
              file={workerImageFile}
              onChange={setWorkerImageFile}
              accept="image/*"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FileUploadField
                label={t('worker.identityFront')}
                hint={t('worker.frontSide')}
                file={workerIdentityFront}
                onChange={setWorkerIdentityFront}
                accept="image/*"
              />
              <FileUploadField
                label={t('worker.identityBack')}
                hint={t('worker.backSide')}
                file={workerIdentityBack}
                onChange={setWorkerIdentityBack}
                accept="image/*"
              />
            </div>
          </div>

          {workerFormError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {workerFormError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1"
              loading={actioning === `worker-form-${workerFormMode}`}
              disabled={workerFormMode === 'create' && availableUsers.length === 0}
            >
              {workerFormMode === 'create' ? t('common.confirm') : t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setWorkerFormOpen(false)
                resetWorkerForm()
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={adminProfileOpen} onClose={() => { setAdminProfileOpen(false); setShowPassword(false); setAdminProfileImageFile(null); setAdminProfileImagePreview(null) }} title="">
        <form onSubmit={handleSaveAdminProfile} className="flex flex-col gap-4 -mt-4">
          <div className="flex flex-col items-center gap-3 pt-6 pb-5 px-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 rounded-t-2xl">
            <div className="relative">
              <div 
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-semibold text-primary-700 dark:text-primary-300 cursor-pointer overflow-hidden border-[3px] border-white dark:border-gray-900 shadow-md"
              >
                {adminProfileImagePreview 
                  ? <img src={adminProfileImagePreview} alt="preview" className="w-full h-full object-cover" />
                  : (user?.profilePictureUrl 
                      ? <img src={user.profilePictureUrl} alt="profile" className="w-full h-full object-cover" />
                      : <span>{(adminProfileForm.username || user?.name || '؟').slice(0, 1).toUpperCase()}</span>)
                }
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 transition-colors shadow"
              >
                <Pencil size={12} color="white" />
              </button>
            </div>
            <input 
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAdminImageChange}
            />
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white text-base">{adminProfileForm.username || user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('admin.adminProfile')}</p>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <Input label={t('profile.name')} value={adminProfileForm.username} onChange={(event) => setAdminProfileForm((current) => ({ ...current, username: event.target.value }))} />
            <Input label={t('auth.login.phone')} type="tel" value={adminProfileForm.phone} onChange={(event) => setAdminProfileForm((current) => ({ ...current, phone: event.target.value }))} />
            
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    🔒
                  </span>
                  {t('auth.resetPassword.title')}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform duration-200 ${showPassword ? 'rotate-180' : ''}`}
                />
              </button>

              {showPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-3 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('auth.login.password')}</label>
                    <input
                      type="password"
                      value={adminProfileForm.currentPassword}
                      onChange={e => setAdminProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('auth.resetPassword.newPassword')}</label>
                    <input
                      type="password"
                      value={adminProfileForm.newPassword}
                      onChange={e => setAdminProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('auth.resetPassword.confirmPassword')}</label>
                    <input
                      type="password"
                      value={adminProfileForm.confirmPassword}
                      onChange={e => setAdminProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                      dir="ltr"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {adminProfileError && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {adminProfileError}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setAdminProfileOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={adminProfileSaving} className="flex-[2]">{t('common.save')}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={adminPromotionOpen} onClose={() => setAdminPromotionOpen(false)} title={t('admin.addAdmin')} size="md">
        <form onSubmit={handlePromoteToAdmin} className="space-y-4">
          <Select label={t('worker.user')} value={adminCandidateId} onChange={(event) => setAdminCandidateId(event.target.value)} required>
            <option value="">{t('common.select')}</option>
            {adminCandidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.username} - {candidate.phone}
              </option>
            ))}
          </Select>
          {adminCandidates.length === 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {t('admin.noCandidates')}
            </div>
          )}
          {adminProfileError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {adminProfileError}
            </div>
          )}
          <Button type="submit" loading={promotingAdmin} disabled={adminCandidates.length === 0} className="w-full">{t('admin.addAdmin')}</Button>
        </form>
      </Modal>
      <Modal open={identityPreviewOpen} onClose={() => setIdentityPreviewOpen(false)} title={t('admin.workerTable.viewIdentity')} size="lg">
        <div className="flex flex-col items-center gap-4">
          {identityPreviewUrl && (
            <img src={identityPreviewUrl} alt="Identity Document" className="w-full rounded-2xl border border-gray-100 shadow-sm dark:border-gray-800" />
          )}
          <Button variant="secondary" onClick={() => setIdentityPreviewOpen(false)}>{t('common.close')}</Button>
        </div>
      </Modal>

    </Layout>
  )
}
