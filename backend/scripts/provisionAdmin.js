import '../config/env.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Department from '../models/Department.js';

/**
 * Enterprise Production Admin Provisioning Script
 * 
 * Safely provisions the initial root administrator for EERS.
 * Does NOT contain hardcoded credentials. Credentials must be supplied
 * via environment variables or CLI arguments.
 * 
 * Usage:
 *   ADMIN_EMAIL="admin@company.com" ADMIN_PASSWORD="SecurePassword123!" ADMIN_NAME="System Administrator" node scripts/provisionAdmin.js
 * 
 * Options via CLI:
 *   --email=admin@company.com --password=... --name="Admin"
 */

const getArg = (flag) => {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`));
  return arg ? arg.split('=')[1] : null;
};

const email = process.env.ADMIN_EMAIL || getArg('email');
const password = process.env.ADMIN_PASSWORD || getArg('password');
const name = process.env.ADMIN_NAME || getArg('name') || 'Enterprise Administrator';
const employeeId = process.env.ADMIN_EMP_ID || getArg('emp-id') || 'EMP-ADMIN-01';

const validatePassword = (pass) => {
  if (!pass || pass.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(pass)) return 'Password must contain at least one number';
  return null;
};

const run = async () => {
  if (!email || !password) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('EERS Production Admin Provisioning');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('ERROR: Missing required administrator credentials.');
    console.error('');
    console.error('Supply credentials via environment variables:');
    console.error('  ADMIN_EMAIL="admin@company.com" \\');
    console.error('  ADMIN_PASSWORD="YourStrongPassword123!" \\');
    console.error('  ADMIN_NAME="Enterprise Admin" \\');
    console.error('  node scripts/provisionAdmin.js');
    console.error('');
    console.error('Or via CLI flags:');
    console.error('  node scripts/provisionAdmin.js --email=admin@company.com --password=... --name="Admin"');
    console.error('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }

  const passError = validatePassword(password);
  if (passError) {
    console.error(`FATAL: ${passError}`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('FATAL: MONGO_URI environment variable is not configured.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.role === 'Admin') {
        console.log(`Administrator account for ${email} already exists.`);
        process.exit(0);
      } else {
        console.error(`User ${email} already exists with non-admin role '${existing.role}'. Aborting.`);
        process.exit(1);
      }
    }

    // Ensure IT Operations department exists for administrative assignment
    let department = await Department.findOne({ code: 'IT' });
    if (!department) {
      department = await Department.create({
        name: 'IT Operations',
        code: 'IT',
        budget: 500000
      });
    }

    // Create the admin user (User schema pre-save hook handles bcrypt hashing)
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'Admin',
      department: department._id,
      employeeId,
      allottedBudget: 500000
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Enterprise Administrator Provisioned Successfully:');
    console.log(`  Name:        ${admin.name}`);
    console.log(`  Email:       ${admin.email}`);
    console.log(`  Role:        ${admin.role}`);
    console.log(`  Employee ID: ${admin.employeeId}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Initial setup complete. Credentials are not logged.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to provision administrator:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

run();
