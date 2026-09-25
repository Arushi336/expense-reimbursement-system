import mongoose from 'mongoose';

const expenseItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
  merchant: { type: String, trim: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than 0'] },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, trim: true },
  receiptUrl: { type: String },
  receiptPublicId: { type: String },
  receiptHash: { type: String }
}, { _id: true });

const expenseClaimSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Claim title is required'],
    trim: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: false
  },
  merchant: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required']
  },
  description: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String
  },
  receiptPublicId: {
    type: String
  },
  receiptHash: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: [
      'Draft', 'Submitted', 'Returned for Correction', 
      'Rejected by HOD', 'Rejected by Finance', 
      'Pending Finance', 'Pending Settlement', 'Approved & Settled'
    ],
    default: 'Draft'
  },
  currentStep: {
    type: String,
    enum: ['Draft', 'Submitted', 'HOD', 'Finance', 'Accounts', 'Completed'],
    default: 'Draft'
  },
  policyViolation: {
    type: Boolean,
    default: false
  },
  policyMessage: {
    type: String,
    default: ''
  },
  // OCR AI Mock fields
  ocrAmount: {
    type: Number
  },
  ocrVendor: {
    type: String
  },
  ocrDate: {
    type: Date
  },
  ocrConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  items: [expenseItemSchema]
}, {
  timestamps: true
});

// ── Database Indexes ────────────────────────────────────────────────────
expenseClaimSchema.index({ status: 1, createdAt: -1 });
expenseClaimSchema.index({ department: 1, status: 1 });
expenseClaimSchema.index({ employee: 1, status: 1, createdAt: -1 });
expenseClaimSchema.index({ date: 1 });

const ExpenseClaim = mongoose.model('ExpenseClaim', expenseClaimSchema);
export default ExpenseClaim;
