import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 
  | 'student' 
  | 'mentor' 
  | 'employer' 
  | 'investor' 
  | 'sponsor' 
  | 'entrepreneur' 
  | 'admin';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  roles: UserRole[];
  primaryRole?: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  // OAuth fields
  googleId?: string;
  appleId?: string;
  oauthProvider?: 'google' | 'apple';
  firebaseUid?: string;
  
  // Profile fields
  avatar?: string;
  dateOfBirth?: Date;
  bio?: string;
  location?: string;
  
  // Account status
  isActive: boolean;
  isBanned: boolean;
  isSuspended: boolean;
  bannedAt?: Date;
  suspendedAt?: Date;
  banReason?: string;
  suspendReason?: string;
  lastLogin?: Date;
  
  // Verification levels per role
  verificationLevels?: {
    [key in UserRole]?: 0 | 1 | 2 | 3; // L0-L3 per role
  };
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    roles: {
      type: [String],
      enum: ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur', 'admin'],
      default: [],
      required: true,
    },
    primaryRole: {
      type: String,
      enum: ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur', 'admin'],
      required: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // OAuth
    googleId: {
      type: String,
      sparse: true, // Allow multiple null values
      unique: true,
    },
    appleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    oauthProvider: {
      type: String,
      enum: ['google', 'apple'],
    },
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
    },
    
    // Profile
    avatar: String,
    dateOfBirth: Date,
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    location: String,
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    bannedAt: Date,
    suspendedAt: Date,
    banReason: String,
    suspendReason: String,
    lastLogin: Date,
    
    // Verification levels per role
    verificationLevels: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret.password;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// Set primary role from roles array
userSchema.pre('save', function (next) {
  if (this.roles.length > 0 && !this.primaryRole) {
    this.primaryRole = this.roles[0] as UserRole;
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for performance
// Note: Fields with unique: true (email, googleId, appleId, firebaseUid) automatically create indexes
userSchema.index({ roles: 1 });
userSchema.index({ isActive: 1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;

