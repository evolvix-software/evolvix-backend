import { body, ValidationChain } from 'express-validator';
import User from '../../infrastructure/db/models/User';

// Email validation
export const validateEmail = (field: string = 'email'): ValidationChain => {
  return body(field)
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();
};

// Password validation
export const validatePassword = (field: string = 'password'): ValidationChain => {
  return body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');
};

// Full name validation
export const validateFullName = (field: string = 'fullName'): ValidationChain => {
  return body(field)
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes');
};

// Role validation (admin not allowed in signup/role selection)
export const validateRole = (field: string = 'role', allowAdmin: boolean = false): ValidationChain => {
  const roles = allowAdmin 
    ? ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur', 'admin']
    : ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'];
  
  return body(field)
    .optional()
    .isIn(roles)
    .withMessage('Invalid role selected');
};

// Check if email exists
export const checkEmailExists = (field: string = 'email') => {
  return body(field).custom(async (email) => {
    if (email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        throw new Error('Email already registered');
      }
    }
    return true;
  });
};

// Check if email doesn't exist (for login)
export const checkEmailNotExists = (field: string = 'email') => {
  return body(field).custom(async (email) => {
    if (email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('Invalid email or password');
      }
    }
    return true;
  });
};

// Login validation (Firebase handles authentication, no password validation needed)
export const loginValidation = [
  // No validation needed - Firebase handles authentication
  // Token is verified in the controller
];

// Forgot password validation
export const forgotPasswordValidation = [
  validateEmail('email'),
];

// Reset password validation
export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  validatePassword('password'),
];

// Change password validation
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  validatePassword('newPassword'),
];

// Signup validation (Firebase handles password validation)
export const signupValidation = [
  validateFullName('fullName'),
  validateEmail('email'),
  // Password validation is handled by Firebase on client side
  checkEmailExists('email'),
  validateRole('role').optional(),
];

// Role selection validation
export const roleSelectionValidation = [
  validateRole('role')
    .notEmpty()
    .withMessage('Role selection is required'),
];

