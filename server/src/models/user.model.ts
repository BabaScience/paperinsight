import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type PreferredStyle = 'technical' | 'simplified' | 'examples-heavy' | 'concise';
export type PreferredModel = 'openai' | 'deepseek';

export interface IUserProfile {
  researchField?: string;
  expertiseLevel?: ExpertiseLevel;
  interests?: string[];
  currentProjects?: string;
  preferredStyle?: PreferredStyle;
  preferredLanguage?: string;
  preferredModel?: PreferredModel;
  tokenLimit?: number;
  bio?: string;
}

export interface ITokenUsage {
  used: number;
  allowance: number;
  lastResetAt: Date;
  pendingRequest: boolean;
  pendingRequestAt?: Date;
  version: number; // For optimistic locking
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  profile?: IUserProfile;
  tokenUsage: ITokenUsage;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: Date;
  googleId?: string;
  authProvider?: 'local' | 'google';
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
}

const profileSchema = new Schema<IUserProfile>(
  {
    researchField: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    expertiseLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    interests: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: 'Maximum 10 interests allowed',
      },
    },
    currentProjects: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    preferredStyle: {
      type: String,
      enum: ['technical', 'simplified', 'examples-heavy', 'concise'],
    },
    preferredLanguage: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    preferredModel: {
      type: String,
      enum: ['openai', 'deepseek'],
      default: undefined,
    },
    tokenLimit: {
      type: Number,
      min: 500,
      max: 8000,
      default: undefined,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Made optional for Google OAuth users
      minlength: 8,
      select: false,
      validate: {
        validator: function(this: IUser, value: string | undefined) {
          // Password required only for local auth
          if (this.authProvider === 'google' && !value) {
            return true; // Google users don't need password
          }
          if ((this.authProvider === 'local' || !this.authProvider) && (!value || value.length < 8)) {
            return false; // Local auth requires password
          }
          return true;
        },
        message: 'Password is required for local authentication and must be at least 8 characters',
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationTokenExpires: {
      type: Date,
      select: false,
    },
    profile: {
      type: profileSchema,
      default: {},
    },
    tokenUsage: {
      used: {
        type: Number,
        default: 0,
      },
      allowance: {
        type: Number,
        default: env.USER_TOKEN_ALLOWANCE,
      },
      lastResetAt: {
        type: Date,
        default: Date.now,
      },
      pendingRequest: {
        type: Boolean,
        default: false,
      },
      pendingRequestAt: {
        type: Date,
      },
      version: {
        type: Number,
        default: 0,
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-detect admin status based on email
userSchema.pre('save', async function (next) {
  const ADMIN_EMAIL = env.ADMIN_EMAIL.toLowerCase();
  if (this.email && this.email.toLowerCase() === ADMIN_EMAIL) {
    this.isAdmin = true;
  } else if (!this.isModified('isAdmin') && !this.isNew) {
    // If not admin email and not explicitly setting isAdmin, ensure it's false
    // Only set to false if it's not being modified (to allow manual admin assignment)
    if (this.isAdmin === undefined) {
      this.isAdmin = false;
    }
  }
  next();
});

// Post-init hook to ensure admin status is set for existing users
userSchema.post('init', function() {
  const ADMIN_EMAIL = env.ADMIN_EMAIL.toLowerCase();
  if (this.email && this.email.toLowerCase() === ADMIN_EMAIL && !this.isAdmin) {
    // Mark as modified so save will update it
    this.isAdmin = true;
    this.markModified('isAdmin');
  }
});

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// ============================================
// Database Indexes
// ============================================

// Unique email index (already created by unique: true, but explicit for clarity)
userSchema.index({ email: 1 }, { unique: true });

// Token usage index for finding users near their limit
userSchema.index({ 'tokenUsage.used': 1, 'tokenUsage.allowance': 1 });

// Pending token requests index for admin dashboard
userSchema.index({ 'tokenUsage.pendingRequest': 1, 'tokenUsage.pendingRequestAt': -1 });

// Email verification token index
userSchema.index({ emailVerificationToken: 1 });

// Google ID index for OAuth lookups
userSchema.index({ googleId: 1 }, { sparse: true });

// Admin index for efficient admin queries
userSchema.index({ isAdmin: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
