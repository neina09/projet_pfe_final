import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  Pencil,
  XCircle,
  Trash2,
  Star,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Eye
} from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

const bookingStatusVariant = {
  PENDING: 'yellow',
  ACCEPTED: 'green',
  COMPLETED: 'primary',
  CANCELLED: 'red',
  REJECTED: 'red',
}

const statusBorderClass = {
  PENDING: 'border-s-amber-400 dark:border-s-amber-500',
  ACCEPTED: 'border-s-emerald-400 dark:border-s-emerald-500',
  COMPLETED: 'border-s-primary-400 dark:border-s-primary-500',
  CANCELLED: 'border-s-red-400 dark:border-s-red-500',
  REJECTED: 'border-s-red-400 dark:border-s-red-500',
}

const BOOKING_FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED']

export default function BookingsList({
  bookings = [],
  onEdit,
  onCancel,
  onDelete,
  onRate,
  onView,
  cancelling,
  deletingBooking,
}) {
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState('ALL')
  const isRtl = i18n.language?.startsWith('ar')

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6

  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === filter)

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedBookings = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getCount = (status) => {
    if (status === 'ALL') return bookings.length
    return bookings.filter(b => b.status === status).length
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap pb-1.5 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60">
        {BOOKING_FILTERS.map(status => {
          const count = getCount(status)
          const isActive = filter === status
          return (
            <button
              key={status}
              onClick={() => {
                setFilter(status)
                setCurrentPage(1)
              }}
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

      {/* Grid view of bookings */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
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
              {isRtl ? 'لم يتم العثور على أي حجوزات تطابق هذا الفلتر حالياً.' : 'No bookings found matching your selected filter currently.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start"
          >
            {paginatedBookings.map((b, i) => {
              const borderAccent = statusBorderClass[b.status] || 'border-s-gray-200'
              const personName = b.workerName || t('common.worker')

              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.05, 0.2) }}
                  className={`card relative overflow-hidden flex flex-col justify-between border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all duration-200 bg-white dark:bg-gray-900 rounded-2xl border-s-4 ${borderAccent}`}
                >
                  <div className="p-3 flex-1 flex flex-col gap-1.5 cursor-pointer" onClick={() => onView?.(b)}>
                    {/* User profile & status row */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                          {b.workerPhoto ? (
                            <img
                              src={b.workerPhoto}
                              alt={personName}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                              onError={e => { e.target.style.display = 'none'; if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex' }}
                            />
                          ) : null}
                          <div
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs border border-gray-200 dark:border-gray-700"
                            style={{ display: b.workerPhoto ? 'none' : 'flex' }}
                          >
                            {(personName || '?')[0].toUpperCase()}
                          </div>
                        </div>

                        {/* Name & status label */}
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm hover:text-primary-500 transition-colors">
                            {personName}
                          </h3>
                          <p className="text-[9px] text-gray-500 mt-0.5">
                            {isRtl ? 'حجز موجه للمهني' : 'Booking for Worker'}
                          </p>
                        </div>
                      </div>

                      <Badge variant={bookingStatusVariant[b.status] || 'gray'} className="shrink-0 font-medium px-2 py-0.5 text-[10px]">
                        {t(`bookings.status.${b.status}`)}
                      </Badge>
                    </div>

                    {/* Booking Description / Details */}
                    {b.description && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {b.description}
                      </p>
                    )}

                    {/* Info tags grid */}
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

                      {b.workerPhone && (
                        <div className="flex items-center gap-1.5 min-w-0" dir="ltr">
                          <Phone size={13} className="text-primary-500 shrink-0" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {b.workerPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" onClick={() => onView?.(b)}>
                      <Eye size={13} className="me-1" />
                      {t('common.view')}
                    </Button>

                    {b.status === 'COMPLETED' && !b.isRated && onRate && (
                      <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center" onClick={() => onRate(b)}>
                        <Star size={13} className="fill-amber-500 text-amber-500 me-1" />
                        {t('workers.profile.rate')}
                      </Button>
                    )}

                    {b.status === 'PENDING' && onEdit && (
                      <Button size="sm" variant="secondary" className="h-7 text-[11px] !py-0 px-2.5 flex items-center" onClick={() => onEdit(b)}>
                        <Pencil size={13} className="me-1" />
                        {t('common.edit')}
                      </Button>
                    )}

                    {(b.status === 'PENDING' || b.status === 'ACCEPTED') && onCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        className="h-7 text-[11px] !py-0 px-2.5 flex items-center"
                        loading={cancelling === b.id}
                        onClick={() => onCancel(b.id)}
                      >
                        <XCircle size={13} className="me-1" />
                        {t('common.cancel')}
                      </Button>
                    )}

                    {['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status) && onDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        className="h-7 text-[11px] !py-0 px-2.5 flex items-center"
                        loading={deletingBooking === b.id}
                        onClick={() => onDelete(b.id)}
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
