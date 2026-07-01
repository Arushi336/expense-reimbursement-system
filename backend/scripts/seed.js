import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

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

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eers');
    console.log('Database Connected for seeding...');

    // Clear all existing collections
    console.log('Clearing database collections...');
    await User.deleteMany();
    await Department.deleteMany();
    await ExpenseCategory.deleteMany();
    await ExpenseClaim.deleteMany();
    await ApprovalHistory.deleteMany();
    await Payment.deleteMany();
    await Notification.deleteMany();
    await AuditLog.deleteMany();
    console.log('Database collections cleared.');

    // 1. Create Departments (HODs will be updated later)
    console.log('Seeding departments...');
    const deptMarketing = await Department.create({ name: 'Marketing', code: 'MKT', budget: 120000 });
    const deptSales = await Department.create({ name: 'Sales', code: 'SLS', budget: 150000 });
    const deptConsulting = await Department.create({ name: 'Consulting', code: 'CNS', budget: 80000 });
    const deptFinance = await Department.create({ name: 'Finance & Audit', code: 'FIN', budget: 100000 });
    const deptEngineering = await Department.create({ name: 'Engineering', code: 'ENG', budget: 200000 });
    const deptHR = await Department.create({ name: 'Human Resources', code: 'HR', budget: 50000 });

    // 2. Create Users
    console.log('Seeding users...');
    const empSarah = await User.create({
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@corporate.com',
      password: 'password123',
      role: 'Employee',
      department: deptMarketing._id,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      allottedBudget: 15000
    });

    const empJames = await User.create({
      name: 'James Wilson',
      email: 'james.wilson@corporate.com',
      password: 'password123',
      role: 'Employee',
      department: deptSales._id,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      allottedBudget: 20000
    });

    const hodMarcus = await User.create({
      name: 'Marcus Brody',
      email: 'marcus.brody@corporate.com',
      password: 'password123',
      role: 'HOD',
      department: deptMarketing._id,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      allottedBudget: 30000
    });

    const hodVictoria = await User.create({
      name: 'Victoria Cole',
      email: 'victoria.cole@corporate.com',
      password: 'password123',
      role: 'HOD',
      department: deptSales._id,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      allottedBudget: 30000
    });

    const finLinda = await User.create({
      name: 'Linda Vance',
      email: 'linda.vance@corporate.com',
      password: 'password123',
      role: 'Finance',
      department: deptFinance._id,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
    });

    const accGary = await User.create({
      name: 'Gary Cooper',
      email: 'gary.cooper@corporate.com',
      password: 'password123',
      role: 'Accounts',
      department: deptFinance._id,
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
    });

    const admDonald = await User.create({
      name: 'Donald Knuth',
      email: 'donald.knuth@corporate.com',
      password: 'password123',
      role: 'Admin',
      department: deptHR._id,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    });

    // 3. Link HODs to Departments
    console.log('Linking department heads...');
    await Department.findByIdAndUpdate(deptMarketing._id, { hod: hodMarcus._id });
    await Department.findByIdAndUpdate(deptSales._id, { hod: hodVictoria._id });

    // 4. Create Expense Categories
    console.log('Seeding expense categories...');
    const catTravel = await ExpenseCategory.create({ name: 'Travel & Lodging', code: 'TRAVEL', maxLimit: 2000, receiptRequired: true });
    const catMeals = await ExpenseCategory.create({ name: 'Meals & Entertainment', code: 'MEALS', maxLimit: 150, receiptRequired: true });
    const catEquipment = await ExpenseCategory.create({ name: 'Office Equipment', code: 'EQUIPMENT', maxLimit: 1000, receiptRequired: true });
    const catSoftware = await ExpenseCategory.create({ name: 'Software & Subscriptions', code: 'SOFTWARE', maxLimit: 300, receiptRequired: false });
    const catUtilities = await ExpenseCategory.create({ name: 'Telecom & Internet', code: 'UTILITIES', maxLimit: 100, receiptRequired: false });
    const catOther = await ExpenseCategory.create({ name: 'Miscellaneous', code: 'OTHER', maxLimit: 200, receiptRequired: true });

    // 5. Create Expense Claims
    console.log('Seeding claims and timelines...');
    
    // Claim 1: Fully approved and paid
    const claim1 = await ExpenseClaim.create({
      id: 'EXP-2026-001',
      title: 'AWS Cloud Hosting Fees - Q2',
      employee: empSarah._id,
      department: deptMarketing._id,
      category: catSoftware._id,
      merchant: 'Amazon Web Services',
      amount: 289.50,
      date: new Date('2026-06-25'),
      description: 'Quarterly hosting for the campaign landing pages.',
      receiptUrl: 'aws_receipt_q2_2026.pdf',
      status: 'Approved & Settled',
      currentStep: 'Completed',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim1._id, actionBy: empSarah._id, role: 'Employee', action: 'Submit', remarks: 'Reimbursement for hosting campaign landing pages.', timestamp: new Date('2026-06-25T10:00:00Z') },
      { claimId: claim1._id, actionBy: hodMarcus._id, role: 'HOD', action: 'Approve', remarks: 'Approved. Essential for marketing ops.', timestamp: new Date('2026-06-26T09:12:00Z') },
      { claimId: claim1._id, actionBy: finLinda._id, role: 'Finance', action: 'Approve', remarks: 'Audit passed. SaaS category matches billing receipt.', timestamp: new Date('2026-06-27T14:30:00Z') },
      { claimId: claim1._id, actionBy: accGary._id, role: 'Accounts', action: 'Approve', remarks: 'Payment completed. Bank transfer ID TXN982341.', timestamp: new Date('2026-06-28T11:22:00Z') }
    ]);

    await Payment.create({
      claimId: claim1._id,
      transactionId: 'TXN982341',
      amount: 289.50,
      processedBy: accGary._id,
      paymentDate: new Date('2026-06-28T11:22:00Z')
    });

    // Claim 2: Pending Finance, with Policy Violation (meals limit exceeded)
    const claim2 = await ExpenseClaim.create({
      id: 'EXP-2026-002',
      title: 'Client Appreciation Dinner',
      employee: empJames._id,
      department: deptSales._id,
      category: catMeals._id,
      merchant: 'Steakhouse Premier',
      amount: 195.00,
      date: new Date('2026-06-26'),
      description: 'Dinner with Acme Corp regional managers after contract renewal.',
      receiptUrl: 'receipt_steakhouse.png',
      status: 'Pending Finance',
      currentStep: 'Finance',
      policyViolation: true,
      policyMessage: 'Meals limit exceeded ($150 limit)'
    });

    await ApprovalHistory.create([
      { claimId: claim2._id, actionBy: empJames._id, role: 'Employee', action: 'Submit', remarks: 'Dinner with 3 Acme executives. Highly successful.', timestamp: new Date('2026-06-26T19:30:00Z') },
      { claimId: claim2._id, actionBy: hodVictoria._id, role: 'HOD', action: 'Approve', remarks: 'Approved. Worth it for the renewals, but please keep budgets in mind.', timestamp: new Date('2026-06-27T10:45:00Z') }
    ]);

    // Claim 3: Pending HOD review
    const claim3 = await ExpenseClaim.create({
      id: 'EXP-2026-003',
      title: 'Hotel Stay - Tech Summit SF',
      employee: empSarah._id,
      department: deptMarketing._id,
      category: catTravel._id,
      merchant: 'Marriott Marquis SF',
      amount: 720.00,
      date: new Date('2026-06-24'),
      description: '3 nights lodging for tech conference.',
      receiptUrl: 'marriott_sf_invoice.pdf',
      status: 'Submitted',
      currentStep: 'HOD',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim3._id, actionBy: empSarah._id, role: 'Employee', action: 'Submit', remarks: 'Conference hotels were booked up, stayed at official venue.', timestamp: new Date('2026-06-25T11:20:00Z') }
    ]);

    // Claim 4: Returned for Correction
    const claim4 = await ExpenseClaim.create({
      id: 'EXP-2026-004',
      title: 'Ergonomic Office Chair',
      employee: empSarah._id,
      department: deptMarketing._id,
      category: catEquipment._id,
      merchant: 'Herman Miller',
      amount: 499.00,
      date: new Date('2026-06-27'),
      description: 'Ergonomic chair upgrade for WFH wellness allowance.',
      receiptUrl: '',
      status: 'Returned for Correction',
      currentStep: 'Draft',
      policyViolation: true,
      policyMessage: 'Receipt document is required for this expense category'
    });

    await ApprovalHistory.create([
      { claimId: claim4._id, actionBy: empSarah._id, role: 'Employee', action: 'Submit', remarks: 'WFH budget request.', timestamp: new Date('2026-06-27T08:15:00Z') },
      { claimId: claim4._id, actionBy: hodMarcus._id, role: 'HOD', action: 'Return for Correction', remarks: 'Please upload the original invoice or receipt to verify the purchase.', timestamp: new Date('2026-06-28T16:30:00Z') }
    ]);

    // 6. Seed Notifications
    console.log('Seeding notifications...');
    await Notification.create([
      { recipient: empSarah._id, message: 'Your claim EXP-2026-001 for $289.50 has been settled.', type: 'PaymentCompleted', isRead: true },
      { recipient: empSarah._id, message: 'Your claim EXP-2026-004 was returned for correction by Marcus Brody.', type: 'CorrectionRequested', isRead: false },
      { recipient: empJames._id, message: 'Your claim EXP-2026-002 has been approved by Victoria Cole and sent to Finance.', type: 'ClaimApproved', isRead: false }
    ]);

    // 7. Seed Audit Logs
    console.log('Seeding administrative audit logs...');
    await AuditLog.create([
      { actor: admDonald._id, action: 'Initialized Seeding', detail: 'Admin triggered database reset and loaded core configuration parameters.', ipAddress: '127.0.0.1' },
      { actor: hodMarcus._id, action: 'HOD Approved Claim', detail: 'HOD Marcus Brody approved claim EXP-2026-001 ($289.50).', ipAddress: '192.168.1.42' },
      { actor: finLinda._id, action: 'Finance Audited Claim', detail: 'Auditor Linda Vance marked EXP-2026-001 compliant.', ipAddress: '192.168.1.18' },
      { actor: accGary._id, action: 'Payout Disbursed', detail: 'Gary Cooper completed payout transfer for claim EXP-2026-001.', ipAddress: '192.168.1.9' }
    ]);

    console.log('Database successfully seeded with mock EERS enterprise records!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedDatabase();
