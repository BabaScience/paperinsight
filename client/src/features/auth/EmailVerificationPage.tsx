import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Email, CheckCircle, Error as ErrorIcon, Send } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { LanguageSwitcherSimple } from '@/components/LanguageSwitcher';

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resolvedMode } = useThemeStore();
  const { t } = useTranslation();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track if verification has been attempted to prevent duplicate requests
  const hasAttemptedVerification = useRef(false);
  const isVerifying = useRef(false);

  useEffect(() => {
    // Only verify once when token is first available
    if (token && !hasAttemptedVerification.current && !isVerifying.current && status === 'pending') {
      hasAttemptedVerification.current = true;
      verifyEmail(token);
    } else if (!token && !email) {
      setStatus('error');
      setErrorMessage(t('auth.invalidVerificationLink', 'Invalid verification link'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only depend on token, not email

  const verifyEmail = async (verificationToken: string) => {
    // Prevent multiple simultaneous verification attempts
    if (isVerifying.current || status === 'success') {
      return;
    }
    
    isVerifying.current = true;
    setStatus('verifying');
    try {
      await authApi.verifyEmail(verificationToken);
      setStatus('success');
      toast.success(t('auth.emailVerified', 'Email verified successfully!'));
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.response?.data?.message || t('auth.verificationFailed', 'Failed to verify email'));
      toast.error(error.response?.data?.message || t('auth.verificationFailed', 'Failed to verify email'));
      // Reset the refs so user can try again if needed
      hasAttemptedVerification.current = false;
      isVerifying.current = false;
    }
  };

  const handleResend = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      toast.success(t('auth.verificationEmailSent', 'Verification email sent. Please check your inbox.'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('auth.resendFailed', 'Failed to resend verification email'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Theme & Language Toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSwitcherSimple />
        <ThemeToggleSimple />
      </div>

      {/* Left side - Visual */}
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
            {t('auth.verifyYourEmail', 'Verify Your Email')}
          </h2>
          <p className="text-theme-secondary text-lg max-w-md mx-auto">
            {t('auth.completeRegistration', 'Complete your registration to get started')}
          </p>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-accent-teal/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      {/* Right side - Content */}
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

          {/* Pending state - waiting for token or showing instructions */}
          {status === 'pending' && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <Email className="w-10 h-10 text-primary-500" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary mb-2">
                {t('auth.checkYourEmail', 'Check Your Email')}
              </h1>
              <p className="text-theme-muted mb-6 text-sm sm:text-base">
                {email ? (
                  <>
                    {t('auth.verificationEmailSentTo', 'We\'ve sent a verification link to')} <strong>{email}</strong>
                  </>
                ) : (
                  t('auth.verificationEmailInstructions', 'We\'ve sent a verification link to your email address. Please click the link to verify your account.')
                )}
              </p>
              {email && (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      {t('auth.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <Send />
                      {t('auth.resendVerification', 'Resend Verification Email')}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Verifying state */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <CircularProgress size={60} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary mb-2">
                {t('auth.verifying', 'Verifying...')}
              </h1>
              <p className="text-theme-muted">
                {t('auth.pleaseWait', 'Please wait while we verify your email')}
              </p>
            </div>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary mb-2">
                {t('auth.emailVerified', 'Email Verified!')}
              </h1>
              <p className="text-theme-muted mb-6">
                {t('auth.redirectingToLogin', 'Redirecting to login...')}
              </p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <ErrorIcon className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary mb-2">
                {t('auth.verificationFailed', 'Verification Failed')}
              </h1>
              <p className="text-theme-muted mb-6">
                {errorMessage || t('auth.invalidOrExpiredToken', 'The verification link is invalid or has expired')}
              </p>
              {email && (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
                >
                  {isResending ? (
                    <>
                      <CircularProgress size={20} color="inherit" />
                      {t('auth.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <Send />
                      {t('auth.resendVerification', 'Resend Verification Email')}
                    </>
                  )}
                </button>
              )}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 font-medium text-sm"
              >
                {t('auth.backToLogin', 'Back to Login')}
              </Link>
            </div>
          )}

          <p className="text-center text-theme-muted mt-6">
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              {t('auth.backToLogin', 'Back to Login')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

