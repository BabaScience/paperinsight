import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AccountTree,
  BubbleChart,
  Timeline,
  Schema,
  Refresh,
  AutoAwesome,
  Error as ErrorIcon,
  CheckCircle,
} from '@mui/icons-material';
import { CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { papersApi, type TokenUsageInfo } from '@/lib/api';
import { useTokenLimitModalStore } from '@/stores/tokenLimitModalStore';
import { MermaidDiagram } from '@/components/MermaidDiagram';

interface DiagramData {
  type: string;
  title: string;
  description: string;
  code: string;
}

interface VisualsPanelProps {
  paperId: string;
}

const DIAGRAM_ICONS: Record<string, React.ElementType> = {
  flowchart: AccountTree,
  mindmap: BubbleChart,
  sequenceDiagram: Timeline,
  classDiagram: Schema,
  erDiagram: Schema,
};

const DIAGRAM_COLORS: Record<string, string> = {
  flowchart: 'from-primary-500 to-accent-violet',
  mindmap: 'from-accent-teal to-accent-mint',
  sequenceDiagram: 'from-accent-gold to-accent-coral',
  classDiagram: 'from-accent-violet to-primary-500',
  erDiagram: 'from-accent-coral to-accent-gold',
};

export function VisualsPanel({ paperId }: VisualsPanelProps) {
  const [diagrams, setDiagrams] = useState<DiagramData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<number>(0);
  const { t } = useTranslation();

  useEffect(() => {
    loadVisuals();
  }, [paperId]);

  const loadVisuals = async (regenerate = false) => {
    try {
      if (regenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await papersApi.getVisuals(paperId, regenerate);
      const { visuals } = response.data.data;
      
      setDiagrams(visuals.diagrams || []);
      setCached(visuals.cached);
      setSelectedDiagram(0);
    } catch (err: any) {
      console.error('Failed to load visuals:', err);
      
      // Check for token limit exceeded error
      const errorCode = err?.response?.data?.code;
      const tokenUsage = err?.response?.data?.data?.tokenUsage;
      
      if (errorCode === 'TOKEN_LIMIT_EXCEEDED' && tokenUsage) {
        useTokenLimitModalStore.getState().showModal(tokenUsage as TokenUsageInfo);
      }
      
      setError(t('visuals.failedToGenerate'));
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = () => {
    loadVisuals(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center shadow-lg">
            <AutoAwesome className="text-white text-2xl" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-primary-500"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
        <p className="mt-4 text-foreground font-medium">{t('visuals.generating')}</p>
        <p className="text-sm text-muted mt-1">{t('visuals.analyzingStructure')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-accent-coral/10 border border-accent-coral/30 flex items-center justify-center">
          <ErrorIcon className="text-accent-coral text-2xl" />
        </div>
        <p className="mt-4 text-foreground font-medium">{t('visuals.failedTitle')}</p>
        <p className="text-sm text-muted mt-1 text-center max-w-md">{error}</p>
        <button
          onClick={handleRegenerate}
          className="mt-4 btn-secondary flex items-center gap-2"
        >
          <Refresh className="w-4 h-4" />
          {t('visuals.tryAgain')}
        </button>
      </div>
    );
  }

  if (diagrams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <BubbleChart className="text-muted text-2xl" />
        </div>
        <p className="mt-4 text-foreground font-medium">{t('visuals.noDiagrams')}</p>
        <p className="text-sm text-muted mt-1 text-center max-w-md">
          {t('visuals.noDiagramsDesc')}
        </p>
        <button
          onClick={handleRegenerate}
          className="mt-4 btn-primary flex items-center gap-2"
        >
          <AutoAwesome className="w-4 h-4" />
          {t('visuals.generateDiagrams')}
        </button>
      </div>
    );
  }

  const currentDiagram = diagrams[selectedDiagram];
  const Icon = DIAGRAM_ICONS[currentDiagram.type] || AccountTree;
  const gradientColor = DIAGRAM_COLORS[currentDiagram.type] || 'from-primary-500 to-accent-violet';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <AutoAwesome className="text-white text-lg sm:text-xl" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{t('visuals.title')}</h3>
            <p className="text-xs sm:text-sm text-muted">
              {t('visuals.diagramCount', { count: diagrams.length })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {cached && (
            <Tooltip title={t('visuals.cachedTooltip')}>
              <span className="hidden xs:flex items-center gap-1 px-2 py-1 text-xs bg-accent-mint/10 text-accent-mint rounded-lg">
                <CheckCircle className="w-3 h-3" />
                <span className="hidden sm:inline">{t('visuals.cached')}</span>
              </span>
            </Tooltip>
          )}
          <Tooltip title={t('visuals.regenerate')}>
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

      {/* Diagram Tabs */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
        {diagrams.map((diagram, idx) => {
          const DiagramIcon = DIAGRAM_ICONS[diagram.type] || AccountTree;
          const isSelected = idx === selectedDiagram;
          const color = DIAGRAM_COLORS[diagram.type] || 'from-primary-500 to-accent-violet';
          
          return (
            <motion.button
              key={idx}
              onClick={() => setSelectedDiagram(idx)}
              whileTap={{ scale: 0.98 }}
              className={`flex-shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border transition-all touch-manipulation ${
                isSelected
                  ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                  : 'border-border bg-surface/50 text-muted hover:text-foreground hover:border-primary-500/30'
              }`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center ${
                isSelected ? `bg-gradient-to-br ${color}` : 'bg-surface'
              }`}>
                <DiagramIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${isSelected ? 'text-white' : 'text-muted'}`} />
              </div>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap max-w-[100px] sm:max-w-none truncate">
                {diagram.title}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Current Diagram */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDiagram}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-3 sm:space-y-4"
        >
          {/* Diagram Info */}
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-surface/50 rounded-lg sm:rounded-xl border border-border/50">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className="text-white text-lg sm:text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{currentDiagram.title}</h4>
                <span className="px-2 py-0.5 text-xs bg-primary-500/10 text-primary-500 rounded-full capitalize self-start xs:self-auto flex-shrink-0">
                  {currentDiagram.type}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted mt-1 line-clamp-2 sm:line-clamp-none">{currentDiagram.description}</p>
            </div>
          </div>

          {/* Diagram Render */}
          <MermaidDiagram
            code={currentDiagram.code}
            title={currentDiagram.title}
            description={currentDiagram.description}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots for mobile */}
      {diagrams.length > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {diagrams.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDiagram(idx)}
              className={`w-8 h-8 rounded-full transition-all ${
                idx === selectedDiagram
                  ? 'bg-primary-500 w-6'
                  : 'bg-primary-500/20 hover:bg-muted'
              }`}
            >
              <span className=" text-white">{idx + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

