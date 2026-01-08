import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  People,
  Description,
  Token,
  HealthAndSafety,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { CircularProgress } from '@mui/material';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function AdminDashboard() {
  const { t } = useTranslation();
  const [daysFilter, setDaysFilter] = useState(30);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', daysFilter],
    queryFn: () => adminApi.getUsers(daysFilter),
  });

  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ['admin', 'papers', daysFilter],
    queryFn: () => adminApi.getPapers(daysFilter),
  });

  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['admin', 'tokens', daysFilter],
    queryFn: () => adminApi.getTokens(daysFilter),
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => adminApi.getHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const statsData = stats?.data?.data;
  const usersData = users?.data?.data;
  const papersData = papers?.data?.data;
  const tokensData = tokens?.data?.data;
  const healthData = health?.data?.data;

  const kpiCards = [
    {
      label: t('admin.stats.totalUsers'),
      value: statsData?.users?.total || 0,
      icon: People,
      color: 'from-blue-500 to-blue-600',
      subtitle: `${statsData?.users?.activeLast30Days || 0} ${t('admin.stats.activeLast30Days')}`,
    },
    {
      label: t('admin.stats.totalPapers'),
      value: statsData?.papers?.total || 0,
      icon: Description,
      color: 'from-purple-500 to-purple-600',
      subtitle: `${statsData?.papers?.last30Days || 0} ${t('admin.stats.last30Days')}`,
    },
    {
      label: t('admin.stats.totalTokens'),
      value: tokensData?.overall?.totalUsed?.toLocaleString() || '0',
      icon: Token,
      color: 'from-green-500 to-green-600',
      subtitle: `${tokensData?.overall?.averageUsed?.toLocaleString() || 0} ${t('admin.stats.avgPerUser')}`,
    },
    {
      label: t('admin.stats.systemHealth'),
      value: healthData?.database?.status === 'healthy' ? t('admin.health.healthy') : t('admin.health.degraded'),
      icon: HealthAndSafety,
      color: healthData?.database?.status === 'healthy' ? 'from-green-500 to-green-600' : 'from-yellow-500 to-yellow-600',
      subtitle: `${healthData?.database?.latency || 0}ms ${t('admin.health.latency')}`,
    },
  ];

  const maxGrowthValue = Math.max(
    ...(usersData?.growth?.map((g: any) => g.count) || []),
    ...(papersData?.growth?.map((g: any) => g.count) || []),
    1
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary">
            {t('admin.dashboard.title')}
          </h1>
          <p className="text-theme-muted mt-1 text-sm sm:text-base">
            {t('admin.dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDaysFilter(days)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                daysFilter === days
                  ? 'bg-primary-500 text-white'
                  : 'bg-theme-secondary text-theme-muted hover:bg-theme-tertiary'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
      >
        {kpiCards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-theme-muted text-xs sm:text-sm font-medium">{card.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-theme-primary mt-1 sm:mt-2">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-theme-muted text-xs mt-1">{card.subtitle}</p>
                )}
              </div>
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg flex-shrink-0`}
              >
                <card.icon className="text-white text-lg sm:text-xl" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <motion.div variants={itemVariants} className="card">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">
            {t('admin.charts.userGrowth')}
          </h2>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <CircularProgress size={40} />
            </div>
          ) : (
            <div className="space-y-2">
              {usersData?.growth?.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-xs text-theme-muted w-20 flex-shrink-0">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-theme-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                        style={{ width: `${(item.count / maxGrowthValue) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-theme-primary w-8 text-right">
                    {item.count}
                  </div>
                </div>
              ))}
              {(!usersData?.growth || usersData.growth.length === 0) && (
                <p className="text-theme-muted text-center py-4">{t('admin.charts.noData')}</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Papers by Status */}
        <motion.div variants={itemVariants} className="card">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">
            {t('admin.charts.papersByStatus')}
          </h2>
          {papersLoading ? (
            <div className="flex justify-center py-8">
              <CircularProgress size={40} />
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(papersData?.byStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-theme-primary capitalize">
                        {status}
                      </span>
                      <span className="text-sm text-theme-muted">{count}</span>
                    </div>
                    <div className="h-2 bg-theme-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                        style={{
                          width: `${papersData?.total ? (count / papersData.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!papersData?.byStatus || Object.keys(papersData.byStatus).length === 0) && (
                <p className="text-theme-muted text-center py-4">{t('admin.charts.noData')}</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Token Usage Over Time */}
        <motion.div variants={itemVariants} className="card">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">
            {t('admin.charts.tokenUsage')}
          </h2>
          {tokensLoading ? (
            <div className="flex justify-center py-8">
              <CircularProgress size={40} />
            </div>
          ) : (
            <div className="space-y-2">
              {tokensData?.usageOverTime?.slice(-10).map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-xs text-theme-muted w-20 flex-shrink-0">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-theme-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                        style={{
                          width: `${
                            tokensData?.overall?.totalUsed
                              ? (item.totalUsed / tokensData.overall.totalUsed) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-theme-primary w-16 text-right">
                    {item.totalUsed?.toLocaleString()}
                  </div>
                </div>
              ))}
              {(!tokensData?.usageOverTime || tokensData.usageOverTime.length === 0) && (
                <p className="text-theme-muted text-center py-4">{t('admin.charts.noData')}</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Top Users by Token Usage */}
        <motion.div variants={itemVariants} className="card">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">
            {t('admin.charts.topUsers')}
          </h2>
          {tokensLoading ? (
            <div className="flex justify-center py-8">
              <CircularProgress size={40} />
            </div>
          ) : (
            <div className="space-y-2">
              {tokensData?.topUsers?.slice(0, 5).map((user: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-theme-primary truncate">
                      {user.name}
                      {user.isAdmin && (
                        <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-theme-muted truncate">{user.email}</div>
                  </div>
                  <div className="text-sm font-semibold text-theme-primary">
                    {user.used?.toLocaleString()}
                  </div>
                </div>
              ))}
              {(!tokensData?.topUsers || tokensData.topUsers.length === 0) && (
                <p className="text-theme-muted text-center py-4">{t('admin.charts.noData')}</p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* System Health */}
      <motion.div variants={itemVariants} className="card">
        <h2 className="text-lg font-semibold text-theme-primary mb-4">
          {t('admin.health.title')}
        </h2>
        {healthLoading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-theme-secondary rounded-lg">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                healthData?.database?.status === 'healthy'
                  ? 'bg-green-500'
                  : healthData?.database?.status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}>
                {healthData?.database?.status === 'healthy' ? (
                  <CheckCircle className="text-white" />
                ) : (
                  <ErrorIcon className="text-white" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-theme-primary">
                  {t('admin.health.database')}
                </div>
                <div className="text-xs text-theme-muted">
                  {healthData?.database?.latency}ms
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-theme-secondary rounded-lg">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                healthData?.redis?.status === 'healthy'
                  ? 'bg-green-500'
                  : healthData?.redis?.status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}>
                {healthData?.redis?.status === 'healthy' ? (
                  <CheckCircle className="text-white" />
                ) : (
                  <ErrorIcon className="text-white" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-theme-primary">
                  {t('admin.health.redis')}
                </div>
                <div className="text-xs text-theme-muted">
                  {healthData?.redis?.latency}ms
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-theme-secondary rounded-lg">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Schedule className="text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-theme-primary">
                  {t('admin.health.uptime')}
                </div>
                <div className="text-xs text-theme-muted">
                  {healthData?.system?.uptime
                    ? `${Math.round(healthData.system.uptime / 3600)}h`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}


