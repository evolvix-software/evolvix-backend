import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Survey, { ISurveyAnswer } from '../../infrastructure/db/models/Survey';
import { surveyData } from '../../application/services/surveyQuestions';
import { AppError, asyncHandler } from '../../middlewares/errorHandler';
import { AuthRequest } from '../../middlewares/auth';
import { UserRole } from '../../infrastructure/db/models/User';

interface SubmitAnswersBody {
  role: UserRole;
  answers: ISurveyAnswer[];
}

/**
 * @route   GET /api/survey/questions/:role
 * @desc    Get survey questions for a specific role
 * @access  Public (or Private if you want to track)
 */
export const getSurveyQuestions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.params;

    const validRoles = ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'];
    
    if (!validRoles.includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    const questions = surveyData[role];

    if (!questions || questions.length === 0) {
      return next(new AppError('No survey questions found for this role', 404));
    }

    res.json({
      success: true,
      data: {
        role,
        questions,
      },
    });
  }
);

/**
 * @route   GET /api/survey/status/:role
 * @desc    Check if survey is completed for user and role
 * @access  Private
 */
export const getSurveyStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const { role } = req.params;

    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const survey = await Survey.findOne({
      userId: authReq.user._id,
      role: role as UserRole,
    });

    const status: {
      completed: boolean;
      completedAt: Date | null;
      hasStarted: boolean;
      progress: number;
    } = {
      completed: false,
      completedAt: null,
      hasStarted: false,
      progress: 0,
    };

    if (survey) {
      status.hasStarted = true;
      status.completed = survey.completed;
      status.completedAt = survey.completedAt ? new Date(survey.completedAt) : null;
      
      // Calculate progress
      const questions = surveyData[role] || [];
      const totalRequired = questions.filter(q => q.required).length;
      const answeredRequired = survey.answers.filter(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        return question?.required;
      }).length;
      
      status.progress = totalRequired > 0 
        ? Math.round((answeredRequired / totalRequired) * 100)
        : Math.round((survey.answers.length / questions.length) * 100);
    }

    res.json({
      success: true,
      data: {
        role,
        ...status,
      },
    });
  }
);

/**
 * @route   GET /api/survey/my-surveys
 * @desc    Get all surveys for the authenticated user
 * @access  Private
 */
export const getMySurveys = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const surveys = await Survey.find({
      userId: authReq.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        surveys: surveys.map(survey => ({
          role: survey.role,
          completed: survey.completed,
          completedAt: survey.completedAt,
          answersCount: survey.answers.length,
          createdAt: survey.createdAt,
          updatedAt: survey.updatedAt,
        })),
      },
    });
  }
);

/**
 * @route   GET /api/survey/:role
 * @desc    Get survey answers for a specific role
 * @access  Private
 */
export const getSurveyAnswers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const { role } = req.params;

    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const survey = await Survey.findOne({
      userId: authReq.user._id,
      role: role as UserRole,
    });

    if (!survey) {
      return res.json({
        success: true,
        data: {
          role,
          answers: [],
          completed: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        role: survey.role,
        answers: survey.answers,
        completed: survey.completed,
        completedAt: survey.completedAt,
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
      },
    });
  }
);

/**
 * @route   POST /api/survey/save-answer
 * @desc    Save a single survey answer
 * @access  Private
 */
