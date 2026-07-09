import mongoose from 'mongoose';

const approvalHistorySchema = new mongoose.Schema({
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseClaim',
    required: true,
    index: true
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['Submit', 'Approve', 'Reject', 'Return for Correction', 'Query', 'Withdraw'],
    required: true
  },
  remarks: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ApprovalHistory = mongoose.model('ApprovalHistory', approvalHistorySchema);
export default ApprovalHistory;
