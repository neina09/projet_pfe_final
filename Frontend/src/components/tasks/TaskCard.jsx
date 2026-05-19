import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MapPin, Clock, Briefcase, MessageSquare, Pencil, Trash2, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Badge from '../ui/Badge'

const statusVariant = {
  PENDING:     'yellow',
  OPEN:        'blue',
  IN_PROGRESS: 'primary',
  COMPLETED:   'green',
  CANCELLED:   'red',
}

export default function TaskCard({ task, index = 0, onEdit, onDelete }) {
  const { t } = useTranslation()

  const statusKey = task.status || 'OPEN'

  const handleEdit = (e) => {
    e.preventDefault()
    onEdit?.(task)
  }

  const handleDelete = (e) => {
    e.preventDefault()
    onDelete?.(task)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
          {task.title}
        </h3>
        <Badge variant={statusVariant[task.status] || 'gray'} className="flex-shrink-0">
          {t(`tasks.status.${statusKey}`)}
        </Badge>
      </div>

      {task.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
        {task.profession && (
          <span className="flex items-center gap-1">
            <Briefcase size={12} /> {t(`home.categories.${task.profession.toLowerCase()}`) || task.profession}
          </span>
        )}
        {task.address && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {task.address}
          </span>
        )}
        {task.createdAt && (
          <span className="flex items-center gap-1">
            <Clock size={12} /> {new Date(task.createdAt).toLocaleDateString()}
          </span>
        )}
        {task.offersCount !== undefined && (
          <span className="flex items-center gap-1">
            <MessageSquare size={12} /> {task.offersCount} {t('tasks.offers.title')}
          </span>
        )}
      </div>

      {task.userName && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
            <User size={12} className="text-gray-500 dark:text-gray-400" />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {task.userName}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2">
        <Link
          to={`/tasks/${task.id}`}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium inline-flex items-center gap-1"
        >
          <span>{t('common.viewMore')}</span>
          <span className="inline-block rtl-flip">→</span>
        </Link>

      </div>
    </motion.div>
  )
}