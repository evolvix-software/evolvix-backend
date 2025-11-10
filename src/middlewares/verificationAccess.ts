/**
 * Middleware to check user verification level and access permissions
 * Based on Global User Verification Framework
 */

import { Request, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User from '../infrastructure/db/models/User';
import Verification, { VerificationLevel, VerificationRole } from '../infrastructure/db/models/Verification';
import { AppError } from './errorHandler';

export interface VerificationAccessRequest extends AuthRequest {
  requiredLevel?: VerificationLevel;
  requiredRole?: VerificationRole;
}

/**
 * Middleware to check if user has required verification level for a role
 * 
 * Access Matrix:
 * L0 (Basic): Email Verification - Limited Access, Profile Setup Only
 * L1 (ID Verified): Govt ID Upload - Course Access, Certificates
 * L2 (Role Verified): KYC + Professional/Company Docs - Mentorship, Job Posting, Investment, CSR Funding
 * L3 (Trusted/Premium): Full KYC + Address Proof + Video Verification - Entrepreneur Zone, Startup Creation, Fund Management
 */
export const requireVerificationLevel = (
  requiredLevel: VerificationLevel,
  role?: VerificationRole
) => {
  return async (req: Request, next: NextFunction) => {
    try {
      const authReq = req as VerificationAccessRequest;
      
      if (!authReq.user) {
        return next(new AppError('Authentication required', 401));
      }

      const user = await User.findById(authReq.user._id);
      if (!user) {
        return next(new AppError('User not found', 404));
      }

      // Determine which role to check
      const checkRole = role || user.primaryRole;
      if (!checkRole) {
        return next(new AppError('No role specified for verification check', 400));
      }

      // Get verification level for the role
      let userLevel: VerificationLevel = 0; // Default to L0
      
      // Check if user has verification level stored in User model
      if (user.verificationLevels && user.verificationLevels[checkRole] !== undefined) {
        userLevel = user.verificationLevels[checkRole] as VerificationLevel;
      }

      // If not found in User model, check Verification collection
      if (userLevel === 0) {
        const verification = await Verification.findOne({
          userId: user._id,
          role: checkRole,
          status: 'approved',
        });

        if (verification) {
          userLevel = verification.verificationLevel;
        } else {
          // Check basic verification (L0)
          if (user.isEmailVerified) {
            userLevel = 0;
          }
        }
      }

      // Check if user meets required level
      if (userLevel < requiredLevel) {
        const levelNames = ['L0 (Basic)', 'L1 (ID Verified)', 'L2 (Role Verified)', 'L3 (Trusted/Premium)'];
        return next(
          new AppError(
            `This action requires ${levelNames[requiredLevel]} verification. Your current level is ${levelNames[userLevel]}.`,
            403
          )
        );
      }

      // Attach verification info to request
      authReq.requiredLevel = requiredLevel;
      authReq.requiredRole = checkRole as VerificationRole;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper function to get user's verification level for a role
 */
export const getUserVerificationLevel = async (
  userId: string,
  role: VerificationRole
): Promise<VerificationLevel> => {
  const user = await User.findById(userId);
  if (!user) return 0;

  // Check User model first
  if (user.verificationLevels && user.verificationLevels[role] !== undefined) {
    return user.verificationLevels[role] as VerificationLevel;
  }

  // Check Verification collection
  const verification = await Verification.findOne({
    userId,
    role,
    status: 'approved',
  });

  if (verification) {
    return verification.verificationLevel;
  }

  // Check basic verification (L0)
  if (user.isEmailVerified) {
    return 0;
  }

  return 0;
};

/**
 * Check if user can access sensitive features based on verification level
 */
export const canAccessFeature = (
  userLevel: VerificationLevel,
  requiredLevel: VerificationLevel
): boolean => {
  return userLevel >= requiredLevel;
};

