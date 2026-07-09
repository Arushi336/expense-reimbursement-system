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
    const deptMarketing = await Department.create({ name: 'Marketing', code: 'MKT', budget: 150000 });
    const deptSales = await Department.create({ name: 'Sales', code: 'SLS', budget: 200000 });
    const deptFinance = await Department.create({ name: 'Finance & Audit', code: 'FIN', budget: 120000 });
    const deptEngineering = await Department.create({ name: 'Engineering', code: 'ENG', budget: 300000 });
    const deptHR = await Department.create({ name: 'Human Resources', code: 'HR', budget: 60000 });
    const deptOperations = await Department.create({ name: 'Operations', code: 'OPS', budget: 180000 });

    // 2. Create Users
    console.log('Seeding users...');
    
    // Employees
    const empArjun = await User.create({
      name: 'Arjun Sharma',
      email: 'arjun.sharma@company.com',
      password: 'password123',
      role: 'Employee',
      department: deptMarketing._id,
      employeeId: 'EMP-IN-108',
      phoneNumber: '+919876543217',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      allottedBudget: 25000
    });

    const empPriya = await User.create({
      name: 'Priya Patel',
      email: 'priya.patel@company.com',
      password: 'password123',
      role: 'Employee',
      department: deptSales._id,
      employeeId: 'EMP-IN-109',
      phoneNumber: '+919876543218',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      allottedBudget: 30000
    });

    const empNeha = await User.create({
      name: 'Neha Joshi',
      email: 'neha.joshi@company.com',
      password: 'password123',
      role: 'Employee',
      department: deptMarketing._id,
      employeeId: 'EMP-IN-110',
      phoneNumber: '+919876543219',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      allottedBudget: 20000
    });

    const empRohit = await User.create({
      name: 'Rohit Verma',
      email: 'rohit.verma@company.com',
      password: 'password123',
      role: 'Employee',
      department: deptEngineering._id,
      employeeId: 'EMP-IN-111',
      phoneNumber: '+919876543220',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      allottedBudget: 35000
    });

    const empSneha = await User.create({
      name: 'Sneha Kulkarni',
      email: 'sneha.kulkarni@company.com',
      password: 'password123',
      role: 'Employee',
      department: deptHR._id,
      employeeId: 'EMP-IN-112',
      phoneNumber: '+919876543221',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      allottedBudget: 15000
    });

    // HODs
    const hodRajesh = await User.create({
      name: 'Rajesh Deshmukh',
      email: 'rajesh.deshmukh@company.com',
      password: 'password123',
      role: 'HOD',
      department: deptMarketing._id,
      employeeId: 'EMP-IN-102',
      phoneNumber: '+919876543211',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      allottedBudget: 40000
    });

    const hodAnjali = await User.create({
      name: 'Anjali Mehta',
      email: 'anjali.mehta@company.com',
      password: 'password123',
      role: 'HOD',
      department: deptSales._id,
      employeeId: 'EMP-IN-103',
      phoneNumber: '+919876543212',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      allottedBudget: 45000
    });

    // Finance Auditing
    const finVivek = await User.create({
      name: 'Vivek Kulkarni',
      email: 'vivek.kulkarni@company.com',
      password: 'password123',
      role: 'Finance',
      department: deptFinance._id,
      employeeId: 'EMP-IN-104',
      phoneNumber: '+919876543213',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
    });

    const finPooja = await User.create({
      name: 'Pooja Shah',
      email: 'pooja.shah@company.com',
      password: 'password123',
      role: 'Finance',
      department: deptFinance._id,
      employeeId: 'EMP-IN-105',
      phoneNumber: '+919876543214',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
    });

    // Accounts Settlers
    const accSuresh = await User.create({
      name: 'Suresh Iyer',
      email: 'suresh.iyer@company.com',
      password: 'password123',
      role: 'Accounts',
      department: deptFinance._id,
      employeeId: 'EMP-IN-106',
      phoneNumber: '+919876543215',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'
    });

    const accKavita = await User.create({
      name: 'Kavita Nair',
      email: 'kavita.nair@company.com',
      password: 'password123',
      role: 'Accounts',
      department: deptFinance._id,
      employeeId: 'EMP-IN-107',
      phoneNumber: '+919876543216',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    });

    // Admin
    const admAmit = await User.create({
      name: 'Amit Patil',
      email: 'amit.patil@company.com',
      password: 'password123',
      role: 'Admin',
      department: deptHR._id,
      employeeId: 'EMP-IN-101',
      phoneNumber: '+919876543210',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150'
    });

    // 3. Link HODs to Departments
    console.log('Linking department heads...');
    await Department.findByIdAndUpdate(deptMarketing._id, { hod: hodRajesh._id });
    await Department.findByIdAndUpdate(deptSales._id, { hod: hodAnjali._id });

    // 4. Create Expense Categories (Indian settings)
    console.log('Seeding expense categories...');
    const catTravel = await ExpenseCategory.create({ name: 'Travel', code: 'TRAVEL', maxLimit: 15000, receiptRequired: true });
    const catFood = await ExpenseCategory.create({ name: 'Food', code: 'FOOD', maxLimit: 2000, receiptRequired: true });
    const catAccommodation = await ExpenseCategory.create({ name: 'Accommodation', code: 'ACCOMMODATION', maxLimit: 8000, receiptRequired: true });
    const catFuel = await ExpenseCategory.create({ name: 'Fuel', code: 'FUEL', maxLimit: 5000, receiptRequired: false });
    const catMedical = await ExpenseCategory.create({ name: 'Medical', code: 'MEDICAL', maxLimit: 10000, receiptRequired: true });
    const catSupplies = await ExpenseCategory.create({ name: 'Office Supplies', code: 'SUPPLIES', maxLimit: 4000, receiptRequired: true });
    const catTraining = await ExpenseCategory.create({ name: 'Training', code: 'TRAINING', maxLimit: 20000, receiptRequired: true });
    const catOther = await ExpenseCategory.create({ name: 'Others', code: 'OTHER', maxLimit: 3000, receiptRequired: true });

    // 5. Create Expense Claims
    console.log('Seeding claims and timelines...');
    
    // Claim 1: Fully approved and paid
    const claim1 = await ExpenseClaim.create({
      id: 'EXP-IN-001',
      title: 'Vande Bharat Train Ticket - Mumbai to Goa',
      employee: empArjun._id,
      department: deptMarketing._id,
      category: catTravel._id,
      merchant: 'Indian Railways (IRCTC)',
      amount: 2450.00,
      date: new Date('2026-06-25'),
      description: 'Travel ticket for attending the client branding meet in Goa.',
      receiptUrl: 'train_ticket_mumbai_goa.pdf',
      status: 'Approved & Settled',
      currentStep: 'Completed',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim1._id, actionBy: empArjun._id, role: 'Employee', action: 'Submit', remarks: 'Travel to client location.', timestamp: new Date('2026-06-25T10:00:00Z') },
      { claimId: claim1._id, actionBy: hodRajesh._id, role: 'HOD', action: 'Approve', remarks: 'Approved. Mandatory travel.', timestamp: new Date('2026-06-26T09:12:00Z') },
      { claimId: claim1._id, actionBy: finVivek._id, role: 'Finance', action: 'Approve', remarks: 'Approved. Travel ticket matches IRCTC invoice.', timestamp: new Date('2026-06-27T14:30:00Z') },
      { claimId: claim1._id, actionBy: accSuresh._id, role: 'Accounts', action: 'Approve', remarks: 'Disbursed via bank transfer.', timestamp: new Date('2026-06-28T11:22:00Z') }
    ]);

    await Payment.create({
      claimId: claim1._id,
      transactionId: 'TXN-BANK-982341',
      bankReference: 'SBI-REF-8734234',
      upiReference: '982341@okaxis',
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Success',
      amount: 2450.00,
      processedBy: accSuresh._id,
      paymentDate: new Date('2026-06-28T11:22:00Z')
    });

    // Claim 2: Pending Finance, with Policy Violation (food limit exceeded)
    const claim2 = await ExpenseClaim.create({
      id: 'EXP-IN-002',
      title: 'Client Appreciation Team Lunch',
      employee: empPriya._id,
      department: deptSales._id,
      category: catFood._id,
      merchant: 'Taj Gateway Restro',
      amount: 3200.00,
      date: new Date('2026-06-26'),
      description: 'Team appreciation lunch with regional distributor clients.',
      receiptUrl: 'taj_dining_receipt.png',
      status: 'Pending Finance',
      currentStep: 'Finance',
      policyViolation: true,
      policyMessage: 'Food limit exceeded (₹2,000 policy limit)'
    });

    await ApprovalHistory.create([
      { claimId: claim2._id, actionBy: empPriya._id, role: 'Employee', action: 'Submit', remarks: 'Team meeting lunch.', timestamp: new Date('2026-06-26T19:30:00Z') },
      { claimId: claim2._id, actionBy: hodAnjali._id, role: 'HOD', action: 'Approve', remarks: 'Approved. Justified due to contract signing.', timestamp: new Date('2026-06-27T10:45:00Z') }
    ]);

    // Claim 3: Pending HOD review
    const claim3 = await ExpenseClaim.create({
      id: 'EXP-IN-003',
      title: 'Corporate Hotel Booking - Bangalore',
      employee: empArjun._id,
      department: deptMarketing._id,
      category: catAccommodation._id,
      merchant: 'Lemon Tree Bengaluru',
      amount: 6500.00,
      date: new Date('2026-06-24'),
      description: 'Lodging charges for Bangalore technology summit.',
      receiptUrl: 'marriott_sf_invoice.pdf',
      status: 'Submitted',
      currentStep: 'HOD',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim3._id, actionBy: empArjun._id, role: 'Employee', action: 'Submit', remarks: 'Official lodging.', timestamp: new Date('2026-06-25T11:20:00Z') }
    ]);

    // Claim 4: Returned for Correction
    const claim4 = await ExpenseClaim.create({
      id: 'EXP-IN-004',
      title: 'Whiteboard Marker & Office Paper',
      employee: empArjun._id,
      department: deptMarketing._id,
      category: catSupplies._id,
      merchant: 'Local Stationery Mart',
      amount: 1200.00,
      date: new Date('2026-06-27'),
      description: 'Markers and sheets purchased for team brainstorming sessions.',
      receiptUrl: '',
      status: 'Returned for Correction',
      currentStep: 'Draft',
      policyViolation: true,
      policyMessage: 'Receipt document is required for this expense category'
    });

    await ApprovalHistory.create([
      { claimId: claim4._id, actionBy: empArjun._id, role: 'Employee', action: 'Submit', remarks: 'Emergency markers.', timestamp: new Date('2026-06-27T08:15:00Z') },
      { claimId: claim4._id, actionBy: hodRajesh._id, role: 'HOD', action: 'Return for Correction', remarks: 'Please upload the purchase bill copy.', timestamp: new Date('2026-06-28T16:30:00Z') }
    ]);

    // Claim 5: Pending HOD review for Sales (Anjali Mehta)
    const claim5 = await ExpenseClaim.create({
      id: 'EXP-IN-005',
      title: 'Sales Distributor Meet Travel',
      employee: empPriya._id,
      department: deptSales._id,
      category: catTravel._id,
      merchant: 'Uber Outstation',
      amount: 4500.00,
      date: new Date('2026-06-27'),
      description: 'Travel support for sales manager client distributions.',
      receiptUrl: 'marriott_sf_invoice.pdf',
      status: 'Submitted',
      currentStep: 'HOD',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim5._id, actionBy: empPriya._id, role: 'Employee', action: 'Submit', remarks: 'Client distributor visit.', timestamp: new Date('2026-06-27T09:00:00Z') }
    ]);

    // Claim 6: Pending Finance review for Marketing
    const claim6 = await ExpenseClaim.create({
      id: 'EXP-IN-006',
      title: 'Tech Summit Printing Banner',
      employee: empArjun._id,
      department: deptMarketing._id,
      category: catSupplies._id,
      merchant: 'Quick Print Shop',
      amount: 2800.00,
      date: new Date('2026-06-28'),
      description: 'Marketing banners printed for Bangalore Tech Summit.',
      receiptUrl: 'taj_dining_receipt.png',
      status: 'Pending Finance',
      currentStep: 'Finance',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim6._id, actionBy: empArjun._id, role: 'Employee', action: 'Submit', remarks: 'Summit printings.', timestamp: new Date('2026-06-28T10:00:00Z') },
      { claimId: claim6._id, actionBy: hodRajesh._id, role: 'HOD', action: 'Approve', remarks: 'Approved. Essential summit marketing.', timestamp: new Date('2026-06-29T11:15:00Z') }
    ]);

    // Claim 7: Pending Settlement for Accounts (Suresh Iyer / Kavita Nair)
    const claim7 = await ExpenseClaim.create({
      id: 'EXP-IN-007',
      title: 'Distributor Medical Emergency Support',
      employee: empPriya._id,
      department: deptSales._id,
      category: catMedical._id,
      merchant: 'Apollo Pharmacy',
      amount: 8900.00,
      date: new Date('2026-06-29'),
      description: 'First aid and emergency medicines purchased for client meet coordinator.',
      receiptUrl: 'train_ticket_mumbai_goa.pdf',
      status: 'Pending Settlement',
      currentStep: 'Accounts',
      policyViolation: false
    });

    await ApprovalHistory.create([
      { claimId: claim7._id, actionBy: empPriya._id, role: 'Employee', action: 'Submit', remarks: 'Emergency aid.', timestamp: new Date('2026-06-29T14:00:00Z') },
      { claimId: claim7._id, actionBy: hodAnjali._id, role: 'HOD', action: 'Approve', remarks: 'Approved. High priority medical aid.', timestamp: new Date('2026-06-29T15:30:00Z') },
      { claimId: claim7._id, actionBy: finVivek._id, role: 'Finance', action: 'Approve', remarks: 'Approved. Verified prescription bills.', timestamp: new Date('2026-06-30T10:12:00Z') }
    ]);

    // 6. Seed Notifications
    console.log('Seeding notifications...');
    await Notification.create([
      { recipient: empArjun._id, message: 'Your claim EXP-IN-001 for ₹2450.00 has been settled.', type: 'PaymentCompleted', isRead: true },
      { recipient: empArjun._id, message: 'Your claim EXP-IN-004 was returned for correction by Rajesh Deshmukh.', type: 'CorrectionRequested', isRead: false },
      { recipient: empPriya._id, message: 'Your claim EXP-IN-002 has been approved by Anjali Mehta and sent to Finance.', type: 'ClaimApproved', isRead: false }
    ]);

    // 7. Seed Audit Logs
    console.log('Seeding administrative audit logs...');
    await AuditLog.create([
      { actor: admAmit._id, action: 'Initialized Seeding', detail: 'Seeded Indian corporate settings and test account data.', ipAddress: '127.0.0.1' },
      { actor: hodRajesh._id, action: 'HOD Approved Claim', detail: 'HOD Rajesh Deshmukh approved claim EXP-IN-001.', ipAddress: '192.168.1.42' },
      { actor: finVivek._id, action: 'Finance Audited Claim', detail: 'Auditor Vivek Kulkarni verified claim EXP-IN-001.', ipAddress: '192.168.1.18' },
      { actor: accSuresh._id, action: 'Payout Disbursed', detail: 'Suresh Iyer settled payouts for claim EXP-IN-001.', ipAddress: '192.168.1.9' }
    ]);

    console.log('Database successfully seeded with mock EERS Indian records!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedDatabase();
