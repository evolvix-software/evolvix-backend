import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../../infrastructure/db/models/User';
import { AppError, asyncHandler } from '../../middlewares/errorHandler';
import { isMongoDBConnected } from '../../infrastructure/db/connection/database';
import jwt from 'jsonwebtoken';

interface AdminLoginBody {
  email: string;
  password: string;
}

// Generate JWT token for admin (separate from Firebase)
const generateAdminToken = (userId: string): string => {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-key-change-in-production';
  return jwt.sign(
    { userId, type: 'admin' },
    secret,
    { expiresIn: '24h' }
  );
};

/**
 * @route   POST /api/admin/login
 * @desc    Admin login (email/password only, separate from Firebase)
 * @access  Public
 */
export const adminLogin = asyncHandler(
  async (req: Request<{}, {}, AdminLoginBody>, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { email, password } = req.body;

    console.log('🔍 Admin login attempt:', { email: email.toLowerCase() });

    // Find admin user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    console.log('👤 User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('📋 User roles:', user.roles);
      console.log('🔐 Has password:', !!user.password);
      console.log('✅ Is active:', user.isActive);
    }

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check if user is admin
    if (!user.roles.includes('admin')) {
      console.log('❌ User is not admin');
      return next(new AppError('Admin access required', 403));
    }

    // Check if user has a password (admins must have password)
    if (!user.password) {
      console.log('❌ User has no password');
      return next(new AppError('Password not set. Please contact administrator.', 401));
    }

    // Verify password
    console.log('🔐 Comparing password...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔐 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Password comparison failed');
      return next(new AppError('Invalid email or password', 401));
    }

    // Check account status
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    if (user.isBanned) {
      return next(new AppError('Your account has been banned', 403));
    }

    if (user.isSuspended) {
      return next(new AppError('Your account has been suspended', 403));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate admin JWT token
    const token = generateAdminToken(String(user._id));

    // Return admin user data (without password)
    const userData = user.toJSON();

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: userData,
        token,
        isAdmin: true,
      },
    });
  }
);

/**
 * @route   POST /api/admin/verify
 * @desc    Verify admin token
 * @access  Private (Admin only)
 */
export const verifyAdminToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required', 401));
    }

    const token = authHeader.substring(7);
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-key-change-in-production';

    try {
      const decoded = jwt.verify(token, secret) as { userId: string; type: string };
      
      if (decoded.type !== 'admin') {
        return next(new AppError('Invalid admin token', 401));
      }

      const user = await User.findById(decoded.userId);
      
      if (!user || !user.roles.includes('admin') || !user.isActive) {
        return next(new AppError('Admin access required', 403));
      }

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
        },
      });
    } catch (error) {
      return next(new AppError('Invalid or expired token', 401));
    }
  }
);


