import express from 'express';
import { createClaim, getClaims, getClaimById, updateClaim, deleteClaim } from '../controllers/claimController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { uploadReceipt } from '../middleware/uploadMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { createClaimSchema } from '../validators/claimValidator.js';

const router = express.Router();

// Apply auth protect globally on claims
router.use(protect);

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: File a new claim or save it as a draft (Multipart Form)
 *     tags: [Expense Claims]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - categoryId
 *               - merchant
 *               - amount
 *               - date
 *             properties:
 *               title:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               merchant:
 *                 type: string
 *               amount:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               receipt:
 *                 type: string
 *                 format: binary
 *               isDraft:
 *                 type: boolean
 *               items:
 *                 type: string
 *                 description: JSON array string of items [{itemName, amount, description}]
 *     responses:
 *       201:
 *         description: Claim created successfully
 */
router.post('/', uploadReceipt, createClaim);

/**
 * @swagger
 * /api/claims:
 *   get:
 *     summary: Retrieve claims list with filters (Role Restricted Scoping)
 *     tags: [Expense Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: employee
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *       - name: department
 *         in: query
 *         schema:
 *           type: string
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of claims retrieved
 */
router.get('/', getClaims);

/**
 * @swagger
 * /api/claims/{id}:
 *   get:
 *     summary: Fetch detailed claim profile, timelines, and payment record
 *     tags: [Expense Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim detailed record retrieved
 *       404:
 *         description: Claim not found
 */
router.get('/:id', getClaimById);

/**
 * @swagger
 * /api/claims/{id}:
 *   put:
 *     summary: Edit draft or corrections claims
 *     tags: [Expense Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               merchant:
 *                 type: string
 *               amount:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *               receipt:
 *                 type: string
 *                 format: binary
 *               isDraft:
 *                 type: boolean
 *               items:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim updated successfully
 */
router.put('/:id', uploadReceipt, updateClaim);

/**
 * @swagger
 * /api/claims/{id}:
 *   delete:
 *     summary: Delete a draft claim
 *     tags: [Expense Claims]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Draft deleted
 *       400:
 *         description: Only draft claims can be deleted
 */
router.delete('/:id', authorizeRoles('Employee'), deleteClaim);

export default router;
