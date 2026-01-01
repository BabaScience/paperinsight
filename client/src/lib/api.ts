import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && originalRequest) {
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
        } catch {
          // Refresh failed, logout
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
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
};

export interface ProfileData {
  researchField?: string;
  expertiseLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  interests?: string[];
  currentProjects?: string;
  preferredStyle?: 'technical' | 'simplified' | 'examples-heavy' | 'concise';
  bio?: string;
}

export const profileApi = {
  get: () => api.get('/profile'),
  
  update: (data: ProfileData) => api.put('/profile', data),
  
  patch: (data: Partial<ProfileData>) => api.patch('/profile', data),
  
  reset: () => api.delete('/profile'),
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





