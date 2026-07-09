import User from '../models/User.js';
import sendEmail from '../config/nodemailer.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  storeRefreshToken, 
  verifyRefreshToken, 
  removeRefreshToken, 
  createPasswordResetToken, 
  resetPassword 
} from '../services/authService.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, allottedBudget } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Employee',
      department: department || null,
      allottedBudget: allottedBudget || 10000
    });

    if (user) {
      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      await storeRefreshToken(user._id, refreshToken);

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
    const user = await User.findOne({ email }).select('+password').populate('department');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid corporate email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

    res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
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

// @desc    Token Refresh
// @route   POST /api/auth/refresh
// @access  Public
export const refreshSession = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const user = await verifyRefreshToken(refreshToken);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token
    await removeRefreshToken(user._id, refreshToken);
    await storeRefreshToken(user._id, newRefreshToken);

    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const resetToken = await createPasswordResetToken(email);

    if (!resetToken) {
      return res.status(404).json({ success: false, message: 'No user registered with that email' });
    }

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email,
        subject: 'EERS Password Reset Request',
        message
      });

      res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Password reset email dispatch failed:', error.message);
      // Clean up fields on failure
      const user = await User.findOne({ email });
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPasswordController = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    const user = await resetPassword(token, password);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token: accessToken,
      refreshToken: refreshToken
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
    user.refreshTokens = []; // Revoke active refresh tokens
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await storeRefreshToken(user._id, refreshToken);

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
    const { refreshToken } = req.body;
    if (refreshToken) {
      await removeRefreshToken(req.user._id, refreshToken);
    }
    res.status(200).json({ success: true, message: 'Successfully signed out of session console.' });
  } catch (error) {
    next(error);
  }
};
