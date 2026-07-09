import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  refreshSession,
  forgotPassword,
  resetPasswordController,
  changePassword,
  logoutUser
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { 
  registerSchema, 
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validators/authValidator.js';

const router = express.Router();

// Public routes
router.post('/register', validateBody(registerSchema), registerUser);
router.post('/login', validateBody(loginSchema), loginUser);
router.post('/refresh', refreshSession);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.put('/reset-password/:token', validateBody(resetPasswordSchema), resetPasswordController);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validateBody(updateProfileSchema), updateUserProfile);
router.put('/change-password', protect, validateBody(changePasswordSchema), changePassword);
router.post('/logout', protect, logoutUser);

export default router;
