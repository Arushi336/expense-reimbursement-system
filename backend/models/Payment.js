import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseClaim',
    required: true,
    unique: true,
    index: true
  },
  transactionId: {
    type: String,
    required: [true, 'Bank Transaction ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    default: 'Bank Transfer'
  }
}, {
  timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
