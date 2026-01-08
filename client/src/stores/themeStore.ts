import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      resolvedMode: 'dark',
      
      setMode: (mode) => {
        const resolvedMode = resolveTheme(mode);
        set({ mode, resolvedMode });
        
        // Update document class
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedMode);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on rehydration
        if (state) {
          const resolvedMode = resolveTheme(state.mode);
          state.resolvedMode = resolvedMode;
          
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          root.classList.add(resolvedMode);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      const resolvedMode = e.matches ? 'dark' : 'light';
      useThemeStore.setState({ resolvedMode });
      
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedMode);
    }
  });
}



