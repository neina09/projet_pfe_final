import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import { useTranslation } from 'react-i18next'

import SplashScreen    from './components/SplashScreen'
import Home             from './pages/Home'
import Login            from './pages/auth/Login'
import Register         from './pages/auth/Register'
import OtpVerify        from './pages/auth/OtpVerify'
import ForgotPassword   from './pages/auth/ForgotPassword'
import ResetPassword    from './pages/auth/ResetPassword'
import WorkersPage      from './pages/workers/WorkersPage'
import WorkerProfile    from './pages/workers/WorkerProfile'
import TasksPage        from './pages/tasks/TasksPage'
import TaskDetail       from './pages/tasks/TaskDetail'
import UserDashboard    from './pages/dashboard/UserDashboard'
import WorkerDashboard  from './pages/dashboard/WorkerDashboard'
import BecomeWorker     from './pages/BecomeWorker'
import AdminDashboard   from './pages/admin/AdminDashboard'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function DashboardRoute() {
  const { isWorker, isAdmin } = useAuth()
  if (isAdmin) return <Navigate to="/admin" replace />
  if (isWorker) return <WorkerDashboard />
  return <UserDashboard />
}

// Full-screen logout overlay
function LogoutOverlay() {
  const { loggingOut } = useAuth()
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {loggingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-500"
          />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">{t('common.loggingOut')}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const { appReady } = useAuth()

  return (
    <>
      <AnimatePresence>
        {!appReady && <SplashScreen key="splash" />}
      </AnimatePresence>

      <LogoutOverlay />

      <AnimatePresence mode="wait">
        <Routes>
          {/* Public */}
          <Route path="/"               element={<Home />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/verify-otp"     element={<OtpVerify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/workers"        element={<WorkersPage />} />
          <Route path="/workers/:id"    element={<WorkerProfile />} />
          <Route path="/tasks"          element={<TasksPage />} />
          <Route path="/tasks/:id"      element={<TaskDetail />} />

          {/* Protected */}
          <Route path="/dashboard"    element={<PrivateRoute><DashboardRoute /></PrivateRoute>} />
          <Route path="/become-worker" element={<PrivateRoute><BecomeWorker /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
