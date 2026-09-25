import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomic claim ID generator — safe under concurrent requests.
 * Uses MongoDB findOneAndUpdate with $inc for race-condition-free increment.
 * Format: EXP-YYYY-XXX
 */
export const getNextClaimId = async () => {
  const year = new Date().getFullYear();
  const counterId = `claim_${year}`;
  
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  return `EXP-${year}-${String(counter.seq).padStart(3, '0')}`;
};

export default Counter;
