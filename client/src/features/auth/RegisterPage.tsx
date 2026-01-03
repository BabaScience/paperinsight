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
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { LanguageSwitcherSimple } from '@/components/LanguageSwitcher';

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
  const { login } = useAuthStore();
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
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);
      toast.success(t('auth.registerSuccess'));
      navigate('/');
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
              src={resolvedMode === 'dark' ? '/lunai-logo-dark.svg' : '/lunai-logo-light.svg'} 
              alt="LUNAI" 
              className="h-10 sm:h-12 w-auto"
            />
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
