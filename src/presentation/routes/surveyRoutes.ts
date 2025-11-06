import { Router } from 'express';
import {
  getSurveyQuestions,
  getSurveyStatus,
  getMySurveys,
  getSurveyAnswers,
  saveAnswer,
  submitSurvey,
} from '../controllers/surveyController';
import { authenticate } from '../../middlewares/auth';
import { body } from 'express-validator';

const router = Router();

// Public route - Get survey questions
router.get('/questions/:role', getSurveyQuestions);

// Protected routes
router.get('/status/:role', authenticate, getSurveyStatus);
router.get('/my-surveys', authenticate, getMySurveys);
router.get('/:role', authenticate, getSurveyAnswers);

// Save single answer
router.post(
  '/save-answer',
  authenticate,
  [
    body('role')
      .isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'])
      .withMessage('Invalid role'),
    body('questionId')
      .notEmpty()
      .withMessage('Question ID is required'),
    body('answer')
      .notEmpty()
      .withMessage('Answer is required'),
  ],
  saveAnswer
);

// Submit complete survey
router.post(
  '/submit',
  authenticate,
  [
    body('role')
      .isIn(['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur'])
      .withMessage('Invalid role'),
    body('answers')
      .isArray()
      .withMessage('Answers must be an array'),
    body('answers.*.questionId')
      .notEmpty()
      .withMessage('Question ID is required'),
    body('answers.*.answer')
      .notEmpty()
      .withMessage('Answer is required'),
  ],
  submitSurvey
);

export default router;

