import { Router } from 'express';
import {
  signup,
  login,
  selectRole,
  refreshToken,
  getMe,
  logout,
} from '../controllers/authController';
import {
  googleAuth,
  appleAuth,
} from '../controllers/oauthController';
import {
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/passwordController';
import { authenticate } from '../../middlewares/auth';
import { loginLimiter, signupLimiter, oauthLimiter } from '../../middlewares/rateLimiter';
import { body } from 'express-validator';
import {
  loginValidation,
  signupValidation,
  roleSelectionValidation,
  validateEmail,
  validatePassword,
} from '../validators/validators';

const router = Router();

// Public routes
router.post(
  '/signup',
  signupLimiter,
  signupValidation,
  signup
);

router.post(
  '/login',
  loginLimiter,
  loginValidation,
  login
);

// OAuth routes (Firebase handles OAuth flow, these endpoints sync user data)
router.post(
  '/google',
  oauthLimiter,
  googleAuth
);

router.post(
  '/apple',
  oauthLimiter,
  appleAuth
);

// Token refresh
router.post('/refresh-token', refreshToken);

// Password reset (public)
router.post(
  '/forgot-password',
  signupLimiter, // Use signup limiter (3 per hour)
  validateEmail('email'),
  forgotPassword
);

router.post(
  '/reset-password',
  validatePassword('password'),
  resetPassword
);

// Protected routes
router.post(
  '/select-role',
  authenticate,
  roleSelectionValidation,
  selectRole
);

router.get('/me', authenticate, getMe);

router.post('/logout', authenticate, logout);

router.post(
  '/change-password',
  authenticate,
  [
    validatePassword('newPassword'),
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
  ],
  changePassword
);

export default router;

