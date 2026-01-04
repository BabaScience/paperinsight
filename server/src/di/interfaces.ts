/**
 * Service Interfaces for Dependency Injection
 * These interfaces define contracts that implementations must follow
 * NOTE: These interfaces should match the actual service implementations
 */

import type { IUserProfile } from '../models/user.model.js';
import type { IMermaidDiagram, IImplementationIdea } from '../models/paper.model.js';

// ============================================
// Embedding Service Interface
// ============================================
export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

// ============================================
// Vector Service Interface
// ============================================
export interface IVectorService {
  upsertVectors(
    vectors: Array<{
      id: string;
      vector: number[];
      payload: Record<string, unknown>;
    }>
  ): Promise<void>;
  searchByPaperId(
    queryVector: number[],
    paperId: string,
    limit?: number
  ): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>>;
  deleteByPaperId(paperId: string): Promise<void>;
}

// ============================================
// Chunking Service Interface
// ============================================
export interface ChunkResult {
  content: string;
  type: 'section' | 'paragraph' | 'sentence';
  sectionTitle?: string;
  tokenCount: number;
  metadata: {
    startIndex: number;
    endIndex: number;
  };
}

export interface IChunkingService {
  countTokens(text: string): number;
  createHierarchicalChunks(
    fullText: string,
    sections: Array<{ title: string; content: string; position: number }>
  ): Promise<ChunkResult[]>;
}

// ============================================
// PDF Service Interface
// ============================================
export interface ParsedPDF {
  text: string;
  metadata: {
    title?: string;
    authors: string[];
    abstract?: string;
    pageCount: number;
  };
  sections: Array<{
    title: string;
    content: string;
    position: number;
  }>;
}

export interface IPdfService {
  parsePdf(buffer: Buffer): Promise<ParsedPDF>;
}

// ============================================
// MinIO Service Interface
// ============================================
export interface IMinioService {
  uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
  getFile(fileKey: string): Promise<Buffer>;
}

// ============================================
// Cache Service Interface
// ============================================
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidate(pattern: string): Promise<number>;
  
  // Paper-specific methods
  getPaperAnalysis(paperId: string): Promise<{
    summary: string;
    keyInsights: string[];
    methodology?: string;
    limitations?: string;
  } | null>;
  setPaperAnalysis(paperId: string, analysis: {
    summary: string;
    keyInsights: string[];
    methodology?: string;
    limitations?: string;
  }): Promise<void>;
  invalidatePaperAnalysis(paperId: string): Promise<void>;
  invalidateAllPaperCache(paperId: string): Promise<void>;
}

// ============================================
// Token Blacklist Service Interface
// ============================================
export interface ITokenBlacklistService {
  revokeToken(token: string, expiresInSeconds: number): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
  revokeAllUserTokens(userId: string, expiresInSeconds: number): Promise<void>;
  isUserSessionRevoked(userId: string, tokenIssuedAt: number): Promise<boolean>;
}

// ============================================
// Token Service Interface
// ============================================
export interface TokenUsageInfo {
  used: number;
  allowance: number;
  remaining: number;
  percentageUsed: number;
  hasReachedLimit: boolean;
  pendingRequest: boolean;
}

export interface ITokenService {
  canUseTokens(userId: string, estimatedTokens: number): Promise<{
    allowed: boolean;
    info: TokenUsageInfo;
  }>;
  recordUsage(userId: string, tokensUsed: number): Promise<TokenUsageInfo>;
  requestExtension(userId: string, message?: string): Promise<void>;
}

// ============================================
// Email Service Interface
// ============================================
export interface IEmailService {
  sendTokenExtensionRequest(
    user: { id: string; name: string; email: string },
    currentUsage: number,
    currentAllowance: number,
    message?: string
  ): Promise<boolean>;
}

// ============================================
// LLM Provider Interface
// ============================================
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface ILLMProvider {
  chat(params: ChatParams): Promise<string>;
  chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void>;
}

export interface ILLMService {
  chat(
    providerName: string | undefined,
    params: ChatParams
  ): Promise<string>;
  chatStream(
    providerName: string | undefined,
    params: ChatParams,
    callbacks: StreamCallbacks
  ): Promise<void>;
  getAvailableProviders(): string[];
  isProviderAvailable(providerName: string): boolean;
  getModelName(providerName: string): string;
}

// ============================================
// RAG Service Interface
// ============================================
export interface QueryResult {
  answer: string;
  sources: Array<{
    chunkId: string;
    content: string;
    score: number;
    sectionTitle?: string;
  }>;
}

export interface AnalysisResult {
  summary: string;
  keyInsights: string[];
  methodology?: string;
  limitations?: string;
  cached?: boolean;
}

export interface VisualsResult {
  diagrams: IMermaidDiagram[];
  cached: boolean;
}

export interface IdeasResult {
  ideas: IImplementationIdea[];
  userContext: {
    researchField?: string;
    interests?: string[];
    currentProjects?: string;
  };
  cached: boolean;
}

export interface IRagService {
  query(
    paperId: string,
    question: string,
    userProfile?: IUserProfile,
    userId?: string
  ): Promise<QueryResult>;
  
  queryStream(
    paperId: string,
    question: string,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: (result: QueryResult) => void;
      onError: (error: Error) => void;
    },
    userProfile?: IUserProfile,
    userId?: string
  ): Promise<void>;
  
  getAnalysis(
    paperId: string,
    userProfile?: IUserProfile,
    forceRegenerate?: boolean,
    userId?: string
  ): Promise<AnalysisResult>;
  
  getVisuals(
    paperId: string,
    userProfile?: IUserProfile,
    forceRegenerate?: boolean,
    userId?: string
  ): Promise<VisualsResult>;
  
  getIdeas(
    paperId: string,
    userProfile?: IUserProfile,
    forceRegenerate?: boolean,
    userId?: string
  ): Promise<IdeasResult>;
}

