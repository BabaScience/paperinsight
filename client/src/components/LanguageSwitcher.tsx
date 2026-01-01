import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  compact?: boolean;
  fullWidth?: boolean;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export function LanguageSwitcher({ compact = false, fullWidth = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    handleClose();
  };

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

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
        aria-label={t('language.select')}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLanguage.code}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 text-lg"
          >
            {currentLanguage.flag}
          </motion.div>
        </AnimatePresence>
        {!compact && (
          <span className="text-sm font-medium text-theme-secondary flex-1 text-left">
            {currentLanguage.label}
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
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            selected={i18n.language === lang.code}
            sx={{
              borderRadius: 1,
              mx: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ fontSize: '1.25rem', minWidth: 36 }}>
              {lang.flag}
            </ListItemIcon>
            <ListItemText 
              primary={lang.label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: i18n.language === lang.code ? 600 : 400,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Simple toggle version for compact spaces
export function LanguageSwitcherSimple() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="p-2 rounded-lg hover:bg-theme-surface-hover transition-colors"
      aria-label="Toggle language"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={currentLanguage.code}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="text-lg"
        >
          {currentLanguage.flag}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

