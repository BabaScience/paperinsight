import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Upload,
  LibraryBooks,
  Logout,
  MenuOpen,
  Menu,
  AutoAwesome,
  Person,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/library', icon: LibraryBooks, label: 'Library' },
  { path: '/upload', icon: Upload, label: 'Upload' },
  { path: '/profile', icon: Person, label: 'Profile' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          <motion.div
            initial={false}
            animate={{ opacity: sidebarOpen ? 1 : 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center">
              <AutoAwesome className="text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-display font-bold text-xl gradient-text whitespace-nowrap">
                PaperInsight
              </span>
            )}
          </motion.div>
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
                      {item.label}
                    </motion.span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Theme Toggle */}
        <div className="px-3 py-2">
          {sidebarOpen ? (
            <ThemeToggle fullWidth />
          ) : (
            <ThemeToggle compact />
          )}
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
            {sidebarOpen && <span className="font-medium">Logout</span>}
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
