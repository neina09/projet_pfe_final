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
import { normalizeWorker } from '../../lib/normalizers'
import { endpoint } from '../../api/endpoints'

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
  const [bookingForm, setBookingForm] = useState({ date: '', address: '', price: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    workersApi.getById(id)
      .then((r) => {
        const nextWorker = normalizeWorker(r.data)
        setWorker(nextWorker)
        setReviews(nextWorker.reviews || [])
      })
      .catch(() => navigate('/workers'))
      .finally(() => setLoading(false))
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
    setSubmitting(true)
    setErrorMsg('')
    try {
      await bookingsApi.create({
        workerId: id,
        description: bookingForm.description,
        address: bookingForm.address,
        bookingDate: bookingForm.date,
        price: bookingForm.price ? Number(bookingForm.price) : undefined,
      })
      setBookingOpen(false)
      setSuccessMsg(t('common.success'))
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || t('common.error'))
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
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 flex flex-col gap-4">
            <div className="card p-6 text-center">
              {/* Profile picture */}
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-primary-100 dark:border-primary-900 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-md">
                  {initials}
                </div>
              )}

              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                {name}
                {worker.verified && <CheckCircle2 size={17} className="text-primary-500" />}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{t(`home.categories.${worker.job}`) || worker.profession}</p>

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
                  <span>{worker.city || worker.location}</span>
                </div>
              )}
              {worker.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone size={15} className="text-primary-500" />
                  <span>{worker.phone}</span>
                </div>
              )}
              {(worker.salaryExpectation || worker.salary || worker.dailyRate) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Briefcase size={15} className="text-primary-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {worker.salaryExpectation || worker.salary || worker.dailyRate} MRU {t('common.perDay')}
                  </span>
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
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                {t('workers.profile.reviews')}
              </h2>

              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('common.noData')}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviews.map((review, index) => (
                    <div
                      key={review.id || `${review.userId || 'review'}-${index}`}
                      className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {review.clientName || review.userName || review.authorName || review.user?.name || t('common.client')}
                          </h3>
                          {review.createdAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <StarRating value={review.stars || review.rating || 0} readOnly size={16} />
                      </div>

                      {(review.comment || review.message || review.review) && (
                        <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                          {review.comment || review.message || review.review}
                        </p>
                      )}
                    </div>
                  ))}
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
        <Modal open={bookingOpen} onClose={() => { setBookingOpen(false); setErrorMsg('') }} title={t('bookings.create')}>
          <form onSubmit={handleBook} className="flex flex-col gap-4">
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
              onChange={e => setBookingForm(f => ({ ...f, date: e.target.value }))}
              required
            />
            <Input label={t('tasks.form.location')} value={bookingForm.address} onChange={e => setBookingForm(f => ({ ...f, address: e.target.value }))} required />
            <Input label={t('tasks.form.budget')} type="number" value={bookingForm.price} onChange={e => setBookingForm(f => ({ ...f, price: e.target.value }))} />
            <Textarea label={t('bookings.form.description')} value={bookingForm.description} onChange={e => setBookingForm(f => ({ ...f, description: e.target.value }))} required />
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
