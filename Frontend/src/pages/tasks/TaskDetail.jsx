import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapPin, Clock, Briefcase, ArrowLeft, CheckCircle2, User, Lock, MessageSquare, Send, XCircle, Star } from 'lucide-react'
import { tasksApi } from '../../api/tasks'
import { ratingsApi } from '../../api/ratings'
import { useAuth } from '../../context/AuthContext'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import StarRating from '../../components/ui/StarRating'
import { normalizeTask } from '../../lib/normalizers'

const statusVariant = { PENDING: 'yellow', OPEN: 'blue', IN_PROGRESS: 'primary', COMPLETED: 'green', CANCELLED: 'red', PENDING_REVIEW: 'yellow' }

function formatOfferStatus(status, t) {
  if (status === 'ACCEPTED' || status === 'SELECTED') return t('tasks.offers.accepted')
  if (status === 'PENDING') return t('tasks.offers.pending')
  if (status === 'WORKER_REFUSED' || status === 'REJECTED' || status === 'REFUSED') return t('tasks.offers.reject')
  if (status === 'IN_PROGRESS') return t('tasks.status.IN_PROGRESS')
  if (status === 'COMPLETED') return t('tasks.status.COMPLETED')
  return status || '-'
}

export default function TaskDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isWorker } = useAuth()
  const [task, setTask] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerForm, setOfferForm] = useState({ message: '' })
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingForm, setRatingForm] = useState({ stars: 5, comment: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', profession: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [offerError, setOfferError] = useState('')
  const [offerSuccess, setOfferSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const taskRes = await tasksApi.getById(id)
      const normalizedTask = normalizeTask(taskRes.data)
      setTask(normalizedTask)

      const isTaskOwner = String(user?.id) === String(normalizedTask.userId)

      if (user) {
        if (isTaskOwner || user.role === 'ADMIN') {
          try {
            const offersRes = await tasksApi.getOffers(id)
            setOffers(offersRes.data || [])
          } catch {
            setOffers([])
          }
        } else if (isWorker) {
          try {
            const myOffersRes = await tasksApi.getMyOffers()
            const myOfferForThisTask = (myOffersRes.data || []).find(o => String(o.taskId || o.task?.id) === String(id))
            setOffers(myOfferForThisTask ? [myOfferForThisTask] : [])
          } catch {
            setOffers([])
          }
        }
      }
    } catch {
      navigate('/tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id, user])

  const isOwner = String(user?.id) === String(task?.userId)
  const currentWorkerOffer = useMemo(
    () => offers.find((offer) => String(offer.workerId || offer.worker?.id) === String(user?.id)),
    [offers, user?.id]
  )
  const selectedOffer = useMemo(
    () => offers.find((offer) => ['ACCEPTED', 'SELECTED', 'IN_PROGRESS', 'COMPLETED'].includes(offer.status)),
    [offers]
  )

  const canCancelTask = Boolean(isOwner && ['OPEN', 'PENDING', 'PENDING_REVIEW'].includes(task?.status))
  const canDeleteTask = Boolean(isOwner && (task?.status === 'COMPLETED' || task?.status === 'CANCELLED' || task?.status === 'REJECTED'))
  const canSubmitOffer = Boolean(user && isWorker && (task?.status === 'OPEN' || task?.status === 'PENDING') && !currentWorkerOffer)
  const canManageOffers = Boolean(isOwner && (task?.status === 'OPEN' || task?.status === 'PENDING'))
  const canWorkerRespondToSelection = Boolean(
    isWorker &&
    ['ACCEPTED', 'SELECTED'].includes(currentWorkerOffer?.status)
  )
  const canRate = Boolean(
    task &&
    task.status === 'COMPLETED' &&
    !task.isRated &&
    (isOwner || (isWorker && String(currentWorkerOffer?.workerId || currentWorkerOffer?.worker?.id) === String(user?.id)))
  )
  const canEditTask = Boolean(isOwner && ['PENDING_REVIEW', 'OPEN', 'PENDING'].includes(task?.status))

  const handleSubmitOffer = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/login')

    try {
      setSubmitting(true)
      await tasksApi.submitOffer(id, offerForm)
      setSubmitting(false)
      setOfferForm({ message: '' })
      alert(t('tasks.offers.success'))
      window.location.reload()
    } catch (err) {
      setSubmitting(false)
      const errorMsg = err.response?.data?.message || ''
      if (errorMsg.includes('AVAILABLE') || errorMsg.includes('مشغول') || errorMsg.includes('busy')) {
        alert(t('errors.workerBusy'))
      } else {
        alert(errorMsg || t('common.error'))
      }
    }
  }

  const handleAcceptOffer = async (offerId) => {
    setActionError('')
    setSubmitting(true)
    try {
      await tasksApi.acceptOffer(id, offerId)
      load()
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setSubmitting(false)
  }

  const handleRejectOffer = async (offerId) => {
    setActionError('')
    setSubmitting(true)
    try {
      await tasksApi.rejectOffer(id, offerId)
      load()
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setSubmitting(false)
  }

  const handleWorkerOfferDecision = async (offerId, action) => {
    setActionError('')
    setSubmitting(true)
    try {
      if (action === 'accept') {
        await tasksApi.workerAccept(offerId)
        navigate('/dashboard', { state: { tab: 'active', filter: 'IN_PROGRESS' } })
      } else {
        await tasksApi.workerRefuse(offerId)
        load()
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setSubmitting(false)
  }

  const handleMarkDone = async () => {
    setActionError('')
    setSubmitting(true)
    try {
      await tasksApi.markDone(id)
      setTask(prev => ({ ...prev, status: 'COMPLETED' }))
      openRatingModal()
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setSubmitting(false)
  }

  const openEditModal = () => {
    setEditForm({
      title: task?.title || '',
      description: task?.description || '',
      profession: task?.profession || '',
      address: task?.address || '',
    })
    setEditOpen(true)
  }

  const handleUpdateTask = async (e) => {
    e.preventDefault()
    setActionError('')
    setEditSubmitting(true)
    try {
      const response = await tasksApi.update(id, editForm)
      const updatedTask = normalizeTask(response.data)
      setTask(updatedTask)
      setComments(response.data?.comments || updatedTask.comments || comments)
      setEditOpen(false)
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setEditSubmitting(false)
  }

  const handleCancelTask = async () => {
    setActionError('')
    setSubmitting(true)
    try {
      const response = await tasksApi.cancel(id)
      setTask(normalizeTask(response.data))
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setSubmitting(false)
  }

  const handleDeleteTask = async () => {
    if (!window.confirm(t('common.confirm'))) return
    setActionError('')
    setSubmitting(true)
    try {
      await tasksApi.delete(id)
      navigate('/dashboard')
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
      setSubmitting(false)
    }
  }


  const openRatingModal = () => {
    setRatingForm({ stars: 5, comment: '' })
    setRatingOpen(true)
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    setRatingSubmitting(true)
    try {
      await ratingsApi.rateTask(id, ratingForm)
      setTask((prev) => ({ ...prev, isRated: true }))
      setRatingOpen(false)
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('errors.serverError'))
    }
    setRatingSubmitting(false)
  }

  if (loading) return <Layout><PageLoader /></Layout>
  if (!task) return null

  return (
    <Layout>
      <div className="page-container py-10 max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors">
          <ArrowLeft size={16} className="rtl-flip" /> {t('common.back')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 flex flex-col gap-5">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{task.title}</h1>
                <Badge variant={statusVariant[task.status] || 'gray'}>
                  {t(`tasks.status.${task.status}`)}
                </Badge>
              </div>

              {task.description && (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{task.description}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-5 text-sm text-gray-500 dark:text-gray-400">
                {task.profession && <span className="flex items-center gap-1.5"><Briefcase size={14} />{task.profession}</span>}
                {task.address && <span className="flex items-center gap-1.5"><MapPin size={14} />{task.address}</span>}
                {task.createdAt && <span className="flex items-center gap-1.5"><Clock size={14} />{new Date(task.createdAt).toLocaleDateString()}</span>}
              </div>

              {task.userName && (
                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <span className="text-primary-700 dark:text-primary-300 font-semibold">{task.userName}</span>
                </div>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {t('tasks.offers.title')} ({task.offersCount || offers.length})
                </h2>
                {canSubmitOffer ? (
                  <Button size="sm" onClick={() => setOfferOpen(true)}>
                    {t('tasks.offers.submit')}
                  </Button>
                ) : (
                  user && isWorker && currentWorkerOffer && (
                    <Badge variant="green" className="py-1.5 px-3">
                      {t('tasks.offers.offerSubmitted')}
                    </Badge>
                  )
                )}
              </div>

              {user && isWorker && currentWorkerOffer && (
                <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50/50 p-5 dark:border-primary-900/30 dark:bg-primary-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-primary-900 dark:text-primary-100">{t('tasks.offers.offerSubmitted')}</h3>
                    <Badge variant={currentWorkerOffer.status === 'COMPLETED' ? 'green' : 'blue'}>
                      {formatOfferStatus(currentWorkerOffer.status, t)}
                    </Badge>
                  </div>
                  {currentWorkerOffer.message && (
                    <p className="text-sm text-primary-800 dark:text-primary-200 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-primary-100/50 dark:border-primary-900/20">
                      {currentWorkerOffer.message}
                    </p>
                  )}
                </div>
              )}

              {offerSuccess && (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
                  {offerSuccess}
                </div>
              )}

              {actionError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  {actionError}
                </div>
              )}

              {!user ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900/40">
                  <Lock size={26} className="mx-auto mb-3 text-gray-400" />
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    {t('tasks.offers.guestHint')}
                  </p>
                  <Button size="sm" onClick={() => navigate('/login')}>
                    {t('nav.login')}
                  </Button>
                </div>
              ) : offers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t('tasks.offers.noOffers')}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {offers.map((offer) => (
                    <div key={offer.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <User size={14} className="text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {offer.workerName || offer.worker?.name || 'Worker'}
                            </p>
                            <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
                              {formatOfferStatus(offer.status, t)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {canManageOffers && offer.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptOffer(offer.id)}
                                loading={submitting}
                                className="text-xs py-1.5 px-3"
                              >
                                <CheckCircle2 size={13} /> {t('tasks.offers.accept')}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRejectOffer(offer.id)}
                                loading={submitting}
                                className="text-xs py-1.5 px-3"
                              >
                                <XCircle size={13} /> {t('tasks.offers.reject')}
                              </Button>
                            </>
                          )}

                          {canWorkerRespondToSelection && offer.id === currentWorkerOffer?.id && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleWorkerOfferDecision(offer.id, 'accept')}
                                loading={submitting}
                                className="text-xs py-1.5 px-3"
                              >
                                <CheckCircle2 size={13} /> {t('tasks.offers.acceptExecution')}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleWorkerOfferDecision(offer.id, 'refuse')}
                                loading={submitting}
                                className="text-xs py-1.5 px-3"
                              >
                                <XCircle size={13} /> {t('tasks.offers.rejectExecution')}
                              </Button>
                            </>
                          )}

                          {['ACCEPTED', 'SELECTED', 'IN_PROGRESS', 'COMPLETED'].includes(offer.status) && (
                            <Badge variant={offer.status === 'COMPLETED' ? 'green' : 'blue'}>
                              {formatOfferStatus(offer.status, t)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {offer.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ms-10">{offer.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
            <div className="card p-5 mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('common.info')}</h3>
              <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>{t('tasks.offers.title')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{task.offersCount || offers.length}</span>
                </div>
                {task.profession && (
                  <div className="flex justify-between">
                    <span>{t('common.profession')}</span>
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{task.profession}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{t('common.status')}</span>
                  <Badge variant={statusVariant[task.status] || 'gray'} className="text-xs">
                    {t(`tasks.status.${task.status}`)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('tasks.manage')}</h3>
              <div className="space-y-2">
                {canEditTask && (
                  <Button variant="secondary" className="w-full" onClick={openEditModal}>
                    {t('tasks.edit')}
                  </Button>
                )}

                {canCancelTask && (
                  <Button variant="danger" className="w-full" loading={submitting} onClick={handleCancelTask}>
                    {t('tasks.cancel')}
                  </Button>
                )}

                {canDeleteTask && (
                  <Button variant="danger" className="w-full" loading={submitting} onClick={handleDeleteTask}>
                    {t('tasks.delete')}
                  </Button>
                )}

                {isOwner && task.status === 'IN_PROGRESS' && (
                  <Button className="w-full" loading={submitting} onClick={handleMarkDone}>
                    <CheckCircle2 size={15} />
                    {t('tasks.markDone')}
                  </Button>
                )}

                {canRate && (
                  <Button variant="secondary" className="w-full" onClick={openRatingModal}>
                    <Star size={15} />
                    {t('tasks.rate')}
                  </Button>
                )}

                {currentWorkerOffer && (
                  <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900/50 dark:text-gray-300">
                    <p className="font-medium text-gray-900 dark:text-white">{t('tasks.offerStatus')}</p>
                    <p className="mt-1">{formatOfferStatus(currentWorkerOffer.status, t)}</p>
                  </div>
                )}

                {selectedOffer && (
                  <div className="rounded-2xl bg-primary-50 p-4 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                    <p className="font-medium">{t('tasks.selectedOffer')}</p>
                    <p className="mt-1">{selectedOffer.workerName || selectedOffer.worker?.name || t('common.worker')}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <Modal open={offerOpen} onClose={() => setOfferOpen(false)} title={t('tasks.offers.submit')}>
          <form onSubmit={handleSubmitOffer} className="flex flex-col gap-4">
            {offerError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                {offerError}
              </div>
            )}
            <Textarea label={t('tasks.offers.message')} value={offerForm.message} onChange={e => setOfferForm({ message: e.target.value })} required />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setOfferOpen(false)} className="flex-1">{t('common.cancel')}</Button>
              <Button type="submit" loading={submitting} className="flex-1">{t('tasks.offers.submit')}</Button>
            </div>
          </form>
        </Modal>

        <Modal open={ratingOpen} onClose={() => setRatingOpen(false)} title={t('workers.profile.rate')}>
          <form onSubmit={handleSubmitRating} className="flex flex-col gap-4">
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900/50 dark:text-gray-300">
              {isOwner
                ? (selectedOffer?.workerName || selectedOffer?.worker?.name || task.title)
                : (task.userName || 'صاحب المهمة')}
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

        <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('tasks.edit')}>
          <form onSubmit={handleUpdateTask} className="flex flex-col gap-4">
            <Input
              label={t('tasks.form.title')}
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <Textarea
              label={t('tasks.form.description')}
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
            <Input
              label={t('tasks.form.profession')}
              value={editForm.profession}
              onChange={(e) => setEditForm((prev) => ({ ...prev, profession: e.target.value }))}
            />
            <Input
              label={t('tasks.form.location')}
              value={editForm.address}
              onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={editSubmitting} className="flex-1">
                {t('tasks.form.update')}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
