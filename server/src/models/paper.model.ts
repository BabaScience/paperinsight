import mongoose, { Document, Schema } from 'mongoose';

export type PaperStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type ProcessingStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface IPaperAnalysis {
  summary: string;
  keyInsights: string[];
  methodology?: string;
  limitations?: string;
  generatedAt: Date;
}

export type MermaidDiagramType = 'flowchart' | 'mindmap' | 'sequenceDiagram' | 'classDiagram' | 'erDiagram';

export interface IMermaidDiagram {
  type: MermaidDiagramType;
  title: string;
  description: string;
  code: string;
}

export interface IPaperVisuals {
  diagrams: IMermaidDiagram[];
  generatedAt: Date;
}

export interface IImplementationIdea {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relevance: string; // Why this is relevant to user's profile
  steps: string[];
  tools?: string[];
  relatedConcepts?: string[];
}

export interface IPaperIdeas {
  ideas: IImplementationIdea[];
  userContext: {
    researchField?: string;
    interests?: string[];
    currentProjects?: string;
  };
  generatedAt: Date;
}

export interface IPaper extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  authors: string[];
  abstract: string;
  doi?: string;
  publicationDate?: Date;
  venue?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  pageCount?: number;
  rawText?: string;
  sections?: Array<{
    title: string;
    content: string;
    position: number;
  }>;
  chunkCount?: number;
  analysis?: IPaperAnalysis;
  visuals?: IPaperVisuals;
  ideas?: IPaperIdeas;
  status: PaperStatus;
  processingSteps: {
    parsing: ProcessingStepStatus;
    chunking: ProcessingStepStatus;
    embedding: ProcessingStepStatus;
  };
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paperSchema = new Schema<IPaper>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Paper',
    },
    authors: {
      type: [String],
      default: [],
    },
    abstract: {
      type: String,
      default: '',
    },
    doi: String,
    publicationDate: Date,
    venue: String,
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    pageCount: Number,
    rawText: {
      type: String,
      select: false,
    },
    sections: [
      {
        title: String,
        content: String,
        position: Number,
      },
    ],
    chunkCount: Number,
    analysis: {
      summary: String,
      keyInsights: [String],
      methodology: String,
      limitations: String,
      generatedAt: Date,
    },
    visuals: {
      diagrams: [{
        type: {
          type: String,
          enum: ['flowchart', 'mindmap', 'sequenceDiagram', 'classDiagram', 'erDiagram'],
        },
        title: String,
        description: String,
        code: String,
      }],
      generatedAt: Date,
    },
    ideas: {
      ideas: [{
        title: String,
        description: String,
        difficulty: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced'],
        },
        relevance: String,
        steps: [String],
        tools: [String],
        relatedConcepts: [String],
      }],
      userContext: {
        researchField: String,
        interests: [String],
        currentProjects: String,
      },
      generatedAt: Date,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed'],
      default: 'uploading',
    },
    processingSteps: {
      parsing: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending',
      },
      chunking: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending',
      },
      embedding: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending',
      },
    },
    error: String,
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ============================================
// Database Indexes
// ============================================

// Compound index for user's papers sorted by date (most common query)
paperSchema.index({ userId: 1, createdAt: -1 });

// Status index for filtering papers by status
paperSchema.index({ status: 1 });

// Compound index for user + status + date (dashboard queries)
paperSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Processing steps index for finding papers that need processing
paperSchema.index({ 'processingSteps.embedding': 1 });

// Text search index for searching papers by title and abstract
paperSchema.index(
  { title: 'text', abstract: 'text' },
  { 
    weights: { title: 10, abstract: 5 },
    name: 'paper_text_search',
  }
);

export const Paper = mongoose.model<IPaper>('Paper', paperSchema);
