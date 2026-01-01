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
  ExpandLess,
  Article,
  SmartToy,
  KeyboardArrowDown,
  Chat,
} from '@mui/icons-material';
import { Chip, CircularProgress, Tabs, Tab, Collapse } from '@mui/material';
import { papersApi } from '@/lib/api';
import { ChatInterface } from './ChatInterface';
import { InsightsPanel } from './InsightsPanel';
import {
  subscribeToPaper,
  unsubscribeFromPaper,
  onProcessingStatus,
  onProcessingComplete,
} from '@/lib/socket';

interface Section {
  title: string;
  content: string;
  position: number;
}

function SectionCard({ section, index }: { section: Section; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const previewLength = 200;
  const hasMoreContent = section.content.length > previewLength;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-surface/50 border border-border/50 rounded-xl overflow-hidden hover:border-primary-500/30 transition-colors"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 font-medium text-sm">
            {index + 1}
          </div>
          <h4 className="font-medium text-foreground">
            {section.title}
          </h4>
        </div>
        {hasMoreContent && (
          expanded ? (
            <ExpandLess className="text-muted" />
          ) : (
            <ExpandMore className="text-muted" />
          )
        )}
      </button>
      
      <Collapse in={expanded || !hasMoreContent}>
        <div className="px-4 pb-4">
          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
            {section.content}
          </p>
        </div>
      </Collapse>
      
      {!expanded && hasMoreContent && (
        <div className="px-4 pb-4">
          <p className="text-sm text-muted leading-relaxed">
            {section.content.slice(0, previewLength)}...
          </p>
          <button
            onClick={() => setExpanded(true)}
            className="text-primary-400 text-sm mt-2 hover:text-primary-300"
          >
            Read more
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

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
        <p className="text-muted text-lg">Paper not found</p>
        <button
          onClick={() => navigate('/library')}
          className="btn-primary mt-4"
        >
          Go to Library
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

  const sections = paper.sections || [];

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 pb-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/library')}
            className="p-2 hover:bg-surface/70 rounded-lg transition-colors mt-1"
          >
            <ArrowBack className="text-muted" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl lg:text-2xl font-display font-bold text-foreground truncate">
                  {paper.title || paper.fileName}
                </h1>
                
                {paper.authors && paper.authors.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-muted">
                    <Person className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">
                      {paper.authors.join(', ')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarToday className="w-4 h-4" />
                    {formatDate(paper.createdAt)}
                  </span>
                  {paper.pageCount && (
                    <span className="flex items-center gap-1">
                      <Description className="w-4 h-4" />
                      {paper.pageCount} pages
                    </span>
                  )}
                  {paper.chunkCount && (
                    <span className="hidden sm:flex items-center gap-1">
                      <Layers className="w-4 h-4" />
                      {paper.chunkCount} chunks
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {isReady && (
                  <Chip
                    icon={<CheckCircle className="w-4 h-4" />}
                    label="Ready"
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                )}
                {isProcessing && (
                  <Chip
                    icon={<Pending className="w-4 h-4" />}
                    label="Processing"
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                )}
                {isFailed && (
                  <Chip
                    icon={<Error className="w-4 h-4" />}
                    label="Failed"
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
              <p className="font-medium text-foreground">Processing paper...</p>
              <p className="text-sm text-muted">{processingMessage || 'Please wait while we analyze your paper'}</p>
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
            <span>Parsing</span>
            <span>Chunking</span>
            <span>Embedding</span>
          </div>
        </motion.div>
      )}

      {/* Failed Status */}
      {isFailed && (
        <div className="flex-shrink-0 card bg-accent-coral/10 border-accent-coral/30 mb-4">
          <div className="flex items-center gap-4">
            <Error className="text-accent-coral" />
            <div>
              <p className="font-medium text-foreground">Processing failed</p>
              <p className="text-sm text-muted">{paper.error || 'An error occurred while processing this paper'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Scrollable */}
      {isReady && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel - Insights/Sections (Full width on mobile, half on desktop) */}
          <div className="card flex flex-col min-h-0 overflow-hidden">
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              className="border-b border-border/50 flex-shrink-0"
            >
              <Tab label="Insights" />
              <Tab 
                label={
                  <span className="flex items-center gap-1.5">
                    Sections
                    {sections.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded-full">
                        {sections.length}
                      </span>
                    )}
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
                    key="sections"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-3"
                  >
                    {sections.length > 0 ? (
                      sections.map((section: Section, idx: number) => (
                        <SectionCard key={idx} section={section} index={idx} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface/50 flex items-center justify-center">
                          <Article className="text-muted text-3xl" />
                        </div>
                        <p className="text-muted font-medium mb-2">No sections extracted</p>
                        <p className="text-sm text-muted max-w-xs mx-auto">
                          The PDF structure didn't match common section patterns. 
                          You can still ask questions about the paper using the chat.
                        </p>
                      </div>
                    )}
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
                    Abstract
                  </summary>
                  <p className="text-sm text-muted leading-relaxed mt-2 pl-6">
                    {paper.abstract}
                  </p>
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
            <p className="text-muted">Loading paper...</p>
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
            Ask AI
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
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 via-accent-violet to-accent-coral flex items-center justify-center shadow-lg">
                      <SmartToy className="text-white text-xl" />
                    </div>
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-accent-mint rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">PaperInsight AI</h3>
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
