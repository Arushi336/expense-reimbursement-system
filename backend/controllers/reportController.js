import ExpenseClaim from '../models/ExpenseClaim.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import mongoose from 'mongoose';
import { calculateApprovalMetrics, generateComprehensiveAnalytics } from '../services/reportService.js';

// @desc    Get dashboard card stats based on user role
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user._id;
    const deptId = req.user.department ? req.user.department._id : null;

    let stats = {};

    if (role === 'Employee') {
      const claims = await ExpenseClaim.find({ employee: userId });
      const pending = claims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status));
      const approved = claims.filter(c => c.status === 'Approved & Settled');
      const rejected = claims.filter(c => c.status.startsWith('Rejected'));
      const returned = claims.filter(c => c.status === 'Returned for Correction');

      const totalReimbursed = approved.reduce((sum, c) => sum + c.amount, 0);
      const pendingAmount = pending.reduce((sum, c) => sum + c.amount, 0);

      stats = {
        totalClaims: claims.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        returned: returned.length,
        totalReimbursed,
        pendingAmount
      };
    } 
    else if (role === 'HOD') {
      const deptClaims = await ExpenseClaim.find({ department: deptId, status: { $ne: 'Draft' } });
      const pendingReviews = deptClaims.filter(c => c.status === 'Submitted');
      const returnedClaims = deptClaims.filter(c => c.status === 'Returned for Correction');

      // Approvals today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const approvalsToday = await ApprovalHistory.countDocuments({
        actionBy: userId,
        action: 'Approve',
        timestamp: { $gte: startOfToday }
      });

      const totalApprovedAmount = deptClaims
        .filter(c => ['Pending Finance', 'Pending Settlement', 'Approved & Settled'].includes(c.status))
        .reduce((sum, c) => sum + c.amount, 0);

      stats = {
        pendingReviews: pendingReviews.length,
        returnedClaims: returnedClaims.length,
        approvalsToday,
        totalApprovedAmount
      };
    } 
    else if (role === 'Finance') {
      const claims = await ExpenseClaim.find({ status: { $ne: 'Draft' } });
      const pendingVerification = claims.filter(c => c.status === 'Pending Finance');
      const approved = claims.filter(c => ['Pending Settlement', 'Approved & Settled'].includes(c.status));
      const rejected = claims.filter(c => c.status === 'Rejected by Finance');

      stats = {
        pendingVerification: pendingVerification.length,
        approved: approved.length,
        rejected: rejected.length
      };
    } 
    else if (role === 'Accounts') {
      const claims = await ExpenseClaim.find({ status: { $ne: 'Draft' } });
      const pendingPayments = claims.filter(c => c.status === 'Pending Settlement');
      const completedPayments = claims.filter(c => c.status === 'Approved & Settled');

      const pendingAmount = pendingPayments.reduce((sum, c) => sum + c.amount, 0);
      const completedAmount = completedPayments.reduce((sum, c) => sum + c.amount, 0);

      stats = {
        pendingPayments: pendingPayments.length,
        completedPayments: completedPayments.length,
        pendingAmount,
        completedAmount
      };
    } 
    else if (role === 'Admin') {
      const totalEmployees = await User.countDocuments({ role: { $ne: 'Admin' } });
      const claims = await ExpenseClaim.find();
      const pending = claims.filter(c => ['Submitted', 'Pending Finance', 'Pending Settlement'].includes(c.status));
      const approved = claims.filter(c => c.status === 'Approved & Settled');
      const rejected = claims.filter(c => c.status.startsWith('Rejected'));

      const totalReimbursementAmount = approved.reduce((sum, c) => sum + c.amount, 0);

      stats = {
        totalEmployees,
        totalClaims: claims.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        totalReimbursementAmount
      };
    }

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly spend metrics for charts
// @route   GET /api/reports/monthly
// @access  Private
export const getMonthlySpend = async (req, res, next) => {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Aggregate payments or claims by month for current calendar year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const matchQuery = {
      status: 'Approved & Settled',
      date: { $gte: startOfYear }
    };

    if (req.user.role === 'Employee') {
      matchQuery.employee = req.user._id;
    } else if (req.user.role === 'HOD') {
      matchQuery.department = req.user.department ? (req.user.department._id || req.user.department) : null;
    }

    const aggregates = await ExpenseClaim.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $month: "$date" },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Format for Recharts
    const trendData = months.map((month, index) => {
      const match = aggregates.find(a => a._id === index + 1);
      return {
        name: month,
        Total: match ? match.total : 0
      };
    });

    res.status(200).json({ success: true, data: trendData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category-wise spend metrics
// @route   GET /api/reports/category
// @access  Private
export const getCategorySpend = async (req, res, next) => {
  try {
    const matchQuery = { status: 'Approved & Settled' };

    if (req.user.role === 'Employee') {
      matchQuery.employee = req.user._id;
    } else if (req.user.role === 'HOD') {
      matchQuery.department = req.user.department ? (req.user.department._id || req.user.department) : null;
    }

    const aggregates = await ExpenseClaim.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$category",
          value: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: "expensecategories",
          localField: "_id",
          foreignField: "_id",
          as: "catInfo"
        }
      },
      { $unwind: "$catInfo" },
      {
        $project: {
          name: "$catInfo.name",
          value: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: aggregates });
  } catch (error) {
    next(error);
  }
};

// @desc    Get department-wise spend comparison
// @route   GET /api/reports/department
// @access  Private
export const getDepartmentSpend = async (req, res, next) => {
  try {
    // Only available to Admin / Finance / HOD
    const aggregates = await ExpenseClaim.aggregate([
      { $match: { status: 'Approved & Settled' } },
      {
        $group: {
          _id: "$department",
          Spent: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "deptInfo"
        }
      },
      { $unwind: "$deptInfo" },
      {
        $project: {
          name: "$deptInfo.name",
          Spent: 1,
          Budget: "$deptInfo.budget"
        }
      }
    ]);

    res.status(200).json({ success: true, data: aggregates });
  } catch (error) {
    next(error);
  }
};

// @desc    Get average approval times by month
// @route   GET /api/reports/approval-time
// @access  Private
export const getApprovalTimeStats = async (req, res, next) => {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const { startDate, endDate, departmentId, employeeId, categoryId, status } = req.query;
    const matchQuery = {};

    if (req.user.role === 'Employee') {
      matchQuery.employee = req.user._id;
    } else if (req.user.role === 'HOD') {
      matchQuery.department = req.user.department ? (req.user.department._id || req.user.department) : null;
      matchQuery.status = { $ne: 'Draft' };
    } else if (req.user.role !== 'Admin') {
      matchQuery.status = { $ne: 'Draft' };
    }

    if (employeeId && employeeId !== 'ALL' && req.user.role !== 'Employee') {
      matchQuery.employee = employeeId;
    }
    if (departmentId && departmentId !== 'ALL' && req.user.role !== 'HOD') {
      matchQuery.department = departmentId;
    }
    if (categoryId && categoryId !== 'ALL') {
      matchQuery.category = categoryId;
    }
    if (status && status !== 'ALL') {
      matchQuery.status = status;
    }
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    const claims = await ExpenseClaim.find(matchQuery);
    const { monthlyApprovalTrends } = await calculateApprovalMetrics(claims);

    res.status(200).json({ success: true, data: monthlyApprovalTrends });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive analytics report data
// @route   GET /api/reports/comprehensive
// @access  Private
export const getComprehensiveReportData = async (req, res, next) => {
  try {
    const data = await generateComprehensiveAnalytics(req.query, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
