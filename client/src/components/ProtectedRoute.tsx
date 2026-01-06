import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

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





