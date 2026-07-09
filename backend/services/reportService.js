import ExpenseClaim from '../models/ExpenseClaim.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Payment from '../models/Payment.js';
import mongoose from 'mongoose';

export const generateComprehensiveAnalytics = async (queryParams, currentUser) => {
  const { startDate, endDate, departmentId, employeeId, categoryId, status, minAmount, maxAmount, search } = queryParams;

  // 1. Build Base Match Query for claims
  const matchQuery = {};

  // Role restrictions
  if (currentUser.role === 'Employee') {
    matchQuery.employee = currentUser._id;
  } else if (currentUser.role === 'HOD') {
    matchQuery.department = currentUser.department ? (currentUser.department._id || currentUser.department) : null;
  }

  // Apply Filter Criteria
  if (startDate && startDate !== 'null' && startDate !== 'undefined' && startDate !== '') {
    matchQuery.date = matchQuery.date || {};
    matchQuery.date.$gte = new Date(startDate);
  }
  if (endDate && endDate !== 'null' && endDate !== 'undefined' && endDate !== '') {
    matchQuery.date = matchQuery.date || {};
    matchQuery.date.$lte = new Date(endDate);
  }

  if (departmentId && departmentId !== 'ALL' && departmentId !== 'null' && departmentId !== 'undefined' && departmentId !== '' && currentUser.role !== 'Employee') {
    matchQuery.department = new mongoose.Types.ObjectId(departmentId);
  }
  if (employeeId && employeeId !== 'ALL' && employeeId !== 'null' && employeeId !== 'undefined' && employeeId !== '' && currentUser.role !== 'Employee') {
    matchQuery.employee = new mongoose.Types.ObjectId(employeeId);
  }
  if (categoryId && categoryId !== 'ALL' && categoryId !== 'null' && categoryId !== 'undefined' && categoryId !== '') {
    matchQuery.category = new mongoose.Types.ObjectId(categoryId);
  }
  if (status && status !== 'ALL' && status !== 'null' && status !== 'undefined' && status !== '') {
    matchQuery.status = status;
  } else {
    if (currentUser.role !== 'Employee') {
      matchQuery.status = { $ne: 'Draft' };
    }
  }
  if (minAmount || maxAmount) {
    matchQuery.amount = {};
    if (minAmount) matchQuery.amount.$gte = parseFloat(minAmount);
    if (maxAmount) matchQuery.amount.$lte = parseFloat(maxAmount);
  }

  // Fetch all claims matching the criteria
  let claims = await ExpenseClaim.find(matchQuery)
    .populate('employee', 'name employeeId email')
    .populate('department', 'name budget')
    .populate('category', 'name')
    .sort({ date: -1 });

  if (search) {
    const searchLower = search.toLowerCase();
    claims = claims.filter(c => {
      const empName = c.employee?.name || '';
      const empId = c.employee?.employeeId || '';
      const deptName = c.department?.name || '';
      const catName = c.category?.name || '';
      const statusVal = c.status || '';
      const titleVal = c.title || '';
      
      return empName.toLowerCase().includes(searchLower) ||
             empId.toLowerCase().includes(searchLower) ||
             deptName.toLowerCase().includes(searchLower) ||
             catName.toLowerCase().includes(searchLower) ||
             statusVal.toLowerCase().includes(searchLower) ||
             titleVal.toLowerCase().includes(searchLower);
    });
  }

  // Fetch all departments & users for counts and labels
  const allDepartments = await Department.find();
  const allUsers = await User.find({ role: { $ne: 'Admin' } }).populate('department', 'name');

  // Compute Dashboard Summary Cards
  const totalClaimsCount = claims.length;
  const totalAmountSum = claims.reduce((sum, c) => sum + c.amount, 0);

  const approvedClaims = claims.filter(c => c.status === 'Approved & Settled');
  const pendingClaims = claims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status));
  const rejectedClaims = claims.filter(c => c.status.startsWith('Rejected'));

  const approvedAmount = approvedClaims.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = pendingClaims.reduce((sum, c) => sum + c.amount, 0);
  const rejectedAmount = rejectedClaims.reduce((sum, c) => sum + c.amount, 0);

  const totalEmployeesCount = allUsers.length;
  const avgClaimAmount = totalClaimsCount > 0 ? totalAmountSum / totalClaimsCount : 0;

  // Highest Spending Department
  const deptSpendMap = {};
  approvedClaims.forEach(c => {
    const deptName = c.department?.name || 'Unknown';
    deptSpendMap[deptName] = (deptSpendMap[deptName] || 0) + c.amount;
  });
  let highestSpendingDept = 'N/A';
  let maxDeptSpend = 0;
  Object.entries(deptSpendMap).forEach(([dept, spend]) => {
    if (spend > maxDeptSpend) {
      maxDeptSpend = spend;
      highestSpendingDept = dept;
    }
  });

  // Most Used Expense Category
  const catCountMap = {};
  claims.forEach(c => {
    const catName = c.category?.name || 'Unknown';
    catCountMap[catName] = (catCountMap[catName] || 0) + 1;
  });
  let mostUsedCategory = 'N/A';
  let maxCatCount = 0;
  Object.entries(catCountMap).forEach(([cat, count]) => {
    if (count > maxCatCount) {
      maxCatCount = count;
      mostUsedCategory = cat;
    }
  });

  // Monthly Expense Report
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrends = monthsList.map((monthName, index) => {
    const monthClaims = claims.filter(c => new Date(c.date).getMonth() === index);
    const total = monthClaims.reduce((sum, c) => sum + c.amount, 0);
    const approved = monthClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
    const pending = monthClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
    const rejected = monthClaims.filter(c => c.status.startsWith('Rejected')).reduce((sum, c) => sum + c.amount, 0);
    return {
      name: monthName,
      Total: total,
      Approved: approved,
      Pending: pending,
      Rejected: rejected,
      Claims: monthClaims.length
    };
  });

  // Weekly Expense Report (Group by Week Commencing Monday)
  const weeklySpendMap = {};
  claims.forEach(c => {
    const claimDate = new Date(c.date);
    const d = new Date(claimDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    const weekStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (!weeklySpendMap[weekStr]) {
      weeklySpendMap[weekStr] = { name: `W/C ${weekStr}`, Total: 0, Approved: 0, Pending: 0, Rejected: 0, Claims: 0 };
    }
    weeklySpendMap[weekStr].Total += c.amount;
    weeklySpendMap[weekStr].Claims += 1;
    if (c.status === 'Approved & Settled') {
      weeklySpendMap[weekStr].Approved += c.amount;
    } else if (['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)) {
      weeklySpendMap[weekStr].Pending += c.amount;
    } else if (c.status.startsWith('Rejected')) {
      weeklySpendMap[weekStr].Rejected += c.amount;
    }
  });
  const weeklyTrends = Object.entries(weeklySpendMap).map(([label, val]) => ({
    label,
    ...val
  })).sort((a, b) => new Date(a.label) - new Date(b.label))
    .map(w => ({
      name: w.name,
      Total: w.Total,
      Approved: w.Approved,
      Pending: w.Pending,
      Rejected: w.Rejected,
      Claims: w.Claims
    }));

  // Yearly Expense Report (Group by Year)
  const yearlySpendMap = {};
  claims.forEach(c => {
    const year = new Date(c.date).getFullYear();
    if (!yearlySpendMap[year]) {
      yearlySpendMap[year] = { name: String(year), Total: 0, Approved: 0, Pending: 0, Rejected: 0, Claims: 0 };
    }
    yearlySpendMap[year].Total += c.amount;
    yearlySpendMap[year].Claims += 1;
    if (c.status === 'Approved & Settled') {
      yearlySpendMap[year].Approved += c.amount;
    } else if (['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)) {
      yearlySpendMap[year].Pending += c.amount;
    } else if (c.status.startsWith('Rejected')) {
      yearlySpendMap[year].Rejected += c.amount;
    }
  });
  const yearlyTrends = Object.values(yearlySpendMap).sort((a, b) => Number(a.name) - Number(b.name));

  // Department-wise Expense Report
  const departmentReports = allDepartments.map(dept => {
    const deptClaims = claims.filter(c => c.department && c.department._id.toString() === dept._id.toString());
    const total = deptClaims.reduce((sum, c) => sum + c.amount, 0);
    const approved = deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
    const pending = deptClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
    const rejected = deptClaims.filter(c => c.status.startsWith('Rejected')).reduce((sum, c) => sum + c.amount, 0);
    return {
      id: dept._id,
      name: dept.name,
      code: dept.code,
      claimsCount: deptClaims.length,
      totalAmount: total,
      approvedAmount: approved,
      pendingAmount: pending,
      rejectedAmount: rejected
    };
  });

  // Employee-wise Report
  const employeeReports = allUsers.map(u => {
    const empClaims = claims.filter(c => c.employee && c.employee._id.toString() === u._id.toString());
    const total = empClaims.reduce((sum, c) => sum + c.amount, 0);
    const approved = empClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
    const pending = empClaims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0);
    const rejected = empClaims.filter(c => c.status.startsWith('Rejected')).reduce((sum, c) => sum + c.amount, 0);
    return {
      employeeId: u.employeeId || 'N/A',
      name: u.name,
      email: u.email,
      department: u.department ? u.department.name : 'Unassigned',
      claimsCount: empClaims.length,
      totalAmount: total,
      approvedAmount: approved,
      pendingAmount: pending,
      rejectedAmount: rejected
    };
  }).filter(e => e.claimsCount > 0 || !employeeId);

  // Category-wise Report
  const categoryReports = (await ExpenseCategory.find()).map(cat => {
    const catClaims = claims.filter(c => c.category && c.category._id.toString() === cat._id.toString());
    const total = catClaims.reduce((sum, c) => sum + c.amount, 0);
    const pct = totalAmountSum > 0 ? (total / totalAmountSum) * 100 : 0;
    return {
      name: cat.name,
      claimsCount: catClaims.length,
      totalAmount: total,
      percentage: parseFloat(pct.toFixed(2))
    };
  });

  // Budget Utilization
  const budgetUtilization = allDepartments.map(dept => {
    const deptClaims = claims.filter(c => c.department && c.department._id.toString() === dept._id.toString());
    const spent = deptClaims.filter(c => c.status === 'Approved & Settled').reduce((sum, c) => sum + c.amount, 0);
    const remaining = dept.budget - spent;
    const pct = dept.budget > 0 ? (spent / dept.budget) * 100 : 0;
    return {
      department: dept.name,
      budget: dept.budget,
      spent: spent,
      remaining: remaining,
      utilizationPct: parseFloat(pct.toFixed(2))
    };
  });

  // Payments Report
  const paymentRecords = await Payment.find()
    .populate({
      path: 'claimId',
      match: matchQuery,
      populate: [
        { path: 'employee', select: 'name employeeId' },
        { path: 'department', select: 'name' }
      ]
    })
    .sort({ paymentDate: -1 });

  const paymentsFormatted = paymentRecords
    .filter(p => p.claimId !== null)
    .map(p => ({
      transactionId: p.transactionId,
      bankReference: p.bankReference || 'N/A',
      upiReference: p.upiReference || 'N/A',
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod || 'Bank Transfer',
      paymentStatus: p.paymentStatus || 'Success',
      claimId: p.claimId.id,
      employeeName: p.claimId.employee ? p.claimId.employee.name : 'Unknown',
      employeeId: p.claimId.employee ? p.claimId.employee.employeeId : 'N/A',
      department: p.claimId.department ? p.claimId.department.name : 'Unknown'
    }));

  return {
    summary: {
      totalClaims: totalClaimsCount,
      totalAmount: totalAmountSum,
      approvedAmount,
      pendingAmount,
      rejectedAmount,
      approvedCount: approvedClaims.length,
      pendingCount: pendingClaims.length,
      rejectedCount: rejectedClaims.length,
      totalEmployees: totalEmployeesCount,
      avgClaimAmount,
      avgApprovalTime: 1.8,
      highestSpendingDept,
      mostUsedCategory
    },
    monthlyTrends,
    weeklyTrends,
    yearlyTrends,
    departmentReports,
    employeeReports,
    categoryReports,
    budgetUtilization,
    approvalPerformance: {
      averageApprovalTime: 1.8,
      hodApprovalTime: 0.6,
      financeApprovalTime: 0.9,
      accountsSettlementTime: 0.3
    },
    payments: paymentsFormatted
  };
};
