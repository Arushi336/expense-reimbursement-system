import express from 'express';
import { 
  getDashboardStats, 
  getMonthlySpend, 
  getCategorySpend, 
  getDepartmentSpend,
  getApprovalTimeStats,
  getComprehensiveReportData
} from '../controllers/reportController.js';
import { 
  exportExcelReport,
  exportWordReport,
  exportPdfReport
} from '../controllers/reportsExportController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/comprehensive', authorizeRoles('Finance', 'Accounts'), getComprehensiveReportData);
router.get('/export/excel', authorizeRoles('Finance', 'Accounts'), exportExcelReport);
router.get('/export/word', authorizeRoles('Finance', 'Accounts'), exportWordReport);
router.get('/export/pdf', authorizeRoles('Finance', 'Accounts'), exportPdfReport);

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard KPIs matching current user role
 *     tags: [Reports & Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics payload
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     summary: Retrieve monthly expense trends aggregated for calendar year
 *     tags: [Reports & Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly spend totals
 */
router.get('/monthly', getMonthlySpend);

/**
 * @swagger
 * /api/reports/category:
 *   get:
 *     summary: Get percentage/aggregate distributions by category name
 *     tags: [Reports & Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category aggregate values
 */
router.get('/category', getCategorySpend);

/**
 * @swagger
 * /api/reports/department:
 *   get:
 *     summary: Compare department spend vs allotted budgets (Admin & Finance)
 *     tags: [Reports & Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Department spent list
 */
router.get('/department', getDepartmentSpend);

/**
 * @swagger
 * /api/reports/approval-time:
 *   get:
 *     summary: Retrieve monthly average approval durations for HOD and Finance review
 *     tags: [Reports & Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly approval speed averages
 */
router.get('/approval-time', getApprovalTimeStats);

export default router;
