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
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-display font-bold text-theme-primary">
          {t('dashboard.welcomeUser', { name: user?.name?.split(' ')[0] })}
        </h1>
        <p className="text-theme-muted mt-1">
          {t('dashboard.overview')}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="card group cursor-default">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-theme-muted text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-theme-primary mt-2">
                  {stat.value}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
              >
                <stat.icon className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-display font-semibold text-theme-primary mb-4">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/upload" className="card card-hover group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Upload className="text-white text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  {t('dashboard.uploadPaper')}
                </h3>
                <p className="text-theme-muted text-sm">
                  {t('dashboard.addNewPaper')}
                </p>
              </div>
            </div>
          </Link>
          <Link to="/library" className="card card-hover group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-teal to-primary-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Description className="text-white text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  {t('dashboard.viewLibrary')}
                </h3>
                <p className="text-theme-muted text-sm">
                  {t('dashboard.browseAllPapers')}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Recent Papers */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold text-theme-primary">
            {t('dashboard.recentPapers')}
          </h2>
          {papers.length > 0 && (
            <Link
              to="/library"
              className="text-primary-400 hover:text-primary-300 text-sm font-medium"
            >
              {t('common.viewAll')} →
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-theme-tertiary rounded w-3/4 mb-4" />
                <div className="h-3 bg-theme-tertiary rounded w-1/2 mb-2" />
                <div className="h-3 bg-theme-tertiary rounded w-full" />
              </div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-theme-secondary flex items-center justify-center">
              <Description className="text-theme-muted text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-theme-secondary mb-2">
              {t('dashboard.noPapers')}
            </h3>
            <p className="text-theme-muted mb-4">
              {t('dashboard.uploadFirstPaper')}
            </p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t('dashboard.uploadPaper')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {papers.slice(0, 6).map((paper: any) => (
              <PaperCard key={paper._id} paper={paper} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
