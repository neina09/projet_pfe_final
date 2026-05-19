import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sun, Moon, Globe, ChevronDown, User, LogOut, LayoutDashboard, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useLang } from '../../context/LanguageContext'
import NotificationDropdown from '../notifications/NotificationDropdown'
import { endpoint } from '../../api/endpoints'

export default function Navbar() {
  const { t } = useTranslation()
  const { user, logout, isAdmin, isWorker } = useAuth()
  const { dark, toggle } = useTheme()
  const { lang, switchLang } = useLang()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [user?.profilePictureUrl])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    setMobileOpen(false)
    setUserMenuOpen(false)
  }

  const navLinks = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/workers', label: t('nav.workers') },
    { to: '/tasks', label: t('nav.tasks') },
    ...(user && !isAdmin ? [{ to: '/dashboard', label: t('nav.dashboard') }] : []),
    ...(isAdmin ? [{ to: '/admin', label: t('nav.admin') }] : []),
  ]

  const siteName = "3ommalek | عمالك"

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
      <nav className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-primary-600 dark:text-primary-400">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
            <img src="/logo.svg" alt="3ommalek" className="w-8 h-8" />
          </div>
          <span className="hidden sm:block">{siteName}</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Language */}
          <button
            onClick={() => switchLang(lang === 'fr' ? 'ar' : 'fr')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1"
            title="Changer la langue"
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{lang === 'fr' ? 'ع' : 'FR'}</span>
          </button>

          {/* Theme */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-gray-600" />}
          </button>

          {user ? (
            <>
              <NotificationDropdown />

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                    {user.profilePictureUrl && !imgError ? (
                      <img 
                        src={user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : endpoint(user.profilePictureUrl)} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      (user.name || user.fullName || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {user.name || user.fullName}
                  </span>
                  <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute end-0 mt-1 w-52 card shadow-xl py-1.5 z-50"
                      onMouseLeave={() => setUserMenuOpen(false)}
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <LayoutDashboard size={15} />
                        {t('nav.dashboard')}
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Shield size={15} />
                          {t('nav.admin')}
                        </Link>
                      )}
                      {!isWorker && !isAdmin && (
                        <Link
                          to="/become-worker"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <User size={15} />
                          {t('nav.becomeWorker')}
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100 dark:border-gray-800" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut size={15} />
                        {t('nav.logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="btn-secondary px-4 py-2 text-sm">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="btn-primary px-4 py-2 text-sm">
                {t('nav.register')}
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="page-container py-3 flex flex-col gap-1">
              {navLinks.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {!user && (
                <div className="flex gap-2 pt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 btn-secondary text-center text-sm py-2.5">
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 btn-primary text-center text-sm py-2.5">
                    {t('nav.register')}
                  </Link>
                </div>
              )}
              {user && (
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 font-medium">
                  <LogOut size={15} /> {t('nav.logout')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
