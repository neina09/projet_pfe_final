import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Briefcase, CalendarCheck, Plus, User, Clock, CheckCircle2, Star, ChevronDown, Pencil, Trash2, XCircle } from 'lucide-react'
import { tasksApi } from '../../api/tasks'
import { bookingsApi } from '../../api/bookings'
import { authApi } from '../../api/auth'
import { ratingsApi } from '../../api/ratings'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import StarRating from '../../components/ui/StarRating'
import { normalizeBooking, normalizeTask } from '../../lib/normalizers'
import { validateFullName, validatePhone, validatePassword } from '../../lib/validators'
import { endpoint } from '../../api/endpoints'
import TasksList from '../../components/dashboard/TasksList'
import BookingsList from '../../components/dashboard/BookingsList'

const statusVariant = {
  PENDING: 'yellow',
  OPEN: 'blue',
  IN_PROGRESS: 'primary',
  PENDING_REVIEW: 'primary',
  COMPLETED: 'green',
  CANCELLED: 'red',
  ACCEPTED: 'green',
  REJECTED: 'red',
}

const taskStatusOrder = {
  IN_PROGRESS: 0,
  PENDING_REVIEW: 0,
  COMPLETED: 1,
  CANCELLED: 2,
  PENDING: 3,
  OPEN: 4,
}

function sortTasksByStatus(items = []) {
  return [...items].sort((a, b) => {
    // Newest first is the primary requirement
    const dateA = new Date(a.createdAt || 0).getTime()
    const dateB = new Date(b.createdAt || 0).getTime()
    if (dateB !== dateA) return dateB - dateA
    
    // Fallback to status order
    return (taskStatusOrder[a.status] ?? 99) - (taskStatusOrder[b.status] ?? 99)
  })
}

