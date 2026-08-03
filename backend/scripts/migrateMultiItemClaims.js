import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpenseClaim from '../models/ExpenseClaim.js';

dotenv.config();

export const migrateMultiItemClaims = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eers';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('Database connected for migration...');
    }

    const claimsToMigrate = await ExpenseClaim.find({
      $or: [
        { items: { $exists: false } },
        { items: { $size: 0 } }
      ]
    });

    console.log(`Found ${claimsToMigrate.length} claims requiring migration...`);

    let migratedCount = 0;
    for (const claim of claimsToMigrate) {
      const item = {
        title: claim.title || 'Expense Item',
        category: claim.category,
        merchant: claim.merchant || '',
        amount: claim.amount || 0,
        date: claim.date || claim.createdAt || new Date(),
        description: claim.description || '',
        receiptUrl: claim.receiptUrl || '',
        receiptPublicId: claim.receiptPublicId || '',
        receiptHash: claim.receiptHash || ''
      };

      claim.items = [item];
      await claim.save();
      migratedCount++;
    }

    console.log(`Successfully migrated ${migratedCount} claims to multi-item format.`);
    return { success: true, count: migratedCount };
  } catch (error) {
    console.error('Error migrating claims:', error.message);
    throw error;
  }
};

// Execute if run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('migrateMultiItemClaims.js')) {
  migrateMultiItemClaims().then(() => mongoose.connection.close());
}
