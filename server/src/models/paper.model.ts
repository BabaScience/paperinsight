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

// Compound indexes for efficient queries
paperSchema.index({ userId: 1, createdAt: -1 });
paperSchema.index({ status: 1 });

export const Paper = mongoose.model<IPaper>('Paper', paperSchema);
