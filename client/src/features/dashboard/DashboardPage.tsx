import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  Description,
  AutoAwesome,
  TrendingUp,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { papersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PaperCard } from '@/components/PaperCard';

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

export function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const { data: papersData, isLoading } = useQuery({
    queryKey: ['papers', 'recent'],
    queryFn: () => papersApi.list(1, 6),
  });

  const papers = papersData?.data?.data?.papers || [];
  const totalPapers = papersData?.data?.data?.pagination?.total || 0;
  const readyPapers = papers.filter((p: any) => p.status === 'ready').length;

  const stats = [
    {
      label: t('dashboard.totalPapers'),
      value: totalPapers,
      icon: Description,
      color: 'from-primary-500 to-primary-600',
    },
    {
      label: t('dashboard.analyzed'),
      value: readyPapers,
      icon: AutoAwesome,
      color: 'from-accent-teal to-primary-500',
    },
    {
      label: t('dashboard.thisWeek'),
      value: papers.filter((p: any) => {
        const date = new Date(p.createdAt);
        const week = new Date();
        week.setDate(week.getDate() - 7);
        return date > week;
      }).length,
      icon: TrendingUp,
      color: 'from-accent-violet to-accent-coral',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary">
          {t('dashboard.welcomeUser', { name: user?.name?.split(' ')[0] })}
        </h1>
        <p className="text-theme-muted mt-1 text-sm sm:text-base">
          {t('dashboard.overview')}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="card group cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-theme-muted text-xs sm:text-sm font-medium">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-theme-primary mt-1 sm:mt-2">
                  {stat.value}
                </p>
              </div>
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg flex-shrink-0`}
              >
                <stat.icon className="text-white text-lg sm:text-xl" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg sm:text-xl font-display font-semibold text-theme-primary mb-3 sm:mb-4">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link to="/upload" className="card card-hover group touch-manipulation">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                <Upload className="text-white text-xl sm:text-2xl" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-theme-primary truncate">
                  {t('dashboard.uploadPaper')}
                </h3>
                <p className="text-theme-muted text-xs sm:text-sm truncate">
                  {t('dashboard.addNewPaper')}
                </p>
              </div>
            </div>
          </Link>
          <Link to="/library" className="card card-hover group touch-manipulation">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-accent-teal to-primary-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                <Description className="text-white text-xl sm:text-2xl" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-theme-primary truncate">
                  {t('dashboard.viewLibrary')}
                </h3>
                <p className="text-theme-muted text-xs sm:text-sm truncate">
                  {t('dashboard.browseAllPapers')}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Recent Papers */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-display font-semibold text-theme-primary">
            {t('dashboard.recentPapers')}
          </h2>
          {papers.length > 0 && (
            <Link
              to="/library"
              className="text-primary-400 hover:text-primary-300 text-sm font-medium touch-manipulation"
            >
              {t('common.viewAll')} →
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-theme-tertiary rounded w-3/4 mb-4" />
                <div className="h-3 bg-theme-tertiary rounded w-1/2 mb-2" />
                <div className="h-3 bg-theme-tertiary rounded w-full" />
              </div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="card text-center py-8 sm:py-12">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-theme-secondary flex items-center justify-center">
              <Description className="text-theme-muted text-2xl sm:text-3xl" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-theme-secondary mb-2">
              {t('dashboard.noPapers')}
            </h3>
            <p className="text-theme-muted mb-4 text-sm sm:text-base">
              {t('dashboard.uploadFirstPaper')}
            </p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t('dashboard.uploadPaper')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {papers.slice(0, 6).map((paper: any) => (
              <PaperCard key={paper._id} paper={paper} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
