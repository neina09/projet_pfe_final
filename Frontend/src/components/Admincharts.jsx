import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { TrendingUp, Calendar, Users, Briefcase, ShieldCheck } from 'lucide-react'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']

function generateMockData(period, dashboard, t) {
  const totalUsers = dashboard?.totalUsers ?? 25
  const verifiedWorkers = dashboard?.verifiedWorkers ?? 8
  const pendingTasks = dashboard?.pendingTasks ?? 12
  const completedBookings = dashboard?.completedBookings ?? 30

  if (period === 'daily') {
    const hours = []
    for (let i = 0; i < 24; i++) {
      const h = `${String(i).padStart(2, '0')}:00`
      hours.push({
        name: h,
        tasks: Math.max(0, Math.round(Math.random() * (pendingTasks / 6))),
        bookings: Math.max(0, Math.round(Math.random() * (completedBookings / 8))),
        users: Math.max(0, Math.round(Math.random() * (totalUsers / 12))),
      })
    }
    return hours
  }

  if (period === 'weekly') {
    const days = [
      t('common.days.sun'),
      t('common.days.mon'),
      t('common.days.tue'),
      t('common.days.wed'),
      t('common.days.thu'),
      t('common.days.fri'),
      t('common.days.sat'),
    ]
    return days.map((name) => ({
      name,
      tasks: Math.max(1, Math.round(pendingTasks / 3 + Math.random() * 5)),
      bookings: Math.max(1, Math.round(completedBookings / 5 + Math.random() * 4)),
      users: Math.max(0, Math.round(totalUsers / 7 + Math.random() * 3)),
    }))
  }

  // monthly
  const weeks = []
  for (let i = 1; i <= 4; i++) {
    weeks.push({
      name: t('common.week_short', { n: i }),
      tasks: Math.max(2, Math.round(pendingTasks / 2 + Math.random() * 8)),
      bookings: Math.max(2, Math.round(completedBookings / 3 + Math.random() * 6)),
      users: Math.max(1, Math.round(totalUsers / 4 + Math.random() * 5)),
    })
  }
  return weeks
}

export default function AdminCharts({ dashboard }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState('weekly')

  const chartData = useMemo(() => generateMockData(period, dashboard, t), [period, dashboard, t])

  const pieData = useMemo(() => [
    { name: t('tasks.status.COMPLETED'), value: dashboard?.completedBookings ?? 0 },
    { name: t('tasks.status.IN_PROGRESS'), value: dashboard?.pendingTasks ?? 0 },
    { name: t('workerStatusLabel.VERIFIED'), value: dashboard?.verifiedWorkers ?? 0 },
    { name: t('workerStatusLabel.PENDING'), value: dashboard?.pendingWorkers ?? 0 },
  ], [dashboard, t])


  const periods = [
    { key: 'daily', label: t('admin.charts.daily') },
    { key: 'weekly', label: t('admin.charts.weekly') },
    { key: 'monthly', label: t('admin.charts.monthly') },
  ]

  const summaryCards = [
    { icon: Briefcase, label: t('admin.stats.tasks'), value: dashboard?.pendingTasks ?? 0, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
    { icon: Calendar, label: t('admin.stats.bookings'), value: dashboard?.completedBookings ?? 0, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: Users, label: t('admin.stats.users'), value: dashboard?.totalUsers ?? 0, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { icon: ShieldCheck, label: t('admin.stats.workers'), value: dashboard?.verifiedWorkers ?? 0, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Period Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp size={22} className="text-primary-500" />
          {t('admin.charts.title')}
        </h2>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p.key
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Tasks & Bookings */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.charts.tasksAndBookings')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    backdropFilter: 'blur(8px)',
                  }}
                />
                <Bar dataKey="tasks" name={t('admin.stats.tasks')} fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="bookings" name={t('admin.stats.bookings')} fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart - Users trend */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.charts.usersTrend')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    backdropFilter: 'blur(8px)',
                  }}
                />
                <Area type="monotone" dataKey="users" name={t('admin.charts.newUsers')} stroke="#6366f1" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                <Area type="monotone" dataKey="tasks" name={t('admin.stats.tasks')} stroke="#22c55e" fillOpacity={1} fill="url(#colorTasks)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Distribution */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.charts.distribution')}
          </h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.9)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-gray-600 dark:text-gray-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
