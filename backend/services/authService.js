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

export const createPasswordResetToken = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return null;

  // Generate random token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  await user.save();
  return resetToken;
};

export const resetPassword = async (token, newPassword) => {
  // Hash token to match saved one
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) return null;

  // Set new password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshTokens = []; // Revoke active sessions

  await user.save();
  return user;
};
