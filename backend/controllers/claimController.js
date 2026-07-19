import ExpenseClaim from '../models/ExpenseClaim.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import computeHash from '../utils/fileHasher.js';
import { runPolicyAudit, withdrawClaim } from '../services/claimService.js';

// @desc    Create / Submit claim
// @route   POST /api/claims
// @access  Private (Employee)
export const createClaim = async (req, res, next) => {
  try {
    const { title, categoryId, merchant, amount, date, description, items, isDraft } = req.body;
    const employee = req.user._id;
    const department = req.user.department ? req.user.department._id : null;

    let receiptUrl = '';
    let receiptPublicId = '';
    let receiptHash = '';

    // Handle receipt file upload
    if (req.file) {
      receiptUrl = req.file.filename; // Multer filename or Cloudinary secure URL
      receiptPublicId = req.file.filename || ''; // Cloudinary public ID
      receiptHash = computeHash(req.file);
    }

    // Run backend business policy checks
    const audit = await runPolicyAudit(Number(amount), categoryId, !!req.file, receiptHash);

    // Generate unique EERS claim identifier code: EXP-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await ExpenseClaim.countDocuments();
    const claimCode = `EXP-${year}-${String(count + 1).padStart(3, '0')}`;

    const status = isDraft === 'true' || isDraft === true ? 'Draft' : 'Submitted';
    const currentStep = status === 'Draft' ? 'Draft' : 'HOD';

    // Parse items if provided
    let claimItems = [];
    if (items) {
      try {
        claimItems = typeof items === 'string' ? JSON.parse(items) : items;
      } catch (err) {
        console.error('Error parsing items', err);
      }
    }

    const claim = await ExpenseClaim.create({
      id: claimCode,
      title,
      employee,
      department,
      category: categoryId,
      merchant,
      amount: Number(amount),
      date: new Date(date),
      description,
      receiptUrl,
      receiptPublicId,
      receiptHash,
      status,
      currentStep,
      policyViolation: audit.violated,
      policyMessage: audit.message,
      items: claimItems
    });

    // Create Approval History action log
    await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: employee,
      role: 'Employee',
      action: status === 'Draft' ? 'Submit' : 'Submit', // Record action as Submit or Draft
      remarks: status === 'Draft' ? 'Draft saved.' : 'Claim submitted for approval.'
    });

    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
};

// @desc    Get claims with searching and filtering
// @route   GET /api/claims
// @access  Private
export const getClaims = async (req, res, next) => {
  try {
    const { employee, status, category, department, from, to } = req.query;
    const query = {};

    // Role-based scoping
    if (req.user.role === 'Employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'HOD') {
      // HOD only views department specific claims
      query.department = req.user.department ? req.user.department._id : null;
      // Filter out draft claims
      query.status = { $ne: 'Draft' };
    } else if (['Finance', 'Accounts', 'Admin'].includes(req.user.role)) {
      // Admins/Auditors view all non-drafts
      if (req.user.role !== 'Admin') {
        query.status = { $ne: 'Draft' };
      }
    }

    // Apply URL Query filters
    if (employee && req.user.role !== 'Employee') query.employee = employee;
    if (status && status !== 'ALL') query.status = status;
    if (category && category !== 'ALL') query.category = category;
    if (department && department !== 'ALL' && req.user.role !== 'HOD') query.department = department;
    
    // Date Range
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const claims = await ExpenseClaim.find(query)
      .populate('employee', 'name email avatar')
      .populate('category', 'name code')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    next(error);
  }
};

// @desc    Get claim by ID (includes Timeline History & Payment records)
// @route   GET /api/claims/:id
// @access  Private
export const getClaimById = async (req, res, next) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id)
      .populate('employee', 'name email avatar')
      .populate('category', 'name code maxLimit')
      .populate('department', 'name code HOD');

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    // Check permissions
    if (req.user.role === 'Employee' && claim.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this claim' });
    }

    if (req.user.role === 'HOD' && claim.department._id.toString() !== req.user.department._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view other departments' });
    }

    // Retrieve history timeline logs
    const history = await ApprovalHistory.find({ claimId: claim._id })
      .populate('actionBy', 'name email role')
      .sort({ timestamp: 1 });

    // Retrieve Payment info if settled
    const payment = await Payment.findOne({ claimId: claim._id })
      .populate('processedBy', 'name email');

    res.status(200).json({
      success: true,
      data: {
        ...claim.toObject(),
        history,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update claim / resubmit
// @route   PUT /api/claims/:id
// @access  Private (Employee)
export const updateClaim = async (req, res, next) => {
  try {
    let claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    // Check ownership
    if (claim.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this claim' });
    }

    // Only allow editing in Draft or Returned state
    if (!['Draft', 'Returned for Correction'].includes(claim.status)) {
      return res.status(400).json({ success: false, message: 'Only Draft or Correction claims can be edited' });
    }

    const { title, categoryId, merchant, amount, date, description, items, isDraft } = req.body;

    let receiptUrl = claim.receiptUrl;
    let receiptPublicId = claim.receiptPublicId;
    let receiptHash = claim.receiptHash;

    if (req.file) {
      receiptUrl = req.file.filename;
      receiptPublicId = req.file.filename || '';
      receiptHash = computeHash(req.file);
    }

    const audit = await runPolicyAudit(Number(amount || claim.amount), categoryId || claim.category, !!req.file || !!receiptUrl, receiptHash);

    const status = isDraft === 'true' || isDraft === true ? 'Draft' : 'Submitted';
    const currentStep = status === 'Draft' ? 'Draft' : 'HOD';

    // Parse items
    let claimItems = claim.items;
    if (items) {
      try {
        claimItems = typeof items === 'string' ? JSON.parse(items) : items;
      } catch (err) {
        console.error('Error parsing items', err);
      }
    }

    claim = await ExpenseClaim.findByIdAndUpdate(req.params.id, {
      title: title || claim.title,
      category: categoryId || claim.category,
      merchant: merchant || claim.merchant,
      amount: amount ? Number(amount) : claim.amount,
      date: date ? new Date(date) : claim.date,
      description: description !== undefined ? description : claim.description,
      receiptUrl,
      receiptPublicId,
      receiptHash,
      status,
      currentStep,
      policyViolation: audit.violated,
      policyMessage: audit.message,
      items: claimItems
    }, { new: true });

    // History Log
    await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: req.user._id,
      role: 'Employee',
      action: 'Submit',
      remarks: status === 'Draft' ? 'Draft updated.' : 'Claim resubmitted for approval.'
    });

    res.status(200).json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete claim
// @route   DELETE /api/claims/:id
// @access  Private (Employee)
export const deleteClaim = async (req, res, next) => {
  try {
    const claim = await ExpenseClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    if (claim.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this claim' });
    }

    if (claim.status !== 'Draft') {
      return res.status(400).json({ success: false, message: 'Only Draft claims can be deleted' });
    }

    await ExpenseClaim.findByIdAndDelete(req.params.id);
    await ApprovalHistory.deleteMany({ claimId: claim._id });

    res.status(200).json({ success: true, message: 'Draft deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw claim
// @route   POST /api/claims/:id/withdraw
// @access  Private (Employee)
export const withdrawClaimController = async (req, res, next) => {
  try {
    const claim = await withdrawClaim(req.params.id, req.user._id, req.ip);
    res.status(200).json({ success: true, message: 'Claim successfully withdrawn.', data: claim });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
