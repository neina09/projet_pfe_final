import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapPin, Star, CheckCircle2, Calendar, ArrowLeft, Briefcase, Images, Phone } from 'lucide-react'
import { workersApi } from '../../api/workers'
import { bookingsApi } from '../../api/bookings'
import { ratingsApi } from '../../api/ratings'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import StarRating from '../../components/ui/StarRating'
import MapPicker from '../../components/ui/MapPicker'
import { normalizeWorker } from '../../lib/normalizers'
import { endpoint } from '../../api/endpoints'
import { formatAddress } from '../../lib/utils'

export default function WorkerProfile() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [worker, setWorker] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [bookingForm, setBookingForm] = useState({ date: '', address: '', locationDetails: '', description: '', clientPhone: user?.phone || '' })
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    let active = true
    const fetchWorker = async () => {
      // If we already have the right worker, don't flash the loader
      if (!worker || String(worker.id) !== String(id)) {
        setLoading(true)
      }
      
      try {
        const r = await workersApi.getById(id)
        if (!active) return
        const nextWorker = normalizeWorker(r.data)
        setWorker(nextWorker)
        setReviews(nextWorker.reviews || [])
      } catch {
        if (active) navigate('/workers')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchWorker()
    return () => { active = false }
  }, [id, navigate])

  useEffect(() => {
    if (!worker?.id) return
    if (Array.isArray(worker.reviews) && worker.reviews.length > 0) return

    ratingsApi.getWorkerRatings(worker.id)
      .then((r) => {
        const payload = r.data
        setReviews(payload?.content || payload?.ratings || payload?.reviews || payload || [])
      })
      .catch(() => setReviews([]))
  }, [worker])

  const handleBook = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/login')
    
    const newErrors = {}
    if (!bookingForm.date) newErrors.date = t('errors.required')
    if (!bookingForm.address) newErrors.address = t('errors.required')
    if (!bookingForm.description) newErrors.description = t('errors.required')

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    const selectedDate = new Date(bookingForm.date)
    const now = new Date()
    if (selectedDate < now) {
      setFormErrors({ date: t('errors.dateInPast') })
      return
    }

    setSubmitting(true)
    setErrorMsg('')
    try {
      await bookingsApi.create({
        workerId: id,
        description: bookingForm.description,
        address: bookingForm.address,
        locationDetails: bookingForm.locationDetails,
        bookingDate: bookingForm.date,
        clientPhone: bookingForm.clientPhone,
      })
      setBookingOpen(false)
      setSuccessMsg(t('common.success'))
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      // Check for conflict error (409 or specific message)
      const errorData = err.response?.data
      if (err.response?.status === 409 || errorData?.message?.toLowerCase().includes('already booked') || errorData?.message?.toLowerCase().includes('conflict')) {
        setErrorMsg(t('errors.conflict'))
      } else {
        setErrorMsg(errorData?.message || err.message || t('common.error'))
      }
    }
    setSubmitting(false)
  }

  useEffect(() => {
    const workerAvailable = worker?.available || worker?.availability === 'AVAILABLE'
    const shouldBlockBooking = !workerAvailable

    if (searchParams.get('book') === '1' && user && worker?.id && !shouldBlockBooking) {
      setBookingOpen(true)
    } else if (!user || !worker?.id || shouldBlockBooking) {
      setBookingOpen(false)
    }
  }, [searchParams, user, worker])

  if (loading) return <Layout><PageLoader /></Layout>
  if (!worker) return null

  const name = worker.name || worker.fullName || worker.user?.name || t('common.worker')
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const isAvail = worker.available || worker.availability === 'AVAILABLE'
  const profileImage = worker.profilePictureUrl
    ? (worker.profilePictureUrl.startsWith('http') ? worker.profilePictureUrl : endpoint(worker.profilePictureUrl))
    : ''
  const portfolioPhotos = (worker.portfolioPhotos || []).map((photo) => (
    photo.startsWith('http') ? photo : endpoint(photo)
  ))
  const bookingBlocked = !isAvail

  return (
    <Layout>
      <div className="page-container py-10 max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors">
          <ArrowLeft size={16} className="rtl-flip" /> {t('common.back')}
        </button>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-sm"
          >
            {successMsg}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="lg:col-span-1 lg:sticky lg:top-24 self-start flex flex-col gap-4"
          >
            <div className="card p-6 text-center">
              {/* Profile picture */}
              <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-primary-100 dark:border-primary-900 shadow-md overflow-hidden bg-primary-500 flex items-center justify-center">
                {profileImage ? (
                  <>
                    <img
                      src={profileImage}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-full items-center justify-center text-3xl font-bold text-white uppercase">
                      {(name || '?')[0]}
                    </div>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-white uppercase">
                    {(name || '?')[0]}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                {name}
                {worker.verified && (
                  <Badge variant="green" className="!bg-primary-500 !text-white border-none shadow-sm flex items-center gap-1 px-2 py-0.5 text-[10px]">
                    <CheckCircle2 size={10} />
                    {t('workers.card.verified', { defaultValue: 'موثق' })}
                  </Badge>
                )}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t(`home.categories.${worker.job || worker.profession}`, { defaultValue: worker.job || worker.profession }) || '—'}
              </p>

              <div className="flex items-center justify-center gap-1 mt-2">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                <span className="font-semibold text-gray-900 dark:text-white">{worker.rating?.toFixed(1) ?? '—'}</span>
              </div>

              <Badge className="mt-3" variant={isAvail ? 'green' : 'gray'}>
                {isAvail ? t('workers.card.available') : t('workers.card.busy')}
              </Badge>

              <div className="flex flex-col gap-2 mt-6">
                <Button onClick={() => user ? setBookingOpen(true) : navigate('/login')} className="w-full" disabled={bookingBlocked}>
                  {bookingBlocked ? t('workers.card.busy') : t('workers.profile.book')}
                </Button>
              </div>
            </div>

            <div className="card p-5 flex flex-col gap-3 text-sm">
              {(worker.city || worker.location) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin size={15} className="text-primary-500" />
                  <span>{formatAddress(worker.city || worker.location)}</span>
                </div>
              )}
              {worker.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone size={15} className="text-primary-500" />
                  <span>{worker.phone}</span>
                </div>
              )}
              {worker.createdAt && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar size={15} className="text-primary-500" />
                  <span>{t('workers.profile.joinedDate')}: {new Date(worker.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Main content */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 flex flex-col gap-4">
            {worker.bio && (
              <div className="card p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('becomeWorker.form.bio')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{worker.bio}</p>
              </div>
            )}

            {worker.skills?.length > 0 && (
              <div className="card p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('workers.profile.skills')}</h2>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio photos */}
            {worker.portfolioPhotos?.length > 0 ? (
              <div className="card p-5">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Images size={16} className="text-primary-500" />
                  {t('worker.portfolio')}
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {portfolioPhotos.map((url, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setLightboxSrc(url)}
                      className="aspect-square rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <img src={url} alt={`portfolio-${i}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card p-5 text-center text-sm text-gray-400 dark:text-gray-500">
                <Images size={28} className="mx-auto mb-2 opacity-40" />
                {t('worker.noPortfolio')}
              </div>
            )}

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                <span>{t('workers.profile.reviews')}</span>
                {reviews.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal">
                    {reviews.length > 5 ? t('common.viewMore', { defaultValue: 'آخر 5 تقييمات' }) : `${reviews.length}`}
                  </span>
                )}
              </h2>

              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('common.noData')}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {[...reviews].reverse().slice(0, 5).map((review, index) => {
                    const reviewerName = review.clientName || review.userName || review.authorName || review.user?.name || t('common.client')
                    const reviewerPhoto = review.userImageUrl || review.clientProfilePicture || review.userProfilePicture || review.profilePictureUrl || review.user?.profilePictureUrl || ''
                    const reviewerInitials = reviewerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    const dateStr = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''

                    return (
                      <motion.div
                        key={review.id || `review-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 h-fit self-start"
                      >
                        {/* Row 1: Avatar + Name + Date + Stars */}
                        <div className="flex items-center gap-2.5">
                          {/* Avatar */}
                          {reviewerPhoto ? (
                            <img
                              src={reviewerPhoto.startsWith('http') ? reviewerPhoto : endpoint(reviewerPhoto)}
                              alt={reviewerName}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm"
                              onError={e => { 
                                e.target.onerror = null; 
                                e.target.style.display = 'none'; 
                                if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ display: reviewerPhoto ? 'none' : 'flex' }}
                          >
                            {reviewerInitials}
                          </div>

                          {/* Name + Date */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                                {reviewerName}
                              </span>
                              {dateStr && (
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                  {dateStr}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stars */}
                          <StarRating value={review.stars || review.rating || 0} readOnly size={12} />
                        </div>

                        {/* Comment */}
                        {(review.comment || review.message || review.review) && (
                          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 mt-2 ps-11">
                            {review.comment || review.message || review.review}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </div>

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxSrc(null)}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.img
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.85 }}
                src={lightboxSrc}
                alt="portfolio"
                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                onClick={e => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booking Modal */}
        <Modal open={bookingOpen} onClose={() => { setBookingOpen(false); setErrorMsg(''); setFormErrors({}) }} title={t('bookings.create')}>
          <form onSubmit={handleBook} className="flex flex-col gap-4" noValidate>
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
                {errorMsg}
              </div>
            )}
            <Input
              label={t('bookings.form.date')}
              type="datetime-local"
              value={bookingForm.date}
              min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={e => {
                setBookingForm(f => ({ ...f, date: e.target.value }))
                if (formErrors.date) setFormErrors(prev => ({ ...prev, date: null }))
              }}
              error={formErrors.date}
              required
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
                >
                  <MapPin size={14} />
                  {showMap ? t('becomeWorker.form.typeAddress') : t('becomeWorker.form.selectOnMap')}
                </button>
              </div>
              
              {showMap && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <MapPicker onLocationSelect={({ address }) => {
                    setBookingForm(f => ({ ...f, address }));
                    if (formErrors.address) setFormErrors(prev => ({ ...prev, address: null }));
                    setShowMap(false);
                  }} />
                </motion.div>
              )}
            </div>

            <Input 
              label={t('tasks.form.location')} 
              value={bookingForm.address} 
              onChange={e => {
                setBookingForm(f => ({ ...f, address: e.target.value }))
                if (formErrors.address) setFormErrors(prev => ({ ...prev, address: null }))
              }}
              placeholder={t('becomeWorker.form.locationPlaceholder')}
              error={formErrors.address}
              required 
            />

            <Input 
              label={t('bookings.form.locationDetails')} 
              value={bookingForm.locationDetails} 
              onChange={e => setBookingForm(f => ({ ...f, locationDetails: e.target.value }))}
              placeholder={t('becomeWorker.form.locationPlaceholder')}
              required
            />

            <Textarea 
              label={t('bookings.form.description')} 
              value={bookingForm.description} 
              onChange={e => {
                setBookingForm(f => ({ ...f, description: e.target.value }))
                if (formErrors.description) setFormErrors(prev => ({ ...prev, description: null }))
              }} 
              error={formErrors.description}
              required 
            />

            <div className="grid grid-cols-1 gap-4">
              <Input
                label={t('auth.login.phone')}
                value={bookingForm.clientPhone}
                onChange={e => setBookingForm(f => ({ ...f, clientPhone: e.target.value }))}
                placeholder="22334455"
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="secondary" onClick={() => setBookingOpen(false)} className="flex-1">{t('common.cancel')}</Button>
              <Button type="submit" loading={submitting} className="flex-1">{t('bookings.form.submit')}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
