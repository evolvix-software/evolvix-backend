import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  submitVerification,
  getVerificationStatus,
  getAllVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
  verifyPhoneNumber,
  sendPhoneOTP,
} from '../controllers/verificationController';
import { authenticate } from '../../middlewares/auth';
import { authenticateAdmin } from '../../middlewares/adminAuth';

const router = Router();

// User routes (require authentication)
router.post(
  '/submit',
  authenticate,
  [
    body('role').isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur']).withMessage('Invalid role'),
    body('verificationLevel').optional().isInt({ min: 0, max: 3 }).withMessage('Verification level must be 0, 1, 2, or 3'),
  ],
  submitVerification
);

router.get(
  '/status',
  authenticate,
  [
    query('role').optional().isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur']).withMessage('Invalid role'),
  ],
  getVerificationStatus
);

router.post(
  '/phone/send-otp',
  authenticate,
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('phoneNumber').isMobilePhone().withMessage('Invalid phone number format'),
  ],
  sendPhoneOTP
);

router.post(
  '/phone/verify',
  authenticate,
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits'),
  ],
  verifyPhoneNumber
);

// Admin routes (require admin authentication)
router.get(
  '/',
  authenticateAdmin,
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'incomplete']).withMessage('Invalid status'),
    query('role').optional().isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur']).withMessage('Invalid role'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  getAllVerifications
);

router.get('/:id', authenticateAdmin, getVerificationById);

router.post(
  '/:id/approve',
  authenticateAdmin,
  [
    body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
  ],
  approveVerification
);

router.post(
  '/:id/reject',
  authenticateAdmin,
  [
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
    body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
  ],
  rejectVerification
);

export default router;

