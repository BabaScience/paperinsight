import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Person,
  School,
  Psychology,
  Lightbulb,
  Work,
  Description,
  Save,
  Add,
  Close,
  CheckCircle,
  AutoAwesome,
  Language,
  SmartToy,
  Tune,
  Warning,
  Send,
  HourglassEmpty,
  DataUsage,
  Security,
  LogoutOutlined,
} from '@mui/icons-material';
import { CircularProgress, Chip, Slider, LinearProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { profileApi, authApi, ProfileData, PreferredModel, TokenUsageInfo } from '@/lib/api';
import { useProfileStore, ExpertiseLevel, PreferredStyle } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; labelKey: string; descKey: string }[] = [
  { value: 'beginner', labelKey: 'profile.beginner', descKey: 'profile.beginnerDesc' },
  { value: 'intermediate', labelKey: 'profile.intermediate', descKey: 'profile.intermediateDesc' },
  { value: 'advanced', labelKey: 'profile.advanced', descKey: 'profile.advancedDesc' },
  { value: 'expert', labelKey: 'profile.expert', descKey: 'profile.expertDesc' },
];

const STYLE_OPTIONS: { value: PreferredStyle; labelKey: string; icon: React.ElementType; descKey: string }[] = [
  { value: 'technical', labelKey: 'profile.technical', icon: School, descKey: 'profile.technicalDesc' },
  { value: 'simplified', labelKey: 'profile.simplified', icon: Lightbulb, descKey: 'profile.simplifiedDesc' },
  { value: 'examples-heavy', labelKey: 'profile.withExamples', icon: Work, descKey: 'profile.withExamplesDesc' },
  { value: 'concise', labelKey: 'profile.concise', icon: Description, descKey: 'profile.conciseDesc' },
];

const COMMON_RESEARCH_FIELDS = [
  'Machine Learning',
  'Computer Science',
  'Artificial Intelligence',
  'Natural Language Processing',
  'Computer Vision',
  'Data Science',
  'Neuroscience',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Economics',
  'Psychology',
  'Medicine',
  'Engineering',
];

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English', flag: '🇬🇧' },
  { value: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { value: 'French', label: 'Français', flag: '🇫🇷' },
  { value: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'Italian', label: 'Italiano', flag: '🇮🇹' },
  { value: 'Portuguese', label: 'Português', flag: '🇵🇹' },
  { value: 'Chinese', label: '中文', flag: '🇨🇳' },
  { value: 'Japanese', label: '日本語', flag: '🇯🇵' },
  { value: 'Korean', label: '한국어', flag: '🇰🇷' },
  { value: 'Arabic', label: 'العربية', flag: '🇸🇦' },
  { value: 'Russian', label: 'Русский', flag: '🇷🇺' },
  { value: 'Hindi', label: 'हिन्दी', flag: '🇮🇳' },
];

const MODEL_OPTIONS: { value: PreferredModel; label: string; description: string; icon: string }[] = [
  { value: 'openai', label: 'OpenAI GPT-4o', description: 'profile.openaiDesc', icon: '🤖' },
  { value: 'deepseek', label: 'DeepSeek', description: 'profile.deepseekDesc', icon: '🔮' },
];

const TOKEN_LIMIT_MARKS = [
  { value: 500, label: '500' },
  { value: 1000, label: '1K' },
  { value: 2000, label: '2K' },
  { value: 4000, label: '4K' },
  { value: 8000, label: '8K' },
];

