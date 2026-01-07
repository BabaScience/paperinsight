import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  ArrowBack,
  Description,
  Person,
  CalendarToday,
  Layers,
  CheckCircle,
  Error,
  Pending,
  ExpandMore,
  KeyboardArrowDown,
  Chat,
  BubbleChart,
  Lightbulb,
  Article,
  AutoAwesome,
} from '@mui/icons-material';
import { Chip, CircularProgress, Tabs, Tab } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { papersApi } from '@/lib/api';
import { ChatInterface } from './ChatInterface';
import { InsightsPanel } from './InsightsPanel';
import { VisualsPanel } from './VisualsPanel';
import { IdeasPanel } from './IdeasPanel';
import {
  subscribeToPaper,
  unsubscribeFromPaper,
  onProcessingStatus,
  onProcessingComplete,
} from '@/lib/socket';
import { useThemeStore } from '@/stores/themeStore';
import { useProfileStore } from '@/stores/profileStore';


export function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedMode } = useThemeStore();
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [translatedAbstract, setTranslatedAbstract] = useState<string | null>(null);
  const [isTranslatingAbstract, setIsTranslatingAbstract] = useState(false);

  // For swipe-to-close gesture
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['paper', id],
    queryFn: () => papersApi.get(id!),
    enabled: !!id,
  });

  const paper = data?.data?.data?.paper;

  // Subscribe to real-time updates
  useEffect(() => {
    if (id) {
      subscribeToPaper(id);

      const unsubStatus = onProcessingStatus((data) => {
        if (data.paperId === id) {
          setProcessingMessage(data.message);
        }
      });

      const unsubComplete = onProcessingComplete((data) => {
        if (data.paperId === id) {
          refetch();
        }
      });

      return () => {
        unsubscribeFromPaper(id);
        unsubStatus();
        unsubComplete();
      };
    }
  }, [id, refetch]);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isChatOpen]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setIsChatOpen(false);
    }
  };

  // Translate abstract if user has preferred language set
  // This hook must be called before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (id && paper?.abstract && profile?.preferredLanguage && profile.preferredLanguage.toLowerCase() !== 'english') {
      const normalizedLanguage = profile.preferredLanguage.toLowerCase();
      
      // Check if translation already exists in cache
      if (paper.translatedAbstracts && paper.translatedAbstracts[normalizedLanguage]) {
        setTranslatedAbstract(paper.translatedAbstracts[normalizedLanguage]);
        return;
      }

      // Request translation if not cached
      setIsTranslatingAbstract(true);
      papersApi.translateAbstract(id, paper.abstract, profile.preferredLanguage)
        .then((response) => {
          setTranslatedAbstract(response.data.data.translatedText);
          // Refetch paper to update cache with new translation
          if (!response.data.data.cached) {
            refetch();
          }
        })
        .catch((error) => {
          console.error('Failed to translate abstract:', error);
          // Fallback to original abstract on error
          setTranslatedAbstract(null);
        })
        .finally(() => {
          setIsTranslatingAbstract(false);
        });
    } else {
      setTranslatedAbstract(null);
    }
  }, [id, paper?.abstract, paper?.translatedAbstracts, profile?.preferredLanguage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <CircularProgress />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3rem)]">
        <p className="text-muted text-lg">{t('analysis.paperNotFound')}</p>
        <button
          onClick={() => navigate('/library')}
          className="btn-primary mt-4"
        >
          {t('analysis.goToLibrary')}
        </button>
      </div>
    );
  }

  const isReady = paper.status === 'ready';
  const isProcessing = paper.status === 'processing';
  const isFailed = paper.status === 'failed';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 pb-3 sm:pb-4">
        <div className="flex items-start gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/library')}
            className="p-2 hover:bg-surface/70 rounded-lg transition-colors mt-0.5 sm:mt-1 touch-manipulation flex-shrink-0"
            aria-label={t('common.back')}
          >
            <ArrowBack className="text-muted w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-foreground line-clamp-2 sm:truncate">
                  {paper.title || paper.fileName}
                </h1>
                
                {paper.authors && paper.authors.length > 0 && (
                  <div className="flex items-center gap-2 mt-1 sm:mt-2 text-muted">
                    <Person className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm truncate">
                      {paper.authors.join(', ')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarToday className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {formatDate(paper.createdAt)}
                  </span>
                  {paper.pageCount && (
                    <span className="flex items-center gap-1">
                      <Description className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {t('analysis.pages', { count: paper.pageCount })}
                    </span>
                  )}
                  {paper.chunkCount && (
                    <span className="hidden sm:flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      {t('analysis.chunks', { count: paper.chunkCount })}
                    </span>
                  )}
                </div>
              </div>

              {/* Status - Hidden on very small screens */}
              <div className="flex-shrink-0 hidden xs:block">
                {isReady && (
                  <Chip
                    icon={<CheckCircle className="w-4 h-4" />}
                    label={t('library.ready')}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                )}
                {isProcessing && (
                  <Chip
                    icon={<Pending className="w-4 h-4" />}
                    label={t('library.processing')}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                )}
                {isFailed && (
                  <Chip
                    icon={<Error className="w-4 h-4" />}
                    label={t('library.failed')}
                    color="error"
                    variant="outlined"
                    size="small"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 card bg-primary-500/10 border-primary-500/30 mb-4"
        >
          <div className="flex items-center gap-4">
            <CircularProgress size={24} />
            <div>
              <p className="font-medium text-foreground">{t('analysis.processingPaper')}</p>
              <p className="text-sm text-muted">{processingMessage || t('analysis.pleaseWait')}</p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            {['parsing', 'chunking', 'embedding'].map((step) => {
              const status = paper.processingSteps[step as keyof typeof paper.processingSteps];
              return (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full ${
                    status === 'completed'
                      ? 'bg-accent-mint'
                      : status === 'in_progress'
                      ? 'bg-primary-500 animate-pulse'
                      : status === 'failed'
                      ? 'bg-accent-coral'
                      : 'bg-border'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted">
            <span>{t('analysis.parsing')}</span>
            <span>{t('analysis.chunking')}</span>
            <span>{t('analysis.embedding')}</span>
          </div>
        </motion.div>
      )}

      {/* Failed Status */}
      {isFailed && (
        <div className="flex-shrink-0 card bg-accent-coral/10 border-accent-coral/30 mb-4">
          <div className="flex items-center gap-4">
            <Error className="text-accent-coral" />
            <div>
              <p className="font-medium text-foreground">{t('analysis.processingFailed')}</p>
              <p className="text-sm text-muted">{paper.error || t('analysis.errorOccurred')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Scrollable */}
      {isReady && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Left Panel - Insights/Visuals/Ideas (Full width on mobile, half on desktop) */}
          <div className="card flex flex-col min-h-0 overflow-hidden">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              className="border-b border-border/50 flex-shrink-0"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minWidth: 'auto',
                  padding: { xs: '8px 12px', sm: '12px 16px' },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            >
              <Tab 
                label={
                  <span className="flex items-center gap-1.5">
                    <AutoAwesome className="w-4 h-4" />
                    {t('analysis.tabs.insights')}
                  </span>
                } 
              />
              <Tab 
                label={
                  <span className="flex items-center gap-1.5">
                    <BubbleChart className="w-4 h-4" />
                    {t('analysis.tabs.visuals')}
                  </span>
                } 
              />
              <Tab 
                label={
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4" />
                    {t('analysis.tabs.ideas')}
                  </span>
                } 
              />
            </Tabs>
            
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <AnimatePresence mode="wait">
                {activeTab === 0 && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <InsightsPanel paperId={id!} />
                  </motion.div>
                )}
                {activeTab === 1 && (
                  <motion.div
                    key="visuals"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <VisualsPanel paperId={id!} />
                  </motion.div>
                )}
                {activeTab === 2 && (
                  <motion.div
                    key="ideas"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <IdeasPanel paperId={id!} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Abstract - Collapsible at bottom */}
            {paper.abstract && (
              <div className="flex-shrink-0 border-t border-border/50 p-4 bg-surface/30">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2">
                    <ExpandMore className="w-4 h-4 transition-transform group-open:rotate-180" />
                    {t('analysis.abstract')}
                    {isTranslatingAbstract && (
                      <CircularProgress size={14} className="ml-2" />
                    )}
                  </summary>
                  <div className="mt-2 pl-6 max-h-64 overflow-y-auto scrollbar-thin">
                    {isTranslatingAbstract ? (
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <CircularProgress size={16} />
                        <span>{t('analysis.translating')}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted leading-relaxed pr-2">
                        {translatedAbstract || paper.abstract}
                      </p>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Right Panel - Chat (Hidden on mobile, visible on desktop) */}
          <div className="hidden lg:block min-h-0 overflow-hidden">
            <ChatInterface paperId={id!} paperTitle={paper.title} />
          </div>
        </div>
      )}

      {/* Not Ready State */}
      {!isReady && !isProcessing && !isFailed && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CircularProgress className="mb-4" />
            <p className="text-muted">{t('analysis.loadingPaper')}</p>
          </div>
        </div>
      )}

      {/* Mobile Chat FAB - Only visible on mobile when paper is ready */}
      {isReady && (
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 group"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 via-accent-violet to-accent-coral blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />
          
          {/* Button */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 via-accent-violet to-accent-coral shadow-2xl flex items-center justify-center">
            <Chat className="text-white text-2xl" />
            
            {/* Message count badge */}
            {messageCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-accent-coral rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
              >
                {messageCount > 9 ? '9+' : messageCount}
              </motion.span>
            )}
          </div>
          
          {/* Label tooltip */}
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-medium text-foreground whitespace-nowrap shadow-lg"
          >
            {t('analysis.askAI')}
          </motion.span>
        </motion.button>
      )}

      {/* Mobile Chat Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="lg:hidden fixed inset-0 bg-overlay backdrop-blur-md z-50"
            />
            
            {/* Chat Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ y, opacity }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
              className="lg:hidden fixed inset-x-0 bottom-0 top-0 bg-background z-50 flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Drag Handle */}
              <div className="flex-shrink-0 pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1.5 bg-border rounded-full" />
              </div>
              
              {/* Mobile Chat Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
                      alt="LUNAI" 
                      className="w-12 h-12"
                    />
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-accent-mint rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      <span className="text-blue-600 dark:text-blue-500">LUNA</span>
                      <span className="text-blue-600 dark:text-blue-500">i</span>
                    </h3>
                    <p className="text-xs text-accent-mint flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-accent-mint rounded-full animate-pulse" />
                      Online • RAG + GPT-4o
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="p-2.5 hover:bg-surface rounded-xl transition-colors"
                  >
                    <KeyboardArrowDown className="text-muted text-2xl" />
                  </button>
                </div>
              </div>
              
              {/* Paper context pill */}
              <div className="px-4 py-2 flex-shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full">
                  <Article className="w-4 h-4 text-primary-400" />
                  <span className="text-xs text-primary-400 font-medium truncate max-w-[200px]">
                    {paper.title || paper.fileName}
                  </span>
                </div>
              </div>
              
              {/* Chat Interface */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatInterface 
                  paperId={id!} 
                  paperTitle={paper.title} 
                  isMobile 
                  onMessageCountChange={setMessageCount}
                />
              </div>
              
              {/* Safe area for home indicator */}
              <div className="h-safe-area-bottom bg-surface/50" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
