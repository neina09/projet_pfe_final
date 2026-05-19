import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 mt-auto">
      <div className="page-container py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/logo.svg" alt="3ommalek" className="w-8 h-8" />
              </div>
              3ommalek | عمالك
            </div>
            <p className="text-sm leading-relaxed">{t('app.description')}</p>
          </div>

          {/* Navigation */}
          <div>
            <Link to="/" className="block text-white font-semibold mb-3 hover:text-primary-400 transition-colors">
              {t('nav.home')}
            </Link>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/workers" className="hover:text-primary-400 transition-colors">
                  {t('nav.workers')}
                </Link>
              </li>
              <li>
                <Link to="/tasks" className="hover:text-primary-400 transition-colors">
                  {t('nav.tasks')}
                </Link>
              </li>
              <li>
                <Link to="/become-worker" className="hover:text-primary-400 transition-colors">
                  {t('nav.becomeWorker')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-primary-400 shrink-0" />
                <span>Mauritanie, Nouakchott</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-primary-400 shrink-0" />
                <a
                  href="mailto:info@3ommalek.mr"
                  className="hover:text-primary-400 transition-colors"
                >
                  info@3ommalek.mr
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-primary-400 shrink-0" />
                <a
                  href="tel:+22200000000"
                  className="hover:text-primary-400 transition-colors"
                >
                  +222 00 00 00 00
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          © {new Date().getFullYear()} 3ommalek | عمالك — Tous droits réservés
        </div>
      </div>
    </footer>
  )
}
