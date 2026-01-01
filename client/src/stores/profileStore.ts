import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type PreferredStyle = 'technical' | 'simplified' | 'examples-heavy' | 'concise';

export interface UserProfile {
  researchField?: string;
  expertiseLevel?: ExpertiseLevel;
  interests?: string[];
  currentProjects?: string;
  preferredStyle?: PreferredStyle;
  preferredLanguage?: string;
  bio?: string;
}

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isLoading: false,
      error: null,
      
      setProfile: (profile) => set({ profile, error: null }),
      
      updateProfile: (updates) => 
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : updates,
          error: null,
        })),
      
      clearProfile: () => set({ profile: null, error: null }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
    }),
    {
      name: 'profile-storage',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);

