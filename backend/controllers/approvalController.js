import ExpenseClaim from '../models/ExpenseClaim.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

// @desc    Process HOD / Finance claim approval action
// @route   POST /api/approvals/:claimId
// @access  Private (HOD, Finance)
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
      if (claim.status !== 'Submitted') {
        return res.status(400).json({ success: false, message: 'Claim is not in HOD review state' });
      }
      
      // HOD can only audit their own department employees
      if (claim.department.toString() !== req.user.department._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve other department claims' });
      }
    } else if (userRole === 'Finance') {
      if (claim.status !== 'Pending Finance') {
        return res.status(400).json({ success: false, message: 'Claim is not in Finance verification state' });
      }
    } else if (userRole === 'Accounts') {
      if (claim.status !== 'Pending Settlement') {
        return res.status(400).json({ success: false, message: 'Claim is not in Accounts settlement state' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Only HOD, Finance, or Accounts roles can review claims' });
    }

    let nextStatus = '';
    let nextStep = '';
    let notificationType = '';
    let notificationMsg = '';

    if (action === 'Approve') {
      if (userRole === 'HOD') {
        nextStatus = 'Pending Finance';
        nextStep = 'Finance';
        notificationType = 'ClaimApproved';
        notificationMsg = `Your claim ${claim.id} was approved by Department Head ${req.user.name}. Sent to Finance.`;
      } else if (userRole === 'Finance') {
        nextStatus = 'Pending Settlement';
        nextStep = 'Accounts';
        notificationType = 'ClaimApproved';
        notificationMsg = `Your claim ${claim.id} passed Finance Audit by ${req.user.name}. Sent to Accounts.`;
      } else {
        nextStatus = 'Approved & Settled';
        nextStep = 'Completed';
        notificationType = 'PaymentCompleted';
        notificationMsg = `Your claim ${claim.id} was settled and approved by Accounts.`;
      }
    } else if (action === 'Reject') {
      nextStatus = userRole === 'HOD' ? 'Rejected by HOD' : userRole === 'Finance' ? 'Rejected by Finance' : 'Rejected by Accounts';
      nextStep = 'Completed';
      notificationType = 'ClaimRejected';
      notificationMsg = `Your claim ${claim.id} was rejected by ${req.user.name} (${userRole}). Remarks: ${remarks}`;
    } else if (action === 'Return for Correction') {
      nextStatus = 'Returned for Correction';
      nextStep = 'Draft';
      notificationType = 'CorrectionRequested';
      notificationMsg = `Your claim ${claim.id} was returned for correction by ${req.user.name} (${userRole}). Reason: ${remarks}`;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action type' });
    }

    // Update claim state
    claim.status = nextStatus;
    claim.currentStep = nextStep;
    await claim.save();

    // Create approval history entry
    const historyEntry = await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: req.user._id,
      role: userRole,
      action: action === 'Return for Correction' ? 'Return for Correction' : action,
      remarks: remarks
    });

    // Notify submitting employee
    await Notification.create({
      recipient: claim.employee,
      message: notificationMsg,
      type: notificationType
    });

    // Create Admin Audit logs
    await AuditLog.create({
      actor: req.user._id,
      action: `${userRole} Review Action`,
      detail: `${userRole} ${req.user.name} processed claim ${claim.id} with action: ${action}.`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Claim ${action}d successfully.`,
      data: claim,
      history: historyEntry
    });
  } catch (error) {
    next(error);
  }
};
