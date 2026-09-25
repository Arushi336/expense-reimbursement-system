import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    index: true,
    enum: [
      'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
      'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_SUCCESS', 'PASSWORD_RESET_FAILURE',
      'OTP_VERIFIED', 'OTP_FAILED',
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'ROLE_CHANGED',
      'CLAIM_CREATED', 'CLAIM_UPDATED', 'CLAIM_WITHDRAWN',
      'CLAIM_APPROVED', 'CLAIM_REJECTED',
      'PAYMENT_CREATED', 'PAYMENT_FAILED',
      'SYSTEM_SETTING_CHANGED',
      // Legacy action names (for backward compatibility with existing logs)
      'Create Department', 'Update Department', 'Delete Department',
      'Create Category', 'Update Category', 'Delete Category',
      'Create User', 'Update User', 'Delete User',
      'Update System Settings',
      'HOD Review Action', 'Finance Review Action', 'Accounts Review Action', 'Admin Review Action',
      'Payout Disbursed', 'Claim Withdrawn'
    ]
  },
  detail: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  resource: {
    type: String,
    trim: true
  },
  resourceId: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    maxlength: 45
  },
  requestId: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient audit log queries
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
