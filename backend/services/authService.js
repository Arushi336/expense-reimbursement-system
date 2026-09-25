import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';

// ── JWT Configuration — NO hardcoded fallbacks ─────────────────────────
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('FATAL: JWT_SECRET not configured');
  return secret;
};

const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '15m'; // 15 min default for access token

const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('FATAL: JWT_REFRESH_SECRET not configured');
  return secret;
};

const getJwtRefreshExpiresIn = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ── Token Generation ────────────────────────────────────────────────────
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiresIn(),
      issuer: 'eers',
      audience: 'eers-client'
    }
  );
};

export const generateRefreshToken = (userId) => {
  const jti = crypto.randomUUID(); // unique token ID for reuse detection
  return jwt.sign(
    { id: userId, type: 'refresh', jti },
    getJwtRefreshSecret(),
    {
      expiresIn: getJwtRefreshExpiresIn(),
      issuer: 'eers',
      audience: 'eers-client'
    }
  );
};

// ── Refresh Token Hashing — never store raw tokens ─────────────────────
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const storeRefreshToken = async (userId, token) => {
  const hashed = hashToken(token);
  // Limit max active sessions per user to 5
  const user = await User.findById(userId).select('+refreshTokens');
  if (user) {
    if (user.refreshTokens.length >= 5) {
      // Remove oldest token
      user.refreshTokens.shift();
    }
    user.refreshTokens.push(hashed);
    await user.save({ validateModifiedOnly: true });
  }
};

export const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, getJwtRefreshSecret(), {
      issuer: 'eers',
      audience: 'eers-client'
    });
    
    if (decoded.type !== 'refresh') return null;
    
    const hashed = hashToken(token);
    const user = await User.findById(decoded.id)
      .select('+refreshTokens')
      .populate('department');
    
    if (!user) return null;
    
    // Check if hashed token exists (reuse detection)
    if (!user.refreshTokens.includes(hashed)) {
      // Possible token reuse attack — revoke ALL tokens for this user
      user.refreshTokens = [];
      await user.save({ validateModifiedOnly: true });
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
};

export const removeRefreshToken = async (userId, token) => {
  const hashed = hashToken(token);
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: hashed }
  });
};

export const revokeAllRefreshTokens = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] }
  });
};

// ── OTP Hashing ─────────────────────────────────────────────────────────
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

  // Resend cooldown: prevent resend within 60 seconds
  if (user.resetPasswordOtpExpire && user.resetPasswordOtp) {
    const timeSinceGenerated = Date.now() - (user.resetPasswordOtpExpire.getTime() - 10 * 60 * 1000);
    if (timeSinceGenerated < 60 * 1000) {
      return { user, otp: null, cooldown: true };
    }
  }

  // Cryptographically secure random 6-digit OTP (100000 - 999999)
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Hash OTP and store securely
  user.resetPasswordOtp = hashOtp(otp);
  user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.resetPasswordVerified = false;
  user.resetPasswordOtpAttempts = 0;

  await user.save({ validateModifiedOnly: true });
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
    await user.save({ validateModifiedOnly: true });
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
    await user.save({ validateModifiedOnly: true });
    return {
      success: false,
      status: 429,
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
    await user.save({ validateModifiedOnly: true });
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
  await user.save({ validateModifiedOnly: true });

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
    await user.save({ validateModifiedOnly: true });
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
  user.refreshTokens = []; // Revoke all active sessions

  await user.save();
  return {
    success: true,
    message: 'Password reset successful'
  };
};
