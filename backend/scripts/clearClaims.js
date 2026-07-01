import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

import ExpenseClaim from '../models/ExpenseClaim.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

const clearClaims = async () => {
  try {
    await connectDB();

    console.log('Clearing transaction-related collections...');
    
    const resClaims = await ExpenseClaim.deleteMany({});
    console.log(`Deleted ${resClaims.deletedCount} expense claims.`);

    const resHistory = await ApprovalHistory.deleteMany({});
    console.log(`Deleted ${resHistory.deletedCount} approval history logs.`);

    const resPayments = await Payment.deleteMany({});
    console.log(`Deleted ${resPayments.deletedCount} payment disbursement logs.`);

    const resNotifs = await Notification.deleteMany({});
    console.log(`Deleted ${resNotifs.deletedCount} notification alerts.`);

    const resAudit = await AuditLog.deleteMany({});
    console.log(`Deleted ${resAudit.deletedCount} audit logs.`);

    console.log('Claims cleared successfully! The database is now ready for testing from the web interface.');
    process.exit(0);
  } catch (err) {
    console.error(`Clear error: ${err.message}`);
    process.exit(1);
  }
};

clearClaims();
