import express from 'express';
import { processPayment } from '../controllers/paymentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/payments/{claimId}:
 *   post:
 *     summary: Log a disbursement payment settlement transaction code
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: claimId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: string
 *               method:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment registered and settled successfully
 */
router.post('/:claimId', protect, authorizeRoles('Accounts'), processPayment);

export default router;
