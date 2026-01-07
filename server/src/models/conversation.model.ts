import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    chunkId: string;
    content: string;
    score: number;
  }>;
  createdAt: Date;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  paperId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        chunkId: String,
        content: String,
        score: Number,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    paperId: {
      type: Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for user conversations
conversationSchema.index({ userId: 1, paperId: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);






