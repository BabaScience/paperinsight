import mongoose, { Document, Schema } from 'mongoose';

export type ChunkType = 'section' | 'paragraph' | 'sentence';

export interface IChunk extends Document {
  _id: mongoose.Types.ObjectId;
  paperId: mongoose.Types.ObjectId;
  content: string;
  chunkType: ChunkType;
  position: number;
  sectionTitle?: string;
  tokenCount: number;
  metadata: {
    startIndex?: number;
    endIndex?: number;
    pageNumber?: number;
  };
  createdAt: Date;
}

const chunkSchema = new Schema<IChunk>(
  {
    paperId: {
      type: Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    chunkType: {
      type: String,
      enum: ['section', 'paragraph', 'sentence'],
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    sectionTitle: String,
    tokenCount: {
      type: Number,
      required: true,
    },
    metadata: {
      startIndex: Number,
      endIndex: Number,
      pageNumber: Number,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient retrieval
chunkSchema.index({ paperId: 1, position: 1 });

export const Chunk = mongoose.model<IChunk>('Chunk', chunkSchema);





