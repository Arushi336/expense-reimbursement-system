export const USERS = {
  employee: {
    id: 'emp_01',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@corporate.com',
    role: 'Employee',
    department: 'Marketing',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    title: 'Senior Marketing Specialist',
    joinedDate: '2023-04-12',
    allottedBudget: 15000,
    spentBudget: 8450,
  },
  hod: {
    id: 'hod_01',
    name: 'Marcus Brody',
    email: 'marcus.brody@corporate.com',
    role: 'HOD',
    department: 'Marketing',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    title: 'VP of Marketing & Communications',
    managedEmployees: 12,
    deptBudget: 120000,
    deptSpent: 64200,
  },
  finance: {
    id: 'fin_01',
    name: 'Linda Vance',
    email: 'linda.vance@corporate.com',
    role: 'Finance',
    department: 'Finance & Audit',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    title: 'Chief Financial Auditor',
    auditsCompleted: 450,
    pendingAuditsCount: 18,
  },
  accounts: {
    id: 'acc_01',
    name: 'Gary Cooper',
    email: 'gary.cooper@corporate.com',
    role: 'Accounts',
    department: 'Accounts Payable',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    title: 'Disbursement Manager',
    batchesSettled: 84,
    pendingSettlementCount: 9,
  },
  admin: {
    id: 'adm_01',
    name: 'Donald Knuth',
    email: 'donald.knuth@corporate.com',
    role: 'Admin',
    department: 'IT Operations',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    title: 'Enterprise System Administrator',
    activePolicies: 6,
    systemUptime: '99.98%',
  }
};

export const EXPENSE_CATEGORIES = {
  TRAVEL: { label: 'Travel & Lodging', icon: 'flight', maxLimit: 2000, receiptRequired: true },
  MEALS: { label: 'Meals & Entertainment', icon: 'restaurant', maxLimit: 150, receiptRequired: true },
  EQUIPMENT: { label: 'Office Equipment', icon: 'laptop', maxLimit: 1000, receiptRequired: true },
  SOFTWARE: { label: 'Software & Subscriptions', icon: 'code', maxLimit: 300, receiptRequired: false },
  UTILITIES: { label: 'Telecom & Internet', icon: 'wifi', maxLimit: 100, receiptRequired: false },
  OTHER: { label: 'Miscellaneous', icon: 'more', maxLimit: 200, receiptRequired: true }
};

export const POLICIES = [
  { id: 'pol_1', category: 'TRAVEL', rule: 'Receipt required for flights/hotels above $50. Lodging limit capped at $250/night.', active: true },
  { id: 'pol_2', category: 'MEALS', rule: 'Business client dinner limit is capped at $75 per person. Alcohol is non-reimbursable.', active: true },
  { id: 'pol_3', category: 'EQUIPMENT', rule: 'Prior manager approval required for purchases over $500.', active: true },
  { id: 'pol_4', category: 'SOFTWARE', rule: 'SaaS subscriptions must be pre-registered with IT for security audit.', active: true },
  { id: 'pol_5', category: 'GLOBAL', rule: 'All claims must be submitted within 30 days of the expense date.', active: true },
];

