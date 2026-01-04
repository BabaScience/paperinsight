import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import i18n from './i18n';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

// ============================================
// Rate Limit State Management
// ============================================
export interface RateLimitInfo {
  isLimited: boolean;
  retryAfter: number; // Unix timestamp when rate limit resets
  message: string;
  endpoint?: string;
}

// Global rate limit state
let rateLimitState: RateLimitInfo = {
  isLimited: false,
  retryAfter: 0,
  message: '',
};

// Subscribers for rate limit changes
const rateLimitSubscribers: Set<(info: RateLimitInfo) => void> = new Set();

export function subscribeToRateLimit(callback: (info: RateLimitInfo) => void): () => void {
  rateLimitSubscribers.add(callback);
  // Immediately notify of current state
  callback(rateLimitState);
  return () => rateLimitSubscribers.delete(callback);
}

function notifyRateLimitChange(info: RateLimitInfo): void {
  rateLimitState = info;
  rateLimitSubscribers.forEach(callback => callback(info));
}

export function getRateLimitState(): RateLimitInfo {
  return rateLimitState;
}

export function clearRateLimit(): void {
  notifyRateLimitChange({
    isLimited: false,
    retryAfter: 0,
    message: '',
  });
}

// ============================================
// API Error Parsing
// ============================================
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export function parseApiError(error: AxiosError): ApiError {
  const data = error.response?.data as { message?: string; code?: string } | undefined;
  return {
    message: data?.message || error.message || 'An unexpected error occurred',
    code: data?.code,
    status: error.response?.status,
  };
}

// Token revocation error messages
const TOKEN_REVOCATION_MESSAGES = [
  'Token has been revoked',
  'User session has been revoked',
  'Refresh token has been revoked',
  'Refresh token expired',
];

function isTokenRevocationError(message: string): boolean {
  return TOKEN_REVOCATION_MESSAGES.some(msg => 
    message.toLowerCase().includes(msg.toLowerCase())
  );
}

// ============================================
// Axios Instance
// ============================================
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    const errorData = error.response?.data as { message?: string } | undefined;
    const errorMessage = errorData?.message || '';
    
    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const headers = error.response.headers;
      const retryAfterHeader = headers['ratelimit-reset'] || headers['retry-after'];
      
      let retryAfter: number;
      if (retryAfterHeader) {
        // If it's a Unix timestamp (large number) or seconds
        const parsed = parseInt(retryAfterHeader, 10);
        if (parsed > 1000000000) {
          // Unix timestamp
          retryAfter = parsed * 1000; // Convert to milliseconds
        } else {
          // Seconds until retry
          retryAfter = Date.now() + (parsed * 1000);
        }
      } else {
        // Default to 60 seconds if no header
        retryAfter = Date.now() + 60000;
      }
      
      // Use server message or translated fallback
      const rateLimitMessage = errorMessage || i18n.t('rateLimit.message');
      
      notifyRateLimitChange({
        isLimited: true,
        retryAfter,
        message: rateLimitMessage,
        endpoint: originalRequest?.url,
      });
      
      // Show toast with time remaining
      const secondsRemaining = Math.ceil((retryAfter - Date.now()) / 1000);
      toast.error(i18n.t('rateLimit.retryIn', { time: `${secondsRemaining}s` }), {
        duration: 5000,
        id: 'rate-limit-toast',
      });
      
      // Auto-clear rate limit when time expires
      setTimeout(() => {
        clearRateLimit();
      }, retryAfter - Date.now());
      
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest) {
      // Check if it's a token revocation error
      if (isTokenRevocationError(errorMessage)) {
        toast.error(i18n.t('auth.sessionRevoked'), {
          duration: 5000,
        });
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }
      
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          
          useAuthStore.getState().setTokens(accessToken, newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - check if it's a revocation
          const refreshErrorData = (refreshError as AxiosError).response?.data as { message?: string } | undefined;
          const refreshErrorMessage = refreshErrorData?.message || '';
          
          if (isTokenRevocationError(refreshErrorMessage)) {
            toast.error(i18n.t('auth.tokenExpired'), {
              duration: 5000,
            });
          }
          
          useAuthStore.getState().clearAuth();
        }
      } else {
        useAuthStore.getState().clearAuth();
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  
  me: () => api.get('/auth/me'),
  
  // Logout from current device (revokes current tokens)
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', refreshToken ? { refreshToken } : {}),
  
  // Logout from all devices (revokes all user sessions)
  logoutAll: () =>
    api.post('/auth/logout-all'),
};

export type PreferredModel = 'openai' | 'deepseek';

export interface ProfileData {
  researchField?: string;
  expertiseLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  interests?: string[];
  currentProjects?: string;
  preferredStyle?: 'technical' | 'simplified' | 'examples-heavy' | 'concise';
  preferredLanguage?: string;
  preferredModel?: PreferredModel;
  tokenLimit?: number;
  bio?: string;
}

export interface TokenUsageInfo {
  used: number;
  allowance: number;
  remaining: number;
  percentageUsed: number;
  hasReachedLimit: boolean;
  pendingRequest: boolean;
}

export const profileApi = {
  get: () => api.get('/profile'),
  
  update: (data: ProfileData) => api.put('/profile', data),
  
  patch: (data: Partial<ProfileData>) => api.patch('/profile', data),
  
  reset: () => api.delete('/profile'),
  
  getTokenUsage: () => api.get<{ status: string; data: { tokenUsage: TokenUsageInfo } }>('/profile/tokens'),
  
  requestTokenExtension: (message?: string) => api.post('/profile/tokens/request', { message }),
};

export const papersApi = {
  upload: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/papers/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },
  
  list: (page = 1, limit = 10) =>
    api.get('/papers', { params: { page, limit } }),
  
  get: (id: string) =>
    api.get(`/papers/${id}`),
  
  delete: (id: string) =>
    api.delete(`/papers/${id}`),
  
  query: (id: string, question: string) =>
    api.post(`/papers/${id}/query`, { question }, {
      responseType: 'text',
      headers: {
        'Accept': 'text/event-stream',
      },
    }),
  
  getAnalysis: (id: string, regenerate = false) =>
    api.get(`/papers/${id}/analysis`, { params: regenerate ? { regenerate: 'true' } : {} }),
  
  getChunks: (id: string) =>
    api.get(`/papers/${id}/chunks`),
  
  getConversation: (id: string) =>
    api.get(`/papers/${id}/conversation`),
  
  getVisuals: (id: string, regenerate = false) =>
    api.get(`/papers/${id}/visuals`, { params: regenerate ? { regenerate: 'true' } : {} }),
  
  getIdeas: (id: string, regenerate = false) =>
    api.get(`/papers/${id}/ideas`, { params: regenerate ? { regenerate: 'true' } : {} }),
};





