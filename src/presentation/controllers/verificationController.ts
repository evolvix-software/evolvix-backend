import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Verification, { VerificationStatus, VerificationRole, VerificationLevel } from '../../infrastructure/db/models/Verification';
import User from '../../infrastructure/db/models/User';
import { AppError, asyncHandler } from '../../middlewares/errorHandler';
import { AuthRequest } from '../../middlewares/auth';
import { isMongoDBConnected } from '../../infrastructure/db/connection/database';
import { encrypt } from '../../utils/encryption';

/**
 * @route   POST /api/verification/submit
 * @desc    Submit verification data
 * @access  Private
 */
export const submitVerification = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }

    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { role, verificationLevel, ...verificationData } = req.body;

    // Validate role
    const validRoles: VerificationRole[] = ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'];
    if (!validRoles.includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    // Get user to check email verification
    const user = await User.findById(authReq.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Determine verification level based on submitted data
    let determinedLevel: VerificationLevel = 0; // L0: Basic
    
    // L0: Email verified
    if (user.isEmailVerified) {
      determinedLevel = 0;
    }
    
    // L1: ID Proof provided
    if (verificationData.idProof && verificationData.idProof.documentUrl) {
      determinedLevel = 1;
    }
    
    // L2: Role-specific documents provided
    if (
      (role === 'student' && verificationData.educationInfo) ||
      (role === 'mentor' && verificationData.professionalCredentials && verificationData.bankDetails) ||
      (role === 'employer' && verificationData.companyKYC) ||
      (role === 'investor' && verificationData.taxCompliance && verificationData.investmentBankDetails) ||
      (role === 'sponsor' && verificationData.sponsorKYC)
    ) {
      determinedLevel = 2;
    }
    
    // L3: Address proof and video verification
    if (verificationData.addressProof && verificationData.videoVerification) {
      determinedLevel = 3;
    }

    // Use provided level or determined level
    const finalLevel = verificationLevel !== undefined ? verificationLevel : determinedLevel;

    // Encrypt sensitive data before storing
    const encryptedData: any = { ...verificationData };
    if (encryptedData.bankDetails?.accountNumber) {
      encryptedData.bankDetails.accountNumber = encrypt(encryptedData.bankDetails.accountNumber);
    }
    if (encryptedData.investmentBankDetails?.accountNumber) {
      encryptedData.investmentBankDetails.accountNumber = encrypt(encryptedData.investmentBankDetails.accountNumber);
    }

    // Check if verification already exists
    let verification = await Verification.findOne({
      userId: authReq.user._id,
      role,
    });

    if (verification) {
      // Update existing verification
      Object.assign(verification, {
        ...encryptedData,
        role,
        verificationLevel: finalLevel,
        status: 'pending' as VerificationStatus,
        submittedAt: new Date(),
      });
      await verification.save();
    } else {
      // Create new verification
      verification = await Verification.create({
        userId: authReq.user._id,
        role,
        verificationLevel: finalLevel,
        status: 'pending' as VerificationStatus,
        ...encryptedData,
        submittedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Verification submitted successfully',
      data: {
        verification,
      },
    });
  }
);

/**
 * @route   GET /api/verification/status
 * @desc    Get verification status for current user
 * @access  Private
 */
export const getVerificationStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { role } = req.query;

    const query: any = { userId: authReq.user._id };
    if (role) {
      query.role = role;
    }

    const verifications = await Verification.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        verifications,
      },
    });
  }
);

/**
 * @route   GET /api/admin/verifications
 * @desc    Get all verifications (admin only)
 * @access  Private (Admin only)
 */
export const getAllVerifications = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status as VerificationStatus | undefined;
    const role = req.query.role as VerificationRole | undefined;

    const query: any = {};
    if (status) query.status = status;
    if (role) query.role = role;

    const [verifications, total] = await Promise.all([
      Verification.find(query)
        .populate('userId', 'fullName email roles primaryRole')
        .populate('reviewedBy', 'fullName email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Verification.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        verifications,
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
 * @route   GET /api/admin/verifications/:id
 * @desc    Get verification by ID (admin only)
 * @access  Private (Admin only)
 */
export const getVerificationById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const { id } = req.params;

    const verification = await Verification.findById(id)
      .populate('userId', 'fullName email roles primaryRole avatar')
      .populate('reviewedBy', 'fullName email')
      .lean();

    if (!verification) {
      return next(new AppError('Verification not found', 404));
    }

    res.json({
      success: true,
      data: {
        verification,
      },
    });
  }
);

/**
 * @route   POST /api/admin/verifications/:id/approve
 * @desc    Approve verification (admin only)
 * @access  Private (Admin only)
 */
export const approveVerification = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const { adminNotes } = req.body;

    const verification = await Verification.findById(id);

    if (!verification) {
      return next(new AppError('Verification not found', 404));
    }

    verification.status = 'approved';
    verification.reviewedBy = authReq.user._id as mongoose.Types.ObjectId;
    verification.reviewedAt = new Date();
    if (adminNotes) verification.adminNotes = adminNotes;

    await verification.save();

    // Update user verification level in User model
    const user = await User.findById(verification.userId);
    if (user) {
      // Initialize verificationLevels if it doesn't exist
      if (!user.verificationLevels) {
        user.verificationLevels = {};
      }
      
      // Update verification level for the specific role
      // Type assertion needed because Mongoose Mixed type is any
      const verificationLevels = user.verificationLevels as { [key: string]: VerificationLevel };
      verificationLevels[verification.role] = verification.verificationLevel;
      user.verificationLevels = verificationLevels;
      
      await user.save();
    }

    res.json({
      success: true,
      message: 'Verification approved successfully',
      data: {
        verification,
      },
    });
  }
);

/**
 * @route   POST /api/admin/verifications/:id/reject
 * @desc    Reject verification (admin only)
 * @access  Private (Admin only)
 */
export const rejectVerification = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!isMongoDBConnected()) {
      return next(new AppError('Database connection is not available', 503));
    }

    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(new AppError('Authentication required', 401));
    }

    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return next(new AppError('Rejection reason is required', 400));
    }

    const verification = await Verification.findById(id);

    if (!verification) {
      return next(new AppError('Verification not found', 404));
    }

    verification.status = 'rejected';
    verification.reviewedBy = authReq.user._id as mongoose.Types.ObjectId;
    verification.reviewedAt = new Date();
    verification.rejectionReason = rejectionReason;
    if (adminNotes) verification.adminNotes = adminNotes;

    await verification.save();

    res.json({
      success: true,
      message: 'Verification rejected successfully',
      data: {
        verification,
      },
    });
  }
);