export const INITIAL_EXPENSES = [
  {
    id: 'EXP-2026-001',
    title: 'AWS Cloud Hosting Fees - Q2',
    employeeId: 'emp_01',
    employeeName: 'Sarah Jenkins',
    department: 'Marketing',
    amount: 289.50,
    date: '2026-06-25',
    category: 'SOFTWARE',
    merchant: 'Amazon Web Services',
    description: 'Quarterly hosting for the campaign landing pages.',
    receiptUrl: 'aws_receipt_q2_2026.pdf',
    status: 'Approved & Settled',
    policyViolations: [],
    history: [
      { step: 'Submit', user: 'Sarah Jenkins', date: '2026-06-25', comment: 'Reimbursement for hosting campaign landing pages.' },
      { step: 'HOD Approval', user: 'Marcus Brody', date: '2026-06-26', comment: 'Approved. Essential for marketing ops.' },
      { step: 'Finance Audit', user: 'Linda Vance', date: '2026-06-27', comment: 'Audit passed. SaaS category matches billing receipt.' },
      { step: 'Settlement', user: 'Gary Cooper', date: '2026-06-28', comment: 'Payment completed. Bank transfer ID TXN982341.' }
    ]
  },
  {
    id: 'EXP-2026-002',
    title: 'Client Appreciation Dinner',
    employeeId: 'emp_02',
    employeeName: 'James Wilson',
    department: 'Sales',
    amount: 195.00,
    date: '2026-06-26',
    category: 'MEALS',
    merchant: 'Steakhouse Premier',
    description: 'Dinner with Acme Corp regional managers after contract renewal.',
    receiptUrl: 'receipt_steakhouse.png',
    status: 'Pending Finance',
    policyViolations: ['Meals limit exceeded ($150 limit)'],
    history: [
      { step: 'Submit', user: 'James Wilson', date: '2026-06-26', comment: 'Dinner with 3 Acme executives. Highly successful.' },
      { step: 'HOD Approval', user: 'Victoria Cole', date: '2026-06-27', comment: 'Approved. Worth it for the renewals, but please keep budgets in mind.' }
    ]
  },
  {
    id: 'EXP-2026-003',
    title: 'Hotel Stay - Tech Summit SF',
    employeeId: 'emp_01',
    employeeName: 'Sarah Jenkins',
    department: 'Marketing',
    amount: 720.00,
    date: '2026-06-24',
    category: 'TRAVEL',
    merchant: 'Marriott Marquis SF',
    description: '3 nights lodging for tech conference.',
    receiptUrl: 'marriott_sf_invoice.pdf',
    status: 'Pending HOD',
    policyViolations: [],
    history: [
      { step: 'Submit', user: 'Sarah Jenkins', date: '2026-06-25', comment: 'Conference hotels were booked up, stayed at official venue.' }
    ]
  },
  {
    id: 'EXP-2026-004',
    title: 'Uber rides for client meetings',
    employeeId: 'emp_03',
    employeeName: 'Emma Watson',
    department: 'Consulting',
    amount: 45.20,
    date: '2026-06-21',
    category: 'TRAVEL',
    merchant: 'Uber Inc',
    description: 'Rides to client site in Chicago.',
    receiptUrl: 'uber_receipt.png',
    status: 'Approved & Settled',
    policyViolations: [],
    history: [
      { step: 'Submit', user: 'Emma Watson', date: '2026-06-22', comment: 'Uber taxi expenses.' },
      { step: 'HOD Approval', user: 'Julian Barnes', date: '2026-06-22', comment: 'Approved.' },
      { step: 'Finance Audit', user: 'Linda Vance', date: '2026-06-23', comment: 'Approved.' },
      { step: 'Settlement', user: 'Gary Cooper', date: '2026-06-24', comment: 'Settled. Transferred.' }
    ]
  },
  {
    id: 'EXP-2026-005',
    title: 'Ergonomic Office Chair',
    employeeId: 'emp_01',
    employeeName: 'Sarah Jenkins',
    department: 'Marketing',
    amount: 499.00,
    date: '2026-06-27',
    category: 'EQUIPMENT',
    merchant: 'Herman Miller',
    description: 'Ergonomic chair upgrade for WFH wellness allowance.',
    receiptUrl: '',
    status: 'Queried',
    policyViolations: ['Receipt required for purchases over $50', 'Prior manager approval required for purchases over $500'],
    history: [
      { step: 'Submit', user: 'Sarah Jenkins', date: '2026-06-27', comment: 'WFH budget request.' },
      { step: 'Query Raised', user: 'Marcus Brody', date: '2026-06-28', comment: 'Please upload the original invoice and the HR pre-approval email for the WFH allowance.' }
    ]
  },
  {
    id: 'EXP-2026-006',
    title: 'Figma Enterprise License - June',
    employeeId: 'emp_01',
    employeeName: 'Sarah Jenkins',
    department: 'Marketing',
    amount: 150.00,
    date: '2026-06-05',
    category: 'SOFTWARE',
    merchant: 'Figma Inc.',
    description: 'Monthly license seat for freelance designer.',
    receiptUrl: 'figma_invoice_june.png',
    status: 'Approved & Settled',
    policyViolations: [],
    history: [
      { step: 'Submit', user: 'Sarah Jenkins', date: '2026-06-06', comment: 'Figma designer seat.' },
      { step: 'HOD Approval', user: 'Marcus Brody', date: '2026-06-06', comment: 'Approved.' },
      { step: 'Finance Audit', user: 'Linda Vance', date: '2026-06-07', comment: 'Approved.' },
      { step: 'Settlement', user: 'Gary Cooper', date: '2026-06-08', comment: 'Paid.' }
    ]
  },
  {
    id: 'EXP-2026-007',
    title: 'Premium Flight to London',
    employeeId: 'emp_04',
    employeeName: 'David Beckham',
    department: 'Sales',
    amount: 2850.00,
    date: '2026-06-18',
    category: 'TRAVEL',
    merchant: 'British Airways',
    description: 'Urgent flight for UK distributor partnership launch.',
    receiptUrl: 'ba_ticket_london.pdf',
    status: 'Pending Finance',
    policyViolations: ['Travel cost exceeds $2000 cap'],
    history: [
      { step: 'Submit', user: 'David Beckham', date: '2026-06-19', comment: 'Crucial deal closure flight. Premium economy booked due to availability.' },
      { step: 'HOD Approval', user: 'Victoria Cole', date: '2026-06-20', comment: 'Approved. Exemption granted because of the business impact.' }
    ]
  },
  {
    id: 'EXP-2026-008',
    title: 'Monthly Home WiFi Subsidy',
    employeeId: 'emp_05',
    employeeName: 'Alan Turing',
    department: 'Research',
    amount: 80.00,
    date: '2026-06-15',
    category: 'UTILITIES',
    merchant: 'Comcast Business',
    description: 'Reimbursement for remote worker home internet.',
    receiptUrl: 'comcast_invoice.pdf',
    status: 'Pending Settlement',
    policyViolations: [],
    history: [
      { step: 'Submit', user: 'Alan Turing', date: '2026-06-15', comment: 'Standard monthly WiFi.' },
      { step: 'HOD Approval', user: 'Grace Hopper', date: '2026-06-16', comment: 'Approved.' },
      { step: 'Finance Audit', user: 'Linda Vance', date: '2026-06-17', comment: 'Passed audit.' }
    ]
  },
  {
    id: 'EXP-2026-009',
    title: 'Marketing Team Team-Building Coffee',
    employeeId: 'emp_01',
    employeeName: 'Sarah Jenkins',
    department: 'Marketing',
    amount: 48.00,
    date: '2026-06-20',
    category: 'MEALS',
    merchant: 'Starbucks Coffee',
    description: 'Starbucks drinks and pastries for team brainstorming.',
    receiptUrl: 'starbucks_receipt.jpg',
    status: 'Approved & Settled',
    policyViolations: [],
    history: [
      { step: 'Submit', user: 'Sarah Jenkins', date: '2026-06-20', comment: 'Coffee brainstorming.' },
      { step: 'HOD Approval', user: 'Marcus Brody', date: '2026-06-21', comment: 'Approved.' },
      { step: 'Finance Audit', user: 'Linda Vance', date: '2026-06-21', comment: 'Approved.' },
      { step: 'Settlement', user: 'Gary Cooper', date: '2026-06-22', comment: 'Settled.' }
    ]
  },
  {
    id: 'EXP-2026-010',
    title: 'Developer Monitor Upgrade',
    employeeId: 'emp_06',
    employeeName: 'Linus Torvalds',
    department: 'Engineering',
    amount: 650.00,
    date: '2026-06-10',
    category: 'EQUIPMENT',
    merchant: 'Dell Store',
    description: '4K UltraSharp monitor for kernel development work.',
    receiptUrl: 'dell_receipt.pdf',
    status: 'Rejected',
    policyViolations: ['Prior manager approval required for purchases over $500'],
    history: [
      { step: 'Submit', user: 'Linus Torvalds', date: '2026-06-11', comment: 'Needed high-res screen.' },
      { step: 'Rejected', user: 'Grace Hopper', date: '2026-06-12', comment: 'Rejected. Standard monitors must be ordered through IT Procurement, not purchased out-of-pocket.' }
    ]
  }
];

export const SYSTEM_AUDIT_LOGS = [
  { id: 1, timestamp: '2026-06-29 13:45:10', actor: 'Donald Knuth (Admin)', action: 'Modified Policy Limit', detail: 'Increased TRAVEL max limit to $2000' },
  { id: 2, timestamp: '2026-06-29 11:22:04', actor: 'Gary Cooper (Accounts)', action: 'Processed Batch', detail: 'Settled 4 expenses totaling $637.50' },
  { id: 3, timestamp: '2026-06-28 16:30:11', actor: 'Linda Vance (Finance)', action: 'Flagged Exception', detail: 'Queried EXP-2026-005 due to missing documentation' },
  { id: 4, timestamp: '2026-06-28 09:12:44', actor: 'Marcus Brody (HOD)', action: 'Approved Expense', detail: 'Approved EXP-2026-001 (AWS Hosting)' },
  { id: 5, timestamp: '2026-06-27 10:05:00', actor: 'Sarah Jenkins (Employee)', action: 'Submitted Expense', detail: 'Submitted EXP-2026-005 ($499.00)' }
];