export const saveAnswer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { role, questionId, answer }: { role: UserRole; questionId: string; answer: string | string[] } = req.body;

    // Validate role
    const validRoles = ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'];
    if (!validRoles.includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    // Get survey questions for validation
    const questions = surveyData[role];
    const question = questions.find(q => q.id === questionId);

    if (!question) {
      return next(new AppError('Question not found for this role', 404));
    }

    // Validate answer format based on question type
    if (question.type === 'single' && typeof answer !== 'string') {
      return next(new AppError('Answer must be a string for single choice questions', 400));
    }

    if (question.type === 'multiple' && !Array.isArray(answer)) {
      return next(new AppError('Answer must be an array for multiple choice questions', 400));
    }

    if (question.type === 'text' && typeof answer !== 'string') {
      return next(new AppError('Answer must be a string for text questions', 400));
    }

    // Validate options if provided
    if (question.options) {
      if (typeof answer === 'string') {
        if (!question.options.includes(answer)) {
          return next(new AppError('Invalid option selected', 400));
        }
      } else if (Array.isArray(answer)) {
        const invalidOptions = answer.filter(opt => !question.options!.includes(opt));
        if (invalidOptions.length > 0) {
          return next(new AppError(`Invalid options selected: ${invalidOptions.join(', ')}`, 400));
        }
      }
    }

    // Find or create survey
    let survey = await Survey.findOne({
      userId: authReq.user._id,
      role,
    });

    if (!survey) {
      survey = await Survey.create({
        userId: authReq.user._id,
        role,
        answers: [],
        completed: false,
      });
    }

    // Update or add answer
    const answerIndex = survey.answers.findIndex(a => a.questionId === questionId);
    const newAnswer: ISurveyAnswer = { questionId, answer };

    if (answerIndex >= 0) {
      survey.answers[answerIndex] = newAnswer;
    } else {
      survey.answers.push(newAnswer);
    }

    await survey.save();

    res.json({
      success: true,
      message: 'Answer saved successfully',
      data: {
        role: survey.role,
        answer: newAnswer,
      },
    });
  }
);

/**
 * @route   POST /api/survey/submit
 * @desc    Submit complete survey with all answers
 * @access  Private
 */
export const submitSurvey = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { role, answers }: SubmitAnswersBody = req.body;

    // Validate role
    const validRoles = ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'];
    if (!validRoles.includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    // Get survey questions for validation
    const questions = surveyData[role];
    if (!questions || questions.length === 0) {
      return next(new AppError('No survey questions found for this role', 404));
    }

    // Validate required questions are answered
    const requiredQuestions = questions.filter(q => q.required);
    const answeredQuestionIds = new Set(answers.map(a => a.questionId));
    
    const missingRequired = requiredQuestions.filter(q => !answeredQuestionIds.has(q.id));
    if (missingRequired.length > 0) {
      return next(
        new AppError(
          `Missing answers for required questions: ${missingRequired.map(q => q.id).join(', ')}`,
          400
        )
      );
    }

    // Validate all answers
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) {
        return next(new AppError(`Question ${answer.questionId} not found for this role`, 400));
      }

      // Validate answer format
      if (question.type === 'single' && typeof answer.answer !== 'string') {
        return next(new AppError(`Answer for ${question.id} must be a string`, 400));
      }

      if (question.type === 'multiple' && !Array.isArray(answer.answer)) {
        return next(new AppError(`Answer for ${question.id} must be an array`, 400));
      }

      if (question.type === 'text' && typeof answer.answer !== 'string') {
        return next(new AppError(`Answer for ${question.id} must be a string`, 400));
      }

      // Validate options if provided
      if (question.options) {
        if (typeof answer.answer === 'string') {
          if (!question.options.includes(answer.answer)) {
            return next(new AppError(`Invalid option for ${question.id}`, 400));
          }
        } else if (Array.isArray(answer.answer)) {
          const invalidOptions = answer.answer.filter(opt => !question.options!.includes(opt));
          if (invalidOptions.length > 0) {
            return next(new AppError(`Invalid options for ${question.id}`, 400));
          }
        }
      }
    }

    // Find or create survey
    let survey = await Survey.findOne({
      userId: authReq.user._id,
      role,
    });

    if (survey) {
      survey.answers = answers;
      survey.completed = true;
      survey.completedAt = new Date();
    } else {
      survey = await Survey.create({
        userId: authReq.user._id,
        role,
        answers,
        completed: true,
        completedAt: new Date(),
      });
    }

    await survey.save();

    res.json({
      success: true,
      message: 'Survey submitted successfully',
      data: {
        role: survey.role,
        completed: survey.completed,
        completedAt: survey.completedAt,
        answersCount: survey.answers.length,
      },
    });
  }
);

