import Department from '../models/Department.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

// @desc    Get system audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ timestamp: -1 });

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get departments
// @route   GET /api/admin/departments
// @access  Private
export const getDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find().populate('hod', 'name email');
    res.status(200).json({ success: true, count: depts.length, data: depts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/admin/departments
// @access  Private (Admin)
export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, hodId, budget } = req.body;

    const exists = await Department.findOne({ $or: [{ name }, { code }] });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Department name or code already exists' });
    }

    const dept = await Department.create({
      name,
      code,
      hod: hodId || null,
      budget: Number(budget || 50000)
    });

    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense categories
// @route   GET /api/admin/categories
// @access  Private
export const getCategories = async (req, res, next) => {
  try {
    const cats = await ExpenseCategory.find({ isActive: true });
    res.status(200).json({ success: true, count: cats.length, data: cats });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Private (Admin)
export const createCategory = async (req, res, next) => {
  try {
    const { name, code, maxLimit, receiptRequired } = req.body;

    const exists = await ExpenseCategory.findOne({ $or: [{ name }, { code }] });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category name or code already exists' });
    }

    const cat = await ExpenseCategory.create({
      name,
      code,
      maxLimit: Number(maxLimit || 1000),
      receiptRequired: receiptRequired !== undefined ? receiptRequired : true
    });

    res.status(201).json({ success: true, data: cat });
  } catch (error) {
    next(error);
  }
};
