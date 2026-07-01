import ExpenseClaim from '../models/ExpenseClaim.js';
import Payment from '../models/Payment.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

// @desc    Process payout settlement
// @route   POST /api/payments/:claimId
// @access  Private (Accounts)
export const processPayment = async (req, res, next) => {
  try {
    const { transactionId, method } = req.body;
    const { claimId } = req.params;

    const claim = await ExpenseClaim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Expense claim not found' });
    }

    // Verify claim is ready for payment
    if (claim.status !== 'Pending Settlement') {
      return res.status(400).json({ success: false, message: 'Claim is not in Pending Settlement queue' });
    }

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ success: false, message: 'Bank Transaction ID is required for settlement' });
    }

    // Check if transaction ID has already been used
    const duplicateTxn = await Payment.findOne({ transactionId });
    if (duplicateTxn) {
      return res.status(400).json({ success: false, message: 'This transaction ID has already been recorded for another payout' });
    }

    // Update claim status
    claim.status = 'Approved & Settled';
    claim.currentStep = 'Completed';
    await claim.save();

    // Create payment entry
    const payment = await Payment.create({
      claimId: claim._id,
      transactionId: transactionId,
      amount: claim.amount,
      processedBy: req.user._id,
      method: method || 'Bank Transfer'
    });

    // Append to approval history
    await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: req.user._id,
      role: 'Accounts',
      action: 'Approve',
      remarks: `Payment settled via ${method || 'Bank Transfer'}. Transaction ID: ${transactionId}`
    });

    // Notify employee
    await Notification.create({
      recipient: claim.employee,
      message: `Reimbursement completed for claim ${claim.id}. Amount $${claim.amount.toFixed(2)} was transferred. Ref ID: ${transactionId}`,
      type: 'PaymentCompleted'
    });

    // Audit logs
    await AuditLog.create({
      actor: req.user._id,
      action: 'Payout Disbursed',
      detail: `Accounts Settler ${req.user.name} released $${claim.amount.toFixed(2)} to claim ${claim.id} (ACH Txn: ${transactionId}).`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Payment settled and claim completed.',
      data: claim,
      payment: payment
    });
  } catch (error) {
    next(error);
  }
};
