import { motion, AnimatePresence } from 'framer-motion';
import { Person, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileCompletionModal({ isOpen, onClose }: ProfileCompletionModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoToProfile = () => {
    navigate('/profile');
    onClose();
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
            onClick={onClose}
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
              className="bg-background rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 via-accent-violet to-accent-coral flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Person className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {t('profileCompletion.title')}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-muted hover:text-foreground"
                  aria-label={t('common.close')}
                >
                  <Close className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-muted mb-6">
                  {t('profileCompletion.message')}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    onClick={handleGoToProfile}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 px-6 py-3"
                  >
                    <Person className="w-5 h-5" />
                    {t('profileCompletion.goToProfile')}
                  </motion.button>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 text-muted hover:text-foreground hover:bg-surface-hover rounded-xl transition-colors font-medium border border-border"
                  >
                    {t('profileCompletion.dismiss')}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

