import ExpenseClaim from '../models/ExpenseClaim.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import computeHash from '../utils/fileHasher.js';
import { runPolicyAudit, withdrawClaim } from '../services/claimService.js';
import { CLAIM_STATUS, WORKFLOW_STEP } from '../config/constants.js';

// @desc    Create / Submit claim
// @route   POST /api/claims
// @access  Private (Employee)
export const createClaim = async (req, res, next) => {
  try {
    const { title, categoryId, merchant, amount, date, description, items, isDraft } = req.body;
    const employee = req.user._id;
    const department = req.user.department ? (req.user.department._id || req.user.department) : (req.body.departmentId || null);

    let receiptUrl = '';
    let receiptPublicId = '';
    let receiptHash = '';

    // Handle receipt file upload
    if (req.file) {
      receiptUrl = req.file.secure_url || req.file.path || req.file.filename;
      receiptPublicId = req.file.filename || '';
      receiptHash = computeHash(req.file);
    }

    // Run backend business policy checks
    const audit = await runPolicyAudit(Number(amount), categoryId, !!req.file, receiptHash);

    // Generate unique EERS claim identifier code: EXP-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await ExpenseClaim.countDocuments();
    const claimCode = `EXP-${year}-${String(count + 1).padStart(3, '0')}`;

    const isSubmitted = !(isDraft === 'true' || isDraft === true);
    let status = isSubmitted ? CLAIM_STATUS.SUBMITTED : CLAIM_STATUS.DRAFT;
    let currentStep = isSubmitted ? WORKFLOW_STEP.HOD : WORKFLOW_STEP.DRAFT;

    // If claim is submitted by an HOD or if department is missing, skip HOD review and move straight to Pending Finance
    if (isSubmitted && (req.user.role === 'HOD' || !department)) {
      status = CLAIM_STATUS.PENDING_FINANCE;
      currentStep = WORKFLOW_STEP.FINANCE;
    }

    // Parse items if provided
    let claimItems = [];
    if (items) {
      try {
        claimItems = typeof items === 'string' ? JSON.parse(items) : items;
      } catch (err) {
        console.error('Error parsing items', err);
      }
    }

    // Fallback if single-item payload was sent without items array
    if ((!claimItems || claimItems.length === 0) && title && amount) {
      claimItems = [{
        title,
        categoryId: categoryId || category,
        merchant,
        amount: Number(amount),
        date: date || new Date(),
        description
      }];
    }

    if (!claimItems || claimItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one expense line item is required' });
    }

    // Process line items & compute server-side total amount
    let calculatedTotal = 0;
    let overallViolation = false;
    const violationMessages = [];

    const processedItems = await Promise.all(claimItems.map(async (item, idx) => {
      const itemAmount = Number(item.amount);
      if (isNaN(itemAmount) || itemAmount <= 0) {
        throw new Error(`Invalid amount for item "${item.title || item.itemName || 'Expense'}"`);
      }
      calculatedTotal += itemAmount;

      const itemCatId = item.categoryId || item.category || categoryId;

      // Extract item-specific receipt file if uploaded
      let itemReceiptUrl = item.receiptUrl || '';
      let itemReceiptPublicId = item.receiptPublicId || '';
      let itemReceiptHash = item.receiptHash || '';

      if (req.files && req.files.length > 0) {
        const itemFile = req.files.find(f => f.fieldname === `receipt_${idx}` || f.fieldname === `receipts[${idx}]`) || req.files[idx];
        if (itemFile) {
          itemReceiptUrl = itemFile.secure_url;
          itemReceiptPublicId = itemFile.filename;
          itemReceiptHash = itemFile.receiptHash || '';
        }
      }

      if (!itemReceiptUrl && receiptUrl) {
        itemReceiptUrl = receiptUrl;
        itemReceiptPublicId = receiptPublicId;
        itemReceiptHash = receiptHash;
      }

      const itemHasReceipt = !!itemReceiptUrl;
      const audit = await runPolicyAudit(itemAmount, itemCatId, itemHasReceipt, itemReceiptHash);
      
      if (audit.violated) {
        overallViolation = true;
        violationMessages.push(`${item.title || item.itemName || 'Item'}: ${audit.message}`);
      }

      return {
        title: item.title || item.itemName || 'Expense Item',
        category: itemCatId,
        merchant: item.merchant || merchant || '',
        amount: itemAmount,
        date: item.date ? new Date(item.date) : new Date(date || Date.now()),
        description: item.description || '',
        receiptUrl: itemReceiptUrl,
        receiptPublicId: itemReceiptPublicId,
        receiptHash: itemReceiptHash
      };
    }));

    const primaryItem = processedItems[0];
    if (!receiptUrl && primaryItem.receiptUrl) {
      receiptUrl = primaryItem.receiptUrl;
      receiptPublicId = primaryItem.receiptPublicId;
      receiptHash = primaryItem.receiptHash;
    }

    const claim = await ExpenseClaim.create({
      id: claimCode,
      title: title || primaryItem.title,
      employee,
      department,
      category: primaryItem.category,
      merchant: primaryItem.merchant,
      amount: calculatedTotal,
      date: primaryItem.date,
      description: description || primaryItem.description,
      receiptUrl,
      receiptPublicId,
      receiptHash,
      status,
      currentStep,
      policyViolation: overallViolation,
      policyMessage: violationMessages.join('; '),
      items: processedItems
    });

    // Create Approval History action log
    await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: employee,
      role: 'Employee',
      action: status === 'Draft' ? 'Submit' : 'Submit',
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
      const hodDept = req.user.department ? (req.user.department._id || req.user.department) : null;
      if (hodDept) {
        query.$or = [
          { department: hodDept },
          { department: null }
        ];
      }
      query.status = { $ne: 'Draft' };
    } else if (['Finance', 'Accounts', 'Admin'].includes(req.user.role)) {
      if (req.user.role !== 'Admin') {
        query.status = { $ne: 'Draft' };
      }
    }

    if (employee && req.user.role !== 'Employee') query.employee = employee;
    if (status && status !== 'ALL') query.status = status;
    if (category && category !== 'ALL') query.category = category;
    if (department && department !== 'ALL' && req.user.role !== 'HOD') query.department = department;
    
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const claims = await ExpenseClaim.find(query)
      .populate('employee', 'name email avatar')
      .populate('category', 'name code')
      .populate('department', 'name code')
      .populate('items.category', 'name code maxLimit receiptRequired')
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
      .populate('department', 'name code HOD')
      .populate('items.category', 'name code maxLimit receiptRequired');

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    if (req.user.role === 'Employee' && claim.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this claim' });
    }

    if (req.user.role === 'HOD') {
      const hodDeptId = req.user.department ? (req.user.department._id || req.user.department).toString() : '';
      const claimDeptId = claim.department ? (claim.department._id || claim.department).toString() : '';
      if (hodDeptId && claimDeptId && hodDeptId !== claimDeptId) {
        return res.status(403).json({ success: false, message: 'Not authorized to view other departments' });
      }
    }

    const history = await ApprovalHistory.find({ claimId: claim._id })
      .populate('actionBy', 'name email role')
      .sort({ timestamp: 1 });

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

    if (claim.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this claim' });
    }

    if (!['Draft', 'Returned for Correction'].includes(claim.status)) {
      return res.status(400).json({ success: false, message: 'Only Draft or Correction claims can be edited' });
    }

    const { title, categoryId, merchant, amount, date, description, items, isDraft } = req.body;

    let receiptUrl = claim.receiptUrl;
    let receiptPublicId = claim.receiptPublicId;
    let receiptHash = claim.receiptHash;

    if (req.file) {
      receiptUrl = req.file.secure_url || req.file.path || req.file.filename;
      receiptPublicId = req.file.filename || '';
      receiptHash = computeHash(req.file);
    }

    // Parse items
    let claimItems = [];
    if (items) {
      try {
        claimItems = typeof items === 'string' ? JSON.parse(items) : items;
      } catch (err) {
        console.error('Error parsing items', err);
      }
    }

    if ((!claimItems || claimItems.length === 0) && (title || amount)) {
      claimItems = [{
        title: title || claim.title,
        categoryId: categoryId || claim.category,
        merchant: merchant || claim.merchant,
        amount: amount ? Number(amount) : claim.amount,
        date: date || claim.date,
        description: description || claim.description
      }];
    }

    if (!claimItems || claimItems.length === 0) {
      claimItems = claim.items;
    }

    let calculatedTotal = 0;
    let overallViolation = false;
    const violationMessages = [];

    const processedItems = await Promise.all(claimItems.map(async (item, idx) => {
      const itemAmount = Number(item.amount);
      calculatedTotal += itemAmount;

      const itemCatId = item.categoryId || item.category || categoryId || claim.category;
      
      let itemReceiptUrl = item.receiptUrl || '';
      let itemReceiptPublicId = item.receiptPublicId || '';
      let itemReceiptHash = item.receiptHash || '';

      if (req.files && req.files.length > 0) {
        const itemFile = req.files.find(f => f.fieldname === `receipt_${idx}` || f.fieldname === `receipts[${idx}]`) || req.files[idx];
        if (itemFile) {
          itemReceiptUrl = itemFile.secure_url;
          itemReceiptPublicId = itemFile.filename;
          itemReceiptHash = itemFile.receiptHash || '';
        }
      }

      if (!itemReceiptUrl && receiptUrl) {
        itemReceiptUrl = receiptUrl;
        itemReceiptPublicId = receiptPublicId;
        itemReceiptHash = receiptHash;
      }

      const itemHasReceipt = !!itemReceiptUrl;
      const audit = await runPolicyAudit(itemAmount, itemCatId, itemHasReceipt, itemReceiptHash);

      if (audit.violated) {
        overallViolation = true;
        violationMessages.push(`${item.title || item.itemName || 'Item'}: ${audit.message}`);
      }

      return {
        title: item.title || item.itemName || 'Expense Item',
        category: itemCatId,
        merchant: item.merchant || merchant || claim.merchant || '',
        amount: itemAmount,
        date: item.date ? new Date(item.date) : new Date(date || claim.date),
        description: item.description || '',
        receiptUrl: itemReceiptUrl,
        receiptPublicId: itemReceiptPublicId,
        receiptHash: itemReceiptHash
      };
    }));

    const primaryItem = processedItems[0];
    if (!receiptUrl && primaryItem.receiptUrl) {
      receiptUrl = primaryItem.receiptUrl;
      receiptPublicId = primaryItem.receiptPublicId;
      receiptHash = primaryItem.receiptHash;
    }
    const status = isDraft === 'true' || isDraft === true ? 'Draft' : 'Submitted';
    const currentStep = status === 'Draft' ? 'Draft' : 'HOD';

    claim = await ExpenseClaim.findByIdAndUpdate(req.params.id, {
      title: title || primaryItem.title,
      category: primaryItem.category,
      merchant: primaryItem.merchant,
      amount: calculatedTotal,
      date: primaryItem.date,
      description: description !== undefined ? description : primaryItem.description,
      receiptUrl,
      receiptPublicId,
      receiptHash,
      status,
      currentStep,
      policyViolation: overallViolation,
      policyMessage: violationMessages.join('; '),
      items: processedItems
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
