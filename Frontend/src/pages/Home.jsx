import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Zap, Shield, Star, Users, Briefcase, Wrench, Hammer, Paintbrush, Droplets, Bolt } from 'lucide-react'
import { workersApi } from '../api/workers'
import WorkerCard from '../components/workers/WorkerCard'
import Layout from '../components/layout/Layout'
import { normalizeWorker } from '../lib/normalizers'

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
}
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

const CATEGORIES = [
  { icon: Droplets, key: 'plumber', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { icon: Bolt, key: 'electrician', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  { icon: Hammer, key: 'carpenter', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  { icon: Paintbrush, key: 'painter', color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  { icon: Wrench, key: 'mason', color: 'text-stone-500 bg-stone-50 dark:bg-stone-900/20' },
  { icon: Briefcase, key: 'cleaner', color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
]

export default function Home() {
  const { t } = useTranslation()
  const [workers, setWorkers] = useState([])

  useEffect(() => {
    workersApi.getPaged({ page: 0, size: 4 })
      .then((r) => setWorkers((r.data?.content || r.data || []).map(normalizeWorker)))
      .catch(() => {})
  }, [])

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-950 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_45%),linear-gradient(135deg,#f6fff9_0%,#ffffff_45%,#eefaf3_100%)] dark:bg-none dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent dark:from-primary-900/20 pointer-events-none" />
        <div className="page-container py-20 md:py-28">
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
              <Zap size={14} /> Mauritanie · {t('app.tagline')}
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
              {t('home.hero.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-emerald-400">
                {t('home.hero.titleHighlight')}
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl">
              {t('home.hero.subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/workers" className="btn-primary inline-flex items-center gap-2">
                {t('home.hero.ctaWorkers')}
                <ArrowRight size={16} className="rtl-flip" />
              </Link>
              <Link to="/tasks" className="btn-outline inline-flex items-center gap-2">
                {t('home.hero.ctaTasks')}
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-8 mt-12">
              {[
                { value: workers.length ? `${workers.length}+` : '500+', label: t('home.hero.stats.workers'), icon: Users },
                { value: '24/7', label: t('home.hero.stats.tasks'), icon: Briefcase },
                { value: 'Top', label: t('home.hero.stats.clients'), icon: Star },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <s.icon size={18} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 page-container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="section-title mb-2">{t('home.categories.title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">{t('app.tagline')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  to={`/workers?profession=${cat.key}`}
                  className="card p-4 flex flex-col items-center gap-3 text-center hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color}`}>
                    <cat.icon size={22} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(`home.categories.${cat.key}`)}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="page-container">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="section-title mb-2 text-center">{t('home.howItWorks.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-10">
              {['step1', 'step2', 'step3'].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="card p-6 text-center"
                >
                  <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {t(`home.howItWorks.${step}.title`)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(`home.howItWorks.${step}.desc`)}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Workers */}
      <section className="py-16 page-container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title">{t('home.featuredWorkers.title')}</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{t('home.featuredWorkers.subtitle')}</p>
            </div>
            <Link to="/workers" className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline flex items-center gap-1">
              {t('home.featuredWorkers.viewAll')} <ArrowRight size={14} className="rtl-flip" />
            </Link>
          </div>

          {workers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {workers.map((w, i) => <WorkerCard key={w.id} worker={w} index={i} />)}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p>{t('workers.empty')}</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-primary-500 to-emerald-500 dark:from-primary-700 dark:to-emerald-700">
        <div className="page-container text-center text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Shield size={40} className="mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-bold mb-3">{t('nav.becomeWorker')}</h2>
            <p className="text-primary-100 mb-6 max-w-md mx-auto">{t('becomeWorker.subtitle')}</p>
            <Link to="/become-worker" className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-xl hover:bg-primary-50 transition-colors inline-flex items-center gap-2">
              {t('nav.becomeWorker')} <ArrowRight size={16} className="rtl-flip" />
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  )
}
