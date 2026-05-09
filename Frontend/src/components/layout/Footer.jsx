import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 mt-auto">
      <div className="page-container py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-sm"><img src="/logo.svg" alt="Ommalak" /></div>
              Ommalak
            </div>
            <p className="text-sm leading-relaxed">{t('app.description')}</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">{t('nav.home')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/workers" className="hover:text-primary-400 transition-colors">{t('nav.workers')}</Link></li>
              <li><Link to="/tasks" className="hover:text-primary-400 transition-colors">{t('nav.tasks')}</Link></li>
              <li><Link to="/become-worker" className="hover:text-primary-400 transition-colors">{t('nav.becomeWorker')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <p className="text-sm">Mauritanie</p>
            <p className="text-sm mt-1">info@ommalak.mr</p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
          © {new Date().getFullYear()} Ommalak — Tous droits réservés
        </div>
      </div>
    </footer>
  )
}
