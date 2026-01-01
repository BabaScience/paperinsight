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
  Refresh,
  Add,
  Close,
  CheckCircle,
  AutoAwesome,
} from '@mui/icons-material';
import { CircularProgress, Tooltip, Chip } from '@mui/material';
import { profileApi, ProfileData } from '@/lib/api';
import { useProfileStore, ExpertiseLevel, PreferredStyle } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';

const EXPERTISE_OPTIONS: { value: ExpertiseLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'New to research, need simple explanations' },
  { value: 'intermediate', label: 'Intermediate', description: 'Familiar with basics, learning advanced concepts' },
  { value: 'advanced', label: 'Advanced', description: 'Deep knowledge, comfortable with technical details' },
  { value: 'expert', label: 'Expert', description: 'Professional researcher, want nuanced discussions' },
];

const STYLE_OPTIONS: { value: PreferredStyle; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'technical', label: 'Technical', icon: School, description: 'Detailed, precise terminology' },
  { value: 'simplified', label: 'Simplified', icon: Lightbulb, description: 'Clear, accessible language' },
  { value: 'examples-heavy', label: 'With Examples', icon: Work, description: 'Lots of concrete examples' },
  { value: 'concise', label: 'Concise', icon: Description, description: 'Brief, to the point' },
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

export function ProfilePage() {
  const { profile, setProfile, setLoading, setError, isLoading } = useProfileStore();
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState<ProfileData>({
    researchField: '',
    expertiseLevel: undefined,
    interests: [],
    currentProjects: '',
    preferredStyle: undefined,
    bio: '',
  });
  
  const [newInterest, setNewInterest] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFieldSuggestions, setShowFieldSuggestions] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
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
        bio: loadedProfile.bio || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
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

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await profileApi.reset();
      setProfile({});
      setFormData({
        researchField: '',
        expertiseLevel: undefined,
        interests: [],
        currentProjects: '',
        preferredStyle: undefined,
        bio: '',
      });
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to reset profile:', err);
      setError('Failed to reset profile');
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

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CircularProgress size={40} className="text-primary-500" />
          <p className="mt-4 text-muted">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 via-accent-violet to-accent-coral flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Person className="text-white text-3xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Your Profile
            </h1>
            <p className="text-muted">
              Personalize how AI responds to your questions
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-accent-gold"
            >
              Unsaved changes
            </motion.span>
          )}
          <Tooltip title="Reset to defaults">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="p-2.5 text-muted hover:text-accent-coral hover:bg-surface rounded-xl transition-colors disabled:opacity-50"
            >
              <Refresh />
            </button>
          </Tooltip>
          <motion.button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Save />
            )}
            Save Profile
          </motion.button>
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
              Profile saved successfully! AI responses will now be personalized.
            </span>
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
                Research Field / Area of Study
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
                  placeholder="e.g., Machine Learning, Neuroscience..."
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
                Bio (Optional)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us a bit about yourself and your research background..."
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
              <h3 className="font-semibold text-foreground">Expertise Level</h3>
              <p className="text-sm text-muted">
                Helps AI adjust explanation complexity
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
                  {option.label}
                </p>
                <p className="text-sm text-muted mt-1">{option.description}</p>
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
              <h3 className="font-semibold text-foreground">Research Interests</h3>
              <p className="text-sm text-muted">
                AI will draw connections to these topics when relevant
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
                placeholder="Add an interest..."
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
                No interests added yet. Add up to 10 topics you're interested in.
              </p>
            )}

            <p className="text-xs text-muted text-right">
              {formData.interests?.length || 0}/10 interests
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
              <h3 className="font-semibold text-foreground">Current Projects</h3>
              <p className="text-sm text-muted">
                AI can relate concepts to your ongoing work
              </p>
            </div>
          </div>

          <textarea
            value={formData.currentProjects}
            onChange={(e) => setFormData({ ...formData, currentProjects: e.target.value })}
            placeholder="Describe what you're currently working on..."
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
              <h3 className="font-semibold text-foreground">Preferred Response Style</h3>
              <p className="text-sm text-muted">
                How would you like AI to explain things?
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
                      {option.label}
                    </p>
                    <p className="text-sm text-muted mt-0.5">{option.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* How it works info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-primary-500/10 via-accent-violet/10 to-accent-coral/10 rounded-2xl p-6 border border-primary-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center flex-shrink-0">
              <AutoAwesome className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                How AI Personalization Works
              </h3>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Expertise level</strong> adjusts language complexity in every response
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-violet rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Interests</strong> help AI make relevant connections and examples
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-teal rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Current projects</strong> are referenced for methodology questions
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent-coral rounded-full mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Response style</strong> controls format and verbosity
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

