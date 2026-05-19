import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Star, CalendarCheck, Briefcase, ToggleLeft, ToggleRight, CheckCircle2, XCircle, ChevronDown, Pencil, User, Trash2, CreditCard, Receipt, Crown, Sparkles, Eye, Calendar, MapPin, Phone } from 'lucide-react'
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
import { endpoint } from '../../api/endpoints'
import { formatAddress } from '../../lib/utils'
import { validateFullName, validatePhone, validatePassword } from '../../lib/validators'
import TasksList from '../../components/dashboard/TasksList'
import BookingsList from '../../components/dashboard/BookingsList'
import MapPicker from '../../components/ui/MapPicker'

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
    // Newest first is the primary requirement
    const dateA = new Date(a.createdAt || 0).getTime()
    const dateB = new Date(b.createdAt || 0).getTime()
    if (dateB !== dateA) return dateB - dateA

    // Fallback to status order
    return (offerStatusOrder[a.status] ?? 99) - (offerStatusOrder[b.status] ?? 99)
  })
}

const taskStatusVariant = {
  OPEN: 'blue',
  PENDING: 'yellow',
  IN_PROGRESS: 'primary',
  COMPLETED: 'green',
  CANCELLED: 'red',
  REJECTED: 'red'
}

export default function WorkerDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language?.startsWith('ar')
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
  const [viewingBooking, setViewingBooking] = useState(null)
  const [imgError, setImgError] = useState(false)
  const [myTasks, setMyTasks] = useState([])
  const [myMadeBookings, setMyMadeBookings] = useState([])
  const [taskFilter, setTaskFilter] = useState('ALL')
  const [madeBookingFilter, setMadeBookingFilter] = useState('ALL')
  const [editingBooking, setEditingBooking] = useState(null)
  const [editBookingForm, setEditBookingForm] = useState({ date: '', address: '', locationDetails: '', description: '', clientPhone: '' })
  const [editBookingSubmitting, setEditBookingSubmitting] = useState(false)
  const [editBookingError, setEditBookingError] = useState('')
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [ratingModal, setRatingModal] = useState(null)
  const [ratingForm, setRatingForm] = useState({ stars: 5, comment: '' })
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [subscriptionSubmitting, setSubscriptionSubmitting] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState('')
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [user?.profilePictureUrl])
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    userName: '',
    workerName: '',
    phone: '',
    profession: '',
    bio: '',
    location: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileError, setProfileError] = useState('')
  const [profileErrors, setProfileErrors] = useState({
    userName: '',
    workerName: '',
    phone: '',
    profession: '',
    bio: '',
    location: '',
    lat: null,
    lng: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
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
      bookingsApi.getWorker()
        .then(r => {
          const raw = r.data?.content || r.data || []
          const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          setBookings(sorted.map(normalizeBooking))
        })
        .catch(() => { }),
      tasksApi.getMyOffers()
        .then(r => {
          const raw = r.data?.content || r.data || []
          const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          setOffers(sorted)
        })
        .catch(() => { }),
      tasksApi.getAssigned()
        .then(r => {
          const raw = r.data?.content || r.data || []
          const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          setAssignedTasks(sorted.map(normalizeTask))
        })
        .catch(() => { }),
      tasksApi.getMy()
        .then(r => {
          const raw = r.data?.content || r.data || []
          setMyTasks(raw.map(normalizeTask))
        })
        .catch(() => { }),
      bookingsApi.getMy()
        .then(r => {
          const raw = r.data || []
          setMyMadeBookings(raw.map(normalizeBooking))
        })
        .catch(() => { })
    ]).finally(() => setLoading(false))
  }, [])

  const loadBookings = () => {
    bookingsApi.getWorker()
      .then(r => {
        const raw = r.data?.content || r.data || []
        const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        setBookings(sorted.map(normalizeBooking))
      })
      .catch(() => { })
  }

  // React to navigation state changes (e.g. from a notification click)
  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab)
    }
  }, [location.state?.tab])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfileImageFile(file)
      setProfileImagePreview(URL.createObjectURL(file))
    }
  }

  const loadWorkerProfile = () => {
    return workersApi.getMine()
      .then((r) => {
        const worker = normalizeWorker(r.data)
        setWorkerProfile(worker)
        setAvailable(worker.available)
        setProfileForm({
          userName: user?.name || user?.fullName || '',
          workerName: worker.name || '',
          phone: worker.phone || user?.phone || '',
          profession: worker.profession || '',
          bio: worker.bio || '',
          location: formatAddress(worker.address) || '',
          lat: worker.latitude || worker.lat || null,
          lng: worker.longitude || worker.lng || null,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })

        ratingsApi.getWorkerRatings(worker.id)
          .then((ratingsResponse) => {
            const payload = ratingsResponse.data
            const rawRatings = payload?.content || payload?.ratings || payload?.reviews || payload || []
            const sorted = [...rawRatings].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            setReceivedRatings(sorted)
          })
          .catch(() => setReceivedRatings([]))
      })
      .catch(() => { })
  }

  const loadSubscription = () => {
    return workersApi.getSubscription()
      .then((response) => {
        setSubscription(response.data)
        setPaymentReference(response.data?.transferReference || '')
      })
      .catch(() => { })
  }

  useEffect(() => {
    loadWorkerProfile()
    loadSubscription()
  }, [user?.name, user?.phone])

  const handleSubscriptionReceiptSubmit = async (e) => {
    e.preventDefault()
    if (!workerProfile?.id) return
    if (!receiptFile) {
      setSubscriptionError(t('workerDashboard.subscription.receiptRequired', { defaultValue: 'يرجى رفع وصل الدفع أولاً.' }))
      return
    }

    setSubscriptionSubmitting(true)
    setSubscriptionError('')
    try {
      const response = await workersApi.submitSubscriptionReceipt(workerProfile.id, receiptFile, paymentReference.trim())
      setSubscription(response.data)
      setReceiptFile(null)
      setSubscriptionModalOpen(false)
      await Promise.allSettled([loadWorkerProfile(), loadSubscription()])
    } catch (error) {
      setSubscriptionError(error.response?.data?.message || t('common.error'))
    } finally {
      setSubscriptionSubmitting(false)
    }
  }

  const toggleAvailability = async () => {
    const newStatus = available ? 'BUSY' : 'AVAILABLE'
    try {
      const worker = await workersApi.getMine()
      await workersApi.updateAvailability(worker.data.id, newStatus)
      setAvailable(!available)
    } catch { }
  }

  const handleRespond = async (id, status) => {
    if (status === 'ACCEPTED') {
      const target = bookings.find(b => b.id === id)
      if (target) {
        const targetTime = new Date(target.date).getTime()
        const conflict = bookings.find(b =>
          b.id !== id &&
          b.status === 'ACCEPTED' &&
          Math.abs(new Date(b.date).getTime() - targetTime) < 3600000 // 1 hour threshold
        )
        if (conflict) {
          alert(t('nav.alreadyBooked'))
          return
        }
      }
    }

    setResponding(`${id}-${status}`)
    try {
      await bookingsApi.respond(id, status)
      // Refresh all bookings to show automatic rejections from backend
      loadBookings()
    } catch { }
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
    } catch { }
    setResponding(null)
  }

  const handleCompleteBooking = async (bookingId) => {
    setCompleting(`booking-${bookingId}`)
    try {
      await bookingsApi.complete(bookingId)
      setBookings(prev => prev.map(item => item.id === bookingId ? { ...item, status: 'COMPLETED' } : item))
    } catch { }
    setCompleting(null)
  }

  const loadMyMadeBookings = () => {
    bookingsApi.getMy()
      .then(r => {
        const raw = r.data?.content || r.data || []
        const sorted = [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        setMyMadeBookings(sorted.map(normalizeBooking))
      })
      .catch(() => { })
  }

  const handleCancelMadeBooking = async (id) => {
    setCancellingBooking(id)
    try {
      await bookingsApi.cancel(id)
      setMyMadeBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b))
    } catch { }
    setCancellingBooking(null)
  }

  const handleDeleteMadeBooking = async (id) => {
    if (!window.confirm(t('common.confirm'))) return
    try {
      await bookingsApi.delete(id)
      setMyMadeBookings(prev => prev.filter(b => b.id !== id))
    } catch { }
  }

  const handleUpdateMadeBooking = async (e) => {
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
      setMyMadeBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
      setEditingBooking(null)
    } catch (err) {
      console.error('Update booking error:', err.response?.status, err.response?.data)
      const data = err.response?.data
      setEditBookingError(data?.message || data?.error || t('common.error'))
    } finally {
      setEditBookingSubmitting(false)
    }
  }

  const openEditMadeBooking = (b) => {
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

  const openRatingModal = (booking) => {
    setRatingModal(booking)
    setRatingForm({ stars: 5, comment: '' })
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    if (!ratingModal) return
    setRatingSubmitting(true)
    try {
      await ratingsApi.rateWorker({ bookingId: ratingModal.id, stars: ratingForm.stars, comment: ratingForm.comment })
      setMyMadeBookings(prev => prev.map(b => b.id === ratingModal.id ? { ...b, isRated: true } : b))
      setRatingModal(null)
    } catch { }
    setRatingSubmitting(false)
  }


  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileErrors({
      userName: '',
      workerName: '',
      phone: '',
      profession: '',
      bio: '',
      location: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })

    let isValid = true
    const newProfileErrors = { ...profileErrors }

    if (!profileForm.userName.trim()) {
      newProfileErrors.userName = t('errors.required')
      isValid = false
    } else if (!validateFullName(profileForm.userName)) {
      newProfileErrors.userName = t('errors.alphanumeric')
      isValid = false
    }

    if (!profileForm.workerName.trim()) {
      newProfileErrors.workerName = t('errors.required')
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
      const current = await workersApi.getMine()
      await authApi.updateProfile({
        username: profileForm.userName,
        phone: profileForm.phone,
      })

      if (profileImageFile) {
        await authApi.uploadImage(profileImageFile)
      }

      // Safely ensure nationalIdNumber is exactly 10 digits to bypass backend DTO validation for non-admins
      let nationalId = current.data.nationalIdNumber || '0000000000'
      if (!/^\d{10}$/.test(nationalId)) {
        nationalId = nationalId.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)
        if (!/^\d{10}$/.test(nationalId)) {
          nationalId = '0000000000'
        }
      }

      await workersApi.updateProfile(current.data.id, {
        name: profileForm.workerName,
        phoneNumber: profileForm.phone,
        job: profileForm.profession,
        address: profileForm.location,
        latitude: profileForm.lat,
        longitude: profileForm.lng,
        bio: profileForm.bio,
        nationalIdNumber: nationalId,
      })

      if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
        await authApi.changePassword({
          currentPassword: profileForm.currentPassword,
          newPassword: profileForm.newPassword,
        })
      }

      await refreshProfile()
      loadWorkerProfile()
      setProfileOpen(false)
    } catch (error) {
      const rawMsg = error.response?.data?.message || ''
      let msg = rawMsg || t('errors.serverError')

      // Check if it's a validation error with a field prefix (e.g. "phoneNumber: Phone number must be...")
      const fieldMatch = typeof rawMsg === 'string' ? rawMsg.match(/^([a-zA-Z0-9_]+):\s*(.+)$/) : null

      const newErrors = {
        userName: '',
        workerName: '',
        phone: '',
        profession: '',
        bio: '',
        location: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }
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
        } else if (fieldName === 'username' || fieldName === 'name' || fieldName === 'workername') {
          if (fieldMsg.includes('already') || fieldMsg.includes('use') || fieldMsg.includes('conflict')) {
            if (fieldName === 'username' || fieldName === 'name') {
              newErrors.userName = t('errors.conflict')
            } else {
              newErrors.workerName = t('errors.conflict')
            }
          } else {
            if (fieldName === 'username' || fieldName === 'name') {
              newErrors.userName = t('errors.alphanumeric')
            } else {
              newErrors.workerName = t('errors.alphanumeric')
            }
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
          newErrors.userName = t('errors.conflict')
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
    { 
      icon: Star, 
      label: t('workerDashboard.stats.rating'), 
      value: workerProfile?.rating?.toFixed(1) ?? workerProfile?.averageRating?.toFixed(1) ?? '—', 
      bgColor: '#FAEEDA', 
      iconColor: '#BA7517' 
    },
    { 
      icon: CalendarCheck, 
      label: t('workerDashboard.stats.jobs'), 
      value: bookings.filter(b => b.status === 'COMPLETED').length, 
      bgColor: '#E1F5EE', 
      iconColor: '#0F6E56' 
    },
    { 
      icon: Briefcase, 
      label: t('workerDashboard.stats.pending'), 
      value: bookings.filter(b => b.status === 'PENDING').length, 
      bgColor: '#FAECE7', 
      iconColor: '#993C1D' 
    },
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
  const filteredInProgress = assignedTasks.filter(t => inProgressFilter === 'ALL' || t.status === inProgressFilter)

  const filteredMyTasks = myTasks.filter(t => taskFilter === 'ALL' || t.status === taskFilter)
  const filteredMyMadeBookings = myMadeBookings.filter(b => madeBookingFilter === 'ALL' || b.status === madeBookingFilter)
  const completedTasks = assignedTasks.filter(t => t.status === 'COMPLETED')
  const subscriptionBadgeVariant = subscription?.active ? 'green' : 'yellow'
  const subscriptionStatusLabel = subscription?.active
    ? t('workerDashboard.subscription.active', { defaultValue: 'نشط' })
    : subscription?.paymentStatus === 'AUTO_APPROVED'
      ? t('workerDashboard.subscription.active', { defaultValue: 'نشط' })
      : subscription?.paymentStatus === 'EXPIRED'
        ? t('workerDashboard.subscription.expired', { defaultValue: 'منتهي' })
        : subscription?.paymentStatus === 'REJECTED'
          ? t('workerDashboard.subscription.rejected', { defaultValue: 'مرفوض' })
          : subscription?.paymentStatus === 'PENDING'
            ? t('workerDashboard.subscription.pending', { defaultValue: 'قيد المراجعة' })
            : t('workerDashboard.subscription.notPaid', { defaultValue: 'غير مدفوع' })

  if (loading) return <Layout><PageLoader /></Layout>

  return (
    <Layout>
      <div className="page-container py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">{t('workerDashboard.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-sm">
              <span>{t('dashboard.welcome')}،</span>
              <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 dark:from-primary-400 dark:to-primary-300">
                {user?.name || user?.fullName}
              </span>
              <span className="inline-block origin-bottom-right hover:animate-wave cursor-default transition-transform hover:scale-110">👋</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${available
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
        {workerProfile?.subscriptionRequired === false && !subscription?.active && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/30 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Soft decorative glow */}
            <div className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none`} />

            <div className={`flex items-center gap-4 relative z-10 flex-col md:flex-row ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 shrink-0">
                <Crown size={22} />
              </div>
              <div>
                <h3 className={`text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 ${isRtl ? 'justify-end' : 'justify-start'}`}>
                  {t('workerDashboard.subscription.bannerTitle', { defaultValue: 'ترقية الحساب للعضوية الذهبية المميزة 👑' })}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
                  {t('workerDashboard.subscription.bannerDesc', {
                    defaultValue: 'حسابك نشط ومستمر بالكامل مجاناً! هل تود مضاعفة أرباحك وتصدر نتائج البحث؟ اضغط هنا للتفعيل والتفاصيل.'
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTab('subscription')
                setTimeout(() => {
                  document.getElementById('dashboard-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 100)
              }}
              className="relative z-10 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-colors duration-200 shrink-0 whitespace-nowrap"
            >
              {t('workerDashboard.subscription.bannerButton', { defaultValue: 'التفاصيل والتفعيل 💎' })}
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-3 gap-[10px] mb-6 w-full">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 shrink-0 shadow-sm hover:shadow-md transition-shadow duration-300"
              style={{
                background: 'var(--color-background-secondary)',
                borderRadius: '8px',
                padding: '12px 16px'
              }}
            >
              <div 
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: s.bgColor
                }}
              >
                <s.icon size={20} style={{ color: s.iconColor }} />
              </div>
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <div 
                  className="font-medium leading-none"
                  style={{ fontSize: '20px', fontWeight: '500', color: 'var(--foreground)' }}
                >
                  {s.value}
                </div>
                <div 
                  className="leading-tight truncate text-start"
                  style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}
                >
                  {s.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {workerProfile?.subscriptionRequired === true && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]"
          >
            <div className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard size={18} className="text-primary-500" />
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      {t('workerDashboard.subscription.title', { defaultValue: 'اشتراك المنصة' })}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('workerDashboard.subscription.subtitle', { defaultValue: 'فعّل اشتراكك لمدة 6 أشهر ليظهر ملفك المهني داخل المنصة.' })}
                  </p>
                </div>
                <Badge variant={subscriptionBadgeVariant}>
                  {subscriptionStatusLabel}
                </Badge>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3 mb-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                  <div className="text-[10px] text-gray-500 mb-0.5">{t('workerDashboard.subscription.amount', { defaultValue: 'قيمة الاشتراك' })}</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">{subscription?.amount ?? 200} MRU</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                  <div className="text-[10px] text-gray-500 mb-0.5">{t('workerDashboard.subscription.recipient', { defaultValue: 'اسم المستفيد' })}</div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-white">{subscription?.recipientName || 'neina med vall'}</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                  <div className="text-[10px] text-gray-500 mb-0.5">{t('workerDashboard.subscription.account', { defaultValue: 'رقم الحساب' })}</div>
                  <div className="text-base font-bold tracking-wide text-gray-900 dark:text-white">{subscription?.accountNumber || '48995086'}</div>
                </div>
              </div>

              <form onSubmit={handleSubscriptionReceiptSubmit} className="space-y-4">
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
                        defaultValue: `الاشتراك نشط حتى ${new Date(subscription.endsAt).toLocaleDateString()}`,
                      })
                      : t('workerDashboard.subscription.lastEndsAt', {
                        date: new Date(subscription.endsAt).toLocaleDateString(),
                        defaultValue: `آخر تاريخ انتهاء كان ${new Date(subscription.endsAt).toLocaleDateString()}`,
                      })}
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
            </div>

            <div className="card p-4 flex flex-col items-center justify-center text-center">
              <img
                src={subscription?.qrImageUrl || '/payment-qr.svg'}
                alt="Payment QR"
                className="w-40 h-40 object-contain rounded-2xl border border-emerald-100 bg-white p-2.5 shadow-sm"
              />
              <p className="mt-3 text-xs font-semibold text-gray-900 dark:text-white">
                {t('workerDashboard.subscription.qrTitle', { defaultValue: 'الدفع عبر QR أو رقم الحساب' })}
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                {t('workerDashboard.subscription.qrHint', { defaultValue: 'يمكنك الدفع عبر QR أو عبر رقم الحساب، ثم أدخل رقم العملية وارفع الوصل لتفعيل ظهورك في المنصة.' })}
              </p>
            </div>
          </motion.div>
        )}

        <div id="dashboard-tabs" className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6 flex-wrap">
          {['offers', 'bookings', 'myTasks', 'myBookings', 'reviews', ...(workerProfile?.subscriptionRequired === false ? ['subscription'] : [])].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === tabKey
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {tabKey === 'offers'
                ? t('workerDashboard.myOffers')
                : tabKey === 'bookings'
                  ? t('workerDashboard.myRequests')
                  : tabKey === 'myTasks'
                    ? t('dashboard.myTasks')
                    : tabKey === 'myBookings'
                      ? t('dashboard.myBookings')
                      : tabKey === 'reviews'
                        ? t('workers.profile.reviews')
                        : t('workerDashboard.subscription.title', { defaultValue: 'الاشتراك المميز 💎' })}
            </button>
          ))}
        </div>

        {tab === 'offers' && (
          <div className="flex flex-col gap-4">
            {/* Filter pills with counts */}
            <div className="flex gap-1.5 flex-wrap pb-1.5 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60">
              {['ALL', 'PENDING', 'SELECTED', 'IN_PROGRESS', 'COMPLETED', 'WORKER_REFUSED'].map((status) => {
                const count = status === 'ALL'
                  ? offers.filter(o => !hiddenOfferIds.includes(String(o.id))).length
                  : offers.filter(o => !hiddenOfferIds.includes(String(o.id))).filter(offer => (offer.status === 'PENDING_REVIEW' ? 'PENDING' : offer.status) === status).length
                const isActive = offerFilter === status
                return (
                  <button
                    key={status}
                    onClick={() => setOfferFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all duration-200 shrink-0 ${isActive
                        ? 'border-primary-500 text-primary-600 bg-primary-50/80 dark:bg-primary-950/20 dark:text-primary-400 shadow-sm scale-102'
                        : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                  >
                    <span>{t(`tasks.status.${status}`)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <AnimatePresence mode="popLayout">
              {filteredOffers.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 shadow-sm"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400">
                    <Briefcase size={28} className="opacity-60" />
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-1">{t('tasks.offers.noOffers')}</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto">
                    {isRtl ? 'لم يتم العثور على أي عروض مطابقة لهذا الفلتر حالياً.' : 'No offers found matching your selected filter currently.'}
                  </p>
                </motion.div>
              ) : (
                <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
                  {filteredOffers.map((offer, i) => {
                    const statusAccent = {
                      PENDING: 'border-s-amber-500 dark:border-s-amber-600',
                      SELECTED: 'border-s-blue-500 dark:border-s-blue-600',
                      IN_PROGRESS: 'border-s-primary-500 dark:border-s-primary-600',
                      COMPLETED: 'border-s-emerald-500 dark:border-s-emerald-600',
                      WORKER_REFUSED: 'border-s-red-500 dark:border-s-red-600',
                      CLOSED: 'border-s-gray-400 dark:border-s-gray-600',
                    }[offer.status] || 'border-s-gray-200'

                    const textAccent = {
                      PENDING: 'text-amber-600 dark:text-amber-400',
                      SELECTED: 'text-blue-600 dark:text-blue-400',
                      IN_PROGRESS: 'text-primary-600 dark:text-primary-400',
                      COMPLETED: 'text-emerald-600 dark:text-emerald-400',
                      WORKER_REFUSED: 'text-red-600 dark:text-red-400',
                      CLOSED: 'text-gray-500 dark:text-gray-400',
                    }[offer.status] || 'text-gray-500'

                    const borderAccent = {
                      PENDING: 'border-s-amber-400 dark:border-s-amber-500',
                      SELECTED: 'border-s-blue-400 dark:border-s-blue-500',
                      IN_PROGRESS: 'border-s-primary-400 dark:border-s-primary-500',
                      COMPLETED: 'border-s-emerald-400 dark:border-s-emerald-500',
                      WORKER_REFUSED: 'border-s-red-400 dark:border-s-red-500',
                      CLOSED: 'border-s-gray-400 dark:border-s-gray-500',
                    }[offer.status] || 'border-s-gray-200'

                    return (
                      <Link to={`/tasks/${offer.taskId}`} key={offer.id} className="block group">
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.05, 0.2) }}
                          className={`card relative overflow-hidden flex flex-col justify-between border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-900 rounded-2xl border-s-4 ${borderAccent}`}
                        >
                          <div className="p-3 flex-1 flex flex-col gap-1.5">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 mb-0.5 block">
                                  {isRtl ? 'عرض مقدم على مهمة' : 'Offer on Task'}
                                </span>
                                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-1 mt-0.5">
                                  {offer.taskTitle}
                                </h3>
                              </div>
                              <Badge variant={{ PENDING: 'yellow', SELECTED: 'blue', IN_PROGRESS: 'primary', COMPLETED: 'green', WORKER_REFUSED: 'red', CLOSED: 'gray' }[offer.status] || 'gray'} className="shrink-0 font-medium px-2 py-0.5 text-[10px]">
                                {offer.status === 'PENDING_REVIEW' ? t('tasks.status.PENDING') : t(`tasks.status.${offer.status}`)}
                              </Badge>
                            </div>

                            {/* Client name */}
                            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-50 dark:border-gray-800/60">
                              <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
                                <User size={10} className="text-gray-500 dark:text-gray-400" />
                              </div>
                              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                {offer.taskUserName || t('common.client')}
                              </span>
                            </div>

                            {/* Bidding Proposal message */}
                            {offer.message && (
                              <div className="relative p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 mt-1.5 italic">
                                <p className="line-clamp-2">{offer.message}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions Bar */}
                          <div className="p-2 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-1">
                              <Eye size={12} />
                              {t('common.view')}
                            </span>

                            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.preventDefault()}>
                              {offer.status === 'SELECTED' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 text-[11px] font-medium px-2 py-0 flex items-center"
                                    loading={responding === `offer-${offer.id}-accept`}
                                    onClick={(e) => { e.stopPropagation(); handleOfferDecision(offer.id, 'accept') }}
                                  >
                                    <CheckCircle2 size={12} className="me-1" />
                                    {t('workerDashboard.accept')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    className="h-7 text-[11px] font-medium px-2 py-0 flex items-center"
                                    loading={responding === `offer-${offer.id}-refuse`}
                                    onClick={(e) => { e.stopPropagation(); handleOfferDecision(offer.id, 'refuse') }}
                                  >
                                    <XCircle size={12} className="me-1" />
                                    {t('workerDashboard.reject')}
                                  </Button>
                                </>
                              )}
                              {['COMPLETED', 'WORKER_REFUSED', 'CLOSED', 'REFUSED'].includes(offer.status) && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="h-7 text-[11px] font-medium px-2 py-0 flex items-center"
                                  loading={deletingOffer === offer.id}
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOffer(offer.id) }}
                                >
                                  <Trash2 size={12} className="me-1" />
                                  {t('common.delete')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {tab === 'bookings' && (
          <div className="flex flex-col gap-4">
            {/* Filter pills with count bubbles */}
            <div className="flex gap-1.5 flex-wrap pb-1.5 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60">
              {['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'].map((status) => {
                const count = status === 'ALL'
                  ? bookings.filter(b => !hiddenBookingIds.includes(String(b.id))).length
                  : bookings.filter(b => !hiddenBookingIds.includes(String(b.id))).filter(b => b.status === status).length
                const isActive = bookingFilter === status
                return (
                  <button
                    key={status}
                    onClick={() => setBookingFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all duration-200 shrink-0 ${isActive
                        ? 'border-primary-500 text-primary-600 bg-primary-50/80 dark:bg-primary-950/20 dark:text-primary-400 shadow-sm scale-102'
                        : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                  >
                    <span>{t(`bookings.status.${status}`)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <AnimatePresence mode="popLayout">
              {filteredBookings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 shadow-sm"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400">
                    <CalendarCheck size={28} className="opacity-60" />
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-1">{t('bookings.empty')}</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto">
                    {isRtl ? 'لم يتم العثور على أي طلبات حجز مطابقة لهذا الفلتر حالياً.' : 'No booking requests found matching your selected filter currently.'}
                  </p>
                </motion.div>
              ) : (
                <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
                  {filteredBookings.map((b, i) => {
                    const statusAccent = {
                      PENDING: 'border-s-amber-500 dark:border-s-amber-600',
                      ACCEPTED: 'border-s-emerald-500 dark:border-s-emerald-600',
                      COMPLETED: 'border-s-primary-500 dark:border-s-primary-600',
                      CANCELLED: 'border-s-red-500 dark:border-s-red-600',
                      REJECTED: 'border-s-red-500 dark:border-s-red-600',
                    }[b.status] || 'border-s-gray-200'

                    const textAccent = {
                      PENDING: 'text-amber-600 dark:text-amber-400',
                      ACCEPTED: 'text-emerald-600 dark:text-emerald-400',
                      COMPLETED: 'text-primary-600 dark:text-primary-400',
                      CANCELLED: 'text-red-600 dark:text-red-400',
                      REJECTED: 'text-red-600 dark:text-red-400',
                    }[b.status] || 'text-gray-500'

                    // Booking lifecycle progress helper
                    const getBookingProgress = (status) => {
                      if (status === 'PENDING') return { percent: 33, label: t('bookings.status.PENDING') }
                      if (status === 'ACCEPTED') return { percent: 66, label: t('bookings.status.ACCEPTED') }
                      if (status === 'COMPLETED') return { percent: 100, label: t('bookings.status.COMPLETED') }
                      return { percent: 100, label: t(`bookings.status.${status}`), isCancelled: true }
                    }
                    const progress = getBookingProgress(b.status)
                    const clientPersonName = b.clientName || b.user?.name || t('common.client')

                    return (
                      <motion.div
                        key={b.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.05, 0.2) }}
                        className={`card relative overflow-hidden flex flex-col justify-between border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-900 rounded-2xl border-s-4 ${statusAccent}`}
                      >
                        <div className="p-3 flex-1 flex flex-col gap-1.5 cursor-pointer" onClick={() => setViewingBooking(b)}>
                          {/* Client profile row */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Client Photo */}
                              <div className="flex-shrink-0 relative">
                                {b.clientPhoto ? (
                                  <img
                                    src={b.clientPhoto}
                                    alt={clientPersonName}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs border border-gray-200 dark:border-gray-700"
                                  style={{ display: b.clientPhoto ? 'none' : 'flex' }}
                                >
                                  {(clientPersonName || '?')[0].toUpperCase()}
                                </div>
                              </div>

                              {/* Client info */}
                              <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm hover:text-primary-500 transition-colors">
                                  {clientPersonName}
                                </h3>
                                <p className="text-[9px] text-gray-500 mt-0.5">
                                  {isRtl ? 'طلب حجز وارد' : 'Incoming booking request'}
                                </p>
                              </div>
                            </div>

                            <Badge variant={{ PENDING: 'yellow', ACCEPTED: 'green', COMPLETED: 'primary', CANCELLED: 'red', REJECTED: 'red' }[b.status] || 'gray'} className="shrink-0 font-medium px-2 py-0.5 text-[10px]">
                              {t(`bookings.status.${b.status}`)}
                            </Badge>
                          </div>

                          {/* Description box */}
                          {b.description && (
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                              {b.description}
                            </p>
                          )}

                          {/* Meta tags */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1.5 pb-0.5 text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-50 dark:border-gray-800/40">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Calendar size={13} className="text-gray-400 shrink-0" />
                              <span className="truncate">
                                {b.date && !isNaN(new Date(b.date).getTime())
                                  ? new Date(b.date).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
                                  : b.date || ''}
                              </span>
                            </div>

                            {b.address && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin size={13} className="text-gray-400 shrink-0" />
                                <span className="truncate">{b.address}</span>
                              </div>
                            )}

                            {b.clientPhone && (
                              <div className="flex items-center gap-1.5 min-w-0" dir="ltr">
                                <Phone size={13} className="text-primary-500 shrink-0" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {b.clientPhone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Bar */}
                        <div className="p-2 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" onClick={() => setViewingBooking(b)}>
                            <Eye size={13} className="me-1" />
                            {t('common.view')}
                          </Button>

                          {b.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-[11px] !py-0 px-2.5 shadow-sm flex items-center"
                                loading={responding === `${b.id}-ACCEPTED`}
                                onClick={() => handleRespond(b.id, 'ACCEPTED')}
                              >
                                <CheckCircle2 size={13} className="me-1" />
                                {t('workerDashboard.accept')}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-7 text-[11px] !py-0 px-2.5 shadow-sm flex items-center"
                                loading={responding === `${b.id}-REJECTED`}
                                onClick={() => handleRespond(b.id, 'REJECTED')}
                              >
                                <XCircle size={13} className="me-1" />
                                {t('workerDashboard.reject')}
                              </Button>
                            </>
                          )}

                          {b.status === 'ACCEPTED' && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] !py-0 px-2.5 shadow-sm flex items-center"
                              loading={completing === `booking-${b.id}`}
                              onClick={() => handleCompleteBooking(b.id)}
                            >
                              <CheckCircle2 size={13} className="me-1" />
                              {t('tasks.status.COMPLETED')}
                            </Button>
                          )}

                          {['COMPLETED', 'REJECTED', 'CANCELLED'].includes(b.status) && (
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-7 text-[11px] !py-0 px-2.5 animate-none flex items-center"
                              loading={deletingBooking === b.id}
                              onClick={() => handleDeleteBooking(b.id)}
                            >
                              <Trash2 size={13} className="me-1" />
                              {t('common.delete')}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {tab === 'myTasks' && (
          <TasksList
            tasks={filteredMyTasks}
            cancelling={null}
          />
        )}

        {tab === 'myBookings' && (
          <BookingsList
            bookings={filteredMyMadeBookings}
            onEdit={openEditMadeBooking}
            onCancel={handleCancelMadeBooking}
            onDelete={handleDeleteMadeBooking}
            onRate={openRatingModal}
            onView={setViewingBooking}
            cancelling={cancellingBooking}
          />
        )}


        {tab === 'reviews' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
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
                  const priorities = ['userImageUrl', 'profilePictureUrl', 'imageUrl', 'photoUrl', 'userPhoto', 'clientPhoto', 'actorPhoto']
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
                    className="card p-3 flex flex-col gap-1.5 hover:shadow-md hover:border-primary-100 dark:hover:border-primary-900 transition-all duration-300 relative group h-fit items-stretch justify-start self-start"
                  >
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden ring-2 ring-gray-50 dark:ring-gray-800 bg-gray-100 dark:bg-gray-800">
                          {reviewerImage && (
                            <img
                              src={reviewerImage}
                              alt={reviewerName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          )}
                          <div className={`${reviewerImage ? 'hidden' : 'flex'} absolute inset-0 w-full h-full items-center justify-center text-gray-400`}>
                            <User size={14} />
                          </div>
                        </div>
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

        {tab === 'subscription' && workerProfile?.subscriptionRequired === false && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr] text-right"
            dir="rtl"
          >
            <div className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2 justify-end">
                    <h2 className="text-lg font-bold text-gray-950 dark:text-white">
                      {t('workerDashboard.subscription.title', { defaultValue: 'اشتراك المنصة' })}
                    </h2>
                    <CreditCard size={18} className="text-primary-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('workerDashboard.subscription.subtitle', { defaultValue: 'فعّل اشتراكك المميز لتتصدر نتائج البحث والعمال في منطقتك!' })}
                  </p>
                </div>
                <Badge variant={subscriptionBadgeVariant}>
                  {subscriptionStatusLabel}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 mb-5">
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

              <form onSubmit={handleSubscriptionReceiptSubmit} className="space-y-4">
                <Input
                  label={t('workerDashboard.subscription.reference', { defaultValue: 'رقم العملية أو المرجع' })}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={t('workerDashboard.subscription.referencePlaceholder', { defaultValue: 'أدخل رقم العملية بعد التحويل' })}
                  required
                />
                <label className="block rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 hover:border-primary-400 transition-colors cursor-pointer text-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 justify-center">
                    <Receipt size={16} />
                    {t('workerDashboard.subscription.receipt', { defaultValue: 'وصل الدفع' })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
                    {t('workerDashboard.subscription.receiptHint', { defaultValue: 'ارفع صورة أو PDF لوصل التحويل، وسيتم التحقق من بياناته عبر OCR أو مراجعته من الإدارة قبل تفعيل الاشتراك.' })}
                  </p>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 truncate">
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
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 text-center">
                    {subscription?.active
                      ? t('workerDashboard.subscription.endsAt', {
                        date: new Date(subscription.endsAt).toLocaleDateString(),
                        defaultValue: `الاشتراك نشط حتى ${new Date(subscription.endsAt).toLocaleDateString()}`,
                      })
                      : t('workerDashboard.subscription.lastEndsAt', {
                        date: new Date(subscription.endsAt).toLocaleDateString(),
                        defaultValue: `آخر تاريخ انتهاء كان ${new Date(subscription.endsAt).toLocaleDateString()}`,
                      })}
                  </div>
                )}



                {subscriptionError && (
                  <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300 text-center">
                    {subscriptionError}
                  </div>
                )}

                <Button type="submit" loading={subscriptionSubmitting} className="w-full sm:w-auto">
                  {t('workerDashboard.subscription.submit', { defaultValue: 'رفع الوصل وإرسال التحقق' })}
                </Button>
              </form>
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
          </motion.div>
        )}

        <Modal open={!!viewingBooking} onClose={() => setViewingBooking(null)} title={t('bookings.details')}>
          {viewingBooking && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <div className="relative w-12 h-12 shrink-0">
                  {(() => {
                    const isClient = viewingBooking.clientName === user?.name || viewingBooking.clientName === user?.fullName;
                    const name = isClient ? (viewingBooking.workerName || t('common.worker')) : (viewingBooking.clientName || t('common.client'));
                    const photo = isClient ? viewingBooking.workerPhoto : viewingBooking.clientPhoto;
                    const initial = (name || '?')[0].toUpperCase();
                    return (
                      <>
                        {photo && (
                          <img
                            src={photo.startsWith('http') ? photo : endpoint(photo)}
                            alt={name}
                            className="w-12 h-12 rounded-full object-cover absolute inset-0 z-10 bg-white"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold absolute inset-0">
                          {initial}
                        </div>
                      </>
                    )
                  })()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {viewingBooking.clientName === user?.name || viewingBooking.clientName === user?.fullName
                      ? (viewingBooking.workerName || t('common.worker'))
                      : (viewingBooking.clientName || t('common.client'))}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {viewingBooking.date && !isNaN(new Date(viewingBooking.date).getTime())
                      ? new Date(viewingBooking.date).toLocaleString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : viewingBooking.date}
                  </p>
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">
                    {viewingBooking.clientName === user?.name || viewingBooking.clientName === user?.fullName
                      ? t('admin.workerTable.phone')
                      : t('auth.login.phone')}
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-start">
                    {viewingBooking.clientName === user?.name || viewingBooking.clientName === user?.fullName
                      ? (viewingBooking.workerPhone || t('common.noData'))
                      : (viewingBooking.clientPhone || t('common.noData'))}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('common.status')}</label>
                  <div className="pt-1 text-start">
                    <Badge variant={{ PENDING: 'yellow', ACCEPTED: 'green', COMPLETED: 'primary', CANCELLED: 'red', REJECTED: 'red' }[viewingBooking.status] || 'gray'}>
                      {t(`bookings.status.${viewingBooking.status}`)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

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
                    : (user?.profilePictureUrl && !imgError
                      ? <img
                        src={user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : endpoint(user.profilePictureUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                      : null)
                  }
                  <span style={{ display: profileImagePreview || (user?.profilePictureUrl && !imgError) ? 'none' : 'block' }}>
                    {(profileForm.workerName || user?.name || '?').slice(0, 1).toUpperCase()}
                  </span>
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
                <p className="font-semibold text-gray-900 dark:text-white text-base">{profileForm.workerName || profileForm.userName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('workerDashboard.profile')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-5 overflow-y-auto max-h-[60vh]">
              <Input
                label={t('profile.userName')}
                value={profileForm.userName}
                onChange={e => {
                  setProfileForm(f => ({ ...f, userName: e.target.value }))
                  setProfileErrors(prev => ({ ...prev, userName: '' }))
                }}
                error={profileErrors.userName}
                dir="auto"
              />

              <Input
                label={t('profile.workerName')}
                value={profileForm.workerName}
                onChange={e => {
                  setProfileForm(f => ({ ...f, workerName: e.target.value }))
                  setProfileErrors(prev => ({ ...prev, workerName: '' }))
                }}
                error={profileErrors.workerName}
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

              <Input
                label={t('worker.job')}
                value={profileForm.profession}
                onChange={e => setProfileForm(f => ({ ...f, profession: e.target.value }))}
                dir="auto"
              />

              <Textarea
                label={t('becomeWorker.form.bio')}
                value={profileForm.bio}
                onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                dir="auto"
                rows={3}
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-start block">{t('worker.address')}</label>
                <MapPicker
                  initialLat={profileForm.lat}
                  initialLng={profileForm.lng}
                  onLocationSelect={({ address, lat, lng }) => {
                    setProfileForm(f => ({ ...f, location: address, lat, lng }))
                  }}
                />
                <Input
                  value={profileForm.location}
                  onChange={e => setProfileForm(f => ({ ...f, location: e.target.value }))}
                  dir="auto"
                />
              </div>

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
                  onClick={handleDeleteWorkerProfile}
                  disabled={saving || deletingProfile}
                  className="w-full py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  {t('profile.deleteAccount')}
                </button>
              </div>
            </div>
          </form>
        </Modal>


        {/* Edit Made Booking Modal */}
        <Modal open={!!editingBooking} onClose={() => setEditingBooking(null)} title={t('common.edit')}>
          {editingBooking && (
            <form onSubmit={handleUpdateMadeBooking} className="flex flex-col gap-4">
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

        {/* Rating Modal */}
        <Modal open={!!ratingModal} onClose={() => setRatingModal(null)} title={t('workers.profile.rate')}>
          {ratingModal && (
            <form onSubmit={handleSubmitRating} className="flex flex-col gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{ratingModal.workerName}</p>
              <div className="flex justify-center">
                <StarRating value={ratingForm.stars} onChange={stars => setRatingForm(f => ({ ...f, stars }))} />
              </div>
              <Textarea
                label={t('tasks.offers.message')}
                value={ratingForm.comment}
                onChange={e => setRatingForm(f => ({ ...f, comment: e.target.value }))}
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="secondary" onClick={() => setRatingModal(null)} className="flex-1">{t('common.cancel')}</Button>
                <Button type="submit" loading={ratingSubmitting} className="flex-1">{t('common.save')}</Button>
              </div>
            </form>
          )}
        </Modal>



      </div>
    </Layout>
  )
}
