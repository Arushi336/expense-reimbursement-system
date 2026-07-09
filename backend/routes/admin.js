import express from 'express';
import { 
  getAuditLogs, 
  getDepartments, 
  createDepartment, 
  updateDepartment,
  deleteDepartment,
  getCategories, 
  createCategory,
  updateCategory,
  deleteCategory,
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getSystemSettingsController,
  updateSystemSettingsController
} from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Global settings
router.get('/settings', getSystemSettingsController);
router.put('/settings', authorizeRoles('Admin'), updateSystemSettingsController);

// Audit logs
router.get('/audit-logs', authorizeRoles('Admin'), getAuditLogs);

// Departments CRUD
router.get('/departments', getDepartments);
router.post('/departments', authorizeRoles('Admin'), createDepartment);
router.put('/departments/:id', authorizeRoles('Admin'), updateDepartment);
router.delete('/departments/:id', authorizeRoles('Admin'), deleteDepartment);

// Expense categories CRUD
router.get('/categories', getCategories);
router.post('/categories', authorizeRoles('Admin'), createCategory);
router.put('/categories/:id', authorizeRoles('Admin'), updateCategory);
router.delete('/categories/:id', authorizeRoles('Admin'), deleteCategory);

// Users CRUD
router.get('/users', authorizeRoles('Admin'), getUsers);
router.post('/users', authorizeRoles('Admin'), createUser);
router.get('/users/:id', authorizeRoles('Admin'), getUserById);
router.put('/users/:id', authorizeRoles('Admin'), updateUser);
router.delete('/users/:id', authorizeRoles('Admin'), deleteUser);

export default router;
