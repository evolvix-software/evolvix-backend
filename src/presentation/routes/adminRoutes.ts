import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  banUser,
  unbanUser,
  suspendUser,
  unsuspendUser,
  activateUser,
  deactivateUser,
  getAdminStats,
} from '../controllers/adminController';
import {
  getAllVerifications,
  getVerificationById,
  approveVerification,
  rejectVerification,
} from '../controllers/verificationController';
import { adminLogin, verifyAdminToken } from '../controllers/adminAuthController';
import { authenticateAdmin } from '../../middlewares/adminAuth';
import { body, query } from 'express-validator';

const router = Router();

// Public admin login (no authentication required)
router.post('/login', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
], adminLogin);

// Verify admin token
router.post('/verify', verifyAdminToken);

// All other admin routes require admin authentication
router.use(authenticateAdmin);

// Statistics
router.get('/stats', getAdminStats);

// User management
router.get('/users', getUsers);
router.post('/users', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('fullName').isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('roles').optional().isArray().withMessage('Roles must be an array'),
  body('primaryRole').optional().isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur']).withMessage('Invalid role'),
], createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('fullName').optional().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('roles').optional().isArray().withMessage('Roles must be an array'),
  body('primaryRole').optional().isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur']).withMessage('Invalid role'),
], updateUser);
router.delete('/users/:id', deleteUser);

// User status management
router.post('/users/:id/ban', [
  body('reason').optional().isString().withMessage('Reason must be a string'),
], banUser);
router.post('/users/:id/unban', unbanUser);
router.post('/users/:id/suspend', [
  body('reason').optional().isString().withMessage('Reason must be a string'),
], suspendUser);
router.post('/users/:id/unsuspend', unsuspendUser);
router.post('/users/:id/activate', activateUser);
router.post('/users/:id/deactivate', deactivateUser);

// Verification management
router.get('/verifications', [
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'incomplete']).withMessage('Invalid status'),
  query('role').optional().isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur']).withMessage('Invalid role'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], getAllVerifications);
router.get('/verifications/:id', getVerificationById);
router.post('/verifications/:id/approve', [
  body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
], approveVerification);
router.post('/verifications/:id/reject', [
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required'),
  body('adminNotes').optional().isString().withMessage('Admin notes must be a string'),
], rejectVerification);

export default router;

