import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import User from '../../infrastructure/db/models/User';
import { AppError, asyncHandler } from '../../middlewares/errorHandler';
import { isMongoDBConnected } from '../../infrastructure/db/connection/database';

interface UpdateUserStatusBody {
  reason?: string;
}

interface UpdateUserBody {
  fullName?: string;
  email?: string;
  roles?: string[];
  primaryRole?: string;
  isEmailVerified?: boolean;
}

interface CreateUserBody {
  fullName: string;
  email: string;
  password?: string;
  roles?: string[];
  primaryRole?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (admin only)
 * @access  Private (Admin only)
 */
export const createUser = asyncHandler(
  async (req: Request<{}, {}, CreateUserBody>, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { fullName, email, password, roles, primaryRole, isEmailVerified, isActive } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 409));
    }

    // Validate roles (admin cannot be created through this endpoint)
    if (roles && roles.includes('admin')) {
      return next(new AppError('Admin users cannot be created through this endpoint', 403));
    }

    // Create user
    const userData: any = {
      fullName,
      email: email.toLowerCase(),
      roles: roles || [],
      primaryRole: primaryRole || (roles && roles.length > 0 ? roles[0] : undefined),
      isEmailVerified: isEmailVerified !== undefined ? isEmailVerified : false,
      isActive: isActive !== undefined ? isActive : true,
    };

    // Set password if provided (will be hashed by pre-save hook)
    if (password) {
      userData.password = password;
    }

    const newUser = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: newUser.toJSON(),
      },
    });
  }
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin only)
 */
export const getUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string; // 'active', 'inactive', 'banned', 'suspended'
    const isEmailVerified = req.query.isEmailVerified === 'true' ? true : req.query.isEmailVerified === 'false' ? false : undefined;

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      query.roles = role;
    }

    if (status === 'active') {
      query.isActive = true;
      query.isBanned = false;
      query.isSuspended = false;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'banned') {
      query.isBanned = true;
    } else if (status === 'suspended') {
      query.isSuspended = true;
    }

    if (isEmailVerified !== undefined) {
      query.isEmailVerified = isEmailVerified;
    }

    // Exclude admin users from regular user list (optional)
    // query.roles = { $ne: 'admin' };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -emailVerificationToken -resetPasswordToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  }
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
export const getUserById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .lean();

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  }
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
export const updateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const { id } = req.params;
    const { fullName, email, roles, primaryRole, isEmailVerified }: UpdateUserBody = req.body;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent updating admin user (or add additional checks)
    if (user.roles.includes('admin') && req.user && (req.user as any)._id.toString() !== id) {
      return next(new AppError('Cannot modify admin user', 403));
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email.toLowerCase();
    if (roles) user.roles = roles as any;
    if (primaryRole) user.primaryRole = primaryRole as any;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent deleting admin user
    if (user.roles.includes('admin')) {
      return next(new AppError('Cannot delete admin user', 403));
    }

    // Prevent self-deletion
    if (req.user && (req.user as any)._id.toString() === id) {
      return next(new AppError('Cannot delete your own account', 403));
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  }
);

/**
 * @route   POST /api/admin/users/:id/ban
 * @desc    Ban user
 * @access  Private (Admin only)
 */
export const banUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;
    const { reason }: UpdateUserStatusBody = req.body;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent banning admin user
    if (user.roles.includes('admin')) {
      return next(new AppError('Cannot ban admin user', 403));
    }

    user.isBanned = true;
    user.isActive = false;
    user.bannedAt = new Date();
    if (reason) user.banReason = reason;

    await user.save();

    res.json({
      success: true,
      message: 'User banned successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   POST /api/admin/users/:id/unban
 * @desc    Unban user
 * @access  Private (Admin only)
 */
export const unbanUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.isBanned = false;
    user.isActive = true;
    user.banReason = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'User unbanned successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   POST /api/admin/users/:id/suspend
 * @desc    Suspend user
 * @access  Private (Admin only)
 */
export const suspendUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;
    const { reason }: UpdateUserStatusBody = req.body;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent suspending admin user
    if (user.roles.includes('admin')) {
      return next(new AppError('Cannot suspend admin user', 403));
    }

    user.isSuspended = true;
    user.isActive = false;
    user.suspendedAt = new Date();
    if (reason) user.suspendReason = reason;

    await user.save();

    res.json({
      success: true,
      message: 'User suspended successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   POST /api/admin/users/:id/unsuspend
 * @desc    Unsuspend user
 * @access  Private (Admin only)
 */
export const unsuspendUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.isSuspended = false;
    user.isActive = true;
    user.suspendReason = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'User unsuspended successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   POST /api/admin/users/:id/activate
 * @desc    Activate user
 * @access  Private (Admin only)
 */
export const activateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.isActive = true;
    user.isBanned = false;
    user.isSuspended = false;

    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   POST /api/admin/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private (Admin only)
 */
export const deactivateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent deactivating admin user
    if (user.roles.includes('admin')) {
      return next(new AppError('Cannot deactivate admin user', 403));
    }

    user.isActive = false;

    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        user,
      },
    });
  }
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
export const getAdminStats = asyncHandler(
  async (_req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }


    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      bannedUsers,
      suspendedUsers,
      verifiedUsers,
      usersByRole,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true, isBanned: false, isSuspended: false }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ isEmailVerified: true }),
      User.aggregate([
        {
          $unwind: '$roles',
        },
        {
          $group: {
            _id: '$roles',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        bannedUsers,
        suspendedUsers,
        verifiedUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  }
);

