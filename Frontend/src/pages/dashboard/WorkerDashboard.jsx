import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Star, CalendarCheck, Briefcase, ToggleLeft, ToggleRight, CheckCircle2, XCircle, ChevronDown, Pencil, User, Trash2 } from 'lucide-react'
import { bookingsApi } from '../../api/bookings'
import { workersApi } from '../../api/workers'
import { tasksApi } from '../../api/tasks'
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
import { normalizeBooking, normalizeWorker, normalizeTask } from '../../lib/normalizers'

const offerStatusOrder = {
  WORKER_REFUSED: 0,
  PENDING: 1,
  CLOSED: 2,
  COMPLETED: 3,
  SELECTED: 4,
  IN_PROGRESS: 5,
  REFUSED: 6,
}

function sortOffersByStatus(items = []) {
  return [...items].sort((a, b) => {
    const statusDiff = (offerStatusOrder[a.status] ?? 99) - (offerStatusOrder[b.status] ?? 99)
    if (statusDiff !== 0) return statusDiff
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  })
}

export default function WorkerDashboard() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab || 'offers')
  const [offerFilter, setOfferFilter] = useState('ALL')
  const [bookingFilter, setBookingFilter] = useState('ALL')
  const [inProgressFilter, setInProgressFilter] = useState('ALL')
  const [bookings, setBookings] = useState([])
  const [offers, setOffers] = useState([])
  const [assignedTasks, setAssignedTasks] = useState([])
  const [receivedRatings, setReceivedRatings] = useState([])
  const [workerProfile, setWorkerProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [deletingBooking, setDeletingBooking] = useState(null)
  const [deletingOffer, setDeletingOffer] = useState(null)
  const [hiddenOfferIds, setHiddenOfferIds] = useState(() => JSON.parse(localStorage.getItem('hidden_offers') || '[]'))
  const [hiddenBookingIds, setHiddenBookingIds] = useState(() => JSON.parse(localStorage.getItem('hidden_bookings') || '[]'))
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    profession: '',
    bio: '',
    location: '',
    salary: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileError, setProfileError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingProfile, setDeletingProfile] = useState(false)
  const [responding, setResponding] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    Promise.all([
      bookingsApi.getWorker().then(r => setBookings((r.data?.content || r.data || []).map(normalizeBooking))).catch(() => {}),
      tasksApi.getMyOffers().then(r => setOffers(r.data?.content || r.data || [])).catch(() => {}),
      tasksApi.getAssigned().then(r => setAssignedTasks((r.data?.content || r.data || []).map(normalizeTask))).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      setProfileImagePreview(URL.createObjectURL(file))
    }
  }

  const loadWorkerProfile = () => {
    workersApi.getMine()
      .then((r) => {
        const worker = normalizeWorker(r.data)
        setWorkerProfile(worker)
        setAvailable(worker.available)
        setProfileForm({
          name: worker.name || user?.name || '',
          phone: worker.phone || user?.phone || '',
          profession: worker.profession || '',
          bio: worker.bio || '',
          location: worker.address || '',
          salary: worker.salary || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })

        ratingsApi.getWorkerRatings(worker.id)
          .then((ratingsResponse) => {
            const payload = ratingsResponse.data
            setReceivedRatings(payload?.content || payload?.ratings || payload?.reviews || payload || [])
          })
          .catch(() => setReceivedRatings([]))
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadWorkerProfile()
  }, [user?.name, user?.phone])

  const toggleAvailability = async () => {
    const newStatus = available ? 'BUSY' : 'AVAILABLE'
    try {
      const worker = await workersApi.getMine()
      await workersApi.updateAvailability(worker.data.id, newStatus)
      setAvailable(!available)
    } catch {}
  }

  const handleRespond = async (id, status) => {
    setResponding(`${id}-${status}`)
    try {
      await bookingsApi.respond(id, status)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    } catch {}
    setResponding(null)
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

  const handleDeleteOffer = async (id) => {
    if (!window.confirm(t('common.confirm'))) return
    setDeletingOffer(id)
    try {
      await tasksApi.deleteOffer(id)
    } catch (err) {
      console.error('Delete offer error:', err)
    } finally {
      const idStr = String(id)
      setHiddenOfferIds(prev => {
        const next = [...new Set([...prev.map(String), idStr])]
        localStorage.setItem('hidden_offers', JSON.stringify(next))
        return next
      })
      setOffers(prev => prev.filter(o => String(o.id) !== idStr))
      setDeletingOffer(null)
    }
  }

  const handleOfferDecision = async (offerId, action) => {
    setResponding(`offer-${offerId}-${action}`)
    try {
      const response = action === 'accept'
        ? await tasksApi.workerAccept(offerId)
        : await tasksApi.workerRefuse(offerId)

      const nextOffer = response.data
      setOffers(prev => prev.map(offer => offer.id === offerId ? { ...offer, ...nextOffer } : offer))

      if (action === 'accept') {
        const assignedTask = normalizeTask({
          id: nextOffer.taskId,
          title: nextOffer.taskTitle,
          status: 'IN_PROGRESS',
          assignedWorkerName: nextOffer.workerName,
        })
        setAssignedTasks(prev => prev.some(task => task.id === assignedTask.id) ? prev : [assignedTask, ...prev])
        setTab('inProgress')
      }
    } catch {}
    setResponding(null)
  }

  const handleCompleteBooking = async (bookingId) => {
    setCompleting(`booking-${bookingId}`)
    try {
      await bookingsApi.complete(bookingId)
      setBookings(prev => prev.map(item => item.id === bookingId ? { ...item, status: 'COMPLETED' } : item))
    } catch {}
    setCompleting(null)
  }



  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setSaving(true)
    try {
      const current = await workersApi.getMine()
      await authApi.updateProfile({
        username: profileForm.name,
        phone: profileForm.phone,
      })

      if (profileImageFile) {
        await authApi.uploadImage(profileImageFile)
      }
      await workersApi.updateProfile(current.data.id, {
        name: profileForm.name,
        phoneNumber: profileForm.phone,
        job: profileForm.profession,
        address: profileForm.location,
        bio: profileForm.bio,
        salary: Number(profileForm.salary || 0),
        nationalIdNumber: current.data.nationalIdNumber || '0000000000',
      })

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
      loadWorkerProfile()
      setProfileOpen(false)
    } catch (error) {
      setProfileError(error.response?.data?.message || error.message || t('errors.workerProfileUpdateError'))
    }
    setSaving(false)
  }

  const handleDeleteWorkerProfile = async () => {
    if (!workerProfile?.id) {
      return
    }
    if (!window.confirm(t('common.confirm'))) {
      return
    }

    setDeletingProfile(true)
    setProfileError('')
    try {
      await workersApi.deleteProfile(workerProfile.id)
      await refreshProfile()
      window.location.href = '/dashboard'
    } catch (error) {
      setProfileError(error.response?.data?.message || error.message || t('errors.workerProfileDeleteError'))
    } finally {
      setDeletingProfile(false)
    }
  }

  const stats = [
    { icon: Star, label: t('workerDashboard.stats.rating'), value: workerProfile?.rating?.toFixed(1) ?? workerProfile?.averageRating?.toFixed(1) ?? '—', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { icon: CalendarCheck, label: t('workerDashboard.stats.jobs'), value: bookings.filter(b => b.status === 'COMPLETED').length, color: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' },
    { icon: Briefcase, label: t('workerDashboard.stats.pending'), value: bookings.filter(b => b.status === 'PENDING').length, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  ]

  const sortedOffers = sortOffersByStatus(offers).filter(o => !hiddenOfferIds.includes(String(o.id)))
  const filteredOffers = offerFilter === 'ALL'
    ? sortedOffers
    : sortedOffers.filter((offer) => {
      const normalizedStatus = (offer.status === 'PENDING_REVIEW' || offer.status === 'PENDING') ? 'PENDING' : offer.status
      return normalizedStatus === offerFilter
    })
  const filteredBookings = bookings.filter(b => !hiddenBookingIds.includes(String(b.id))).filter((booking) => {
    if (bookingFilter === 'ALL') return true
    return booking.status === bookingFilter
  })
  const inProgressTasks = assignedTasks.filter(t => t.status === 'IN_PROGRESS')
  const completedTasks = assignedTasks.filter(t => t.status === 'COMPLETED')

  if (loading) return <Layout><PageLoader /></Layout>

  return (
    <Layout>
      <div className="page-container py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="section-title">{t('workerDashboard.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{user?.name || user?.fullName}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                available
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-700 text-gray-500'
              }`}
            >
              {available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              {available ? t('workerDashboard.available') : t('workerDashboard.busy')}
            </button>
            <Button variant="secondary" onClick={() => setProfileOpen(true)}>
              {t('workerDashboard.profile')}
            </Button>
            <Link to="/tasks">
              <Button>{t('tasks.title')}</Button>
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

        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6 flex-wrap">
          {['offers', 'bookings', 'reviews'].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === tabKey
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tabKey === 'offers'
                ? t('workerDashboard.myOffers')
                : tabKey === 'bookings'
                  ? t('workerDashboard.myRequests')
                  : t('workers.profile.reviews')}
            </button>
          ))}
        </div>

        {tab === 'offers' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap mb-1">
              {['ALL', 'PENDING', 'SELECTED', 'IN_PROGRESS', 'COMPLETED', 'WORKER_REFUSED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOfferFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    offerFilter === status
                      ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {t(`tasks.status.${status}`)}
                </button>
              ))}
            </div>

            {filteredOffers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Briefcase size={36} className="mx-auto mb-3 opacity-40" />
                <p>{t('tasks.offers.noOffers')}</p>
              </div>
            ) : (
              filteredOffers.map((offer, i) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{offer.taskTitle}</h3>
                      <Badge variant={{ PENDING: 'yellow', SELECTED: 'blue', IN_PROGRESS: 'primary', COMPLETED: 'green', WORKER_REFUSED: 'red', CLOSED: 'gray' }[offer.status] || 'gray'}>
                        {offer.status === 'PENDING_REVIEW' ? t('tasks.status.PENDING') : t(`tasks.status.${offer.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{offer.taskUserName || t('common.client')}</p>
                    {offer.message && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{offer.message}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {offer.status === 'SELECTED' && (
                      <>
                        <Button
                          size="sm"
                          className="!px-3 !py-1.5 flex-1 sm:flex-none"
                          loading={responding === `offer-${offer.id}-accept`}
                          onClick={() => handleOfferDecision(offer.id, 'accept')}
                        >
                          <CheckCircle2 size={14} />
                          {t('workerDashboard.accept')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="!px-3 !py-1.5 flex-1 sm:flex-none"
                          loading={responding === `offer-${offer.id}-refuse`}
                          onClick={() => handleOfferDecision(offer.id, 'refuse')}
                        >
                          <XCircle size={14} />
                          {t('workerDashboard.reject')}
                        </Button>
                      </>
                    )}
                    {['COMPLETED', 'WORKER_REFUSED', 'CLOSED', 'REFUSED'].includes(offer.status) && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 !px-3 !py-1.5 flex-1 sm:flex-none" 
                        loading={deletingOffer === offer.id} 
                        onClick={() => handleDeleteOffer(offer.id)}
                      >
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

        {tab === 'bookings' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap mb-1">
              {['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'].map((status) => (
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {b.clientName || b.user?.name || t('common.client')}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{b.date || new Date(b.createdAt).toLocaleDateString()}</p>
                    {b.description && <p className="text-xs text-gray-500 mt-1 truncate">{b.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={{ PENDING: 'yellow', ACCEPTED: 'green', COMPLETED: 'primary', CANCELLED: 'red', REJECTED: 'red' }[b.status] || 'gray'}>
                      {t(`bookings.status.${b.status}`)}
                    </Badge>
                    {b.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          className="!px-3 !py-1.5"
                          loading={responding === `${b.id}-ACCEPTED`}
                          onClick={() => handleRespond(b.id, 'ACCEPTED')}
                        >
                          {t('workerDashboard.accept')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="!px-3 !py-1.5"
                          loading={responding === `${b.id}-REJECTED`}
                          onClick={() => handleRespond(b.id, 'REJECTED')}
                        >
                          {t('workerDashboard.reject')}
                        </Button>
                      </>
                    )}
                    {b.status === 'ACCEPTED' && (
                      <Button
                        size="sm"
                        loading={completing === `booking-${b.id}`}
                        onClick={() => handleCompleteBooking(b.id)}
                      >
                        <CheckCircle2 size={14} />
                        {t('tasks.status.COMPLETED')}
                      </Button>
                    )}
                    {['COMPLETED', 'REJECTED', 'CANCELLED'].includes(b.status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 !px-3 !py-1.5"
                        loading={deletingBooking === b.id}
                        onClick={() => handleDeleteBooking(b.id)}
                      >
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

        {/* inProgress and completed tabs removed as per user request */}

        {tab === 'reviews' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receivedRatings.length === 0 ? (
              <div className="col-span-full text-center py-16 card bg-gray-50/50 dark:bg-gray-800/20 border-dashed border-2 border-gray-200 dark:border-gray-700">
                <Star size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">{t('workerDashboard.noReviews')}</p>
              </div>
            ) : (
              receivedRatings.map((review, i) => {
                const reviewerName = review.clientName || review.userName || review.authorName || review.user?.name || review.user?.fullName || t('common.client')
                
                // Dynamic detection: Find ANY field that might contain an image URL
                const findImageUrl = (obj) => {
                  if (!obj) return null
                  // Priorities
                  const priorities = ['profilePictureUrl', 'imageUrl', 'photoUrl', 'userPhoto', 'clientPhoto', 'actorPhoto']
                  for (const p of priorities) if (obj[p]) return obj[p]
                  
                  // Regex search
                  const key = Object.keys(obj).find(k => 
                    (k.toLowerCase().includes('photo') || k.toLowerCase().includes('image') || k.toLowerCase().includes('picture')) &&
                    typeof obj[k] === 'string' && (obj[k].includes('/') || obj[k].startsWith('http'))
                  )
                  if (key) return obj[key]
                  
                  // Check nested user object
                  if (obj.user) return findImageUrl(obj.user)
                  if (obj.client) return findImageUrl(obj.client)
                  if (obj.reviewer) return findImageUrl(obj.reviewer)
                  if (obj.author) return findImageUrl(obj.author)
                  
                  return null
                }

                const rawImage = findImageUrl(review)
                const reviewerImage = rawImage ? (rawImage.startsWith('http') ? rawImage : `${import.meta.env.VITE_API_BASE_URL || ''}${rawImage}`) : null
                
                // Worker's own photo (the user viewing the dashboard)
                const selfPhotoRaw = user?.profilePictureUrl || workerProfile?.profilePictureUrl || user?.imageUrl
                const workerImage = selfPhotoRaw ? (selfPhotoRaw.startsWith('http') ? selfPhotoRaw : `${import.meta.env.VITE_API_BASE_URL || ''}${selfPhotoRaw}`) : null

                return (
                  <motion.div
                    key={review.id || i}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="card p-4 flex flex-col gap-2.5 hover:shadow-md hover:border-primary-100 dark:hover:border-primary-900 transition-all duration-300 relative group"
                  >
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {reviewerImage ? (
                          <img
                            src={reviewerImage}
                            alt={reviewerName}
                            className="w-8 h-8 rounded-lg object-cover ring-2 ring-gray-50 dark:ring-gray-800"
                            onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.parentElement.innerHTML = '<div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><svg size="14" ... /></div>' }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <User size={14} />
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-3 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {reviewerName}
                          </h3>
                          <span className="text-[10px] text-gray-400 font-normal whitespace-nowrap">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Worker's photo - showing who received the review */}
                        {workerImage && (
                          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 rounded-full border border-primary-100 dark:border-primary-800">
                             <img src={workerImage} className="w-4 h-4 rounded-full object-cover" alt="worker" />
                             <span className="text-[9px] font-medium text-primary-600 dark:text-primary-400 uppercase tracking-tighter">{t('common.you')}</span>
                          </div>
                        )}
                        <StarRating value={review.stars || review.rating || 0} readOnly size={12} />
                      </div>
                    </div>

                    {(review.comment || review.message || review.review) && (
                      <div className="bg-gray-50/50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100/50 dark:border-gray-700/50">
                        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                          {review.comment || review.message || review.review}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )
              })
            )}
          </div>
        )}

        <Modal open={profileOpen} onClose={() => { setProfileOpen(false); setShowPassword(false); setProfileImageFile(null); setProfileImagePreview(null) }} title="">
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 -mt-4">
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
                        : <span>{(profileForm.name || user?.name || '?').slice(0, 1).toUpperCase()}</span>)
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
                <p className="font-semibold text-gray-900 dark:text-white text-base">{profileForm.name || user?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('workerDashboard.profile')}</p>
              </div>
            </div>
            <Input label={t('profile.name')} value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
            <Input label={t('profile.phone')} type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label={t('becomeWorker.form.profession')} value={profileForm.profession} onChange={e => setProfileForm(f => ({ ...f, profession: e.target.value }))} />
            <Input label={t('becomeWorker.form.location')} value={profileForm.location} onChange={e => setProfileForm(f => ({ ...f, location: e.target.value }))} />
            <Input label={t('becomeWorker.form.salary')} type="number" value={profileForm.salary} onChange={e => setProfileForm(f => ({ ...f, salary: e.target.value }))} />
            <Textarea label={t('becomeWorker.form.bio')} value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} />
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
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
                {profileError}
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button type="submit" loading={saving} className="w-full">{t('common.save')}</Button>
              <Button type="button" variant="danger" loading={deletingProfile} onClick={handleDeleteWorkerProfile} className="w-full">{t('admin.delete')}</Button>
            </div>
          </form>
        </Modal>


      </div>
    </Layout>
  )
}
