import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../../infrastructure/db/models/User';
import { AppError, asyncHandler } from '../../middlewares/errorHandler';
import { AuthRequest } from '../../middlewares/auth';
import emailService from '../../application/services/emailService';

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  password: string;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (sends reset token via email)
 * @access  Public
 */
export const forgotPassword = asyncHandler(
  async (req: Request<{}, {}, ForgotPasswordBody>, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success message for security (don't reveal if email exists)
    // But only proceed if user exists
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and save to database
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await user.save({ validateBeforeSave: false });

    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken);

    // Always return success message for security (don't reveal if email exists)
    const response: any = {
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    };

    // In development mode, also return token for testing (if email service not configured)
    if (process.env.NODE_ENV === 'development' && !emailSent) {
      response.resetToken = resetToken;
      response.resetUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${email}`;
      response.message += ' (Email service not configured - token included for testing)';
    }

    res.json(response);
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
export const resetPassword = asyncHandler(
  async (req: Request<{}, {}, ResetPasswordBody>, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { token, password } = req.body;

    if (!token) {
      return next(new AppError('Reset token is required', 400));
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  }
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
export const changePassword = asyncHandler(
  async (req: Request<{}, {}, ChangePasswordBody>, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(authReq.user._id).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user has a password set
    if (!user.password) {
      return next(new AppError('Password not set. Please use password reset instead.', 400));
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }
);

