import { motion, AnimatePresence } from 'framer-motion';
import { LightMode, DarkMode, SettingsBrightness } from '@mui/icons-material';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeToggleProps {
  compact?: boolean;
  fullWidth?: boolean;
}

const themeOptions = [
  { value: 'light' as const, labelKey: 'themeToggle.light', icon: LightMode },
  { value: 'dark' as const, labelKey: 'themeToggle.dark', icon: DarkMode },
  { value: 'system' as const, labelKey: 'themeToggle.system', icon: SettingsBrightness },
];

export function ThemeToggle({ compact = false, fullWidth = false }: ThemeToggleProps) {
  const { mode, resolvedMode, setMode } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { t } = useTranslation();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (value: 'light' | 'dark' | 'system') => {
    setMode(value);
    handleClose();
  };

  const CurrentIcon = resolvedMode === 'dark' ? DarkMode : LightMode;

  return (
    <>
      <motion.button
        onClick={handleClick}
        whileHover={{ scale: compact ? 1.05 : 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center gap-3 rounded-xl transition-all duration-300
          ${compact 
            ? 'p-2.5 hover:bg-theme-surface-hover justify-center' 
            : fullWidth
              ? 'w-full px-3 py-3 hover:bg-theme-surface-hover border border-theme-border/50 justify-start'
              : 'px-3 py-2.5 hover:bg-theme-surface-hover border border-theme-border'
          }
        `}
        aria-label={t('themeToggle.toggleTheme')}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={resolvedMode}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <CurrentIcon 
              className={`w-5 h-5 ${
                resolvedMode === 'dark' 
                  ? 'text-amber-400' 
                  : 'text-amber-500'
              }`} 
            />
          </motion.div>
        </AnimatePresence>
        {!compact && (
          <span className="text-sm font-medium text-theme-secondary capitalize flex-1 text-left">
            {mode === 'system' ? `${t('themeToggle.system')} (${t(`themeToggle.${resolvedMode}`)})` : t(`themeToggle.${mode}`)}
          </span>
        )}
      </motion.button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
          },
        }}
      >
        {themeOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            selected={mode === option.value}
            sx={{
              borderRadius: 1,
              mx: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
              },
            }}
          >
            <ListItemIcon>
              <option.icon 
                fontSize="small" 
                className={mode === option.value ? 'text-primary-500' : ''} 
              />
            </ListItemIcon>
            <ListItemText 
              primary={t(option.labelKey)}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: mode === option.value ? 600 : 400,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Simple toggle version (just toggles between light/dark)
export function ThemeToggleSimple() {
  const { resolvedMode, setMode } = useThemeStore();
  const { t } = useTranslation();

  const toggle = () => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="p-2 rounded-lg hover:bg-theme-surface-hover transition-colors"
      aria-label={t('themeToggle.toggleTheme')}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={resolvedMode}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        >
          {resolvedMode === 'dark' ? (
            <DarkMode className="w-5 h-5 text-amber-400" />
          ) : (
            <LightMode className="w-5 h-5 text-amber-500" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
