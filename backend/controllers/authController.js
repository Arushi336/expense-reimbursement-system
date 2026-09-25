import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import sendEmail from '../config/nodemailer.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  storeRefreshToken, 
  verifyRefreshToken, 
  removeRefreshToken,
  revokeAllRefreshTokens,
  generatePasswordResetOtp, 
  verifyResetOtp, 
  completePasswordReset 
} from '../services/authService.js';

// ── Helper: Create audit log (never throws) ────────────────────────────
const auditLog = async (actor, action, detail, ip) => {
  try {
    await AuditLog.create({ actor, action, detail, ipAddress: ip });
  } catch (err) {
    // Audit logging must never break the request
    console.error('Audit log write failed:', err.message);
  }
};

// ── Cookie Helpers (HttpOnly, Secure, SameSite) ─────────────────────────
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (accessToken) {
    res.cookie('eers_access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
  }
  if (refreshToken) {
    res.cookie('eers_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
};

const clearAuthCookies = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('eers_access_token', { httpOnly: true, secure: isProd, sameSite: 'lax' });
  res.clearCookie('eers_refresh_token', { httpOnly: true, secure: isProd, sameSite: 'lax' });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// SECURITY: Public registration ALWAYS creates Employee role only.
// Only Admin can create other roles via /api/admin/users
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;
    // CRITICAL: Ignore any role submitted by the client
    // Public registration can only create Employee accounts.

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'Employee', // FORCED — never trust client-supplied role
      department: department || null,
      allottedBudget: 10000
    });

    if (user) {
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      await storeRefreshToken(user._id, refreshToken);

      await auditLog(user._id, 'USER_CREATED', `Self-registered Employee account: ${user.email}`, req.ip);

      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        token: accessToken,
        refreshToken: refreshToken
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password').populate('department');
    
    // Use generic error message — never reveal whether email exists
    if (!user || !(await user.comparePassword(password))) {
      // Log failed attempt
      if (user) {
        await auditLog(user._id, 'LOGIN_FAILURE', `Failed login attempt for ${email}`, req.ip);
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

    await auditLog(user._id, 'LOGIN_SUCCESS', `Successful login: ${user.email} (${user.role})`, req.ip);

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      allottedBudget: user.allottedBudget,
      employeeId: user.employeeId,
      phoneNumber: user.phoneNumber,
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('department');
    if (user) {
      res.status(200).json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        allottedBudget: user.allottedBudget,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, phoneNumber, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = name || user.name;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.avatar = avatar || user.avatar;

      const updatedUser = await user.save();
      res.status(200).json({
        success: true,
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        phoneNumber: updatedUser.phoneNumber,
        avatar: updatedUser.avatar
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Token Refresh with Rotation
// @route   POST /api/auth/refresh
// @access  Public
export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.eers_refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const user = await verifyRefreshToken(refreshToken);
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token: remove old, store new
    await removeRefreshToken(user._id, refreshToken);
    await storeRefreshToken(user._id, newRefreshToken);

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password (Request 6-digit OTP via Email)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const otpData = await generatePasswordResetOtp(cleanEmail);

    // Email enumeration protection:
    // If the account does not exist, return generic success message without leaking account existence
    if (!otpData) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this corporate email, a 6-digit password reset OTP has been sent.'
      });
    }

    // Resend cooldown
    if (otpData.cooldown) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this corporate email, a 6-digit password reset OTP has been sent.'
      });
    }

    const { otp } = otpData;

    // Plain text email message
    const plainTextMessage = `EERS Password Reset\n\nYour password reset OTP is:\n\n${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request a password reset, please ignore this email.`;

    // Rich HTML email message with enterprise branding
    const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 520px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #082a4a; padding: 28px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 12px; }
    .content { padding: 32px; text-align: center; }
    .title { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .desc { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { display: inline-block; background: #f0f7ff; border: 2px dashed #0273c7; border-radius: 12px; padding: 16px 36px; margin: 8px 0 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0273c7; margin: 0; }
    .timer { font-size: 13px; color: #0284c7; font-weight: 600; margin-bottom: 20px; }
    .warning { font-size: 12px; color: #94a3b8; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px; line-height: 1.5; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Fluid Controls Pvt. Ltd.</h1>
      <p>Expense Reimbursement System (EERS)</p>
    </div>
    <div class="content">
      <div class="title">Password Reset OTP</div>
      <div class="desc">You recently requested a password recovery code for your corporate EERS account. Please use the verification code below:</div>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <div class="timer">⏱ This OTP is valid for 10 minutes.</div>
      <div class="warning">
        If you did not request a password reset, please ignore this email or contact corporate IT security immediately.
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from EERS. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`;

    try {
      await sendEmail({
        email: cleanEmail,
        subject: 'EERS Password Reset OTP',
        message: plainTextMessage,
        html: htmlMessage
      });

      await auditLog(null, 'PASSWORD_RESET_REQUESTED', `Password reset OTP requested for ${cleanEmail}`, req.ip);

      // DO NOT expose OTP in response
      res.status(200).json({
        success: true,
        message: 'If an account exists for this corporate email, a 6-digit password reset OTP has been sent.'
      });
    } catch (error) {
      console.error('Password reset OTP email dispatch failed');

      // Clean up fields on email failure
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpire = undefined;
        user.resetPasswordVerified = false;
        user.resetPasswordOtpAttempts = 0;
        await user.save({ validateModifiedOnly: true });
      }

      return res.status(500).json({ 
        success: false, 
        message: 'Unable to send password reset OTP. Please try again later.' 
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Reset Password OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
export const verifyResetOtpController = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyResetOtp(email, otp);

    if (!result.success) {
      await auditLog(null, 'OTP_FAILED', `OTP verification failed for ${email}`, req.ip);
      return res.status(result.status || 400).json({
        success: false,
        message: result.message
      });
    }

    await auditLog(null, 'OTP_VERIFIED', `OTP verified successfully for ${email}`, req.ip);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password (After Successful OTP Verification)
// @route   PUT /api/auth/reset-password
// @access  Public
export const resetPasswordController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await completePasswordReset(email, password);
    if (!result.success) {
      await auditLog(null, 'PASSWORD_RESET_FAILURE', `Password reset failed for ${email}`, req.ip);
      return res.status(result.status || 400).json({
        success: false,
        message: result.message
      });
    }

    await auditLog(null, 'PASSWORD_RESET_SUCCESS', `Password reset completed for ${email}`, req.ip);

    // Do not automatically log the user in.
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password (Authenticated Session)
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Invalid current password' });
    }

    user.password = newPassword;
    user.refreshTokens = []; // Revoke all active refresh tokens
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

    await auditLog(user._id, 'PASSWORD_CHANGED', `Password changed for ${user.email}`, req.ip);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout User / Revoke Session
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.eers_refresh_token || req.body?.refreshToken;
    if (refreshToken && req.user?._id) {
      await removeRefreshToken(req.user._id, refreshToken);
    }
    
    clearAuthCookies(res);
    
    await auditLog(req.user._id, 'LOGOUT', `User logged out: ${req.user.email}`, req.ip);
    
    res.status(200).json({ success: true, message: 'Successfully signed out of session console.' });
  } catch (error) {
    next(error);
  }
};
