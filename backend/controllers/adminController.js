import Department from '../models/Department.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';

// ==========================================
// 1. Audit Logs
// ==========================================

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

// ==========================================
// 2. Department Management CRUD
// ==========================================

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

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Create Department',
      detail: `Created department ${name} (${code}) with budget ₹${budget}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/admin/departments/:id
// @access  Private (Admin)
export const updateDepartment = async (req, res, next) => {
  try {
    const { name, code, hodId, budget } = req.body;
    const dept = await Department.findById(req.params.id);

    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    dept.name = name || dept.name;
    dept.code = code || dept.code;
    dept.hod = hodId !== undefined ? hodId : dept.hod;
    dept.budget = budget !== undefined ? Number(budget) : dept.budget;

    await dept.save();

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Update Department',
      detail: `Updated department ${dept.name} (${dept.code})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
// @access  Private (Admin)
export const deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    await Department.findByIdAndDelete(req.params.id);

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Delete Department',
      detail: `Deleted department ${dept.name} (${dept.code})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. Expense Category Management CRUD
// ==========================================

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

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Create Category',
      detail: `Created expense category ${name} (${code})`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: cat });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private (Admin)
export const updateCategory = async (req, res, next) => {
  try {
    const { name, code, maxLimit, receiptRequired, isActive } = req.body;
    const cat = await ExpenseCategory.findById(req.params.id);

    if (!cat) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    cat.name = name || cat.name;
    cat.code = code || cat.code;
    cat.maxLimit = maxLimit !== undefined ? Number(maxLimit) : cat.maxLimit;
    cat.receiptRequired = receiptRequired !== undefined ? receiptRequired : cat.receiptRequired;
    cat.isActive = isActive !== undefined ? isActive : cat.isActive;

    await cat.save();

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Update Category',
      detail: `Updated category ${cat.name} (${cat.code})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: cat });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Admin)
export const deleteCategory = async (req, res, next) => {
  try {
    const cat = await ExpenseCategory.findById(req.params.id);
    if (!cat) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await ExpenseCategory.findByIdAndDelete(req.params.id);

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Delete Category',
      detail: `Deleted category ${cat.name} (${cat.code})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. User Management CRUD
// ==========================================

// @desc    Get all users (paginated, filterable)
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req, res, next) => {
  try {
    const { role, department, search, page = 1, limit = 10 } = req.query;
    const query = {};

    if (role && role !== 'ALL') query.role = role;
    if (department && department !== 'ALL') query.department = department;

    let users = await User.find(query).populate('department', 'name code');

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(searchLower) || 
        u.email.toLowerCase().includes(searchLower) || 
        (u.employeeId && u.employeeId.toLowerCase().includes(searchLower))
      );
    }

    const count = users.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + Number(limit));

    res.status(200).json({
      success: true,
      count,
      data: paginatedUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create User account
// @route   POST /api/admin/users
// @access  Private (Admin)
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, employeeId, phoneNumber, allottedBudget } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Employee',
      department: departmentId || null,
      employeeId,
      phoneNumber,
      allottedBudget: allottedBudget || 10000
    });

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Create User',
      detail: `Created user account ${name} (${email}) with role: ${role}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('department');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user account
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, departmentId, employeeId, phoneNumber, allottedBudget, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.department = departmentId !== undefined ? departmentId : user.department;
    user.employeeId = employeeId !== undefined ? employeeId : user.employeeId;
    user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
    user.allottedBudget = allottedBudget !== undefined ? Number(allottedBudget) : user.allottedBudget;

    if (password && password.trim() !== '') {
      user.password = password;
    }

    await user.save();

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Update User',
      detail: `Updated user account ${user.name} (${user.email})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Delete User',
      detail: `Deleted user account ${user.name} (${user.email})`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. System Settings CRUD
// ==========================================

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private
export const getSystemSettingsController = async (req, res, next) => {
  try {
    const settings = await SystemSetting.find();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.status(200).json({
      success: true,
      data: {
        travelCap: Number(settingsMap.travelCap || 15000),
        mealsCap: Number(settingsMap.mealsCap || 2000),
        mileageRate: Number(settingsMap.mileageRate || 10)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/Update system settings
// @route   PUT /api/admin/settings
// @access  Private (Admin)
export const updateSystemSettingsController = async (req, res, next) => {
  try {
    const { travelCap, mealsCap, mileageRate } = req.body;

    const data = [
      { key: 'travelCap', value: Number(travelCap || 15000) },
      { key: 'mealsCap', value: Number(mealsCap || 2000) },
      { key: 'mileageRate', value: Number(mileageRate || 10) }
    ];

    for (const item of data) {
      await SystemSetting.findOneAndUpdate(
        { key: item.key },
        { value: item.value },
        { upsert: true, new: true }
      );
    }

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'Update System Settings',
      detail: `Updated global parameters: travelCap=${travelCap}, mealsCap=${mealsCap}, mileageRate=${mileageRate}`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Global limits updated successfully',
      data: { travelCap, mealsCap, mileageRate }
    });
  } catch (error) {
    next(error);
  }
};
