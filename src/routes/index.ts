import { Router } from 'express';
import authRoutes from '../presentation/routes/authRoutes';
import surveyRoutes from '../presentation/routes/surveyRoutes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/survey', surveyRoutes);

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
    },
  });
});

export default router;

