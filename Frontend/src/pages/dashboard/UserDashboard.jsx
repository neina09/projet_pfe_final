import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    const statusDiff = (taskStatusOrder[a.status] ?? 99) - (taskStatusOrder[b.status] ?? 99)
    if (statusDiff !== 0) return statusDiff
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
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

  const name = user?.name || user?.fullName || ''
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    Promise.all([
      tasksApi.getMy().then(r => setTasks((r.data?.content || r.data || []).map(normalizeTask))).catch(() => {}),
      bookingsApi.getMy().then(r => setBookings((r.data?.content || r.data || []).map(normalizeBooking))).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

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
        if (!profileForm.currentPassword || !profileForm.newPassword) {
          throw new Error(t('errors.passwordRequired'))
        }
        if (profileForm.newPassword !== profileForm.confirmPassword) {
          throw new Error(t('errors.passwordMismatch'))
        }
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
      setProfileError(error.response?.data?.message || error.message || t('errors.serverError'))
    }
    setSaving(false)
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
            <h1 className="section-title">{t('dashboard.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('dashboard.welcome')}, <span className="font-semibold text-gray-900 dark:text-white">{user?.name || user?.fullName}</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card p-5 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
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
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap mb-1">
              {['ALL', 'IN_PROGRESS', 'COMPLETED', 'OPEN', 'PENDING', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setTaskFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    taskFilter === status
                      ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {t(`tasks.status.${status}`)}
                </button>
              ))}
            </div>

            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Briefcase size={36} className="mx-auto mb-3 opacity-40" />
                <p>{t('tasks.empty')}</p>
                <Link to="/tasks" className="mt-3 inline-block">
                  <Button size="sm" className="mt-3">{t('tasks.create')}</Button>
                </Link>
              </div>
            ) : (
              filteredTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <h3 className="font-bold text-gray-900 dark:text-white truncate">{task.title}</h3>
                       <Badge variant={statusVariant[task.status] || 'gray'}>
                         {task.status === 'PENDING_REVIEW' ? t('tasks.status.PENDING') : t(`tasks.status.${task.status}`)}
                       </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {['PENDING_REVIEW', 'OPEN', 'PENDING'].includes(task.status) && (
                      <>
                        <Button size="sm" variant="secondary" className="!px-3 !py-1.5 flex-1 sm:flex-none" onClick={() => openTaskEditModal(task)}>
                          <Pencil size={14} />
                          {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="secondary" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 !px-3 !py-1.5 flex-1 sm:flex-none" loading={cancelling === `cancel-task-${task.id}`} onClick={() => handleCancelTask(task.id)}>
                          <XCircle size={14} />
                          {t('common.cancel')}
                        </Button>
                      </>
                    )}
                    {['COMPLETED', 'CANCELLED', 'CLOSED', 'REJECTED', 'WORKER_REFUSED'].includes(task.status) && (
                      <Button size="sm" variant="secondary" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 !px-3 !py-1.5 flex-1 sm:flex-none" loading={cancelling === `delete-task-${task.id}`} onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 size={14} />
                        {t('common.delete')}
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button size="sm" className="!px-3 !py-1.5 flex-1 sm:flex-none" loading={cancelling === `task-${task.id}`} onClick={() => handleCompleteTask(task.id)}>
                        <CheckCircle2 size={14} />
                        {t('tasks.status.COMPLETED')}
                      </Button>
                    )}
                    {task.status === 'COMPLETED' && !task.isRated && (
                      <Button size="sm" variant="secondary" className="flex-1 sm:flex-none" onClick={() => openRatingModal({ type: 'task', id: task.id, name: task.assignedWorkerName || task.title })}>
                        <Star size={14} />
                        {t('workers.profile.rate')}
                      </Button>
                    )}
                    <Link to={`/tasks/${task.id}`} className="text-xs text-primary-600 hover:underline px-2 whitespace-nowrap">{t('common.viewMore')}</Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap mb-1">
              {['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setBookingFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    bookingFilter === status
                      ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {t(`bookings.status.${status}`)}
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarCheck size={36} className="mx-auto mb-3 opacity-40" />
                <p>{t('bookings.empty')}</p>
              </div>
            ) : (
              filteredBookings.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {b.workerProfilePictureUrl || b.worker?.profilePictureUrl ? (
                      <img 
                        src={b.workerProfilePictureUrl || b.worker?.profilePictureUrl} 
                        alt={b.workerName} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 border-2 border-gray-100 dark:border-gray-700">
                        <User size={18} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {b.workerName || b.worker?.name || t('common.worker')}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{b.date || new Date(b.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={statusVariant[b.status] || 'gray'}>
                      {t(`bookings.status.${b.status}`)}
                    </Badge>
                    {b.status === 'COMPLETED' && !b.isRated && (
                      <Button size="sm" variant="secondary" onClick={() => openRatingModal({ type: 'booking', id: b.id, name: b.workerName || t('common.worker') })}>
                        <Star size={14} />
                        {t('workers.profile.rate')}
                      </Button>
                    )}
                    {(b.status === 'PENDING' || b.status === 'ACCEPTED') && (
                      <Button variant="secondary" size="sm" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 !px-3 !py-1.5" loading={cancelling === b.id} onClick={() => handleCancelBooking(b.id)}>
                        {t('common.cancel')}
                      </Button>
                    )}
                    {['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status) && (
                      <Button size="sm" variant="secondary" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 !px-3 !py-1.5" loading={deletingBooking === b.id} onClick={() => handleDeleteBooking(b.id)}>
                        <Trash2 size={14} />
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
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
                    : (user?.profilePictureUrl
                        ? <img src={user.profilePictureUrl} alt="profile" className="w-full h-full object-cover" />
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
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('profile.name')}</label>
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                  dir="rtl"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('profile.phone')}</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                  dir="ltr"
                />
              </div>

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

                {showPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-3 p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('profile.currentPassword')}</label>
                      <input
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('profile.newPassword')}</label>
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('profile.confirmPassword')}</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                        dir="ltr"
                      />
                    </div>
                  </motion.div>
                )}
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

      </div>
    </Layout>
  )
}
