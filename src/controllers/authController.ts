import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User, { UserRole } from '../infrastructure/db/models/User';
import Survey from '../infrastructure/db/models/Survey';
import { verifyToken } from '../utils/firebase';
import { AppError, asyncHandler } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import emailService from '../application/services/emailService';
import { isMongoDBConnected } from '../infrastructure/db/connection/database';

interface SignupBody {
  fullName: string;
  email: string;
  role?: UserRole;
}

interface LoginBody {
  // Empty - Firebase handles authentication
}


/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (Firebase token required)
 * @access  Public
 */
export const signup = asyncHandler(
  async (req: Request<{}, {}, SignupBody>, res: Response, next: NextFunction) => {
    // Check if MongoDB is connected
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available. Please ensure MongoDB is running and try again later.', 503));
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    // Verify Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Firebase ID token is required', 401));
    }

    const idToken = authHeader.substring(7);
    let firebaseUser;
    try {
      firebaseUser = await verifyToken(idToken);
    } catch (error) {
      return next(new AppError('Invalid Firebase token', 401));
    }

    const { fullName, email, role } = req.body;

    // Prevent admin signup - admins can only be created manually
    if (role === 'admin') {
      return next(new AppError('Admin accounts cannot be created through signup', 403));
    }

    // Validate role
    const validRoles = ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'];
    if (role && !validRoles.includes(role)) {
      return next(new AppError('Invalid role selected', 400));
    }

    // Check if user already exists
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (user) {
      return next(new AppError('User already exists', 409));
    }

    // Check if email already exists
    if (firebaseUser.email) {
      user = await User.findOne({ email: firebaseUser.email.toLowerCase() });
      if (user) {
        // Link Firebase UID to existing user
        user.firebaseUid = firebaseUser.uid;
        await user.save({ validateBeforeSave: false });
      }
    }

    // Create user in MongoDB
    const userData: any = {
      fullName: fullName || firebaseUser.name || 'User',
      email: email?.toLowerCase() || firebaseUser.email?.toLowerCase() || '',
      firebaseUid: firebaseUser.uid,
      roles: role ? [role] : [],
      primaryRole: role,
      isEmailVerified: firebaseUser.email_verified || false,
    };

    // Generate email verification token if email is not verified
    if (!firebaseUser.email_verified) {
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    userData.emailVerificationToken = crypto
      .createHash('sha256')
      .update(emailVerificationToken)
      .digest('hex');
    userData.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    const newUser = await User.create(userData);

    // Check survey completion status if role is selected
    let surveyStatus = null;
    if (role) {
      const survey = await Survey.findOne({
        userId: newUser._id,
        role,
      });
      surveyStatus = {
        role,
        completed: survey?.completed || false,
        hasStarted: !!survey,
      };
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(newUser.email, newUser.fullName).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          roles: newUser.roles,
          primaryRole: newUser.primaryRole,
          isEmailVerified: newUser.isEmailVerified,
        },
        survey: surveyStatus,
      },
    });
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (verify Firebase token and sync user data)
 * @access  Public
 */
export const login = asyncHandler(
  async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) => {
    // Check if MongoDB is connected
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available. Please ensure MongoDB is running and try again later.', 503));
    }

    // Verify Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Firebase ID token is required', 401));
    }

    const idToken = authHeader.substring(7);
    let firebaseUser;
    try {
      firebaseUser = await verifyToken(idToken);
    } catch (error) {
      return next(new AppError('Invalid Firebase token', 401));
    }

    // Find user by Firebase UID or email
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!user && firebaseUser.email) {
      user = await User.findOne({ email: firebaseUser.email.toLowerCase() });
      
      if (user) {
        // Link Firebase UID to existing user
        user.firebaseUid = firebaseUser.uid;
        await user.save({ validateBeforeSave: false });
      }
    }

    // If user doesn't exist, create one (for Firebase users who haven't signed up through our API)
    if (!user) {
      user = await User.create({
        fullName: firebaseUser.name || 'User',
        email: firebaseUser.email?.toLowerCase() || '',
        firebaseUid: firebaseUser.uid,
        roles: [],
        isEmailVerified: firebaseUser.email_verified || false,
      });
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Get survey status for all user roles
    const surveys = await Survey.find({
      userId: user._id,
    });

    const surveyStatusMap: Record<string, { completed: boolean; hasStarted: boolean }> = {};
    surveys.forEach(survey => {
      surveyStatusMap[survey.role] = {
        completed: survey.completed,
        hasStarted: true,
      };
    });

    // Add survey status for primary role if exists
    const primaryRoleSurvey = user.primaryRole 
      ? surveys.find(s => s.role === user.primaryRole)
      : null;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          roles: user.roles,
          primaryRole: user.primaryRole,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
        },
        survey: primaryRoleSurvey
          ? {
              role: primaryRoleSurvey.role,
              completed: primaryRoleSurvey.completed,
              hasStarted: true,
            }
          : user.primaryRole
          ? {
              role: user.primaryRole,
              completed: false,
              hasStarted: false,
            }
          : null,
        surveys: surveyStatusMap,
      },
    });
  }
);

/**
 * @route   POST /api/auth/select-role
 * @desc    Select/update user role
 * @access  Private
 */
export const selectRole = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { role } = req.body;

    // Check if role is valid (admin cannot be selected)
    const validRoles: UserRole[] = [
      'student',
      'mentor',
      'employer',
      'investor',
      'sponsor',
      'entrepreneur',
    ];

    if (!validRoles.includes(role)) {
      return next(new AppError('Invalid role selected. Admin role cannot be assigned.', 400));
    }

    if (role === 'admin') {
      return next(new AppError('Admin role cannot be selected. Admin accounts must be created manually.', 403));
    }

    // Update user roles
    const user = authReq.user;
    const userRoles = user.roles || [];
    if (!userRoles.includes(role)) {
      userRoles.push(role);
    }
    user.roles = userRoles;
    user.primaryRole = role;
    await user.save();

    res.json({
      success: true,
      message: 'Role selected successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          roles: user.roles,
          primaryRole: user.primaryRole,
        },
      },
    });
  }
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Verify Firebase token (no refresh needed with Firebase)
 * @access  Public
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Verify Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Firebase ID token is required', 401));
    }

    const idToken = authHeader.substring(7);
    try {
      const firebaseUser = await verifyToken(idToken);
      
      // Find user
      let user = await User.findOne({ firebaseUid: firebaseUser.uid });

      if (!user || !user.isActive) {
        return next(new AppError('User not found or inactive', 401));
      }

      // Firebase handles token refresh automatically, so we just verify
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: user._id,
            email: user.email,
            roles: user.roles,
            primaryRole: user.primaryRole,
          },
        },
      });
    } catch (error) {
      return next(new AppError('Invalid token', 401));
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
export const getMe = asyncHandler(
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Get survey status for all user roles
    const surveys = await Survey.find({
      userId: authReq.user._id,
    });

    const surveyStatusMap: Record<string, { completed: boolean; hasStarted: boolean }> = {};
    surveys.forEach(survey => {
      surveyStatusMap[survey.role] = {
        completed: survey.completed,
        hasStarted: true,
      };
    });

    res.json({
      success: true,
      data: {
        user: authReq.user,
        surveys: surveyStatusMap,
      },
    });
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client should delete token)
 * @access  Private
 */
export const logout = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    // In a production app, you might want to maintain a blacklist of tokens
    // For now, client-side token deletion is sufficient

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
);
