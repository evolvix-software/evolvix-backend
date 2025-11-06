import { Router } from 'express';
import authRoutes from './authRoutes';
import surveyRoutes from './surveyRoutes';
import adminRoutes from './adminRoutes';
import verificationRoutes from './verificationRoutes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/survey', surveyRoutes);
router.use('/admin', adminRoutes);
router.use('/verification', verificationRoutes);

// API root
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Evolvix Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      signup: '/api/auth/signup',
      login: '/api/auth/login',
      googleAuth: '/api/auth/google',
      survey: '/api/survey',
      surveyQuestions: '/api/survey/questions/:role',
      admin: '/api/admin',
    },
  });
});

export default router;

