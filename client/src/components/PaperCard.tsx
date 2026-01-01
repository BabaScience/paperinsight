import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Description,
  AccessTime,
  CheckCircle,
  Error,
  Pending,
  AutoAwesome,
} from '@mui/icons-material';
import type { Paper } from '@/stores/paperStore';

interface PaperCardProps {
  paper: Paper;
}

const statusConfig = {
  uploading: {
    icon: Pending,
    label: 'Uploading',
    color: 'warning' as const,
    bgClass: 'bg-accent-gold/10 text-accent-gold',
  },
  processing: {
    icon: AutoAwesome,
    label: 'Processing',
    color: 'info' as const,
    bgClass: 'bg-primary-500/10 text-primary-400',
  },
  ready: {
    icon: CheckCircle,
    label: 'Ready',
    color: 'success' as const,
    bgClass: 'bg-accent-mint/10 text-accent-mint',
  },
  failed: {
    icon: Error,
    label: 'Failed',
    color: 'error' as const,
    bgClass: 'bg-accent-coral/10 text-accent-coral',
  },
};

export function PaperCard({ paper }: PaperCardProps) {
  const status = statusConfig[paper.status];
  const StatusIcon = status.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/paper/${paper._id}`}
        className="block card card-hover h-full"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-violet/20 flex items-center justify-center flex-shrink-0">
            <Description className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-theme-primary truncate">
              {paper.title || paper.fileName}
            </h3>
            {paper.authors && paper.authors.length > 0 && (
              <p className="text-sm text-theme-muted truncate mt-1">
                {paper.authors.slice(0, 2).join(', ')}
                {paper.authors.length > 2 && ` +${paper.authors.length - 2}`}
              </p>
            )}
          </div>
        </div>

        {paper.abstract && (
          <p className="text-sm text-theme-muted mt-3 line-clamp-2">
            {paper.abstract}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-border/50">
          <div className="flex items-center gap-2 text-sm text-theme-muted">
            <AccessTime className="w-4 h-4" />
            {formatDate(paper.createdAt)}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgClass}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
        </div>

        {paper.status === 'processing' && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-xs text-theme-muted">
              <div className="flex-1 h-1.5 bg-theme-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-violet"
                  initial={{ width: '0%' }}
                  animate={{ width: '60%' }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
              </div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
