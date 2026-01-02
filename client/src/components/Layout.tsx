import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Upload,
  LibraryBooks,
  Logout,
  MenuOpen,
  Menu,
  Person,
  Token,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { profileApi, TokenUsageInfo } from '@/lib/api';
import { Tooltip, CircularProgress } from '@mui/material';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.dashboard' },
  { path: '/library', icon: LibraryBooks, labelKey: 'nav.library' },
  { path: '/upload', icon: Upload, labelKey: 'nav.upload' },
  { path: '/profile', icon: Person, labelKey: 'nav.profile' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const { user, logout } = useAuthStore();
  const { resolvedMode } = useThemeStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load token usage on mount and periodically refresh
  useEffect(() => {
    loadTokenUsage();
    // Refresh every 60 seconds
    const interval = setInterval(loadTokenUsage, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get color based on usage percentage
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getUsageBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full glass border-r border-theme-border/50 z-50 flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-theme-border/50">
          <div className="flex items-center gap-2 overflow-hidden">
            <img 
              src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
              alt="LUNAI" 
              className="w-10 h-10 flex-shrink-0"
            />
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display font-bold text-xl text-primary-400 whitespace-nowrap"
              >
                LUNAI
              </motion.span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-theme-surface-hover rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <MenuOpen className="text-theme-muted" />
            ) : (
              <Menu className="text-theme-muted" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                        : 'text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium whitespace-nowrap"
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Theme & Language Toggles */}
        <div className="px-3 py-2 space-y-2">
          {sidebarOpen ? (
            <>
              <ThemeToggle fullWidth />
              <LanguageSwitcher fullWidth />
            </>
          ) : (
            <>
              <ThemeToggle compact />
              <LanguageSwitcher compact />
            </>
          )}
        </div>

        {/* Token Usage Indicator */}
        <div className="px-3 py-2 border-t border-theme-border/50">
          <NavLink
            to="/profile"
            className="block"
          >
            <Tooltip 
              title={tokenUsage 
                ? `${tokenUsage.used.toLocaleString()} / ${tokenUsage.allowance.toLocaleString()} tokens used`
                : 'Loading...'
              }
              placement="right"
              arrow
            >
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-theme-surface-hover ${
                tokenUsage?.hasReachedLimit ? 'bg-red-500/10' : ''
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  tokenUsage?.hasReachedLimit 
                    ? 'bg-red-500/20 text-red-500' 
                    : 'bg-primary-500/20 text-primary-500'
                }`}>
                  {isLoadingTokens ? (
                    <CircularProgress size={16} className="text-primary-500" />
                  ) : (
                    <Token className="w-4 h-4" />
                  )}
                </div>
                {sidebarOpen && tokenUsage && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-theme-muted">{t('nav.tokens')}</span>
                      <span className={`text-xs font-medium ${getUsageColor(tokenUsage.percentageUsed)}`}>
                        {tokenUsage.percentageUsed.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-theme-surface rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(tokenUsage.percentageUsed, 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${getUsageBgColor(tokenUsage.percentageUsed)}`}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-theme-muted">
                        {t('nav.tokensLeft', { value: (tokenUsage.remaining / 1000).toFixed(1) })}
                      </span>
                    </div>
                  </div>
                )}
                {!sidebarOpen && tokenUsage && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{
                    backgroundColor: tokenUsage.percentageUsed >= 90 
                      ? 'rgb(239, 68, 68)' 
                      : tokenUsage.percentageUsed >= 70 
                      ? 'rgb(245, 158, 11)' 
                      : 'rgb(16, 185, 129)'
                  }} />
                )}
              </div>
            </Tooltip>
          </NavLink>
        </div>

        {/* User section */}
        <div className="p-3 border-t border-theme-border/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-teal to-primary-500 flex items-center justify-center text-white font-medium flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-theme-primary truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-theme-muted truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 mt-2 text-theme-muted hover:text-accent-coral hover:bg-theme-surface-hover rounded-xl transition-all"
          >
            <Logout className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">{t('nav.logout')}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 260 : 80 }}
      >
        <div className="min-h-screen p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
