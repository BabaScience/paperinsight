import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccessTime, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { subscribeToRateLimit, clearRateLimit, type RateLimitInfo } from '@/lib/api';

export function RateLimitBanner() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = subscribeToRateLimit((info) => {
      if (info.isLimited) {
        setRateLimitInfo(info);
      } else {
        setRateLimitInfo(null);
      }
    });

    return unsubscribe;
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!rateLimitInfo?.isLimited) {
      setTimeRemaining(0);
      return;
    }

    const updateTimeRemaining = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitInfo.retryAfter - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearRateLimit();
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  const formatTime = (seconds: number): string => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const handleDismiss = () => {
    clearRateLimit();
  };

  return (
    <AnimatePresence>
      {rateLimitInfo?.isLimited && timeRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-amber-500/10 border border-amber-500/30 backdrop-blur-md rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <AccessTime className="text-amber-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                  {t('rateLimit.title', 'Rate Limit Reached')}
                </h4>
                <p className="text-xs text-theme-muted mt-1">
                  {rateLimitInfo.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 bg-amber-500/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ 
                        duration: timeRemaining, 
                        ease: 'linear' 
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-amber-500/20 rounded-lg transition-colors flex-shrink-0"
                aria-label={t('common.dismiss', 'Dismiss')}
              >
                <Close className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to check if a specific endpoint is rate limited
export function useRateLimit() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToRateLimit((info) => {
      setRateLimitInfo(info.isLimited ? info : null);
    });

    return unsubscribe;
  }, []);

  return {
    isRateLimited: rateLimitInfo?.isLimited ?? false,
    retryAfter: rateLimitInfo?.retryAfter ?? 0,
    message: rateLimitInfo?.message ?? '',
  };
}



