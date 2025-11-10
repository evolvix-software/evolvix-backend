import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/firebase';
import { AppError, asyncHandler } from '../../middlewares/errorHandler';
import User from '../../infrastructure/db/models/User';
import config from '../../config/env';

/**
 * @route   POST /api/auth/google
 * @desc    Handle Google OAuth (Firebase handles the OAuth flow)
 * @access  Public
 */
export const googleAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Verify Firebase token from Authorization header (Firebase handles Google OAuth)
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

    // Find or create user
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!user && firebaseUser.email) {
      user = await User.findOne({ email: firebaseUser.email.toLowerCase() });
      
      if (user) {
        // Link Firebase UID to existing user
        user.firebaseUid = firebaseUser.uid;
        user.googleId = firebaseUser.firebase?.identities?.google?.[0] || undefined;
        user.oauthProvider = 'google';
        user.isEmailVerified = firebaseUser.email_verified || false;
        await user.save({ validateBeforeSave: false });
      }
    }

    // Create new user if doesn't exist
    if (!user) {
      user = await User.create({
        fullName: firebaseUser.name || 'User',
        email: firebaseUser.email?.toLowerCase() || '',
        firebaseUid: firebaseUser.uid,
        googleId: firebaseUser.firebase?.identities?.google?.[0] || undefined,
        oauthProvider: 'google',
        isEmailVerified: firebaseUser.email_verified || false,
        roles: [],
        avatar: firebaseUser.picture,
        lastLogin: new Date(),
      });
    } else {
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
    }

    // Redirect to frontend
    // Use first origin if multiple are configured, or the single origin
    const frontendOrigin = Array.isArray(config.corsOrigin) 
      ? config.corsOrigin[0] 
      : config.corsOrigin;
    const redirectUrl = new URL(`${frontendOrigin}/auth/oauth/callback`);
    redirectUrl.searchParams.set('provider', 'google');
    
    if (!user.primaryRole || user.roles.length === 0) {
      redirectUrl.searchParams.set('needsRoleSelection', 'true');
    }

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          roles: user.roles,
          primaryRole: user.primaryRole,
        },
        redirectUrl: redirectUrl.toString(),
      },
    });
  }
);

/**
 * @route   POST /api/auth/apple
 * @desc    Handle Apple Sign In (Firebase handles the OAuth flow)
 * @access  Public
 */
export const appleAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Verify Firebase token from Authorization header (Firebase handles Apple OAuth)
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

    // Find or create user
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!user && firebaseUser.email) {
      user = await User.findOne({ email: firebaseUser.email.toLowerCase() });
      
      if (user) {
        // Link Firebase UID to existing user
        user.firebaseUid = firebaseUser.uid;
        user.appleId = firebaseUser.firebase?.identities?.apple?.[0] || undefined;
        user.oauthProvider = 'apple';
        user.isEmailVerified = firebaseUser.email_verified || false;
        await user.save({ validateBeforeSave: false });
      }
    }

    // Create new user if doesn't exist
    if (!user) {
      user = await User.create({
        fullName: firebaseUser.name || 'User',
        email: firebaseUser.email?.toLowerCase() || '',
        firebaseUid: firebaseUser.uid,
        appleId: firebaseUser.firebase?.identities?.apple?.[0] || undefined,
        oauthProvider: 'apple',
        isEmailVerified: firebaseUser.email_verified || false,
        roles: [],
        avatar: firebaseUser.picture,
        lastLogin: new Date(),
      });
    } else {
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      message: 'Apple authentication successful',
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

