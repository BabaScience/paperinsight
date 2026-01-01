import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Lightbulb,
  Science,
  Warning,
  AutoAwesome,
  Refresh,
  CheckCircle,
} from '@mui/icons-material';
import { CircularProgress, Tooltip, IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { papersApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface InsightsPanelProps {
  paperId: string;
}

export function InsightsPanel({ paperId }: InsightsPanelProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', paperId],
    queryFn: () => papersApi.getAnalysis(paperId),
    retry: 1,
  });

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await papersApi.getAnalysis(paperId, true);
      // Update the cache with the new result
      queryClient.setQueryData(['analysis', paperId], result);
      toast.success(t('insights.regenerateSuccess'));
    } catch (err) {
      toast.error(t('insights.regenerateFailed'));
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CircularProgress size={32} className="mb-4" />
        <p className="text-muted">{t('insights.generating')}</p>
        <p className="text-sm text-muted mt-1">{t('insights.mayTakeMoment')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Warning className="text-accent-coral text-4xl mb-3" />
        <p className="text-muted">{t('insights.failedToLoad')}</p>
        <p className="text-sm text-muted mt-1">{t('insights.tryAgainLater')}</p>
      </div>
    );
  }

  const analysis = data?.data?.data?.analysis;

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <AutoAwesome className="text-muted text-4xl mb-3" />
        <p className="text-muted">{t('insights.noInsights')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header with cache status and regenerate button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {analysis.cached && (
            <Tooltip title={t('insights.cachedTooltip')}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-accent-mint/10 text-accent-mint border border-accent-mint/20 rounded-full">
                <CheckCircle className="w-3 h-3" />
                {t('insights.cached')}
              </span>
            </Tooltip>
          )}
          {analysis.cached === false && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-full">
              <AutoAwesome className="w-3 h-3" />
              {t('insights.fresh')}
            </span>
          )}
        </div>
        <Tooltip title={t('insights.regenerateInsights')}>
          <span>
            <IconButton
              size="small"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="text-muted hover:text-foreground"
            >
              {isRegenerating ? (
                <CircularProgress size={18} />
              ) : (
                <Refresh fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <AutoAwesome className="w-4 h-4 text-primary-400" />
            </div>
            <h4 className="font-semibold text-foreground">{t('insights.summary')}</h4>
          </div>
          <p className="text-muted leading-relaxed text-sm">
            {analysis.summary}
          </p>
        </div>
      )}

      {/* Key Insights */}
      {analysis.keyInsights && analysis.keyInsights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent-gold/20 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-accent-gold" />
            </div>
            <h4 className="font-semibold text-foreground">{t('insights.keyInsights')}</h4>
          </div>
          <ul className="space-y-2">
            {analysis.keyInsights.map((insight: string, idx: number) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 bg-surface/50 border border-border/30 rounded-lg"
              >
                <span className="w-6 h-6 rounded-full bg-accent-gold/20 text-accent-gold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-sm text-muted">{insight}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Methodology */}
      {analysis.methodology && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent-teal/20 flex items-center justify-center">
              <Science className="w-4 h-4 text-accent-teal" />
            </div>
            <h4 className="font-semibold text-foreground">{t('insights.methodology')}</h4>
          </div>
          <p className="text-muted leading-relaxed text-sm">
            {analysis.methodology}
          </p>
        </div>
      )}

      {/* Limitations */}
      {analysis.limitations && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent-coral/20 flex items-center justify-center">
              <Warning className="w-4 h-4 text-accent-coral" />
            </div>
            <h4 className="font-semibold text-foreground">{t('insights.limitations')}</h4>
          </div>
          <p className="text-muted leading-relaxed text-sm">
            {analysis.limitations}
          </p>
        </div>
      )}
    </motion.div>
  );
}
