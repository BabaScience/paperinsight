import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { EmailVerificationPage } from '@/features/auth/EmailVerificationPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { UploadPage } from '@/features/upload/UploadPage';
import { AnalysisPage } from '@/features/analysis/AnalysisPage';
import { ProfilePage } from '@/features/profile/ProfilePage';

export default function App() {
  const { isAuthenticated, setLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state
    setLoading(false);
  }, [setLoading]);

  useEffect(() => {
    // Connect/disconnect socket based on auth state
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="paper/:id" element={<AnalysisPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}





