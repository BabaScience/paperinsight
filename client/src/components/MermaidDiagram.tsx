import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { motion } from 'framer-motion';
import { 
  ContentCopy, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  RestartAlt, 
  Download,
  Fullscreen,
  FullscreenExit,
  Close,
} from '@mui/icons-material';
import { Tooltip, Dialog, DialogContent, IconButton } from '@mui/material';
import { useThemeStore } from '@/stores/themeStore';

interface MermaidDiagramProps {
  code: string;
  title?: string;
  description?: string;
  className?: string;
}

// Initialize mermaid with default config
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  mindmap: {
    useMaxWidth: true,
  },
});

export function MermaidDiagram({ code, title, description, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { resolvedMode } = useThemeStore();

  const renderDiagram = useCallback(async () => {
    if (!code) return;

    try {
      // Update mermaid theme based on current mode
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedMode === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
        mindmap: {
          useMaxWidth: true,
        },
        themeVariables: resolvedMode === 'dark' ? {
          primaryColor: '#6366f1',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#4f46e5',
          lineColor: '#64748b',
          secondaryColor: '#1e293b',
          tertiaryColor: '#334155',
          background: '#0f172a',
          mainBkg: '#1e293b',
          nodeBkg: '#1e293b',
          textColor: '#f8fafc',
          nodeTextColor: '#f8fafc',
          clusterBkg: '#334155',
          titleColor: '#f8fafc',
          edgeLabelBackground: '#1e293b',
        } : {
          primaryColor: '#6366f1',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#4f46e5',
          lineColor: '#64748b',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#e2e8f0',
          background: '#ffffff',
          mainBkg: '#ffffff',
          nodeBkg: '#f8fafc',
          textColor: '#0f172a',
          nodeTextColor: '#0f172a',
          clusterBkg: '#f1f5f9',
          titleColor: '#0f172a',
          edgeLabelBackground: '#ffffff',
        },
      });

      // Generate unique ID for this diagram
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Render the diagram
      const { svg: renderedSvg } = await mermaid.render(id, code);
      setSvg(renderedSvg);
      setError(null);
    } catch (err) {
      console.error('Mermaid render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
      setSvg('');
    }
  }, [code, resolvedMode]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Reset zoom when entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setZoom(1);
    }
  }, [isFullscreen]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Control buttons component (reused in both views)
  const ControlButtons = ({ showFullscreenToggle = true, size = 'small', isMobileFullscreen = false }: { showFullscreenToggle?: boolean; size?: 'small' | 'large'; isMobileFullscreen?: boolean }) => {
    const iconClass = size === 'large' ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-4 h-4';
    const buttonClass = size === 'large' 
      ? 'p-2 sm:p-2.5 bg-surface/90 backdrop-blur-sm border border-border rounded-lg sm:rounded-xl hover:bg-surface-hover transition-colors touch-manipulation'
      : 'p-1.5 bg-surface/90 backdrop-blur-sm border border-border rounded-lg hover:bg-surface-hover transition-colors touch-manipulation';

    return (
      <div className="flex items-center gap-0.5 sm:gap-1">
        <Tooltip title="Zoom out">
          <button onClick={handleZoomOut} className={buttonClass}>
            <ZoomOut className={`${iconClass} text-muted`} />
          </button>
        </Tooltip>
        <span className={`px-1.5 sm:px-2 text-[10px] sm:text-xs text-muted bg-surface/90 backdrop-blur-sm border border-border rounded-md sm:rounded-lg ${size === 'large' ? 'py-1.5 sm:py-2' : 'py-1'}`}>
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip title="Zoom in">
          <button onClick={handleZoomIn} className={buttonClass}>
            <ZoomIn className={`${iconClass} text-muted`} />
          </button>
        </Tooltip>
        <Tooltip title="Reset zoom">
          <button onClick={handleResetZoom} className={`${buttonClass} ${isMobileFullscreen ? 'hidden xs:block' : ''}`}>
            <RestartAlt className={`${iconClass} text-muted`} />
          </button>
        </Tooltip>
        <div className={`w-px ${size === 'large' ? 'h-5 sm:h-6' : 'h-4'} bg-border mx-0.5 sm:mx-1 ${isMobileFullscreen ? 'hidden xs:block' : ''}`} />
        <Tooltip title="Download SVG">
          <button onClick={downloadSvg} className={`${buttonClass} ${isMobileFullscreen ? 'hidden xs:block' : ''}`}>
            <Download className={`${iconClass} text-muted`} />
          </button>
        </Tooltip>
        <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
          <button onClick={copyCode} className={`${buttonClass} ${isMobileFullscreen ? 'hidden sm:block' : ''}`}>
            {copied ? (
              <Check className={`${iconClass} text-accent-mint`} />
            ) : (
              <ContentCopy className={`${iconClass} text-muted`} />
            )}
          </button>
        </Tooltip>
        {showFullscreenToggle && (
          <>
            <div className={`w-px ${size === 'large' ? 'h-5 sm:h-6' : 'h-4'} bg-border mx-0.5 sm:mx-1`} />
            <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              <button onClick={toggleFullscreen} className={buttonClass}>
                {isFullscreen ? (
                  <FullscreenExit className={`${iconClass} text-muted`} />
                ) : (
                  <Fullscreen className={`${iconClass} text-muted`} />
                )}
              </button>
            </Tooltip>
          </>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className={`p-4 bg-accent-coral/10 border border-accent-coral/30 rounded-xl ${className}`}>
        <p className="text-accent-coral text-sm font-medium mb-2">Failed to render diagram</p>
        <pre className="text-xs text-muted overflow-auto max-h-32 bg-surface p-2 rounded">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="text-xs text-muted cursor-pointer hover:text-foreground">
            View Mermaid code
          </summary>
          <pre className="mt-2 text-xs text-muted overflow-auto max-h-48 bg-surface p-2 rounded font-mono">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <>
      {/* Normal View */}
      <div className={`relative group ${className}`}>
        {/* Controls - Always visible on mobile, hover on desktop */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <ControlButtons />
        </div>

        {/* Diagram container */}
        <motion.div
          ref={containerRef}
          className="overflow-auto bg-surface/30 rounded-lg sm:rounded-xl border border-border/50 p-2 sm:p-4 min-h-[150px] sm:min-h-[200px] flex items-center justify-center cursor-pointer touch-manipulation"
          style={{ maxHeight: '400px' }}
          onClick={() => !isFullscreen && setIsFullscreen(true)}
        >
          {svg ? (
            <div
              className="mermaid-svg transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex items-center gap-2 text-muted">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs sm:text-sm">Rendering diagram...</span>
            </div>
          )}
        </motion.div>

        {/* Tap/Click hint */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[10px] sm:text-xs text-muted bg-surface/90 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border">
            <span className="sm:hidden">Tap to expand</span>
            <span className="hidden sm:inline">Click to view fullscreen</span>
          </span>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Dialog
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        fullScreen
        maxWidth={false}
        PaperProps={{
          sx: {
            m: 0,
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            backgroundColor: resolvedMode === 'dark' ? '#1e293b' : '#ffffff',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: resolvedMode === 'dark' ? '#1e293b' : '#ffffff',
          }}
        >
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50 ${
              resolvedMode === 'dark' ? 'bg-surface/80' : 'bg-white/90'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center flex-shrink-0">
                <Fullscreen className="text-white text-lg sm:text-xl" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">
                  {title || 'Diagram View'}
                </h2>
                {description && (
                  <p className="text-xs sm:text-sm text-muted line-clamp-1 sm:line-clamp-none">{description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <ControlButtons showFullscreenToggle={false} size="large" isMobileFullscreen={true} />
              <div className="hidden sm:block w-px h-8 bg-border" />
              <Tooltip title="Close (ESC)">
                <IconButton
                  onClick={() => setIsFullscreen(false)}
                  sx={{
                    p: { xs: 1, sm: 1.5 },
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    },
                  }}
                >
                  <Close sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                </IconButton>
              </Tooltip>
            </div>
          </motion.div>

          {/* Diagram Area */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={`flex-1 overflow-auto p-6 flex items-center justify-center w-full min-h-0 ${
              resolvedMode === 'dark' ? 'bg-surface' : 'bg-white'
            }`}
          >
            <div
              className="mermaid-svg transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: 'center center',
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </motion.div>

          {/* Footer hint */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`flex items-center justify-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-t border-border/50 text-xs sm:text-sm text-muted ${
              resolvedMode === 'dark' ? 'bg-surface/50' : 'bg-white/80'
            }`}
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 sm:px-2 py-0.5 bg-surface border border-border rounded text-[10px] sm:text-xs font-mono">ESC</kbd>
              <span className="hidden xs:inline">to close</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Scroll to pan</span>
            <span>•</span>
            <span>Pinch/controls to zoom</span>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
