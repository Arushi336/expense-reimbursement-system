import ExpenseClaim from '../models/ExpenseClaim.js';
import Payment from '../models/Payment.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

// @desc    Process payout settlement with concurrency-safe atomic transition & idempotency
// @route   POST /api/payments/:claimId
// @access  Private (Accounts)
export const processPayment = async (req, res, next) => {
  try {
    const { transactionId, method } = req.body;
    const { claimId } = req.params;

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ success: false, message: 'Bank Transaction ID is required for settlement' });
    }

    const cleanTxnId = transactionId.trim();

    // Prevent duplicate transaction ID usage across system
    const existingTxn = await Payment.findOne({ transactionId: cleanTxnId });
    if (existingTxn) {
      return res.status(400).json({ 
        success: false, 
        message: 'This transaction ID has already been recorded for another payout' 
      });
    }

    // Atomic claim state transition: only succeeds if claim is currently in 'Pending Settlement'
    // Guarantees zero duplicate disbursements under concurrent clicks/requests
    const claim = await ExpenseClaim.findOneAndUpdate(
      { _id: claimId, status: 'Pending Settlement' },
      { status: 'Approved & Settled', currentStep: 'Completed' },
      { new: true }
    );

    if (!claim) {
      // Check existing state to provide accurate failure diagnostic
      const existingClaim = await ExpenseClaim.findById(claimId);
      if (!existingClaim) {
        return res.status(404).json({ success: false, message: 'Expense claim not found' });
      }
      if (existingClaim.status === 'Approved & Settled') {
        return res.status(400).json({ 
          success: false, 
          message: 'Claim has already been settled and paid. Duplicate disbursement prevented.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: `Claim cannot be settled from status: "${existingClaim.status}"` 
      });
    }

    let payment;
    try {
      // Create unique payment record
      payment = await Payment.create({
        claimId: claim._id,
        transactionId: cleanTxnId,
        amount: claim.amount,
        processedBy: req.user._id,
        method: method || 'Bank Transfer'
      });
    } catch (paymentErr) {
      // Rollback claim status if payment persistence failed
      await ExpenseClaim.findByIdAndUpdate(claim._id, {
        status: 'Pending Settlement',
        currentStep: 'Accounts'
      });

      if (paymentErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Payment for this claim or with this transaction ID already exists.'
        });
      }
      throw paymentErr;
    }

    // Append to approval history
    await ApprovalHistory.create({
      claimId: claim._id,
      actionBy: req.user._id,
      role: 'Accounts',
      action: 'Approve',
      remarks: `Payment settled via ${method || 'Bank Transfer'}. Transaction ID: ${cleanTxnId}`
    });

    // Notify employee
    await Notification.create({
      recipient: claim.employee,
      message: `Reimbursement completed for claim ${claim.id}. Amount ₹${claim.amount.toFixed(2)} was transferred. Ref ID: ${cleanTxnId}`,
      type: 'PaymentCompleted'
    });

    // Enterprise audit log
    await AuditLog.create({
      actor: req.user._id,
      action: 'PAYMENT_CREATED',
      resource: 'ExpenseClaim',
      resourceId: claim._id,
      detail: `Accounts Settler ${req.user.name} released ₹${claim.amount.toFixed(2)} for claim ${claim.id} (Txn: ${cleanTxnId}).`,
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
