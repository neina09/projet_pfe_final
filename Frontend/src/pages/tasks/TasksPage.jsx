import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Briefcase, LocateFixed, MapPinned } from 'lucide-react'
import { tasksApi } from '../../api/tasks'
import { useAuth } from '../../context/AuthContext'
import TaskCard from '../../components/tasks/TaskCard'
import Layout from '../../components/layout/Layout'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { Textarea, Select } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { normalizeTask } from '../../lib/normalizers'

// Status labels are handled via t() in the component
const TASK_TYPE_OPTIONS = [
  { value: 'plumber', labelKey: 'home.categories.plumber' },
  { value: 'electrician', labelKey: 'home.categories.electrician' },
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

export default function TasksPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('OPEN')
  
  useEffect(() => {
    if (user) {
      setStatusFilter('ALL')
    } else {
      setStatusFilter('OPEN')
    }
  }, [user])
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', profession: '', address: '', latitude: '', longitude: '' })
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [resolvingAddress, setResolvingAddress] = useState(false)

  const load = () => {
    setLoading(true)
    // If filtering for ALL or OPEN, we use the public endpoint.
    // Otherwise, we fetch the user's own tasks and filter locally.
    const request = (statusFilter === 'ALL' || statusFilter === 'OPEN')
      ? tasksApi.getAll()
      : tasksApi.getMy()

    request
      .then((r) => {
        const data = r.data?.content || r.data || []
        setTasks(data.map(normalizeTask))
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  useEffect(() => {
    if (createOpen && !form.latitude && !form.longitude) {
      handleDetectLocation()
    }
  }, [createOpen])

  const reverseGeocode = async (latitude, longitude) => {
    setResolvingAddress(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=ar`,
        {
          headers: {
            'Accept-Language': 'ar',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Reverse geocoding failed')
      }

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

      setForm((prev) => ({
        ...prev,
        address: readableName || data?.display_name || prev.address,
      }))
    } catch {
      setForm((prev) => ({
        ...prev,
        address: prev.address || `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`,
      }))
    } finally {
      setResolvingAddress(false)
    }
  }

  const availableStatuses = useMemo(() => ['ALL', 'OPEN', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], [])

  useEffect(() => {
    if (!availableStatuses.includes(statusFilter)) {
      setStatusFilter('ALL')
    }
  }, [availableStatuses, statusFilter])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return tasks.filter((task) => {
      const normalizedStatus = (task.status === 'PENDING_REVIEW' || task.status === 'PENDING') ? 'PENDING' : task.status
      const searchableText = [
        task.title,
        task.description,
        task.profession,
        task.address,
        task.location,
        task.userName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchSearch = !q || searchableText.includes(q)
      const matchStatus = statusFilter === 'ALL' || normalizedStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, tasks])

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t('common.error'))
      return
    }

    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setForm((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }))
        reverseGeocode(latitude.toFixed(6), longitude.toFixed(6))
        setLocating(false)
      },
      () => {
        setLocationError(t('common.error'))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await tasksApi.create({
        title: form.title,
        description: form.description,
        profession: form.profession,
        address: form.address,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      })
      setCreateOpen(false)
      setForm({ title: '', description: '', profession: '', address: '', latitude: '', longitude: '' })
      setLocationError('')
      load()
    } catch {}
    setSubmitting(false)
  }

  return (
    <Layout>
      <div className="page-container py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="section-title">{t('tasks.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('tasks.subtitle')}</p>
          </div>
          {user ? (
            <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
              <Plus size={16} /> {t('tasks.create')}
            </Button>
          ) : (
            <Link to="/login">
              <Button className="flex items-center gap-2">
                <Plus size={16} /> {t('tasks.create')}
              </Button>
            </Link>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('tasks.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base ps-10"
            />
          </div>
          {user && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {availableStatuses.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                    statusFilter === s
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {t(`tasks.status.${s}`) || s}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <p className="text-sm text-gray-500 mb-4">{filtered.length} {t('tasks.title').toLowerCase()}</p>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title={t('tasks.empty')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)}
          </div>
        )}

        {/* Create Task Modal */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('tasks.create')}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input label={t('tasks.form.title')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            <Textarea label={t('tasks.form.description')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            <Select label={t('tasks.form.profession')} value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} required>
              <option value="">{t('common.select')}</option>
              {TASK_TYPE_OPTIONS.map((option) => (
                <option key={option.value || option.id} value={option.value || option.id}>{t(option.labelKey)}</option>
              ))}
            </Select>
            <Input label={t('tasks.form.location')} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                  <MapPinned size={16} className="text-primary-500" />
                  {t('tasks.form.location')}
                </div>
                <Button type="button" variant="secondary" onClick={handleDetectLocation} loading={locating} className="px-4 py-2 text-sm">
                  <LocateFixed size={15} />
                  {t('tasks.form.location')}
                </Button>
              </div>

              {locationError && (
                <p className="mb-3 text-sm text-red-500">{locationError}</p>
              )}

              {(resolvingAddress || locating) && !locationError && (
                <p className="mb-3 text-sm text-primary-600">{t('common.loading')}</p>
              )}

              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
                {form.latitude && form.longitude ? (
                  <iframe
                    title="task-location-map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude) - 0.01}%2C${Number(form.latitude) - 0.01}%2C${Number(form.longitude) + 0.01}%2C${Number(form.latitude) + 0.01}&layer=mapnik&marker=${form.latitude}%2C${form.longitude}`}
                    className="h-64 w-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-white text-sm text-gray-400 dark:bg-gray-950">
                    {t('common.noData')}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} className="flex-1">{t('common.cancel')}</Button>
              <Button type="submit" loading={submitting} className="flex-1">{t('tasks.form.submit')}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