export function ProfilePage() {
  const { profile, setProfile, setLoading, setError, isLoading } = useProfileStore();
  const { user, clearAuth } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ProfileData>({
    researchField: '',
    expertiseLevel: undefined,
    interests: [],
    currentProjects: '',
    preferredStyle: undefined,
    preferredLanguage: undefined,
    preferredModel: undefined,
    tokenLimit: 2000,
    bio: '',
  });
  
  const [newInterest, setNewInterest] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFieldSuggestions, setShowFieldSuggestions] = useState(false);
  
  // Token usage state
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  // Security state
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
    loadTokenUsage();
  }, []);

  // Track changes
  useEffect(() => {
    if (profile) {
      const changed = JSON.stringify(formData) !== JSON.stringify({
        researchField: profile.researchField || '',
        expertiseLevel: profile.expertiseLevel,
        interests: profile.interests || [],
        currentProjects: profile.currentProjects || '',
        preferredStyle: profile.preferredStyle,
        preferredLanguage: profile.preferredLanguage,
        preferredModel: profile.preferredModel,
        tokenLimit: profile.tokenLimit || 2000,
        bio: profile.bio || '',
      });
      setHasChanges(changed);
    } else {
      setHasChanges(
        !!formData.researchField ||
        !!formData.expertiseLevel ||
        (formData.interests && formData.interests.length > 0) ||
        !!formData.currentProjects ||
        !!formData.preferredStyle ||
        !!formData.preferredLanguage ||
        !!formData.preferredModel ||
        formData.tokenLimit !== 2000 ||
        !!formData.bio
      );
    }
  }, [formData, profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.get();
      const loadedProfile = response.data.data.profile;
      setProfile(loadedProfile);
      setFormData({
        researchField: loadedProfile.researchField || '',
        expertiseLevel: loadedProfile.expertiseLevel,
        interests: loadedProfile.interests || [],
        currentProjects: loadedProfile.currentProjects || '',
        preferredStyle: loadedProfile.preferredStyle,
        preferredLanguage: loadedProfile.preferredLanguage,
        preferredModel: loadedProfile.preferredModel,
        tokenLimit: loadedProfile.tokenLimit || 2000,
        bio: loadedProfile.bio || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadTokenUsage = async () => {
    try {
      setIsLoadingTokens(true);
      const response = await profileApi.getTokenUsage();
      setTokenUsage(response.data.data.tokenUsage);
    } catch (err) {
      console.error('Failed to load token usage:', err);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleRequestExtension = async () => {
    try {
      setIsSubmittingRequest(true);
      await profileApi.requestTokenExtension(requestMessage);
      setShowRequestModal(false);
      setRequestMessage('');
      loadTokenUsage(); // Refresh token usage to show pending status
    } catch (err) {
      console.error('Failed to request extension:', err);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setIsLoggingOutAll(true);
      await authApi.logoutAll();
      toast.success(t('auth.logoutAllSuccess'));
      clearAuth();
      navigate('/login');
    } catch (err) {
      console.error('Failed to logout from all devices:', err);
      toast.error(t('auth.logoutFailed'));
      // Still clear local auth even if API fails
      clearAuth();
      navigate('/login');
    } finally {
      setIsLoggingOutAll(false);
      setShowLogoutAllModal(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await profileApi.update(formData);
      setProfile(response.data.data.profile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && formData.interests && formData.interests.length < 10) {
      if (!formData.interests.includes(newInterest.trim())) {
        setFormData({
          ...formData,
          interests: [...formData.interests, newInterest.trim()],
        });
      }
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests?.filter((i) => i !== interest) || [],
    });
  };

  const selectResearchField = (field: string) => {
    setFormData({ ...formData, researchField: field });
    setShowFieldSuggestions(false);
  };

  const handleDiscard = () => {
    if (profile) {
      setFormData({
        researchField: profile.researchField || '',
        expertiseLevel: profile.expertiseLevel,
        interests: profile.interests || [],
        currentProjects: profile.currentProjects || '',
        preferredStyle: profile.preferredStyle,
        preferredLanguage: profile.preferredLanguage,
        preferredModel: profile.preferredModel,
        tokenLimit: profile.tokenLimit || 2000,
        bio: profile.bio || '',
      });
    } else {
      setFormData({
        researchField: '',
        expertiseLevel: undefined,
        interests: [],
        currentProjects: '',
        preferredStyle: undefined,
        preferredLanguage: undefined,
        preferredModel: undefined,
        tokenLimit: 2000,
        bio: '',
      });
    }
    setHasChanges(false);
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CircularProgress size={40} className="text-primary-500" />
          <p className="mt-4 text-muted">{t('profile.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 sm:space-y-8 ${hasChanges ? 'pb-24' : ''}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary-500 via-accent-violet to-accent-coral flex items-center justify-center shadow-lg shadow-primary-500/25 flex-shrink-0">
            <Person className="text-white text-2xl sm:text-3xl" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t('profile.title')}
            </h1>
            <p className="text-muted text-sm sm:text-base">
              {t('profile.subtitle')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {hasChanges && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs sm:text-sm text-accent-gold"
            >
              {t('profile.unsavedChanges')}
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-4 py-3 bg-accent-mint/10 border border-accent-mint/30 rounded-xl"
          >
            <CheckCircle className="text-accent-mint" />
            <span className="text-accent-mint font-medium">
              {t('profile.saveSuccess')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token Usage Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`card ${tokenUsage?.hasReachedLimit ? 'border-accent-coral/50 bg-accent-coral/5' : ''}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            tokenUsage?.hasReachedLimit 
              ? 'bg-gradient-to-br from-accent-coral to-red-600' 
              : 'bg-gradient-to-br from-primary-500 to-accent-teal'
          }`}>
            <DataUsage className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('profile.tokenUsage')}</h3>
            <p className="text-sm text-muted">
              {t('profile.tokenUsageDescription')}
            </p>
          </div>
        </div>

        {isLoadingTokens ? (
          <div className="flex items-center justify-center py-4">
            <CircularProgress size={24} className="text-primary-500" />
          </div>
        ) : tokenUsage ? (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted">
                  {tokenUsage.used.toLocaleString()} {t('profile.tokensUsed')}
                </span>
                <span className="text-muted">
                  {t('profile.tokenUsageOf', { total: tokenUsage.allowance.toLocaleString() })}
                </span>
              </div>
              <LinearProgress
                variant="determinate"
                value={Math.min(tokenUsage.percentageUsed, 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgb(var(--color-surface))',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: tokenUsage.percentageUsed >= 90
                      ? 'linear-gradient(90deg, rgb(239, 68, 68), rgb(220, 38, 38))'
                      : tokenUsage.percentageUsed >= 70
                      ? 'linear-gradient(90deg, rgb(245, 158, 11), rgb(234, 88, 12))'
                      : 'linear-gradient(90deg, rgb(var(--color-primary-500)), rgb(var(--color-accent-teal)))',
                  },
                }}
              />
              <div className="flex justify-between mt-2 text-sm">
                <span className={`font-medium ${tokenUsage.hasReachedLimit ? 'text-accent-coral' : 'text-primary-500'}`}>
                  {tokenUsage.percentageUsed.toFixed(1)}%
                </span>
                <span className="text-muted">
                  {tokenUsage.remaining.toLocaleString()} {t('profile.tokensRemaining')}
                </span>
              </div>
            </div>

            {/* Warning/Status */}
            {tokenUsage.hasReachedLimit && !tokenUsage.pendingRequest && (
              <div className="bg-accent-coral/10 border border-accent-coral/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Warning className="text-accent-coral flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-accent-coral">{t('profile.tokenLimitReached')}</h4>
                    <p className="text-sm text-muted mt-1">{t('profile.tokenLimitReachedDesc')}</p>
                    <motion.button
                      onClick={() => setShowRequestModal(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-3 px-4 py-2 bg-accent-coral text-white rounded-lg text-sm font-medium hover:bg-accent-coral/90 transition-colors"
                    >
                      {t('profile.requestExtension')}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {tokenUsage.pendingRequest && (
              <div className="bg-accent-gold/10 border border-accent-gold/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <HourglassEmpty className="text-accent-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-accent-gold">{t('profile.pendingRequest')}</h4>
                    <p className="text-sm text-muted mt-1">{t('profile.pendingRequestDesc')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>

      {/* Token Extension Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('profile.requestExtensionTitle')}
              </h3>
              <p className="text-sm text-muted mb-4">
                {t('profile.requestExtensionDesc')}
              </p>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder={t('profile.requestExtensionPlaceholder')}
                className="input-field resize-none w-full"
                rows={4}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 text-muted hover:text-foreground transition-colors rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <motion.button
                  onClick={handleRequestExtension}
                  disabled={isSubmittingRequest}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {isSubmittingRequest ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t('profile.submitRequest')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-coral to-red-600 flex items-center justify-center">
            <Security className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('profile.security', 'Security')}</h3>
            <p className="text-sm text-muted">
              {t('profile.securityDescription', 'Manage your account security settings')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowLogoutAllModal(true)}
            className="w-full flex items-center gap-3 p-4 bg-surface-hover/50 hover:bg-surface-hover rounded-xl transition-colors text-left"
          >
            <LogoutOutlined className="text-accent-coral" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{t('auth.logoutAllDevices')}</p>
              <p className="text-sm text-muted">{t('auth.logoutAllDevicesDesc')}</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Logout All Devices Confirmation Modal */}
      <AnimatePresence>
        {showLogoutAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLogoutAllModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-coral/10 flex items-center justify-center">
                  <LogoutOutlined className="text-accent-coral text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('auth.logoutAllDevices')}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-muted mb-6">
                {t('auth.logoutAllConfirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutAllModal(false)}
                  disabled={isLoggingOutAll}
                  className="flex-1 px-4 py-2.5 text-muted hover:text-foreground transition-colors rounded-xl border border-border hover:bg-surface-hover disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <motion.button
                  onClick={handleLogoutAll}
                  disabled={isLoggingOutAll}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2.5 bg-accent-coral text-white rounded-xl font-medium hover:bg-accent-coral/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingOutAll ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <LogoutOutlined className="w-5 h-5" />
                  )}
                  {t('common.confirm')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Form */}
      <div className="grid gap-6">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-teal to-primary-500 flex items-center justify-center text-white">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{user?.name}</h3>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('profile.researchField')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.researchField}
                  onChange={(e) => {
                    setFormData({ ...formData, researchField: e.target.value });
                    setShowFieldSuggestions(true);
                  }}
                  onFocus={() => setShowFieldSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFieldSuggestions(false), 200)}
                  placeholder={t('profile.researchFieldPlaceholder')}
                  className="input-field pr-10"
                  maxLength={100}
                />
                <School className="absolute right-3 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
              </div>
              
              {/* Field suggestions dropdown */}
              <AnimatePresence>
                {showFieldSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto"
                  >
                    {COMMON_RESEARCH_FIELDS.filter(
                      (field) =>
                        field.toLowerCase().includes(formData.researchField?.toLowerCase() || '')
                    ).map((field) => (
                      <button
                        key={field}
                        onClick={() => selectResearchField(field)}
                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {field}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('profile.bioOptional')}
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder={t('profile.bioPlaceholder')}
                className="input-field resize-none"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted mt-1 text-right">
                {formData.bio?.length || 0}/300
              </p>
            </div>
          </div>
        </motion.div>

        {/* Expertise Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center">
              <Psychology className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.expertiseLevel')}</h3>
              <p className="text-sm text-muted">
                {t('profile.expertiseLevelDescription')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPERTISE_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setFormData({ ...formData, expertiseLevel: option.value })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.expertiseLevel === option.value
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border hover:border-primary-500/30 hover:bg-surface'
                }`}
              >
                <p className={`font-medium ${
                  formData.expertiseLevel === option.value ? 'text-primary-500' : 'text-foreground'
                }`}>
                  {t(option.labelKey)}
                </p>
                <p className="text-sm text-muted mt-1">{t(option.descKey)}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Interests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-gold to-accent-coral flex items-center justify-center">
              <Lightbulb className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.interests')}</h3>
              <p className="text-sm text-muted">
                {t('profile.interestsDescription')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInterest();
                  }
                }}
                placeholder={t('profile.addInterest')}
                className="input-field flex-1"
                maxLength={50}
                disabled={formData.interests && formData.interests.length >= 10}
              />
              <motion.button
                onClick={addInterest}
                disabled={!newInterest.trim() || (formData.interests && formData.interests.length >= 10)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-3 bg-primary-500/10 text-primary-500 rounded-xl hover:bg-primary-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Add />
              </motion.button>
            </div>

            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {formData.interests?.map((interest) => (
                  <motion.div
                    key={interest}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Chip
                      label={interest}
                      onDelete={() => removeInterest(interest)}
                      deleteIcon={<Close className="w-4 h-4" />}
                      sx={{
                        backgroundColor: 'rgb(var(--color-surface))',
                        color: 'rgb(var(--color-text-primary))',
                        border: '1px solid rgb(var(--color-border))',
                        '& .MuiChip-deleteIcon': {
                          color: 'rgb(var(--color-text-muted))',
                          '&:hover': {
                            color: 'rgb(239, 68, 68)',
                          },
                        },
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {formData.interests && formData.interests.length === 0 && (
              <p className="text-sm text-muted text-center py-4">
                {t('profile.noInterests')}
              </p>
            )}

            <p className="text-xs text-muted text-right">
              {t('profile.interestCount', { count: formData.interests?.length || 0 })}
            </p>
          </div>
        </motion.div>

        {/* Current Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-teal to-accent-mint flex items-center justify-center">
              <Work className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.currentProjects')}</h3>
              <p className="text-sm text-muted">
                {t('profile.currentProjectsDescription')}
              </p>
            </div>
          </div>

          <textarea
            value={formData.currentProjects}
            onChange={(e) => setFormData({ ...formData, currentProjects: e.target.value })}
            placeholder={t('profile.currentProjectsPlaceholder')}
            className="input-field resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted mt-1 text-right">
            {formData.currentProjects?.length || 0}/500
          </p>
        </motion.div>

        {/* Preferred Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet to-primary-500 flex items-center justify-center">
              <AutoAwesome className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.preferredStyle')}</h3>
              <p className="text-sm text-muted">
                {t('profile.preferredStyleDescription')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STYLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, preferredStyle: option.value })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                    formData.preferredStyle === option.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-border hover:border-primary-500/30 hover:bg-surface'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    formData.preferredStyle === option.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface text-muted'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      formData.preferredStyle === option.value ? 'text-primary-500' : 'text-foreground'
                    }`}>
                      {t(option.labelKey)}
                    </p>
                    <p className="text-sm text-muted mt-0.5">{t(option.descKey)}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Preferred Language */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-coral to-accent-gold flex items-center justify-center">
              <Language className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.preferredLanguage')}</h3>
              <p className="text-sm text-muted">
                {t('profile.preferredLanguageDescription')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {LANGUAGE_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setFormData({ ...formData, preferredLanguage: option.value })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all touch-manipulation ${
                  formData.preferredLanguage === option.value
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border hover:border-primary-500/30 hover:bg-surface active:bg-surface'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl">{option.flag}</span>
                  <div className="min-w-0">
                    <p className={`font-medium text-xs sm:text-sm truncate ${
                      formData.preferredLanguage === option.value ? 'text-primary-500' : 'text-foreground'
                    }`}>
                      {option.label}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted truncate">{option.value}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {!formData.preferredLanguage && (
            <p className="text-sm text-muted text-center mt-4">
              {t('profile.noLanguageSelected')}
            </p>
          )}
        </motion.div>

        {/* AI Model Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-mint to-accent-teal flex items-center justify-center">
              <SmartToy className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.aiModel')}</h3>
              <p className="text-sm text-muted">
                {t('profile.aiModelDescription')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODEL_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => setFormData({ ...formData, preferredModel: option.value })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.preferredModel === option.value
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-border hover:border-primary-500/30 hover:bg-surface'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{option.icon}</span>
                  <p className={`font-medium ${
                    formData.preferredModel === option.value ? 'text-primary-500' : 'text-foreground'
                  }`}>
                    {option.label}
                  </p>
                </div>
                <p className="text-sm text-muted">{t(option.description)}</p>
              </motion.button>
            ))}
          </div>

          {!formData.preferredModel && (
            <p className="text-sm text-muted text-center mt-4">
              {t('profile.noModelSelected')}
            </p>
          )}
        </motion.div>

        {/* Token Limit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-coral flex items-center justify-center">
              <Tune className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('profile.tokenLimit')}</h3>
              <p className="text-sm text-muted">
                {t('profile.tokenLimitDescription')}
              </p>
            </div>
          </div>

          <div className="px-4 py-2">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted">{t('profile.tokenLimitLabel')}</span>
              <span className="text-sm font-medium text-primary-500">
                {formData.tokenLimit?.toLocaleString()} {t('profile.tokens')}
              </span>
            </div>
            <Slider
              value={formData.tokenLimit || 2000}
              onChange={(_, value) => setFormData({ ...formData, tokenLimit: value as number })}
              min={500}
              max={8000}
              step={100}
              marks={TOKEN_LIMIT_MARKS}
              sx={{
                color: 'rgb(var(--color-primary-500))',
                '& .MuiSlider-markLabel': {
                  color: 'rgb(var(--color-text-muted))',
                  fontSize: '0.75rem',
                },
                '& .MuiSlider-mark': {
                  backgroundColor: 'rgb(var(--color-border))',
                },
                '& .MuiSlider-thumb': {
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0 0 0 8px rgba(var(--color-primary-500), 0.16)',
                  },
                },
                '& .MuiSlider-track': {
                  background: 'linear-gradient(90deg, rgb(var(--color-primary-500)), rgb(var(--color-accent-violet)))',
                },
              }}
            />
            <p className="text-xs text-muted mt-4">
              {t('profile.tokenLimitHint')}
            </p>
          </div>
        </motion.div>

        {/* How it works info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="bg-gradient-to-r from-primary-500/10 via-accent-violet/10 to-accent-coral/10 rounded-2xl p-6 border border-primary-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center flex-shrink-0">
              <AutoAwesome className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                {t('profile.howItWorks')}
              </h3>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('profile.expertiseLevel')}</strong> {t('profile.howExpertise')}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-violet rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('profile.interests')}</strong> {t('profile.howInterests')}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-teal rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('profile.currentProjects')}</strong> {t('profile.howProjects')}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-coral rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('profile.preferredStyle')}</strong> {t('profile.howStyle')}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-gold rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('profile.preferredLanguage')}</strong> {t('profile.howLanguage')}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-mint rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('profile.aiModel')}</strong> {t('profile.howModel')}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Save Alert */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 p-4 pb-safe"
          >
            <div className="max-w-4xl mx-auto">
              <div className="bg-surface/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/20 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  {/* Left side - message */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-accent-gold to-accent-coral flex items-center justify-center flex-shrink-0">
                      <Warning className="text-white text-sm sm:text-base" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm sm:text-base truncate">
                        {t('profile.unsavedChanges')}
                      </p>
                      <p className="text-xs sm:text-sm text-muted hidden xs:block">
                        {t('profile.unsavedChangesHint')}
                      </p>
                    </div>
                  </div>

                  {/* Right side - buttons */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <motion.button
                      onClick={handleDiscard}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-xl transition-colors text-sm sm:text-base font-medium"
                    >
                      {t('common.discard')}
                    </motion.button>
                    <motion.button
                      onClick={handleSave}
                      disabled={isSaving}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-primary flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
                    >
                      {isSaving ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                      <span className="hidden xs:inline">{t('profile.saveChanges')}</span>
                      <span className="xs:hidden">{t('common.save')}</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

