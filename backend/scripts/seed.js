import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Models
import User from '../models/User.js';
import Department from '../models/Department.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import ExpenseClaim from '../models/ExpenseClaim.js';
import ApprovalHistory from '../models/ApprovalHistory.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

const resetDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eers');
    console.log('Database connected for cleanup...');

    console.log('Clearing database collections...');
    await User.deleteMany();
    await Department.deleteMany();
    await ExpenseCategory.deleteMany();
    await ExpenseClaim.deleteMany();
    await ApprovalHistory.deleteMany();
    await Payment.deleteMany();
    await Notification.deleteMany();
    await AuditLog.deleteMany();
    console.log('Database collections cleared. No seed data inserted.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error clearing database:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

resetDatabase();
