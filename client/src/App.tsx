import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { EmailVerificationPage } from '@/features/auth/EmailVerificationPage';
import { GoogleCallbackPage } from '@/features/auth/GoogleCallbackPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { UploadPage } from '@/features/upload/UploadPage';
import { AnalysisPage } from '@/features/analysis/AnalysisPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { AdminDashboard } from '@/features/admin/AdminDashboard';

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
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

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
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}





