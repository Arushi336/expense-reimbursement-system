import ExpenseClaim from '../models/ExpenseClaim.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { CLAIM_STATUS, WORKFLOW_STEP } from '../config/constants.js';

// @desc    Process HOD / Finance / Accounts claim approval action with atomic concurrency locking
// @route   POST /api/approvals/:claimId
// @access  Private (HOD, Finance, Accounts, Admin)
export const processApproval = async (req, res, next) => {
  try {
    const { action, remarks } = req.body;
    const { claimId } = req.params;
    const userRole = req.user.role;

    const claim = await ExpenseClaim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    // Verify correct workflow state matching active role
    if (userRole === 'HOD') {
      if (claim.status !== CLAIM_STATUS.SUBMITTED) {
        return res.status(400).json({ success: false, message: 'Claim is not in HOD review state' });
      }
      
      // HOD can only audit their own department employees
      const hodDeptId = req.user.department ? (req.user.department._id || req.user.department).toString() : '';
      const claimDeptId = claim.department ? (claim.department._id || claim.department).toString() : '';
      if (hodDeptId && claimDeptId && hodDeptId !== claimDeptId) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve other department claims' });
      }
    } else if (userRole === 'Finance') {
      if (claim.status !== CLAIM_STATUS.PENDING_FINANCE && claim.status !== CLAIM_STATUS.SUBMITTED) {
        return res.status(400).json({ success: false, message: 'Claim is not in Finance verification state' });
      }
    } else if (userRole === 'Accounts') {
      if (claim.status !== CLAIM_STATUS.PENDING_SETTLEMENT) {
        return res.status(400).json({ success: false, message: 'Claim is not in Accounts settlement state' });
      }
    } else if (userRole === 'Admin') {
      if (![CLAIM_STATUS.SUBMITTED, CLAIM_STATUS.PENDING_FINANCE, CLAIM_STATUS.PENDING_SETTLEMENT].includes(claim.status)) {
        return res.status(400).json({ success: false, message: 'Claim is not in a pending review state' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Only HOD, Finance, Accounts, or Admin roles can review claims' });
    }

    let nextStatus = '';
    let nextStep = '';
    let notificationType = '';
    let notificationMsg = '';
    let auditAction = 'CLAIM_UPDATED';

    if (action === 'Approve') {
      auditAction = 'CLAIM_APPROVED';
      if (userRole === 'HOD' || (userRole === 'Admin' && claim.status === CLAIM_STATUS.SUBMITTED)) {
        nextStatus = CLAIM_STATUS.PENDING_FINANCE;
        nextStep = WORKFLOW_STEP.FINANCE;
        notificationType = 'ClaimApproved';
        notificationMsg = `Your claim ${claim.id} was approved by ${req.user.name} (${userRole}). Sent to Finance.`;
      } else if (userRole === 'Finance' || (userRole === 'Admin' && claim.status === CLAIM_STATUS.PENDING_FINANCE)) {
        nextStatus = CLAIM_STATUS.PENDING_SETTLEMENT;
        nextStep = WORKFLOW_STEP.ACCOUNTS;
        notificationType = 'ClaimApproved';
        notificationMsg = `Your claim ${claim.id} passed Finance Audit by ${req.user.name}. Sent to Accounts.`;
      } else {
        nextStatus = CLAIM_STATUS.APPROVED_SETTLED;
        nextStep = WORKFLOW_STEP.COMPLETED;
        notificationType = 'PaymentCompleted';
        notificationMsg = `Your claim ${claim.id} was settled and approved by Accounts.`;
      }
    } else if (action === 'Reject') {
      auditAction = 'CLAIM_REJECTED';
      nextStatus = userRole === 'HOD' 
        ? CLAIM_STATUS.REJECTED_BY_HOD 
        : userRole === 'Finance' 
        ? CLAIM_STATUS.REJECTED_BY_FINANCE 
        : CLAIM_STATUS.REJECTED_BY_ACCOUNTS;
      nextStep = WORKFLOW_STEP.COMPLETED;
      notificationType = 'ClaimRejected';
      notificationMsg = `Your claim ${claim.id} was rejected by ${req.user.name} (${userRole}). Remarks: ${remarks || 'None'}`;
    } else if (action === 'Return for Correction') {
      auditAction = 'CLAIM_UPDATED';
      nextStatus = CLAIM_STATUS.RETURNED_FOR_CORRECTION;
      nextStep = WORKFLOW_STEP.DRAFT;
      notificationType = 'CorrectionRequested';
      notificationMsg = `Your claim ${claim.id} was returned for correction by ${req.user.name} (${userRole}). Reason: ${remarks || 'None'}`;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action type' });
    }

    // Atomic update on current status to prevent concurrent double-processing
    const updatedClaim = await ExpenseClaim.findOneAndUpdate(
      { _id: claim._id, status: claim.status },
      { status: nextStatus, currentStep: nextStep },
      { new: true }
    );

    if (!updatedClaim) {
      return res.status(409).json({ 
        success: false, 
        message: 'Conflict: This claim has already been updated or processed by another user.' 
      });
    }

    // Create approval history entry
    const historyEntry = await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: req.user._id,
      role: userRole,
      action: action === 'Return for Correction' ? 'Return for Correction' : action,
      remarks: remarks || ''
    });

    // Notify submitting employee
    await Notification.create({
      recipient: claim.employee,
      message: notificationMsg,
      type: notificationType
    });

    // Standardized Enterprise Audit Log
    await AuditLog.create({
      actor: req.user._id,
      action: auditAction,
      resource: 'ExpenseClaim',
      resourceId: claim._id,
      detail: `${userRole} ${req.user.name} executed ${action} on claim ${claim.id}. Remarks: ${remarks || 'None'}`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Claim ${action}d successfully.`,
      data: updatedClaim,
      history: historyEntry
    });
  } catch (error) {
    next(error);
  }
};
