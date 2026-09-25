import User from '../models/User.js';
import Department from '../models/Department.js';
import ExpenseCategory from '../models/ExpenseCategory.js';

const departments = [
  { name: 'Marketing', code: 'MKT', budget: 150000 },
  { name: 'Finance & Audit', code: 'FIN', budget: 120000 },
  { name: 'Accounts Payable', code: 'ACC', budget: 90000 },
  { name: 'IT Operations', code: 'IT', budget: 100000 }
];

const categories = [
  { name: 'Travel', code: 'TRAVEL', maxLimit: 15000, receiptRequired: true },
  { name: 'Food', code: 'FOOD', maxLimit: 2000, receiptRequired: true },
  { name: 'Accommodation', code: 'ACCOMMODATION', maxLimit: 8000, receiptRequired: true },
  { name: 'Fuel', code: 'FUEL', maxLimit: 5000, receiptRequired: false },
  { name: 'Medical', code: 'MEDICAL', maxLimit: 10000, receiptRequired: true },
  { name: 'Office Supplies', code: 'SUPPLIES', maxLimit: 4000, receiptRequired: true },
  { name: 'Training', code: 'TRAINING', maxLimit: 20000, receiptRequired: true },
  { name: 'Others', code: 'OTHER', maxLimit: 3000, receiptRequired: true }
];

// ── DEVELOPMENT-ONLY demo stakeholders ──────────────────────────────────
// These users are NEVER created in production.
// Production admin accounts must be created through a secure process.
const devStakeholders = [
  {
    name: 'Arjun Sharma',
    email: 'arjun.sharma@company.com',
    password: 'DevPass@123!',
    role: 'Employee',
    departmentCode: 'MKT',
    employeeId: 'EMP-001',
    phoneNumber: '+919876543210',
    allottedBudget: 25000
  },
  {
    name: 'Rajesh Deshmukh',
    email: 'rajesh.deshmukh@company.com',
    password: 'DevPass@123!',
    role: 'HOD',
    departmentCode: 'MKT',
    employeeId: 'EMP-002',
    phoneNumber: '+919876543211',
    allottedBudget: 40000
  },
  {
    name: 'Vivek Kulkarni',
    email: 'vivek.kulkarni@company.com',
    password: 'DevPass@123!',
    role: 'Finance',
    departmentCode: 'FIN',
    employeeId: 'EMP-003',
    phoneNumber: '+919876543212'
  },
  {
    name: 'Suresh Iyer',
    email: 'suresh.iyer@company.com',
    password: 'DevPass@123!',
    role: 'Accounts',
    departmentCode: 'ACC',
    employeeId: 'EMP-004',
    phoneNumber: '+919876543213'
  },
  {
    name: 'Amit Patil',
    email: 'amit.patil@company.com',
    password: 'DevPass@123!',
    role: 'Admin',
    departmentCode: 'IT',
    employeeId: 'EMP-005',
    phoneNumber: '+919876543214'
  },
  {
    name: 'Uday Kale',
    email: 'udaykale2024.it@mmcoe.edu.in',
    password: 'DevPass@123!',
    role: 'Employee',
    departmentCode: 'IT',
    employeeId: 'EMP-006',
    phoneNumber: '+919876543215',
    allottedBudget: 25000
  }
];

const ensureDepartment = async (departmentData) => {
  const existingDepartment = await Department.findOne({ code: departmentData.code });
  if (existingDepartment) {
    return existingDepartment;
  }

  return Department.create(departmentData);
};

const ensureCategory = async (categoryData) => {
  const existingCategory = await ExpenseCategory.findOne({ code: categoryData.code });
  if (existingCategory) {
    return existingCategory;
  }

  return ExpenseCategory.create(categoryData);
};

const ensureStakeholder = async (stakeholderData, departmentsByCode) => {
  const existingUser = await User.findOne({ email: stakeholderData.email });
  if (existingUser) {
    return existingUser;
  }

  return User.create({
    name: stakeholderData.name,
    email: stakeholderData.email,
    password: stakeholderData.password,
    role: stakeholderData.role,
    department: departmentsByCode.get(stakeholderData.departmentCode)?._id,
    employeeId: stakeholderData.employeeId,
    phoneNumber: stakeholderData.phoneNumber,
    allottedBudget: stakeholderData.allottedBudget || 10000
  });
};

export const ensureBootstrapData = async () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Departments and categories are always bootstrapped (reference data)
  const departmentsByCode = new Map();
  for (const departmentData of departments) {
    const department = await ensureDepartment(departmentData);
    departmentsByCode.set(department.code, department);
  }

  for (const categoryData of categories) {
    await ensureCategory(categoryData);
  }

  // SECURITY: NEVER create demo users in production
  if (isProd) {
    console.log('Production mode: Skipping demo user creation');
    return { created: false };
  }

  // Development only: create demo stakeholders
  let createdAny = false;
  for (const stakeholderData of devStakeholders) {
    const existingUser = await User.findOne({ email: stakeholderData.email });
    if (!existingUser) {
      await ensureStakeholder(stakeholderData, departmentsByCode);
      createdAny = true;
    }
  }

  if (createdAny) {
    console.log('Development seed data: Demo users created');
  }

  return { created: createdAny };
};
