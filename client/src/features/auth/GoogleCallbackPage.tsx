import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { authApi } from '@/lib/api';

export function GoogleCallbackPage() {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { resolvedMode } = useThemeStore();
  const { t } = useTranslation();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track if we've already processed the callback to prevent re-processing
  const hasProcessed = useRef(false);
  // Track status in ref for timeout check (state might not be updated yet)
  const statusRef = useRef<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) {
      console.log('🔒 Google callback already processed, skipping');
      return;
    }

    console.log('🔐 Google OAuth callback handler started');

    // Read params directly from URL to avoid React Router re-render issues
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    const userId = urlParams.get('userId');
    const error = urlParams.get('error');

    console.log('📋 Callback params:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUserId: !!userId,
      hasError: !!error,
      userId: userId || 'none',
    });

    // If no tokens/error in URL, don't process
    if (!accessToken && !refreshToken && !userId && !error) {
      console.log('⚠️ No OAuth params found in URL, redirecting to login');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    // Mark as processed immediately to prevent re-execution
    hasProcessed.current = true;

    // SECURITY: Immediately remove sensitive tokens from URL BEFORE processing
    // This prevents tokens from appearing in browser history, being shared, or logged
    console.log('🔒 Removing tokens from URL for security');
    window.history.replaceState(
      {},
      '',
      window.location.pathname
    );
    // Also update React Router's search params
    setSearchParams({}, { replace: true });
    console.log('✅ URL cleaned, tokens removed from address bar');

    // Set up fallback timeout to ensure redirect happens even if something fails
    const fallbackTimeout = setTimeout(() => {
      console.warn('⚠️ Callback handler timeout - redirecting to login as fallback');
      if (statusRef.current === 'processing') {
        statusRef.current = 'error';
        setStatus('error');
        setErrorMessage('Authentication timeout. Please try again.');
        toast.error('Authentication timeout. Please try again.');
        navigate('/login', { replace: true });
      }
    }, 10000); // 10 second timeout

    if (error) {
      console.error('❌ OAuth error received:', error);
      clearTimeout(fallbackTimeout);
      statusRef.current = 'error';
      setStatus('error');
      setErrorMessage(error);
      toast.error(t('auth.googleAuthFailed', 'Google authentication failed'));
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
      return;
    }

    if (accessToken && refreshToken && userId) {
      console.log('✅ All tokens present, starting authentication flow');
      
      // Fetch user data asynchronously
      const fetchUserAndLogin = async () => {
        try {
          console.log('🔄 Setting temporary user state with tokens');
          // Set tokens first so the API call can use them
          const tempUser = {
            id: userId,
            email: '',
            name: '',
            emailVerified: true,
          };
          login(tempUser, accessToken, refreshToken);
          console.log('✅ Tokens stored in auth store');
          
          console.log('🔄 Fetching full user data from API...');
          // Now fetch the full user data
          const response = await authApi.me();
          const userData = response.data.data.user;
          console.log('✅ User data fetched:', { id: userData.id, email: userData.email });

          const user = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            emailVerified: userData.emailVerified,
            isAdmin: userData.isAdmin || false,
            profile: userData.profile,
          };

          login(user, accessToken, refreshToken);
          console.log('✅ User logged in successfully');
          statusRef.current = 'success';
          setStatus('success');
          toast.success(t('auth.loginSuccess', 'Logged in successfully'));
          
          clearTimeout(fallbackTimeout);
          
          // Redirect to dashboard after short delay
          console.log('🔄 Redirecting to dashboard in 1 second...');
          setTimeout(() => {
            console.log('✅ Redirecting to dashboard');
            navigate('/', { replace: true });
          }, 1000);
        } catch (error: any) {
          console.error('❌ Error during authentication:', error);
          clearTimeout(fallbackTimeout);
          statusRef.current = 'error';
          setStatus('error');
          const errorMessage = error?.response?.data?.message || error?.message || t('auth.googleAuthFailed', 'Failed to complete Google authentication');
          setErrorMessage(errorMessage);
          toast.error(errorMessage);
          
          // Clear any partial auth state on error
          useAuthStore.getState().clearAuth();
          
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      };

      fetchUserAndLogin();
    } else {
      console.error('❌ Missing required tokens:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUserId: !!userId,
      });
      clearTimeout(fallbackTimeout);
      statusRef.current = 'error';
      setStatus('error');
      setErrorMessage(t('auth.missingTokens', 'Missing authentication tokens'));
      toast.error(t('auth.missingTokens', 'Missing authentication tokens'));
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    }
    
    // Cleanup function
    return () => {
      clearTimeout(fallbackTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

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

