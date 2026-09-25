import mongoose from 'mongoose';
import '../config/env.js';
import User from '../models/User.js';
import { 
  generatePasswordResetOtp, 
  verifyResetOtp, 
  completePasswordReset,
  hashOtp 
} from '../services/authService.js';
import { ensureBootstrapData } from './bootstrapDefaults.js';

const TEST_EMAIL = 'udaykale2024.it@mmcoe.edu.in';
const INITIAL_PASSWORD = 'DevPass@123!';
const NEW_PASSWORD = 'NewSecurePassword2026!';

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('   EERS FORGOT PASSWORD & EMAIL OTP FLOW TEST SUITE    ');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eers');
  await ensureBootstrapData();

  // Reset user password to default before starting
  let user = await User.findOne({ email: TEST_EMAIL });
  if (!user) {
    console.error(`Seed user ${TEST_EMAIL} not found!`);
    process.exit(1);
  }
  user.password = INITIAL_PASSWORD;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpire = undefined;
  user.resetPasswordVerified = false;
  user.resetPasswordOtpAttempts = 0;
  await user.save();

  console.log(`Test account initialized: ${TEST_EMAIL}\n`);

  // --- Test 1: Forgot Password (OTP Generation) ---
  console.log('Test 1: Forgot Password (OTP Generation & Secure Hashing)');
  const forgotResult = await generatePasswordResetOtp(TEST_EMAIL);
  assert(forgotResult !== null, 'OTP generated successfully');
  assert(forgotResult && forgotResult.otp && forgotResult.otp.length === 6 && /^\d{6}$/.test(forgotResult.otp), 'Generated OTP is exactly 6 numeric digits');
  
  const savedUser1 = await User.findOne({ email: TEST_EMAIL }).select('+resetPasswordOtp');
  assert(savedUser1.resetPasswordOtp !== forgotResult.otp, 'OTP is NOT stored in plaintext in the database');
  assert(savedUser1.resetPasswordOtp === hashOtp(forgotResult.otp), 'Stored OTP matches SHA-256 hash of generated OTP');
  assert(savedUser1.resetPasswordOtpExpire > Date.now(), 'OTP expiration timestamp is set in future (10 min)');
  assert(savedUser1.resetPasswordVerified === false, 'Verification flag initialized to false');
  console.log(`  Generated OTP: ${forgotResult.otp} (Hashed: ${savedUser1.resetPasswordOtp.slice(0, 16)}...)`);

  // --- Test 2: Wrong OTP Submission ---
  console.log('\nTest 2: Wrong OTP Submission');
  const wrongOtpResult = await verifyResetOtp(TEST_EMAIL, '111111');
  assert(wrongOtpResult.success === false, 'Wrong OTP rejected');
  assert(wrongOtpResult.message.includes('Invalid OTP'), 'Error message indicates invalid OTP');
  
  const savedUser2 = await User.findOne({ email: TEST_EMAIL }).select('+resetPasswordOtp');
  assert(savedUser2.resetPasswordOtpAttempts === 1, 'Failed attempt counter incremented to 1');

  // --- Test 3: Correct OTP Submission ---
  console.log('\nTest 3: Correct OTP Verification');
  const correctOtpResult = await verifyResetOtp(TEST_EMAIL, forgotResult.otp);
  assert(correctOtpResult.success === true, 'Correct OTP verified successfully');
  
  const savedUser3 = await User.findOne({ email: TEST_EMAIL }).select('+resetPasswordOtp');
  assert(savedUser3.resetPasswordVerified === true, 'User marked as resetPasswordVerified = true');
  assert(savedUser3.resetPasswordOtp === undefined, 'OTP consumed and cleared from DB (Single-use)');
  assert(savedUser3.resetPasswordOtpAttempts === 0, 'Attempt counter reset to 0');

  // --- Test 7: OTP Reuse Check ---
  console.log('\nTest 7: OTP Reuse Prevention');
  const reuseResult = await verifyResetOtp(TEST_EMAIL, forgotResult.otp);
  assert(reuseResult.success === false, 'Consumed OTP cannot be reused');

  // --- Test 5: Password Reset ---
  console.log('\nTest 5: Password Reset Execution');
  const resetResult = await completePasswordReset(TEST_EMAIL, NEW_PASSWORD);
  assert(resetResult.success === true, 'Password reset succeeded');
  
  const savedUser4 = await User.findOne({ email: TEST_EMAIL }).select('+password');
  assert(savedUser4.resetPasswordVerified === false, 'Verified flag reset to false after password change');
  assert(savedUser4.resetPasswordOtpExpire === undefined, 'OTP expiration cleared');
  assert(savedUser4.refreshTokens.length === 0, 'Active refresh tokens revoked');

  // --- Test 6: Login with New Password & Rejection with Old Password ---
  console.log('\nTest 6: Authentication with New Password');
  const userForAuth = await User.findOne({ email: TEST_EMAIL }).select('+password');
  const oldPassMatch = await userForAuth.comparePassword(INITIAL_PASSWORD);
  const newPassMatch = await userForAuth.comparePassword(NEW_PASSWORD);
  assert(oldPassMatch === false, 'Old password rejected');
  assert(newPassMatch === true, 'New password accepted by bcrypt comparison');

  // --- Test 4: Expired OTP Simulation ---
  console.log('\nTest 4: Expired OTP Handling');
  const expiredGen = await generatePasswordResetOtp(TEST_EMAIL);
  // Simulate expiration by setting timestamp to past
  await User.updateOne({ email: TEST_EMAIL }, { resetPasswordOtpExpire: new Date(Date.now() - 60000) });
  const expiredVerifyResult = await verifyResetOtp(TEST_EMAIL, expiredGen.otp);
  assert(expiredVerifyResult.success === false, 'Expired OTP rejected');
  assert(expiredVerifyResult.message.includes('expired'), 'Error message clearly specifies OTP expiration');

  // --- Test 8: Resend OTP (Old OTP Invalidated, New OTP Valid) ---
  console.log('\nTest 8: Resend OTP Invalidation');
  const firstOtpData = await generatePasswordResetOtp(TEST_EMAIL);
  const firstOtp = firstOtpData.otp;
  // Resend: generate second OTP
  const secondOtpData = await generatePasswordResetOtp(TEST_EMAIL);
  const secondOtp = secondOtpData.otp;
  
  assert(firstOtp !== secondOtp, 'Resent OTP produces new random 6-digit code');
  
  const tryOldOtp = await verifyResetOtp(TEST_EMAIL, firstOtp);
  assert(tryOldOtp.success === false, 'Previous OTP invalidated upon resend');
  
  const tryNewOtp = await verifyResetOtp(TEST_EMAIL, secondOtp);
  assert(tryNewOtp.success === true, 'Newest OTP successfully verified');

  // --- Test 9: Brute-Force Rate Limiting (5 Failed Attempts) ---
  console.log('\nTest 9: Brute-Force Attempt Protection');
  const bruteOtpData = await generatePasswordResetOtp(TEST_EMAIL);
  for (let i = 1; i <= 5; i++) {
    await verifyResetOtp(TEST_EMAIL, '000000');
  }
  const after5Attempts = await verifyResetOtp(TEST_EMAIL, bruteOtpData.otp);
  assert(after5Attempts.success === false, 'OTP completely invalidated after 5 failed attempts');

  // --- Test 10: Reset Attempt Without Prior OTP Verification ---
  console.log('\nTest 10: Reset Without Verification Protection');
  await User.updateOne({ email: TEST_EMAIL }, { resetPasswordVerified: false });
  const unverifiedReset = await completePasswordReset(TEST_EMAIL, 'ShouldNotWork123');
  assert(unverifiedReset.success === false, 'Password reset rejected when unverified');

  // Restore password back to default password123 for developer convenience
  const restoreUser = await User.findOne({ email: TEST_EMAIL });
  restoreUser.password = INITIAL_PASSWORD;
  restoreUser.resetPasswordOtp = undefined;
  restoreUser.resetPasswordOtpExpire = undefined;
  restoreUser.resetPasswordVerified = false;
  restoreUser.resetPasswordOtpAttempts = 0;
  await restoreUser.save();

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passedCount}/${totalCount} TESTS PASSED (${((passedCount/totalCount)*100).toFixed(0)}%)`);
  console.log('========================================================\n');

  await mongoose.connection.close();
  process.exit(passedCount === totalCount ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
