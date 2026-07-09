import ExpenseClaim from '../models/ExpenseClaim.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import SystemSetting from '../models/SystemSetting.js';

export const getSystemSettings = async () => {
  const settings = await SystemSetting.find();
  const settingsMap = {};
  settings.forEach(s => {
    settingsMap[s.key] = s.value;
  });
  return {
    travelCap: Number(settingsMap.travelCap || 15000),
    mealsCap: Number(settingsMap.mealsCap || 2000),
    mileageRate: Number(settingsMap.mileageRate || 10)
  };
};

export const runPolicyAudit = async (amount, categoryId, fileAttached, receiptHash) => {
  const category = await ExpenseCategory.findById(categoryId);
  if (!category) return { violated: false, message: '' };

  const violations = [];
  const settings = await getSystemSettings();

  // Determine cap limit (dynamic overrides from system settings if matches category)
  let maxLimit = category.maxLimit;
  if (category.code === 'TRAVEL') {
    maxLimit = settings.travelCap;
  } else if (category.code === 'FOOD' || category.code === 'MEALS') {
    maxLimit = settings.mealsCap;
  }

  // Check category limit
  if (amount > maxLimit) {
    violations.push(`${category.name} limit exceeded (₹${maxLimit} cap)`);
  }

  // Check if receipt required
  if (category.receiptRequired && !fileAttached) {
    violations.push('Receipt document is required for this expense category');
  }

  // Check duplicate hash
  if (receiptHash) {
    const existing = await ExpenseClaim.findOne({ receiptHash });
    if (existing) {
      violations.push(`Duplicate receipt detected (already uploaded in claim ${existing.id})`);
    }
  }

  return {
    violated: violations.length > 0,
    message: violations.join('; ')
  };
};

export const withdrawClaim = async (claimId, userId, ipAddress) => {
  const claim = await ExpenseClaim.findById(claimId);
  if (!claim) {
    throw new Error('Expense claim not found');
  }

  if (claim.employee.toString() !== userId.toString()) {
    throw new Error('Not authorized to withdraw this claim');
  }

  if (claim.status !== 'Submitted') {
    throw new Error('Only pending claims in Submitted status can be withdrawn');
  }

  // Revert status to Draft
  claim.status = 'Draft';
  claim.currentStep = 'Draft';
  await claim.save();

  // Create approval history entry
  await ApprovalHistory.create({
    claimId: claim._id,
    actionBy: userId,
    role: 'Employee',
    action: 'Withdraw',
    remarks: 'Claim withdrawn by employee. Reverted to Draft.'
  });

  // Create audit log
  await AuditLog.create({
    actor: userId,
    action: 'Claim Withdrawn',
    detail: `Employee withdrew claim ${claim.id}. Reverted back to Draft status.`,
    ipAddress
  });

  return claim;
};
