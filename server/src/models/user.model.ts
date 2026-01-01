import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type PreferredStyle = 'technical' | 'simplified' | 'examples-heavy' | 'concise';

export interface IUserProfile {
  researchField?: string;
  expertiseLevel?: ExpertiseLevel;
  interests?: string[];
  currentProjects?: string;
  preferredStyle?: PreferredStyle;
  bio?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  profile?: IUserProfile;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
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
      required: true,
      minlength: 8,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profile: {
      type: profileSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
