import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { 
  Briefcase, 
  Pencil, 
  XCircle, 
  Trash2, 
  CheckCircle2, 
  Star, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  User, 
  Eye, 
  Clock,
  Hammer
} from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

const statusVariant = {
  PENDING_REVIEW: 'yellow',
  PENDING: 'yellow',
  OPEN: 'blue',
  IN_PROGRESS: 'primary',
  COMPLETED: 'green',
  CLOSED: 'gray',
  CANCELLED: 'red',
  REJECTED: 'red',
  WORKER_REFUSED: 'red',
}

const statusBorderClass = {
  PENDING_REVIEW: 'border-s-amber-400 dark:border-s-amber-500',
  PENDING: 'border-s-amber-400 dark:border-s-amber-500',
  OPEN: 'border-s-blue-400 dark:border-s-blue-500',
  IN_PROGRESS: 'border-s-primary-400 dark:border-s-primary-500',
  COMPLETED: 'border-s-emerald-400 dark:border-s-emerald-500',
  CLOSED: 'border-s-gray-400 dark:border-s-gray-500',
  CANCELLED: 'border-s-red-400 dark:border-s-red-500',
  REJECTED: 'border-s-red-400 dark:border-s-red-500',
  WORKER_REFUSED: 'border-s-red-400 dark:border-s-red-500',
}

const TASK_FILTERS = ['ALL', 'IN_PROGRESS', 'COMPLETED', 'OPEN', 'PENDING', 'CANCELLED']

export default function TasksList({
  tasks = [],
  onEdit,
  onCancel,
  onDelete,
  onComplete,
  onRate,
  cancelling,
}) {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6
  const isRtl = i18n.language?.startsWith('ar')

  const filtered = filter === 'ALL'
    ? tasks
    : tasks.filter(task => {
        const s = task.status === 'PENDING_REVIEW' ? 'PENDING' : task.status
        return s === filter
      })

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedTasks = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getCount = (status) => {
    if (status === 'ALL') return tasks.length
    return tasks.filter(task => {
      const s = task.status === 'PENDING_REVIEW' ? 'PENDING' : task.status
      return s === status
    }).length
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap pb-1.5 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60">
        {TASK_FILTERS.map(status => {
          const count = getCount(status)
          const isActive = filter === status
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all duration-200 shrink-0 ${
                isActive
                  ? 'border-primary-500 text-primary-600 bg-primary-50/80 dark:bg-primary-950/20 dark:text-primary-400 shadow-sm scale-102'
                  : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{t(`tasks.status.${status}`)}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                isActive 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid view of tasks */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400">
              <Briefcase size={28} className="opacity-60" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white mb-1">{t('tasks.empty')}</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
              {isRtl ? 'لم تقم بإنشاء أي طلبات مطابقة لهذا الفلتر حالياً.' : 'No tasks match your selected filter currently.'}
            </p>
            {onEdit && (
              <Link to="/tasks">
                <Button size="md" className="shadow-lg shadow-primary-500/20">{t('tasks.create')}</Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start"
          >
            {paginatedTasks.map((task, i) => {
              const borderAccent = statusBorderClass[task.status] || 'border-s-gray-200'
              const translatedProfession = task.profession 
                ? t(`home.categories.${task.profession.toLowerCase()}`, task.profession) 
                : ''

              return (
                <motion.div
                  key={task.id}
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
                        {task.profession && (
                          <div className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 mb-0.5 capitalize">
                            {translatedProfession}
                          </div>
                        )}
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug line-clamp-1">
                          {task.title}
                        </h3>
                      </div>
                      <Badge variant={statusVariant[task.status] || 'gray'} className="shrink-0 font-medium px-2 py-0.5 text-[10px]">
                        {task.status === 'PENDING_REVIEW' ? t('tasks.status.PENDING') : t(`tasks.status.${task.status}`)}
                      </Badge>
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1.5 pb-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{task.createdAt ? new Date(task.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                      </div>

                      {task.address && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate">{task.address}</span>
                        </div>
                      )}

                      {task.offersCount !== undefined && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MessageSquare size={13} className="text-primary-500 shrink-0" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {task.offersCount} {isRtl ? 'عروض' : 'offers'}
                          </span>
                        </div>
                      )}

                      {task.assignedWorkerName && (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User size={13} className="text-emerald-500 shrink-0" />
                          <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                            {isRtl ? `معين لـ: ${task.assignedWorkerName}` : `Assigned: ${task.assignedWorkerName}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1.5 flex-wrap">
                    <Link to={`/tasks/${task.id}`}>
                      <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 flex items-center">
                        <Eye size={13} className="me-1" />
                        {t('common.view')}
                      </Button>
                    </Link>

                    {['PENDING_REVIEW', 'OPEN', 'PENDING'].includes(task.status) && (
                      <>
                        {onEdit && (
                          <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" onClick={() => onEdit(task)}>
                            <Pencil size={13} className="me-1" />
                            {t('common.edit')}
                          </Button>
                        )}
                        {onCancel && (
                          <Button size="sm" variant="danger" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" loading={cancelling === `cancel-task-${task.id}`} onClick={() => onCancel(task.id)}>
                            <XCircle size={13} className="me-1" />
                            {t('common.cancel')}
                          </Button>
                        )}
                      </>
                    )}

                    {['COMPLETED', 'CANCELLED', 'CLOSED', 'REJECTED', 'WORKER_REFUSED'].includes(task.status) && onDelete && (
                      <Button size="sm" variant="danger" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" loading={cancelling === `delete-task-${task.id}`} onClick={() => onDelete(task.id)}>
                        <Trash2 size={13} className="me-1" />
                        {t('common.delete')}
                      </Button>
                    )}

                    {task.status === 'IN_PROGRESS' && onComplete && (
                      <Button size="sm" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" loading={cancelling === `task-${task.id}`} onClick={() => onComplete(task.id)}>
                        <CheckCircle2 size={13} className="me-1" />
                        {t('tasks.status.COMPLETED')}
                      </Button>
                    )}

                    {task.status === 'COMPLETED' && !task.isRated && onRate && (
                      <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center" onClick={() => onRate(task)}>
                        <Star size={13} className="fill-amber-500 text-amber-500 me-1" />
                        {t('workers.profile.rate')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 pb-2 border-t border-gray-100 dark:border-gray-800/60 mt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="!px-4"
          >
            {isRtl ? 'السابق' : 'Previous'}
          </Button>

          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-2">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="!px-4"
          >
            {isRtl ? 'التالي' : 'Next'}
          </Button>
        </div>
      )}
    </div>
  )
}
