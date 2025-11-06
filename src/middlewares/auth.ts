import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/firebase';
import { DecodedIdToken } from 'firebase-admin/auth';
import User, { IUser, UserRole } from '../infrastructure/db/models/User';
import { AppError } from './errorHandler';

// Extend Express Request to include token
declare global {
  namespace Express {
    interface Request {
      token?: DecodedIdToken;
    }
  }
}

// Extend Request to include IUser
declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
  }
}

export interface AuthRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: IUser;
  token: DecodedIdToken;
}

/**
 * Middleware to authenticate Firebase ID token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a token.', 401);
    }
    
    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify Firebase ID token
    const decoded = await verifyToken(idToken);
    
    // Find user by Firebase UID or email
    // First try to find by Firebase UID stored in the database
    let user = await User.findOne({ firebaseUid: decoded.uid });
    
    // If not found by UID, try by email
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email.toLowerCase() });
      
      // If found by email, link the Firebase UID
      if (user) {
        user.firebaseUid = decoded.uid;
        await user.save({ validateBeforeSave: false });
      }
    }
    
    if (!user || !user.isActive) {
      throw new AppError('User not found or account is inactive', 401);
    }

    // Check if user is banned
    if (user.isBanned) {
      throw new AppError('Your account has been banned. Please contact support.', 403);
    }

    // Check if user is suspended
    if (user.isSuspended) {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = decoded;
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired token', 401));
    }
  }
};

/**
 * Middleware to check if user has required role(s)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    const userRoles = (req.user as IUser).roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole && !userRoles.includes('admin')) {
      // Admin has access to all routes
      return next(
        new AppError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }
    
    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  if (!(req.user as IUser).roles.includes('admin')) {
    return next(new AppError('Admin access required', 403));
  }
  
  next();
};

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid token exists
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      const decoded = await verifyToken(idToken);
      
      // Find user by Firebase UID or email
      let user = await User.findOne({ firebaseUid: decoded.uid });
      
      if (!user && decoded.email) {
        user = await User.findOne({ email: decoded.email.toLowerCase() });
        
        if (user) {
          user.firebaseUid = decoded.uid;
          await user.save({ validateBeforeSave: false });
        }
      }
      
      if (user && user.isActive) {
        req.user = user;
        req.token = decoded;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

