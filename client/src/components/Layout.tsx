import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Upload,
  LibraryBooks,
  Logout,
  MenuOpen,
  Menu,
  Person,
  Token,
  Close,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { RateLimitBanner } from './RateLimitBanner';
import { ProfileCompletionModal } from './ProfileCompletionModal';
import { profileApi, authApi, TokenUsageInfo } from '@/lib/api';
import { Tooltip, CircularProgress } from '@mui/material';
import { isProfileComplete } from '@/utils/profileUtils';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.dashboard' },
  { path: '/library', icon: LibraryBooks, labelKey: 'nav.library' },
  { path: '/upload', icon: Upload, labelKey: 'nav.upload' },
  { path: '/profile', icon: Person, labelKey: 'nav.profile' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, refreshToken, clearAuth, isLoggingOut, setLoggingOut, isAuthenticated } = useAuthStore();
  const { profile, setProfile, setLoading } = useProfileStore();
  const { resolvedMode } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await profileApi.get();
      const loadedProfile = response.data.data.profile;
      setProfile(loadedProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Don't show error toast for profile loading failures, just log it
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProfile]);

  // Load profile when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, loadProfile]);

  // Load token usage on mount and periodically refresh
  useEffect(() => {
    loadTokenUsage();
    // Refresh every 60 seconds
    const interval = setInterval(loadTokenUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check profile completeness and show modal if needed
  useEffect(() => {
    if (isAuthenticated && profile !== null) {
      // Only show modal if profile is incomplete and user is not already on profile page
      if (!isProfileComplete(profile) && location.pathname !== '/profile') {
        setShowProfileModal(true);
      } else {
        setShowProfileModal(false);
      }
    }
  }, [profile, location.pathname, isAuthenticated]);

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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setLoggingOut(true);
    try {
      // Call logout API to revoke tokens on server
      await authApi.logout(refreshToken || undefined);
      toast.success(t('auth.logoutSuccess', 'Logged out successfully'));
    } catch (error) {
      // Even if API fails, we still clear local state
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local auth state and redirect
      clearAuth();
      navigate('/login');
    }
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

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-theme-border/50">
        <div className="flex items-center gap-2 overflow-hidden">
          <img 
            src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
            alt="LUNAI" 
            className="w-10 h-10 flex-shrink-0"
          />
          {(sidebarOpen || isMobile) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="whitespace-nowrap"
            >
              <span className="font-bold text-xl tracking-tight text-blue-600 dark:text-blue-500">LUNA</span>
              <span className="font-bold text-xl text-blue-600 dark:text-blue-500">i</span>
            </motion.span>
          )}
        </div>
        {!isMobile && (
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
        )}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 hover:bg-theme-surface-hover rounded-lg transition-colors"
          >
            <Close className="text-theme-muted" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 touch-manipulation
                  ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                      : 'text-theme-secondary hover:bg-theme-surface-hover hover:text-theme-primary active:bg-theme-surface-hover'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {(sidebarOpen || isMobile) && (
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
        {(sidebarOpen || isMobile) ? (
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
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-theme-surface-hover touch-manipulation ${
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
              {(sidebarOpen || isMobile) && tokenUsage && (
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
              {!sidebarOpen && !isMobile && tokenUsage && (
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
          {(sidebarOpen || isMobile) && (
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
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-3 py-3 mt-2 text-theme-muted hover:text-accent-coral hover:bg-theme-surface-hover rounded-xl transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingOut ? (
            <CircularProgress size={20} className="text-theme-muted flex-shrink-0" />
          ) : (
            <Logout className="w-5 h-5 flex-shrink-0" />
          )}
          {(sidebarOpen || isMobile) && (
            <span className="font-medium">
              {isLoggingOut ? t('auth.loggingOut', 'Logging out...') : t('nav.logout')}
            </span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      
      {/* Rate Limit Banner */}
      <RateLimitBanner />
      
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 glass border-b border-theme-border/50 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-theme-surface-hover rounded-lg transition-colors touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="text-theme-primary w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-2">
          <img 
            src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
            alt="LUNAI" 
            className="w-8 h-8"
          />
          <span>
            <span className="font-bold text-lg tracking-tight text-blue-600 dark:text-blue-500">LUNA</span>
            <span className="font-bold text-lg text-blue-600 dark:text-blue-500">i</span>
          </span>
        </div>

        <NavLink
          to="/profile"
          className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-teal to-primary-500 flex items-center justify-center text-white font-medium"
        >
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </NavLink>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-overlay backdrop-blur-sm z-50"
            />
            
            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-[280px] max-w-[85vw] glass border-r border-theme-border/50 z-50 flex flex-col"
            >
              <SidebarContent isMobile />
              {/* Safe area padding for bottom */}
              <div className="pb-safe" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex fixed left-0 top-0 h-full glass border-r border-theme-border/50 z-50 flex-col"
      >
        <SidebarContent />
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-300 pt-16 lg:pt-0"
        style={{ width: '100vw', marginLeft: 0 }}
      >
        <div 
          className="min-h-screen p-4 sm:p-6 lg:transition-all lg:duration-300"
          style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024 ? (sidebarOpen ? 260 : 80) : 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:ml-0"
            style={{ marginLeft: 0 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>

      {/* Desktop margin adjustment */}
      <style>{`
        @media (min-width: 1024px) {
          main > div {
            margin-left: ${sidebarOpen ? 260 : 80}px !important;
          }
        }
      `}</style>
    </div>
  );
}
