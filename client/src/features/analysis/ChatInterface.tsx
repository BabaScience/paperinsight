import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Person,
  ContentCopy,
  Check,
  Article,
  Refresh,
  Psychology,
  TipsAndUpdates,
  Science,
  QuestionMark,
} from '@mui/icons-material';
import { CircularProgress, Tooltip, IconButton } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { papersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import toast from 'react-hot-toast';

interface ChatInterfaceProps {
  paperId: string;
  paperTitle: string;
  isMobile?: boolean;
  onMessageCountChange?: (count: number) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    chunkId: string;
    content: string;
    score: number;
    sectionTitle?: string;
  }>;
  createdAt: Date;
  isError?: boolean;
}

const suggestedQuestionKeys = [
  { icon: TipsAndUpdates, key: "chat.mainContribution", color: "from-amber-500 to-orange-500" },
  { icon: Science, key: "chat.methodologyUsed", color: "from-cyan-500 to-blue-500" },
  { icon: Psychology, key: "chat.keyFindings", color: "from-violet-500 to-purple-500" },
  { icon: QuestionMark, key: "chat.whatLimitations", color: "from-rose-500 to-pink-500" },
];

export function ChatInterface({ paperId, paperTitle, isMobile = false, onMessageCountChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedMode } = useThemeStore();
  const { accessToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load conversation history
  const { data: conversationData } = useQuery({
    queryKey: ['conversation', paperId],
    queryFn: () => papersApi.getConversation(paperId),
  });

  useEffect(() => {
    if (conversationData?.data?.data?.conversation?.messages) {
      setMessages(conversationData.data.data.conversation.messages);
    }
  }, [conversationData]);

  // Notify parent of message count changes
  useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount (only on desktop)
  useEffect(() => {
    if (!isMobile) {
      inputRef.current?.focus();
    }
  }, [isMobile]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: question.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setRetryQuestion(null);
    setIsStreaming(true);

    // Add placeholder for assistant response
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      if (!accessToken) {
        toast.error(t('chat.pleaseLogin'));
        logout();
        navigate('/login');
        return;
      }

      const response = await fetch(`/api/papers/${paperId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      if (response.status === 401) {
        toast.error(t('chat.sessionExpired'));
        logout();
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Query failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      let fullContent = '';
      let sources: Message['sources'] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'token') {
                fullContent += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    lastMessage.content = fullContent;
                  }
                  return newMessages;
                });
              } else if (data.type === 'complete') {
                sources = data.sources;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    lastMessage.sources = sources;
                  }
                  return newMessages;
                });
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      setRetryQuestion(question);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          lastMessage.content = t('chat.errorMessage');
          lastMessage.isError = true;
        }
        return newMessages;
      });
      toast.error(t('chat.failedResponse'));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleRetry = () => {
    if (retryQuestion) {
      // Remove the error message before retrying
      setMessages((prev) => prev.slice(0, -2));
      sendMessage(retryQuestion);
    }
  };

  const copyToClipboard = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(t('chat.copiedToClipboard'));
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`flex flex-col h-full min-h-0 overflow-hidden ${isMobile ? 'bg-background' : 'card'}`}>
      {/* Header - Hidden on mobile since overlay has its own header */}
      {!isMobile && (
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="relative">
            <img 
              src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
              alt="LUNAI" 
              className="w-11 h-11"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-mint rounded-full border-2 border-background" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{t('chat.header')}</h3>
            <p className="text-xs text-muted">{t('chat.poweredBy')}</p>
          </div>
          {messages.length > 0 && (
            <Tooltip title={t('chat.clearConversation')}>
              <IconButton
                size="small"
                onClick={() => setMessages([])}
                className="text-muted hover:text-foreground"
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin min-h-0 ${isMobile ? 'px-4' : ''}`}>
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4 px-2"
          >
            {/* Hero section */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-accent-violet/10 to-transparent rounded-3xl blur-2xl" />
              <img 
                src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
                alt="LUNAI" 
                className="relative w-20 h-20 mx-auto"
              />
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('chat.askAnything')}
            </h3>
            <p className="text-muted text-sm mb-6 max-w-[280px] mx-auto leading-relaxed">
              {t('chat.analyzedPaper', { title: paperTitle })}
            </p>
            
            {/* Suggested questions grid */}
            <div className="grid grid-cols-2 gap-2">
              {suggestedQuestionKeys.map((q, idx) => {
                const Icon = q.icon;
                const questionText = t(q.key);
                return (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => sendMessage(questionText)}
                    className="group relative p-3 text-left bg-surface/50 hover:bg-surface border border-border/50 hover:border-primary-500/30 rounded-xl transition-all duration-200 overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${q.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${q.color} flex items-center justify-center mb-2 shadow-sm`}>
                      <Icon className="text-white text-sm" />
                    </div>
                    <p className="text-xs text-foreground font-medium leading-tight">
                      {questionText}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                {message.role === 'user' ? (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md bg-gradient-to-br from-primary-500 to-primary-600">
                    <Person className="text-white text-sm" />
                  </div>
                ) : (
                  <img 
                    src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
                    alt="LUNAI" 
                    className="w-8 h-8 flex-shrink-0"
                  />
                )}

                {/* Message Content */}
                <div
                  className={`flex-1 max-w-[85%] ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-tr-md'
                        : message.isError
                        ? 'bg-accent-coral/10 text-accent-coral border border-accent-coral/30 rounded-tl-md'
                        : 'bg-surface border border-border/50 rounded-tl-md'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {message.content ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                              ul: ({ children }) => <ul className="mb-2 pl-4 list-disc text-foreground">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal text-foreground">{children}</ol>,
                              li: ({ children }) => <li className="mb-1 text-foreground">{children}</li>,
                              strong: ({ children }) => <strong className="text-primary-500 font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="text-foreground italic">{children}</em>,
                              code: ({ children }) => <code className="bg-code px-1.5 py-0.5 rounded text-code text-xs font-mono">{children}</code>,
                              h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold text-foreground mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-bold text-foreground mb-1">{children}</h3>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-primary-400 pl-3 italic text-muted">{children}</blockquote>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : isStreaming && idx === messages.length - 1 ? (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex gap-1">
                              <motion.span 
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                                className="w-2 h-2 bg-primary-400 rounded-full"
                              />
                              <motion.span 
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                className="w-2 h-2 bg-primary-400 rounded-full"
                              />
                              <motion.span 
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                className="w-2 h-2 bg-primary-400 rounded-full"
                              />
                            </div>
                            <span className="text-sm text-muted">{t('chat.analyzingPaper')}</span>
                          </div>
                        ) : null}
                        {isStreaming && idx === messages.length - 1 && message.content && (
                          <span className="inline-block w-0.5 h-4 bg-primary-400 animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className={`text-[10px] text-muted mt-1 ${message.role === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatTime(message.createdAt)}
                  </p>

                  {/* Error Retry Button */}
                  {message.isError && retryQuestion && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={handleRetry}
                      className="mt-2 px-3 py-1.5 text-xs bg-accent-coral/10 text-accent-coral border border-accent-coral/30 rounded-lg hover:bg-accent-coral/20 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Refresh className="w-3 h-3" />
                      Retry
                    </motion.button>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 space-y-1.5"
                    >
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Article className="w-3 h-3" />
                        <span className="font-medium">{t('chat.sources', { count: message.sources.length })}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {message.sources.slice(0, 3).map((source, sIdx) => (
                          <Tooltip
                            key={sIdx}
                            title={
                              <div className="max-w-xs">
                                <p className="font-medium mb-1 text-sm">{source.sectionTitle || `Chunk ${sIdx + 1}`}</p>
                                <p className="text-xs opacity-90">{source.content.slice(0, 200)}...</p>
                                <p className="text-xs mt-1 text-primary-300">{t('chat.relevance', { score: Math.round(source.score * 100) })}</p>
                              </div>
                            }
                            placement="top"
                            arrow
                          >
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface border border-border/50 text-muted rounded-lg hover:bg-surface/80 hover:border-primary-500/30 cursor-help transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                              {source.sectionTitle?.slice(0, 15) || `S${sIdx + 1}`}
                              {source.sectionTitle && source.sectionTitle.length > 15 && '...'}
                            </span>
                          </Tooltip>
                        ))}
                        {message.sources.length > 3 && (
                          <span className="px-2 py-1 text-xs text-muted">
                            {t('chat.more', { count: message.sources.length - 3 })}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Copy button for assistant messages */}
                  {message.role === 'assistant' && message.content && !message.isError && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => copyToClipboard(message.content, idx)}
                      className="mt-1.5 p-1.5 text-muted hover:text-foreground hover:bg-surface/50 rounded-lg transition-all"
                    >
                      {copiedId === idx ? (
                        <Check className="w-4 h-4 text-accent-mint" />
                      ) : (
                        <ContentCopy className="w-4 h-4" />
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className={`pt-3 border-t border-border/50 flex-shrink-0 ${isMobile ? 'px-4 pb-2 bg-surface/30' : ''}`}>
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={t('chat.askQuestion')}
              className="input-field w-full resize-none min-h-[48px] max-h-[120px] pr-4 leading-relaxed text-sm"
              rows={1}
              disabled={isStreaming}
            />
          </div>
          <motion.button
            type="submit"
            disabled={!input.trim() || isStreaming}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary h-12 w-12 p-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 rounded-xl"
          >
            {isStreaming ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        {/* Hide keyboard hint on mobile */}
        {!isMobile && (
          <p className="text-xs text-muted mt-2 text-center">
            {t('common.pressEnterToSend')}
          </p>
        )}
      </form>
    </div>
  );
}
