import { motion, AnimatePresence } from 'framer-motion';
import { Token, Close, Person, RequestQuote } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTokenLimitModalStore } from '@/stores/tokenLimitModalStore';
import { profileApi } from '@/lib/api';
import { useState } from 'react';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';

export function TokenLimitExceededModal() {
  const { isOpen, tokenUsage, hideModal } = useTokenLimitModalStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleViewProfile = () => {
    navigate('/profile');
    hideModal();
  };

  const handleRequestExtension = async () => {
    try {
      setIsRequesting(true);
      await profileApi.requestTokenExtension();
      toast.success(t('tokenLimitExceeded.requestSent'));
      hideModal();
      navigate('/profile');
    } catch (err) {
      console.error('Failed to request extension:', err);
      toast.error(t('tokenLimitExceeded.requestFailed'));
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideModal}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white dark:bg-primary-500 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-coral via-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-accent-coral/25">
                    <Token className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {t('tokenLimitExceeded.title')}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={hideModal}
                  className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-muted hover:text-foreground"
                  aria-label={t('common.close')}
                >
                  <Close className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-muted mb-4">
                  {t('tokenLimitExceeded.message')}
                </p>

                {/* Token Usage Display */}
                {tokenUsage && (
                  <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted">
                        {t('tokenLimitExceeded.currentUsage', {
                          used: tokenUsage.used.toLocaleString(),
                          allowance: tokenUsage.allowance.toLocaleString(),
                        })}
                      </span>
                      <span className="text-sm font-medium text-accent-coral">
                        {tokenUsage.percentageUsed.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-accent-coral/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(tokenUsage.percentageUsed, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-accent-coral to-red-600 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {t('tokenLimitExceeded.remaining', {
                        remaining: tokenUsage.remaining.toLocaleString(),
                      })}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    onClick={handleRequestExtension}
                    disabled={isRequesting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRequesting ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <>
                        <RequestQuote className="w-5 h-5" />
                        {t('tokenLimitExceeded.requestExtension')}
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={handleViewProfile}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 text-foreground hover:bg-surface-hover rounded-xl transition-colors font-medium border border-border flex items-center justify-center gap-2"
                  >
                    <Person className="w-5 h-5" />
                    {t('tokenLimitExceeded.viewProfile')}
                  </motion.button>
                </div>
                <motion.button
                  onClick={hideModal}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-3 px-6 py-2.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-xl transition-colors font-medium"
                >
                  {t('tokenLimitExceeded.dismiss')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

