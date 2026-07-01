import express from 'express';
import { getAuditLogs, getDepartments, createDepartment, getCategories, createCategory } from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Retrieve system administration activity logs
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit logs retrieved
 */
router.get('/audit-logs', authorizeRoles('Admin'), getAuditLogs);

/**
 * @swagger
 * /api/admin/departments:
 *   get:
 *     summary: Get list of all corporate departments
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Departments list
 *   post:
 *     summary: Register a new corporate department
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               hodId:
 *                 type: string
 *               budget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Department created
 */
router.get('/departments', getDepartments);
router.post('/departments', authorizeRoles('Admin'), createDepartment);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get list of active expense claim categories
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Categories list
 *   post:
 *     summary: Register a new expense claim category
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               maxLimit:
 *                 type: number
 *               receiptRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created
 */
router.get('/categories', getCategories);
router.post('/categories', authorizeRoles('Admin'), createCategory);

export default router;
