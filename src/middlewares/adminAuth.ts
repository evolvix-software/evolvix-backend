import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../infrastructure/db/models/User';
import { AppError } from './errorHandler';

/**
 * Middleware to authenticate admin using JWT token (separate from Firebase)
 */
export const authenticateAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide an admin token.', 401);
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-key-change-in-production';
    let decoded: { userId: string; type: string };
    
    try {
      decoded = jwt.verify(token, secret) as { userId: string; type: string };
    } catch (error) {
      throw new AppError('Invalid or expired admin token', 401);
    }
    
    // Verify token type is admin
    if (decoded.type !== 'admin') {
      throw new AppError('Invalid admin token', 401);
    }
    
    // Find user by ID
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new AppError('Admin user not found', 401);
    }
    
    // Verify user is admin
    if (!user.roles.includes('admin')) {
      throw new AppError('Admin access required', 403);
    }
    
    // Check account status
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', 403);
    }
    
    if (user.isBanned) {
      throw new AppError('Your account has been banned', 403);
    }
    
    if (user.isSuspended) {
      throw new AppError('Your account has been suspended', 403);
    }
    
    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid admin token', 401));
    }
  }
};

