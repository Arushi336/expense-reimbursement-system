import express from 'express';
import { processApproval } from '../controllers/approvalController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { approvalActionSchema } from '../validators/claimValidator.js';

const router = express.Router();

/**
 * @swagger
 * /api/approvals/{claimId}:
 *   post:
 *     summary: Process HOD / Finance approval audit decision
 *     tags: [Approvals]
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
 *               - action
 *               - remarks
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [Approve, Reject, Return for Correction]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action processed successfully
 */
router.post('/:claimId', protect, authorizeRoles('HOD', 'Finance', 'Accounts'), validateBody(approvalActionSchema), processApproval);

export default router;
