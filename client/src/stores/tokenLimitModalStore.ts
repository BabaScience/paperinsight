import { create } from 'zustand';
import type { TokenUsageInfo } from '@/lib/api';

interface TokenLimitModalState {
  isOpen: boolean;
  tokenUsage: TokenUsageInfo | null;
  
  showModal: (tokenUsage: TokenUsageInfo) => void;
  hideModal: () => void;
}

export const useTokenLimitModalStore = create<TokenLimitModalState>()((set) => ({
  isOpen: false,
  tokenUsage: null,
  
  showModal: (tokenUsage) => set({ isOpen: true, tokenUsage }),
  hideModal: () => set({ isOpen: false, tokenUsage: null }),
}));


