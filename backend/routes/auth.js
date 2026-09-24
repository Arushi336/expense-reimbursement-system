import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  refreshSession,
  forgotPassword,
  verifyResetOtpController,
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
  verifyResetOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validators/authValidator.js';

const router = express.Router();

// Public routes
router.post('/register', validateBody(registerSchema), registerUser);
router.post('/login', validateBody(loginSchema), loginUser);
router.post('/refresh', refreshSession);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a 6-digit password reset OTP sent to registered corporate email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: udaykale2024.it@mmcoe.edu.in
 *     responses:
 *       200:
 *         description: Generic success response indicating OTP email dispatch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If an account exists for this corporate email, a 6-digit password reset OTP has been sent.
 *       400:
 *         description: Validation error
 *       500:
 *         description: Email transmission error
 */
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     summary: Verify 6-digit password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: udaykale2024.it@mmcoe.edu.in
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP / attempt limit reached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid OTP. You have 4 attempts remaining.
 */
router.post('/verify-reset-otp', validateBody(verifyResetOtpSchema), verifyResetOtpController);

/**
 * @swagger
 * /api/auth/reset-password:
 *   put:
 *     summary: Set a new password after successful OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: udaykale2024.it@mmcoe.edu.in
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: NewSecretPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset successful
 *       400:
 *         description: Verification not completed, expired, or invalid password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Password reset request has not been verified. Please verify your OTP first.
 */
router.put('/reset-password', validateBody(resetPasswordSchema), resetPasswordController);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validateBody(updateProfileSchema), updateUserProfile);
router.put('/change-password', protect, validateBody(changePasswordSchema), changePassword);
router.post('/logout', protect, logoutUser);

export default router;
