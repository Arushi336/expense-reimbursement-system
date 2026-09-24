import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'supersecretenterpriseexpensereimbursementsystemkey2026';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';
const getJwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey2026';
const getJwtRefreshExpiresIn = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: getJwtExpiresIn()
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtRefreshSecret(), {
    expiresIn: getJwtRefreshExpiresIn()
  });
};

export const storeRefreshToken = async (userId, token) => {
  await User.findByIdAndUpdate(userId, {
    $push: { refreshTokens: token }
  });
};

export const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, getJwtRefreshSecret());
    const user = await User.findById(decoded.id).select('+password').populate('department');
    if (!user || !user.refreshTokens.includes(token)) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
};

export const removeRefreshToken = async (userId, token) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: token }
  });
};

/**
 * Helper to compute SHA-256 hash for 6-digit OTP
 * Ensures OTP is never stored in plaintext in the database.
 */
export const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

/**
 * Generate a cryptographically secure 6-digit OTP for password reset
 * Invalidates any existing OTP, resets verification state, and sets 10-min expiration
 */
export const generatePasswordResetOtp = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) return null;

  // Cryptographically secure random 6-digit OTP (100000 - 999999)
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Hash OTP and store securely
  user.resetPasswordOtp = hashOtp(otp);
  user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.resetPasswordVerified = false;
  user.resetPasswordOtpAttempts = 0;

  await user.save();
  return { user, otp };
};

/**
 * Verify submitted OTP against stored hashed OTP
 * Enforces: user exists, active request, expiry check, max 5 attempts, timing-safe hash comparison
 * On success: marks resetPasswordVerified = true, invalidates OTP (single-use)
 */
export const verifyResetOtp = async (email, otp) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+resetPasswordOtp');
  if (!user) {
    return { success: false, status: 400, message: 'Invalid email or OTP' };
  }

  if (!user.resetPasswordOtp || !user.resetPasswordOtpExpire) {
    return {
      success: false,
      status: 400,
      message: 'No active password reset request found. Please request a new OTP.'
    };
  }

  // Check expiration
  if (user.resetPasswordOtpExpire < Date.now()) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    user.resetPasswordVerified = false;
    user.resetPasswordOtpAttempts = 0;
    await user.save();
    return {
      success: false,
      status: 400,
      message: 'OTP has expired. Please request a new OTP.'
    };
  }

  // Brute-force attempt protection: max 5 failed attempts
  if (user.resetPasswordOtpAttempts >= 5) {
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    user.resetPasswordVerified = false;
    user.resetPasswordOtpAttempts = 0;
    await user.save();
    return {
      success: false,
      status: 400,
      message: 'Too many failed verification attempts. This OTP has been invalidated. Please request a new OTP.'
    };
  }

  // Compare hashed OTP using timing-safe comparison
  const hashedInput = hashOtp(otp);
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(hashedInput, 'hex'),
    Buffer.from(user.resetPasswordOtp, 'hex')
  );

  if (!isMatch) {
    user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
    const attemptsRemaining = 5 - user.resetPasswordOtpAttempts;
    await user.save();
    return {
      success: false,
      status: 400,
      message: attemptsRemaining > 0
        ? `Invalid OTP. You have ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
        : 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.'
    };
  }

  // Verification successful: mark verified, single-use OTP consumed
  user.resetPasswordVerified = true;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpAttempts = 0;
  // Maintain a 10-minute session window to complete new password entry
  user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  return {
    success: true,
    message: 'OTP verified successfully'
  };
};

/**
 * Complete password reset after successful OTP verification
 * Enforces: resetPasswordVerified must be true, valid session window
 * Updates password (hashed by pre-save hook), revokes all refresh tokens
 */
export const completePasswordReset = async (email, newPassword) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return { success: false, status: 400, message: 'Invalid password reset request' };
  }

  if (!user.resetPasswordVerified) {
    return {
      success: false,
      status: 400,
      message: 'Password reset request has not been verified. Please verify your OTP first.'
    };
  }

  if (user.resetPasswordOtpExpire && user.resetPasswordOtpExpire < Date.now()) {
    user.resetPasswordVerified = false;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    await user.save();
    return {
      success: false,
      status: 400,
      message: 'Password reset session has expired. Please request a new OTP.'
    };
  }

  // Set new password (pre-save hook will hash it with bcrypt)
  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpExpire = undefined;
  user.resetPasswordVerified = false;
  user.resetPasswordOtpAttempts = 0;
  user.refreshTokens = []; // Revoke active sessions

  await user.save();
  return {
    success: true,
    message: 'Password reset successful'
  };
};
