import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.eers_access_token) {
    token = req.cookies.eers_access_token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ success: false, message: 'Server configuration error' });
      }
      
      const decoded = jwt.verify(token, secret, {
        issuer: 'eers',
        audience: 'eers-client'
      });
      
      // Ensure this is an access token, not a refresh token
      if (decoded.type !== 'access') {
        return res.status(401).json({ success: false, message: 'Invalid token type' });
      }
      
      // Get user from database, exclude sensitive fields
      req.user = await User.findById(decoded.id)
        .select('-refreshTokens -resetPasswordOtp -resetPasswordOtpExpire -resetPasswordVerified -resetPasswordOtpAttempts')
        .populate('department');
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};
