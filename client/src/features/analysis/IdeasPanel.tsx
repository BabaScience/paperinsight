import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Refresh,
  AutoAwesome,
  Error as ErrorIcon,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  School,
  Code,
  Psychology,
  Person,
  Work,
  Star,
  TrendingUp,
} from '@mui/icons-material';
import { CircularProgress, Tooltip, Chip, Collapse } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { papersApi, type TokenUsageInfo } from '@/lib/api';
import { useTokenLimitModalStore } from '@/stores/tokenLimitModalStore';
import { useProfileStore } from '@/stores/profileStore';

interface ImplementationIdea {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relevance: string;
  steps: string[];
  tools?: string[];
  relatedConcepts?: string[];
}

interface UserContext {
  researchField?: string;
  interests?: string[];
  currentProjects?: string;
}

interface IdeasPanelProps {
  paperId: string;
}

const DIFFICULTY_CONFIG = {
  beginner: {
    label: 'Beginner',
    color: 'bg-accent-mint/10 text-accent-mint border-accent-mint/30',
    icon: '🌱',
    description: 'Good starting point',
  },
  intermediate: {
    label: 'Intermediate',
    color: 'bg-accent-gold/10 text-accent-gold border-accent-gold/30',
    icon: '🔥',
    description: 'Some experience needed',
  },
  advanced: {
    label: 'Advanced',
    color: 'bg-accent-coral/10 text-accent-coral border-accent-coral/30',
    icon: '🚀',
    description: 'Expert level',
  },
};

