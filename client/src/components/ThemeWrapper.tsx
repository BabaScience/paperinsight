import { useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/stores/themeStore';
import { getTheme } from '@/lib/theme';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { resolvedMode } = useThemeStore();

  // Apply theme class to document on mount and changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedMode);
  }, [resolvedMode]);

  // Update favicon based on theme
  useEffect(() => {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg';
    }
  }, [resolvedMode]);

  // Get the correct MUI theme
  const muiTheme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

  // Toast styles based on theme
  const toastStyle = useMemo(() => ({
    style: {
      background: resolvedMode === 'dark' ? '#1e293b' : '#ffffff',
      color: resolvedMode === 'dark' ? '#f8fafc' : '#0f172a',
      border: `1px solid ${resolvedMode === 'dark' ? '#334155' : '#e2e8f0'}`,
    },
  }), [resolvedMode]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={toastStyle}
      />
    </ThemeProvider>
  );
}

