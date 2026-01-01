import { create } from 'zustand';

export interface Paper {
  _id: string;
  title: string;
  authors: string[];
  abstract: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  processingSteps: {
    parsing: string;
    chunking: string;
    embedding: string;
  };
  chunkCount?: number;
  pageCount?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaperState {
  papers: Paper[];
  selectedPaper: Paper | null;
  isUploading: boolean;
  uploadProgress: number;
  processingStatus: {
    [paperId: string]: {
      step: string;
      status: string;
      progress: number;
      message: string;
    };
  };
  
  setPapers: (papers: Paper[]) => void;
  addPaper: (paper: Paper) => void;
  updatePaper: (id: string, updates: Partial<Paper>) => void;
  removePaper: (id: string) => void;
  setSelectedPaper: (paper: Paper | null) => void;
  setUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setProcessingStatus: (paperId: string, status: {
    step: string;
    status: string;
    progress: number;
    message: string;
  }) => void;
  clearProcessingStatus: (paperId: string) => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  papers: [],
  selectedPaper: null,
  isUploading: false,
  uploadProgress: 0,
  processingStatus: {},
  
  setPapers: (papers) => set({ papers }),
  
  addPaper: (paper) =>
    set((state) => ({ papers: [paper, ...state.papers] })),
  
  updatePaper: (id, updates) =>
    set((state) => ({
      papers: state.papers.map((p) =>
        p._id === id ? { ...p, ...updates } : p
      ),
      selectedPaper:
        state.selectedPaper?._id === id
          ? { ...state.selectedPaper, ...updates }
          : state.selectedPaper,
    })),
  
  removePaper: (id) =>
    set((state) => ({
      papers: state.papers.filter((p) => p._id !== id),
      selectedPaper: state.selectedPaper?._id === id ? null : state.selectedPaper,
    })),
  
  setSelectedPaper: (paper) => set({ selectedPaper: paper }),
  
  setUploading: (isUploading) => set({ isUploading }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  setProcessingStatus: (paperId, status) =>
    set((state) => ({
      processingStatus: {
        ...state.processingStatus,
        [paperId]: status,
      },
    })),
  
  clearProcessingStatus: (paperId) =>
    set((state) => {
      const { [paperId]: _, ...rest } = state.processingStatus;
      return { processingStatus: rest };
    }),
}));