function IdeaCard({ idea, index }: { idea: ImplementationIdea; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const diffConfig = DIFFICULTY_CONFIG[idea.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-surface/50 border border-border/50 rounded-xl sm:rounded-2xl overflow-hidden hover:border-primary-500/30 transition-all"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 sm:p-4 flex items-start gap-2 sm:gap-4 text-left hover:bg-surface/30 transition-colors touch-manipulation"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-violet/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl sm:text-2xl">{diffConfig.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-1 xs:gap-2">
            <h4 className="font-semibold text-foreground leading-tight text-sm sm:text-base line-clamp-2 xs:line-clamp-none">
              {idea.title}
            </h4>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 self-start ${diffConfig.color}`}>
              {diffConfig.label}
            </span>
          </div>
          
          <p className="text-xs sm:text-sm text-muted mt-1 line-clamp-2">
            {idea.description}
          </p>
          
          {/* Relevance badge */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-primary-400">
            <Star className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{idea.relevance}</span>
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-1 sm:ml-2">
          {expanded ? (
            <ExpandLess className="text-muted w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <ExpandMore className="text-muted w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <Collapse in={expanded}>
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 border-t border-border/30 pt-3 sm:pt-4">
          {/* Implementation Steps */}
          <div>
            <h5 className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400 flex-shrink-0" />
              {t('ideas.implementationSteps')}
            </h5>
            <ol className="space-y-2">
              {idea.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-muted pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tools */}
          {idea.tools && idea.tools.length > 0 && (
            <div>
              <h5 className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-teal flex-shrink-0" />
                {t('ideas.suggestedTools')}
              </h5>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {idea.tools.map((tool, idx) => (
                  <Chip
                    key={idx}
                    label={tool}
                    size="small"
                    sx={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      color: 'rgb(var(--color-text-secondary))',
                      border: '1px solid rgb(var(--color-border))',
                      fontSize: { xs: '0.625rem', sm: '0.75rem' },
                      height: { xs: '22px', sm: '24px' },
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Related Concepts */}
          {idea.relatedConcepts && idea.relatedConcepts.length > 0 && (
            <div>
              <h5 className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Psychology className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-violet flex-shrink-0" />
                {t('ideas.relatedConcepts')}
              </h5>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {idea.relatedConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs bg-accent-violet/10 text-accent-violet rounded-md sm:rounded-lg"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Collapse>
    </motion.div>
  );
}

export function IdeasPanel({ paperId }: IdeasPanelProps) {
  const [ideas, setIdeas] = useState<ImplementationIdea[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const { profile } = useProfileStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadIdeas();
  }, [paperId]);

  const loadIdeas = async (regenerate = false) => {
    try {
      if (regenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await papersApi.getIdeas(paperId, regenerate);
      const { ideas: ideasData } = response.data.data;
      
      setIdeas(ideasData.ideas || []);
      setUserContext(ideasData.userContext || null);
      setCached(ideasData.cached);
    } catch (err: any) {
      console.error('Failed to load ideas:', err);
      
      // Check for token limit exceeded error
      const errorCode = err?.response?.data?.code;
      const tokenUsage = err?.response?.data?.data?.tokenUsage;
      
      if (errorCode === 'TOKEN_LIMIT_EXCEEDED' && tokenUsage) {
        useTokenLimitModalStore.getState().showModal(tokenUsage as TokenUsageInfo);
      }
      
      setError(t('ideas.failedToGenerate'));
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = () => {
    loadIdeas(true);
  };

  const hasProfile = profile && (profile.researchField || profile.interests?.length || profile.currentProjects);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-gold to-accent-coral flex items-center justify-center shadow-lg">
            <Lightbulb className="text-white text-2xl" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-accent-gold"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <p className="mt-4 text-foreground font-medium">{t('ideas.generating')}</p>
        <p className="text-sm text-muted mt-1">
          {hasProfile 
            ? t('ideas.tailoringToProfile') 
            : t('ideas.creatingGeneral')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-accent-coral/10 border border-accent-coral/30 flex items-center justify-center">
          <ErrorIcon className="text-accent-coral text-2xl" />
        </div>
        <p className="mt-4 text-foreground font-medium">{t('ideas.failedTitle')}</p>
        <p className="text-sm text-muted mt-1 text-center max-w-md">{error}</p>
        <button
          onClick={handleRegenerate}
          className="mt-4 btn-secondary flex items-center gap-2"
        >
          <Refresh className="w-4 h-4" />
          {t('ideas.tryAgain')}
        </button>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Lightbulb className="text-muted text-2xl" />
        </div>
        <p className="mt-4 text-foreground font-medium">{t('ideas.noIdeas')}</p>
        <p className="text-sm text-muted mt-1 text-center max-w-md">
          {hasProfile 
            ? t('ideas.noIdeasWithProfile')
            : t('ideas.noIdeasNoProfile')}
        </p>
        <button
          onClick={handleRegenerate}
          className="mt-4 btn-primary flex items-center gap-2"
        >
          <AutoAwesome className="w-4 h-4" />
          {t('ideas.generateIdeas')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent-gold to-accent-coral flex items-center justify-center shadow-lg flex-shrink-0">
            <Lightbulb className="text-white text-lg sm:text-xl" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{t('ideas.title')}</h3>
            <p className="text-xs sm:text-sm text-muted">
              {t('ideas.ideaCount', { count: ideas.length })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {cached && (
            <Tooltip title={t('ideas.cachedTooltip')}>
              <span className="hidden xs:flex items-center gap-1 px-2 py-1 text-xs bg-accent-mint/10 text-accent-mint rounded-lg">
                <CheckCircle className="w-3 h-3" />
                <span className="hidden sm:inline">{t('ideas.cached')}</span>
              </span>
            </Tooltip>
          )}
          <Tooltip title={t('ideas.regenerate')}>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="p-1.5 sm:p-2 text-muted hover:text-foreground hover:bg-surface rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
            >
              {isRegenerating ? (
                <CircularProgress size={18} className="text-primary-500" />
              ) : (
                <Refresh className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Profile Context Info */}
      {userContext && (userContext.researchField || userContext.interests?.length || userContext.currentProjects) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 sm:p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg sm:rounded-xl"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm text-primary-400 mb-2">
            <Person className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="font-medium">{t('ideas.tailoredToProfile')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
            {userContext.researchField && (
              <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-surface rounded-md sm:rounded-lg text-muted">
                <School className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-none">{userContext.researchField}</span>
              </span>
            )}
            {userContext.interests && userContext.interests.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-surface rounded-md sm:rounded-lg text-muted">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {userContext.interests.slice(0, 2).join(', ')}
                  {userContext.interests.length > 2 && ` +${userContext.interests.length - 2}`}
                </span>
              </span>
            )}
            {userContext.currentProjects && (
              <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-surface rounded-md sm:rounded-lg text-muted">
                <Work className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                {t('ideas.projectsActive')}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* No Profile Warning */}
      {!hasProfile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 sm:p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-lg sm:rounded-xl"
        >
          <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm text-accent-gold">
            <Person className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>{t('ideas.tip')}:</strong> {t('ideas.completeProfile')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Ideas List */}
      <AnimatePresence>
        <div className="space-y-3">
          {ideas.map((idea, idx) => (
            <IdeaCard key={idx} idea={idea} index={idx} />
          ))}
        </div>
      </AnimatePresence>

      {/* Difficulty Legend */}
      <div className="pt-3 sm:pt-4 border-t border-border/50">
        <p className="text-[10px] sm:text-xs text-muted mb-2">{t('ideas.difficultyLevels')}:</p>
        <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2 xs:gap-3">
          {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-sm">{config.icon}</span>
              <span className="text-[10px] sm:text-xs text-muted">
                <span className="font-medium">{t(`ideas.difficulty.${key}`)}</span>
                <span className="hidden xs:inline"> - {t(`ideas.difficultyDesc.${key}`)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

