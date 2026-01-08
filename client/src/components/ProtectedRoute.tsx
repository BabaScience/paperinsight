import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { CircularProgress } from '@mui/material';
import { authApi } from '@/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, setUser } = useAuthStore();
  const location = useLocation();

  // Refresh user data on mount to get latest admin status
  useEffect(() => {
    if (isAuthenticated) {
      authApi.me()
        .then((response) => {
          const userData = response.data.data.user;
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            emailVerified: userData.emailVerified,
            isAdmin: userData.isAdmin || false,
            profile: userData.profile,
          });
        })
        .catch((error) => {
          console.error('Failed to refresh user data:', error);
          // Don't block access if refresh fails
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Refresh when authentication state changes

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if email is verified
  // Note: emailVerified might be undefined for existing users, so we check explicitly for false
  if (user && user.emailVerified === false) {
    return <Navigate to={`/verify-email${user.email ? `?email=${encodeURIComponent(user.email)}` : ''}`} replace />;
  }

  return <>{children}</>;
}





