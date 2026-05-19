import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MapPin, Star, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { endpoint } from '../../api/endpoints'
import { formatAddress } from '../../lib/utils'

export default function WorkerCard({ worker, index = 0 }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const name = worker.name || worker.fullName || worker.user?.name || t('common.worker')
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const image = worker.profilePictureUrl
    ? (worker.profilePictureUrl.startsWith('http') ? worker.profilePictureUrl : endpoint(worker.profilePictureUrl))
    : ''
  const isAvailable = worker.available || worker.availability === 'AVAILABLE'
  const bookTarget = user ? `/workers/${worker.id}?book=1` : '/login'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
      className="group relative flex flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all duration-300 hover:border-primary-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-900/30"
    >
      {/* Header Row */}
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-full ring-2 ring-gray-50 dark:ring-gray-800">
            {image ? (
              <>
                <img
                  src={image}
                  alt={name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-xl font-bold text-white">
                  {initials}
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          {worker.verified && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm dark:bg-gray-900 dark:text-primary-400">
              <CheckCircle2 size={12} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">{name}</h3>
            <Badge 
              variant={isAvailable ? 'green' : 'gray'} 
              className="rounded-full px-2 py-0.5 text-[9px] font-bold"
            >
              {isAvailable ? t('workers.card.available') : t('workers.card.busy')}
            </Badge>
          </div>
          <p className="truncate text-xs font-medium text-primary-600 dark:text-primary-400">
            {t(`home.categories.${worker.profession || worker.job}`, { defaultValue: worker.profession || worker.job }) || '—'}
          </p>
          
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-bold">{worker.rating?.toFixed(1) ?? '0.0'}</span>
            </div>
            
            {worker.location && (
              <div className="flex min-w-0 items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="flex-shrink-0 text-gray-400" />
                <span className="truncate block">{formatAddress(worker.location)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-1.5 pt-1">
        <Link to={`/workers/${worker.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full h-7 rounded-lg !py-0 text-[11px] font-bold flex items-center justify-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800">
            {t('workers.card.viewProfile')}
          </Button>
        </Link>
        {isAvailable ? (
          <Link to={bookTarget} className="flex-1">
            <Button size="sm" className="w-full h-7 rounded-lg !py-0 text-[11px] font-bold flex items-center justify-center">
              {t('workers.card.book')}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="flex-1 h-7 rounded-lg !py-0 text-[11px] font-bold opacity-50 cursor-not-allowed flex items-center justify-center" disabled>
            {t('workers.card.busy')}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

