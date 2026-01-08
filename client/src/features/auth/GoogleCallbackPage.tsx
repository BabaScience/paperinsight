import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { authApi } from '@/lib/api';

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { resolvedMode } = useThemeStore();
  const { t } = useTranslation();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(error);
      toast.error(t('auth.googleAuthFailed', 'Google authentication failed'));
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      return;
    }

    if (accessToken && refreshToken && userId) {
      // Fetch user data asynchronously
      const fetchUserAndLogin = async () => {
        try {
          // Set tokens first so the API call can use them
          const tempUser = {
            id: userId,
            email: '',
            name: '',
            emailVerified: true,
          };
          login(tempUser, accessToken, refreshToken);
          
          // Now fetch the full user data
          const response = await authApi.me();
          const userData = response.data.data.user;

          const user = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            emailVerified: userData.emailVerified,
            isAdmin: userData.isAdmin || false,
            profile: userData.profile,
          };

          login(user, accessToken, refreshToken);
          setStatus('success');
          toast.success(t('auth.loginSuccess', 'Logged in successfully'));
          
          // Redirect to dashboard after short delay
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } catch (error: any) {
          setStatus('error');
          setErrorMessage(error.message || t('auth.googleAuthFailed', 'Failed to complete Google authentication'));
          toast.error(error.message || t('auth.googleAuthFailed', 'Failed to complete Google authentication'));
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      };

      fetchUserAndLogin();
    } else {
      setStatus('error');
      setErrorMessage(t('auth.missingTokens', 'Missing authentication tokens'));
      toast.error(t('auth.missingTokens', 'Missing authentication tokens'));
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  }, [searchParams, navigate, login, t]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={resolvedMode === 'dark' ? '/lunai-icon-dark.svg' : '/lunai-icon-light.svg'} 
            alt="LUNAI" 
            className="h-12 w-auto"
          />
          <span>
            <span className="font-bold text-3xl tracking-tight text-blue-600 dark:text-blue-500">LUNA</span>
            <span className="font-bold text-3xl text-blue-600 dark:text-blue-500">i</span>
          </span>
        </div>

        {status === 'processing' && (
          <>
            <CircularProgress size={60} className="mb-4" />
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-2">
              {t('auth.completingAuth', 'Completing authentication...')}
            </h1>
            <p className="text-theme-muted">
              {t('auth.pleaseWait', 'Please wait while we sign you in')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-green-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-2">
              {t('auth.loginSuccess', 'Success!')}
            </h1>
            <p className="text-theme-muted">
              {t('auth.redirecting', 'Redirecting to dashboard...')}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-theme-primary mb-2">
              {t('auth.authFailed', 'Authentication Failed')}
            </h1>
            <p className="text-theme-muted mb-4">
              {errorMessage || t('auth.googleAuthFailed', 'Google authentication failed')}
            </p>
            <p className="text-sm text-theme-muted">
              {t('auth.redirectingToLogin', 'Redirecting to login...')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

