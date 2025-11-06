import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from './User';

export interface ISurveyAnswer {
  questionId: string;
  answer: string | string[];
}

export interface ISurvey extends Document {
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  answers: ISurveyAnswer[];
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const surveyAnswerSchema = new Schema<ISurveyAnswer>(
  {
    questionId: {
      type: String,
      required: true,
    },
    answer: {
      type: Schema.Types.Mixed, // Can be string or array of strings
      required: true,
    },
  },
  { _id: false }
);

const surveySchema = new Schema<ISurvey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'],
      required: true,
      index: true,
    },
    answers: {
      type: [surveyAnswerSchema],
      default: [],
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for userId + role to ensure one survey per role per user
surveySchema.index({ userId: 1, role: 1 }, { unique: true });

// Index for querying by completion status
surveySchema.index({ userId: 1, completed: 1 });

const Survey = mongoose.model<ISurvey>('Survey', surveySchema);

export default Survey;

