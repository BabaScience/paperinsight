import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Visibility, VisibilityOff, AutoAwesome, Email, Lock } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ThemeToggleSimple } from '@/components/ThemeToggle';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggleSimple />
      </div>

      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center">
              <AutoAwesome className="text-white text-2xl" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">
              PaperInsight
            </span>
          </div>

          <h1 className="text-3xl font-display font-bold text-theme-primary mb-2">
            Welcome back
          </h1>
          <p className="text-theme-muted mb-8">
            Sign in to continue analyzing research papers
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Email
              </label>
              <div className="relative">
                <Email className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
                <input
                  type="email"
                  {...register('email')}
                  className="input-field pl-12"
                  placeholder="you@example.com"
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
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="input-field pl-12 pr-12"
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-theme-muted mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 via-accent-violet/10 to-accent-coral/10" />
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 text-center p-12"
        >
          <div className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center animate-float">
            <AutoAwesome className="text-white text-6xl" />
          </div>
          <h2 className="text-4xl font-display font-bold text-theme-primary mb-4 text-balance">
            Unlock the Power of
            <span className="gradient-text"> AI Research Analysis</span>
          </h2>
          <p className="text-theme-secondary text-lg max-w-md mx-auto">
            Transform complex research papers into actionable insights with our
            advanced RAG-powered analysis platform.
          </p>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-violet/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