export default function UserDashboard() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const location = useLocation()
  const fileRef = useRef(null)

  const [tab, setTab] = useState(location.state?.tab || 'tasks')
  const [taskFilter, setTaskFilter] = useState(location.state?.filter || 'ALL')
  const [bookingFilter, setBookingFilter] = useState('ALL')

  const [tasks, setTasks] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [hiddenTaskIds, setHiddenTaskIds] = useState(() => JSON.parse(localStorage.getItem('hidden_tasks') || '[]'))
  const [hiddenBookingIds, setHiddenBookingIds] = useState(() => JSON.parse(localStorage.getItem('hidden_bookings') || '[]'))

  const [profileOpen, setProfileOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const [profileForm, setProfileForm] = useState({
    username: user?.name || user?.fullName || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileError, setProfileError] = useState('')
  const [profileErrors, setProfileErrors] = useState({
    username: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [saving, setSaving] = useState(false)
  const [taskEditOpen, setTaskEditOpen] = useState(false)
  const [taskEditSubmitting, setTaskEditSubmitting] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', profession: '', address: '' })

  const [cancelling, setCancelling] = useState(null)
  const [deletingBooking, setDeletingBooking] = useState(null)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState(null)
  const [ratingForm, setRatingForm] = useState({ stars: 5, comment: '' })
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [viewingBooking, setViewingBooking] = useState(null)
  const [editingBooking, setEditingBooking] = useState(null)
  const [editBookingForm, setEditBookingForm] = useState({ date: '', address: '', locationDetails: '', description: '', clientPhone: '' })
  const [editBookingSubmitting, setEditBookingSubmitting] = useState(false)
  const [editBookingError, setEditBookingError] = useState('')
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [user?.profilePictureUrl])

  const name = user?.name || user?.fullName || ''
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    Promise.all([
      tasksApi.getMy()
        .then(r => {
          const raw = r.data?.content || r.data || []
          const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          setTasks(sorted.map(normalizeTask))
        })
        .catch(() => {}),
      bookingsApi.getMy()
        .then(r => {
          const raw = r.data?.content || r.data || []
          const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          setBookings(sorted.map(normalizeBooking))
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // React to navigation state changes (e.g. from a notification click)
  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab)
    }
  }, [location.state?.tab])


  useEffect(() => {
    setProfileForm({
      username: user?.name || user?.fullName || '',
      phone: user?.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }, [user?.name, user?.fullName, user?.phone])

  const handleCancelBooking = async (id) => {
    setCancelling(id)
    try {
      await bookingsApi.cancel(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b))
    } catch {}
    setCancelling(null)
  }

  const handleUpdateBooking = async (e) => {
    e.preventDefault()
    if (!editingBooking) return
    
    setEditBookingSubmitting(true)
    setEditBookingError('')
    try {
      const res = await bookingsApi.update(editingBooking.id, {
        description: editBookingForm.description,
        address: editBookingForm.address,
        locationDetails: editBookingForm.locationDetails,
        bookingDate: editBookingForm.date,
        clientPhone: editBookingForm.clientPhone,
      })
      const updated = normalizeBooking(res.data)
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
      setEditingBooking(null)
    } catch (err) {
      console.error('Update booking error:', err.response?.status, err.response?.data)
      const data = err.response?.data
      const msg = data?.message || data?.error || (typeof data === 'string' ? data : '') || t('common.error')
      setEditBookingError(msg)
    } finally {
      setEditBookingSubmitting(false)
    }
  }

  const openEditBooking = (b) => {
    setEditingBooking(b)
    setEditBookingForm({
      date: b.date ? new Date(b.date).toISOString().slice(0, 16) : '',
      address: b.address || '',
      locationDetails: b.locationDetails || '',
      description: b.description || '',
      clientPhone: b.clientPhone || user?.phone || '',
    })
    setViewingBooking(null)
  }

  const handleDeleteBooking = async (id) => {
    if (!window.confirm(t('common.confirm'))) return
    setDeletingBooking(id)
    try {
      await bookingsApi.delete(id)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      const idStr = String(id)
      setHiddenBookingIds(prev => {
        const next = [...new Set([...prev.map(String), idStr])]
        localStorage.setItem('hidden_bookings', JSON.stringify(next))
        return next
      })
      setBookings(prev => prev.filter(b => String(b.id) !== idStr))
      setDeletingBooking(null)
    }
  }

  const handleCompleteTask = async (id) => {
    setCancelling(`task-${id}`)
    try {
      await tasksApi.markDone(id)
      setTasks(prev => prev.map(task => task.id === id ? { ...task, status: 'COMPLETED' } : task))
      setTaskFilter('COMPLETED')
      
      const taskToRate = tasks.find(t => String(t.id) === String(id))
      if (taskToRate) {
        openRatingModal({ 
          type: 'task', 
          id: taskToRate.id, 
          name: taskToRate.assignedWorkerName || taskToRate.title 
        })
      }
    } catch {}
    setCancelling(null)
  }

  const handleCancelTask = async (id) => {
    setCancelling(`cancel-task-${id}`)
    try {
      await tasksApi.cancel(id)
      setTasks(prev => prev.map(task => task.id === id ? { ...task, status: 'CANCELLED' } : task))
    } catch {}
    setCancelling(null)
  }

  const handleDeleteTask = async (id) => {
    if (!window.confirm(t('common.confirm'))) return
    setCancelling(`delete-task-${id}`)
    try {
      await tasksApi.delete(id)
    } catch (err) {
      console.error('Delete task error:', err)
    } finally {
      const idStr = String(id)
      setHiddenTaskIds(prev => {
        const next = [...new Set([...prev.map(String), idStr])]
        localStorage.setItem('hidden_tasks', JSON.stringify(next))
        return next
      })
      setTasks(prev => prev.filter(task => String(task.id) !== idStr))
      setCancelling(null)
    }
  }

  const openTaskEditModal = (task) => {
    setSelectedTask(task)
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      profession: task.profession || '',
      address: task.address || '',
    })
    setTaskEditOpen(true)
  }

  const handleUpdateTask = async (e) => {
    e.preventDefault()
    if (!selectedTask) return
    setTaskEditSubmitting(true)
    try {
      const response = await tasksApi.update(selectedTask.id, taskForm)
      const updatedTask = normalizeTask(response.data)
      setTasks(prev => prev.map(task => task.id === selectedTask.id ? updatedTask : task))
      setTaskEditOpen(false)
      setSelectedTask(null)
    } catch {}
    setTaskEditSubmitting(false)
  }

  const openRatingModal = (target) => {
    setRatingTarget(target)
    setRatingForm({ stars: 5, comment: '' })
    setRatingOpen(true)
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    if (!ratingTarget) return
    setRatingSubmitting(true)
    try {
      if (ratingTarget.type === 'booking') {
        await ratingsApi.rateBooking(ratingTarget.id, ratingForm)
        setBookings(prev => prev.map(item => item.id === ratingTarget.id ? { ...item, isRated: true } : item))
      } else {
        await ratingsApi.rateTask(ratingTarget.id, ratingForm)
        setTasks(prev => prev.map(item => item.id === ratingTarget.id ? { ...item, isRated: true } : item))
      }
      setRatingOpen(false)
    } catch {}
    setRatingSubmitting(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileErrors({ username: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' })
    
    let isValid = true
    const newProfileErrors = { username: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' }

    if (!profileForm.username.trim()) {
      newProfileErrors.username = t('errors.required')
      isValid = false
    } else if (!validateFullName(profileForm.username)) {
      newProfileErrors.username = t('errors.alphanumeric')
      isValid = false
    }

    if (!profileForm.phone.trim()) {
      newProfileErrors.phone = t('errors.required')
      isValid = false
    } else if (!validatePhone(profileForm.phone)) {
      newProfileErrors.phone = t('errors.numericOnly')
      isValid = false
    }

    if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword) {
        newProfileErrors.currentPassword = t('errors.required')
        isValid = false
      }
      if (!profileForm.newPassword) {
        newProfileErrors.newPassword = t('errors.required')
        isValid = false
      } else {
        const passVal = validatePassword(profileForm.newPassword)
        if (!passVal.isLongEnough) {
          newProfileErrors.newPassword = t('errors.minPassword8')
          isValid = false
        } else if (!passVal.hasLetter || !passVal.hasNumber) {
          newProfileErrors.newPassword = t('errors.passwordComplexity')
          isValid = false
        }
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        newProfileErrors.confirmPassword = t('errors.passwordMismatch')
        isValid = false
      }
    }

    if (!isValid) {
      setProfileErrors(newProfileErrors)
      return
    }

    setSaving(true)
    try {
      await authApi.updateProfile({
        username: profileForm.username,
        phone: profileForm.phone,
      })

      if (profileImageFile) {
        await authApi.uploadImage(profileImageFile)
      }

      if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
        await authApi.changePassword({
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
        })
      }

      await refreshProfile()
      setProfileImageFile(null)
      setProfileImagePreview(null)
      setShowPassword(false)
      setProfileOpen(false)
    } catch (error) {
      const rawMsg = error.response?.data?.message || ''
      let msg = rawMsg || t('errors.serverError')

      // Check if it's a validation error with a field prefix (e.g. "phone: Phone must be...")
      const fieldMatch = typeof rawMsg === 'string' ? rawMsg.match(/^([a-zA-Z0-9_]+):\s*(.+)$/) : null

      const newErrors = { username: '', phone: '', currentPassword: '', newPassword: '', confirmPassword: '' }
      let isFieldSpecific = false

      if (fieldMatch) {
        const fieldName = fieldMatch[1].toLowerCase()
        const fieldMsg = fieldMatch[2].toLowerCase()

        if (fieldName === 'phone' || fieldName === 'phonenumber') {
          if (fieldMsg.includes('already') || fieldMsg.includes('use')) {
            newErrors.phone = t('errors.phoneAlreadyInUse')
          } else {
            newErrors.phone = t('errors.invalidMauritanianPhone')
          }
          isFieldSpecific = true
        } else if (fieldName === 'username' || fieldName === 'name') {
          if (fieldMsg.includes('already') || fieldMsg.includes('use') || fieldMsg.includes('conflict')) {
            newErrors.username = t('errors.conflict')
          } else {
            newErrors.username = t('errors.alphanumeric')
          }
          isFieldSpecific = true
        } else if (fieldName === 'currentpassword') {
          newErrors.currentPassword = t('errors.incorrectPassword')
          isFieldSpecific = true
        } else if (fieldName === 'newpassword') {
          newErrors.newPassword = t('errors.passwordComplexity')
          isFieldSpecific = true
        } else {
          msg = fieldMatch[2]
        }
      } else {
        // Business exceptions or non-validation errors
        const lowerMsg = msg.toLowerCase()
        if (lowerMsg.includes('already') && (lowerMsg.includes('phone') || lowerMsg.includes('téléphone'))) {
          newErrors.phone = t('errors.phoneAlreadyInUse')
          isFieldSpecific = true
        } else if (lowerMsg.includes('mauritanian') && (lowerMsg.includes('phone') || lowerMsg.includes('téléphone'))) {
          newErrors.phone = t('errors.invalidMauritanianPhone')
          isFieldSpecific = true
        } else if (lowerMsg.includes('already') && (lowerMsg.includes('username') || lowerMsg.includes('name'))) {
          newErrors.username = t('errors.conflict')
          isFieldSpecific = true
        } else if (lowerMsg.includes('current password') || lowerMsg.includes('incorrect password')) {
          newErrors.currentPassword = t('errors.incorrectPassword')
          isFieldSpecific = true
        } else if (lowerMsg.includes('password')) {
          newErrors.newPassword = t('errors.passwordComplexity')
          isFieldSpecific = true
        }
      }

      if (isFieldSpecific) {
        setProfileErrors(newErrors)
        msg = ''
      }
      
      setProfileError(msg)
    }
    setSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('profile.confirmDeleteAccount'))) return
    setSaving(true)
    try {
      await authApi.deleteAccount()
      window.location.href = '/'
    } catch (error) {
      setProfileError(error.response?.data?.message || error.message || t('errors.serverError'))
      setSaving(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProfileImageFile(file)
    setProfileImagePreview(URL.createObjectURL(file))
  }

  const stats = [
    { icon: Briefcase, label: t('dashboard.stats.tasks'), value: tasks.length, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { icon: CalendarCheck, label: t('dashboard.stats.bookings'), value: bookings.length, color: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' },
    { icon: Clock, label: t('tasks.status.PENDING'), value: tasks.filter(t => t.status === 'PENDING').length, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ]

  const sortedTasks = sortTasksByStatus(tasks).filter(t => !hiddenTaskIds.includes(String(t.id)))
  const filteredTasks = taskFilter === 'ALL'
    ? sortedTasks
    : sortedTasks.filter((task) => {
      const normalizedStatus = (task.status === 'PENDING_REVIEW' || task.status === 'PENDING') ? 'PENDING' : task.status
      return normalizedStatus === taskFilter
    })
  const filteredBookings = bookings.filter(b => !hiddenBookingIds.includes(String(b.id))).filter((booking) => {
    if (bookingFilter === 'ALL') return true
    return booking.status === bookingFilter
  })

  if (loading) return <Layout><PageLoader /></Layout>

  return (
    <Layout>
      <div className="page-container py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">{t('dashboard.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-sm">
              <span>{t('dashboard.welcome')}،</span>
              <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-300">
                {user?.name || user?.fullName}
              </span>
              <span className="inline-block origin-bottom-right hover:animate-wave cursor-default transition-transform hover:scale-110">👋</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setProfileOpen(true)} className="flex items-center gap-2">
              <User size={15} /> {t('dashboard.profile')}
            </Button>
            <Link to="/tasks">
              <Button className="flex items-center gap-2">
                <Plus size={15} /> {t('tasks.create')}
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card p-3.5 flex items-center gap-3"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6">
          {['tasks', 'bookings'].map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {key === 'tasks' ? t('dashboard.myTasks') : t('dashboard.myBookings')}
            </button>
          ))}
        </div>

        {tab === 'tasks' && (
          <TasksList
            tasks={filteredTasks}
            onEdit={openTaskEditModal}
            onCancel={handleCancelTask}
            onDelete={handleDeleteTask}
            onComplete={handleCompleteTask}
            onRate={(task) => openRatingModal({ type: 'task', id: task.id, name: task.assignedWorkerName || task.title })}
            cancelling={cancelling}
          />
        )}

        {tab === 'bookings' && (
          <BookingsList
            bookings={filteredBookings}
            onEdit={(b) => {
              setEditingBooking(b)
              setEditBookingForm({
                date: b.date ? new Date(b.date).toISOString().slice(0, 16) : '',
                address: b.address || '',
                locationDetails: b.locationDetails || '',
                description: b.description || '',
                clientPhone: b.clientPhone || user?.phone || '',
              })
              setEditBookingError('')
            }}
            onCancel={handleCancelBooking}
            onDelete={handleDeleteBooking}
            onRate={(b) => openRatingModal({ type: 'booking', id: b.id, name: b.workerName || t('common.worker') })}
            onView={setViewingBooking}
            cancelling={cancelling}
            deletingBooking={deletingBooking}
          />
        )}

        {/* ======= PROFILE MODAL ======= */}
        <Modal open={profileOpen} onClose={() => { setProfileOpen(false); setShowPassword(false) }} title="">
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-0 -mt-4">

            {/* Header avec avatar */}
            <div className="flex flex-col items-center gap-3 pt-6 pb-5 px-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 rounded-t-2xl">
              <div className="relative">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-semibold text-primary-700 dark:text-primary-300 cursor-pointer overflow-hidden border-[3px] border-white dark:border-gray-900 shadow-md"
                >
                  {profileImagePreview
                    ? <img src={profileImagePreview} alt="preview" className="w-full h-full object-cover" />
                    : (user?.profilePictureUrl && !imgError
                        ? <img 
                            src={user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : endpoint(user.profilePictureUrl)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            onError={() => setImgError(true)}
                          />
                        : <span>{initials || '؟'}</span>)
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
                onChange={handleImageChange}
              />
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white text-base">{profileForm.username || name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('profile.title')}</p>
              </div>
            </div>

            {/* Champs */}
            <div className="flex flex-col gap-4 p-5">
                <Input
                  label={t('profile.userName')}
                  value={profileForm.username}
                  onChange={e => {
                    setProfileForm(f => ({ ...f, username: e.target.value }))
                    setProfileErrors(prev => ({ ...prev, username: '' }))
                  }}
                  error={profileErrors.username}
                  dir="auto"
                />

                <Input
                  label={t('profile.phone')}
                  value={profileForm.phone}
                  onChange={e => {
                    setProfileForm(f => ({ ...f, phone: e.target.value }))
                    setProfileErrors(prev => ({ ...prev, phone: '' }))
                  }}
                  error={profileErrors.phone}
                  dir="ltr"
                />

              {/* Section mot de passe */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                      🔒
                    </span>
                    {t('profile.changePassword')}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${showPassword ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {showPassword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-3 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                      <div className="flex flex-col gap-3 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <Input
                          label={t('profile.currentPassword')}
                          type="password"
                          value={profileForm.currentPassword}
                          onChange={e => {
                            setProfileForm(f => ({ ...f, currentPassword: e.target.value }))
                            setProfileErrors(prev => ({ ...prev, currentPassword: '' }))
                          }}
                          error={profileErrors.currentPassword}
                          placeholder="••••••••"
                          dir="ltr"
                        />
                        <Input
                          label={t('profile.newPassword')}
                          type="password"
                          value={profileForm.newPassword}
                          onChange={e => {
                            setProfileForm(f => ({ ...f, newPassword: e.target.value }))
                            setProfileErrors(prev => ({ ...prev, newPassword: '' }))
                          }}
                          error={profileErrors.newPassword}
                          placeholder="••••••••"
                          dir="ltr"
                        />
                        <Input
                          label={t('profile.confirmPassword')}
                          type="password"
                          value={profileForm.confirmPassword}
                          onChange={e => {
                            setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))
                            setProfileErrors(prev => ({ ...prev, confirmPassword: '' }))
                          }}
                          error={profileErrors.confirmPassword}
                          placeholder="••••••••"
                          dir="ltr"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {profileError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300 border border-red-100 dark:border-red-800">
                  {profileError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); setShowPassword(false) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <Button type="submit" loading={saving} className="flex-[2]">
                  {t('profile.update')}
                </Button>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  {t('profile.deleteAccount')}
                </button>
              </div>
            </div>
          </form>
        </Modal>

        {/* ======= RATING MODAL ======= */}
        <Modal open={ratingOpen} onClose={() => setRatingOpen(false)} title={t('workers.profile.rate')}>
          <form onSubmit={handleSubmitRating} className="flex flex-col gap-4">
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900/50 dark:text-gray-300">
              {ratingTarget?.name}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{t('common.stars')}</span>
              <StarRating value={ratingForm.stars} onChange={(stars) => setRatingForm((prev) => ({ ...prev, stars }))} size={24} />
            </div>
            <Textarea
              label={t('tasks.offers.message')}
              value={ratingForm.comment}
              onChange={e => setRatingForm(prev => ({ ...prev, comment: e.target.value }))}
              required
            />
            <Button type="submit" loading={ratingSubmitting} className="w-full">{t('common.confirm')}</Button>
          </form>
        </Modal>

        <Modal open={taskEditOpen} onClose={() => setTaskEditOpen(false)} title={t('common.edit')}>
          <form onSubmit={handleUpdateTask} className="flex flex-col gap-4">
            <Input label={t('tasks.form.title')} value={taskForm.title} onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))} required />
            <Textarea label={t('tasks.form.description')} value={taskForm.description} onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))} required />
            <Input label={t('tasks.form.profession')} value={taskForm.profession} onChange={e => setTaskForm(prev => ({ ...prev, profession: e.target.value }))} />
            <Input label={t('tasks.form.location')} value={taskForm.address} onChange={e => setTaskForm(prev => ({ ...prev, address: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setTaskEditOpen(false)} className="flex-1">{t('common.cancel')}</Button>
              <Button type="submit" loading={taskEditSubmitting} className="flex-1">{t('tasks.form.update')}</Button>
            </div>
          </form>
        </Modal>

        {/* ======= BOOKING DETAILS MODAL ======= */}
        <Modal open={!!viewingBooking} onClose={() => setViewingBooking(null)} title={t('bookings.details')}>
          {viewingBooking && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                <div className="relative w-14 h-14 shrink-0">
                  {viewingBooking.workerPhoto ? (
                    <>
                      <img 
                        src={viewingBooking.workerPhoto.startsWith('http') ? viewingBooking.workerPhoto : endpoint(viewingBooking.workerPhoto)} 
                        alt={viewingBooking.workerName || t('common.worker')} 
                        className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm absolute inset-0 z-10 bg-white" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-bold text-xl border-2 border-white dark:border-gray-800 shadow-sm absolute inset-0">
                        {(viewingBooking.workerName || '?')[0].toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-bold text-xl border-2 border-white dark:border-gray-800 shadow-sm">
                      {(viewingBooking.workerName || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                    {viewingBooking.workerName || t('common.worker')}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                    <Clock size={14} className="text-primary-500" />
                    <span>
                      {viewingBooking.date && !isNaN(new Date(viewingBooking.date).getTime()) 
                        ? new Date(viewingBooking.date).toLocaleString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : viewingBooking.date}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('bookings.form.description')}</label>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-start bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  {viewingBooking.description || t('common.noDescription')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('becomeWorker.form.location')}</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-start">
                    {viewingBooking.address || t('common.noData')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('bookings.form.locationDetailsDisplay')}</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-start">
                    {viewingBooking.locationDetails || t('common.noData')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('auth.login.phone')}</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-start">
                    {viewingBooking.workerPhone || viewingBooking.clientPhone || t('common.noData')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('common.status')}</label>
                  <div className="pt-1 flex justify-start">
                    <Badge variant={statusVariant[viewingBooking.status] || 'gray'}>
                      {t(`bookings.status.${viewingBooking.status}`)}
                    </Badge>
                  </div>
                </div>
              </div>

              {viewingBooking.status === 'COMPLETED' && !viewingBooking.isRated && (
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button onClick={() => { 
                    const b = viewingBooking; 
                    setViewingBooking(null); 
                    openRatingModal({ type: 'booking', id: b.id, name: b.workerName });
                  }}>
                    {t('workers.profile.rate')}
                  </Button>
                </div>
              )}

              {viewingBooking.status === 'PENDING' && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Button variant="secondary" onClick={() => openEditBooking(viewingBooking)}>
                    {t('common.edit')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Edit Booking Modal */}
        <Modal open={!!editingBooking} onClose={() => setEditingBooking(null)} title={t('common.edit')}>
          {editingBooking && (
            <form onSubmit={handleUpdateBooking} className="flex flex-col gap-4">
              {editBookingError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
                  {editBookingError}
                </div>
              )}
              
              <Input
                label={t('bookings.form.date')}
                type="datetime-local"
                value={editBookingForm.date}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setEditBookingForm(f => ({ ...f, date: e.target.value }))}
                required
              />

              <Input 
                label={t('tasks.form.location')} 
                value={editBookingForm.address} 
                onChange={e => setEditBookingForm(f => ({ ...f, address: e.target.value }))}
                required 
              />

              <Input 
                label={t('bookings.form.locationDetails')} 
                value={editBookingForm.locationDetails} 
                onChange={e => setEditBookingForm(f => ({ ...f, locationDetails: e.target.value }))}
              />

              <Textarea 
                label={t('bookings.form.description')} 
                value={editBookingForm.description} 
                onChange={e => setEditBookingForm(f => ({ ...f, description: e.target.value }))}
                required 
              />

              <Input
                label={t('auth.login.phone')}
                value={editBookingForm.clientPhone}
                onChange={e => setEditBookingForm(f => ({ ...f, clientPhone: e.target.value }))}
                required
              />

              <div className="flex gap-2 mt-2">
                <Button type="button" variant="secondary" onClick={() => setEditingBooking(null)} className="flex-1">{t('common.cancel')}</Button>
                <Button type="submit" loading={editBookingSubmitting} className="flex-1">{t('common.save')}</Button>
              </div>
            </form>
          )}
        </Modal>

      </div>
    </Layout>
  )
}

