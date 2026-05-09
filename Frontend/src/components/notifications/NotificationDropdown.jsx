import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { notificationsApi } from '../../api/notifications'
import { useAuth } from '../../context/AuthContext'

export default function NotificationDropdown() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [busy, setBusy] = useState(false)
  const ref = useRef()
  // eslint-disable-next-line no-unused-vars
  const _lang = i18n.language // Subscribe to language changes to trigger re-render

  const loadUnreadCount = () => {
    if (!user) {
      setUnread(0)
      return
    }
    notificationsApi.getUnreadCount()
      .then(r => setUnread(r.data?.unreadCount ?? r.data ?? 0))
      .catch(() => {})
  }

  const loadNotifications = () => {
    if (!user) {
      setNotifications([])
      return
    }
    notificationsApi.getAll()
      .then(r => setNotifications(r.data || []))
      .catch(() => {})
  }

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setUnread(0)
      return
    }
    loadUnreadCount()
    const intervalId = setInterval(() => {
      loadUnreadCount()
      if (open) loadNotifications()
    }, 15000)
    return () => clearInterval(intervalId)
  }, [open, user])

  useEffect(() => {
    if (!open || !user) return
    loadNotifications()
  }, [open, user])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId)
      setNotifications(prev => prev.map(item => item.id === notificationId ? { ...item, isRead: true, read: true } : item))
      setUnread(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const handleMarkAllAsRead = async () => {
    setBusy(true)
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true, read: true })))
      setUnread(0)
    } catch {}
    setBusy(false)
  }

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationsApi.deleteOne(notificationId)
      setNotifications(prev => prev.filter(item => item.id !== notificationId))
      loadUnreadCount()
    } catch {}
  }

  const handleDeleteAll = async () => {
    setBusy(true)
    try {
      await notificationsApi.deleteAll()
      setNotifications([])
      setUnread(0)
    } catch {}
    setBusy(false)
  }

  const translateMessage = (msg) => {
    if (!msg) return ''
    
    // Pattern matching for backend English messages
    if (msg.startsWith('You have been selected for the task:')) {
      const taskName = msg.replace('You have been selected for the task:', '').trim()
      return t('notifications.patterns.selected', { taskName })
    }
    if (msg.startsWith('A new offer has been submitted for your task:')) {
      const taskName = msg.replace('A new offer has been submitted for your task:', '').trim()
      return t('notifications.patterns.newOffer', { taskName })
    }
    if (msg.includes('Your offer for the task') && msg.includes('has been accepted')) {
      const taskName = msg.replace('Your offer for the task', '').replace('has been accepted', '').trim()
      return t('notifications.patterns.offerAccepted', { taskName })
    }
    if (msg.includes('Your offer for the task') && msg.includes('has been rejected')) {
      const taskName = msg.replace('Your offer for the task', '').replace('has been rejected', '').trim()
      return t('notifications.patterns.offerRejected', { taskName })
    }
    if (msg.startsWith('The task') && msg.endsWith('is completed')) {
      const taskName = msg.replace('The task', '').replace('is completed', '').trim()
      return t('notifications.patterns.taskCompleted', { taskName })
    }
    if (msg.startsWith('Your booking is confirmed for:')) {
      const date = msg.replace('Your booking is confirmed for:', '').trim()
      return t('notifications.patterns.bookingConfirmed', { date })
    }
    if (msg.startsWith('You have a new booking request for:')) {
      const date = msg.replace('You have a new booking request for:', '').trim()
      return t('notifications.patterns.newBooking', { date })
    }
    if (msg.includes('Your worker account has been verified')) {
      return t('notifications.patterns.workerVerified')
    }
    if (msg.startsWith('Your task has been approved and is now visible on the platform:')) {
      const taskName = msg.replace('Your task has been approved and is now visible on the platform:', '').trim()
      return t('notifications.patterns.taskApproved', { taskName })
    }
    if (msg.startsWith('Worker') && msg.includes('has accepted to start working on:')) {
      const parts = msg.replace('Worker', '').split('has accepted to start working on:')
      const workerName = parts[0].trim()
      const taskName = parts[1].trim()
      return t('notifications.patterns.workerAccepted', { workerName, taskName })
    }
    if (msg.startsWith('Worker') && msg.includes('has refused the task:')) {
      const parts = msg.replace('Worker', '').split('has refused the task:')
      const workerName = parts[0].trim()
      const taskName = parts[1].trim()
      return t('notifications.patterns.workerRefused', { workerName, taskName })
    }
    if (msg.startsWith('Worker submitted identity document for review:')) {
      const workerName = msg.replace('Worker submitted identity document for review:', '').trim()
      return t('notifications.patterns.identitySubmitted', { workerName })
    }
    if (msg.startsWith('New worker registration pending approval:')) {
      const workerName = msg.replace('New worker registration pending approval:', '').trim()
      return t('notifications.patterns.workerPendingApproval', { workerName })
    }
    if (msg.includes('has been approved') && msg.startsWith('Worker')) {
      const workerName = msg.replace('Worker', '').replace('has been approved', '').trim()
      return t('notifications.patterns.workerApproved', { workerName })
    }
    if (msg.includes('has been rejected') && msg.startsWith('Worker')) {
      const workerName = msg.replace('Worker', '').replace('has been rejected', '').trim()
      return t('notifications.patterns.workerRejected', { workerName })
    }
    if (msg.startsWith('Your task has been rejected:')) {
      const taskName = msg.replace('Your task has been rejected:', '').trim()
      return t('notifications.patterns.taskRejected', { taskName })
    }
    if (msg.startsWith('Task cancelled:')) {
      const taskName = msg.replace('Task cancelled:', '').trim()
      return t('notifications.patterns.taskCancelled', { taskName })
    }
    if (msg.startsWith('Booking cancelled:')) {
      const date = msg.replace('Booking cancelled:', '').trim()
      return t('notifications.patterns.bookingCancelled', { date })
    }

    return msg
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={t('nav.notifications')}
        disabled={!user}
      >
        <Bell size={20} className="text-gray-600 dark:text-gray-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 mt-2 w-80 card shadow-xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('notifications.title')}</h3>
                {unread > 0 && (
                  <span className="text-xs text-primary-500 font-medium">
                    {unread} {t('notifications.unread')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={busy || unread === 0}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600 disabled:opacity-40 dark:hover:bg-gray-800"
                  title={t('notifications.markAll')}
                >
                  <CheckCheck size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={busy || notifications.length === 0}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 disabled:opacity-40 dark:hover:bg-gray-800"
                  title={t('common.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">{t('notifications.empty')}</p>
              ) : (
                notifications.map((n, i) => (
                  <div key={n.id || i} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!(n.read ?? n.isRead) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="flex-1 text-start"
                        onClick={() => !(n.read ?? n.isRead) && n.id && handleMarkAsRead(n.id)}
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {translateMessage(n.message || n.content)}
                        </p>
                        {n.createdAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        )}
                      </button>
                      {n.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(n.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                          title={t('common.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
