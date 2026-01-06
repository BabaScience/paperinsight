import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { LanguageSwitcherSimple } from '@/components/LanguageSwitcher';

// Google icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { resolvedMode } = useThemeStore();
  const { t } = useTranslation();

  const registerSchema = z
    .object({
      name: z.string().min(2, t('auth.nameMin')),
      email: z.string().email(t('auth.invalidEmail')),
      password: z.string().min(8, t('auth.passwordMin')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast.success(response.data.message || t('auth.registerSuccess'));
      // Redirect to verification page with email
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.registerFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Theme & Language Toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSwitcherSimple />
        <ThemeToggleSimple />
      </div>

      {/* Left side - Visual (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/20 via-primary-600/10 to-accent-gold/10" />
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 text-center p-12"
        >
          <img 
            src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
            alt="LUNAI" 
            className="w-32 h-32 mx-auto mb-8 animate-float"
          />
          <h2 className="text-4xl font-display font-bold text-theme-primary mb-4 text-balance">
            {t('auth.startResearchJourney')}
          </h2>
          <p className="text-theme-secondary text-lg max-w-md mx-auto">
            {t('auth.joinResearchers')}
          </p>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-accent-teal/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-16 sm:pt-20 lg:pt-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <img 
              src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
              alt="LUNAI" 
              className="h-10 sm:h-12 w-auto"
            />
            <span>
              <span className="font-bold text-2xl sm:text-3xl tracking-tight text-blue-600 dark:text-blue-500">LUNA</span>
              <span className="font-bold text-2xl sm:text-3xl text-blue-600 dark:text-blue-500">i</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary mb-2">
            {t('auth.createAccount')}
          </h1>
          <p className="text-theme-muted mb-6 sm:mb-8 text-sm sm:text-base">
            {t('auth.getStarted')}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <Person className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
                <input
                  type="text"
                  {...register('name')}
                  className="input-field pl-12"
                  placeholder={t('auth.namePlaceholder')}
                />
              </div>
              {errors.name && (
                <p className="text-accent-coral text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Email className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
                <input
                  type="email"
                  {...register('email')}
                  className="input-field pl-12"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              {errors.email && (
                <p className="text-accent-coral text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="input-field pl-12 pr-12"
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-secondary transition-colors"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </button>
              </div>
              {errors.password && (
                <p className="text-accent-coral text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="input-field pl-12"
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-accent-coral text-sm mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('auth.register')
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-theme-primary text-theme-muted">
                {t('auth.or', 'or')}
              </span>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={() => authApi.googleAuth()}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-theme-border rounded-lg bg-theme-surface hover:bg-theme-surface-hover transition-colors text-theme-secondary font-medium"
          >
            <GoogleIcon />
            <span>{t('auth.signUpWithGoogle', 'Sign up with Google')}</span>
          </button>

          <p className="text-center text-theme-muted mt-6">
            {t('auth.hasAccount')}{' '}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              {t('auth.signIn')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
