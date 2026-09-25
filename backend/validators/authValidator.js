import Joi from 'joi';

// ── Common password patterns to reject ──────────────────────────────────
const COMMON_PASSWORDS = [
  'password', 'password123', 'password1', '123456', '12345678',
  'qwerty', 'abc123', 'monkey', 'master', 'dragon',
  'letmein', 'login', 'admin', 'welcome', 'passw0rd'
];

// Enterprise password: min 8 chars, 1 upper, 1 lower, 1 digit, 1 special
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/[0-9]/, 'digit')
  .pattern(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'special character')
  .custom((value, helpers) => {
    if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be at most 128 characters',
    'string.pattern.name': 'Password must contain at least one {#name}',
    'any.invalid': 'This password is too common. Please choose a stronger password.'
  });

export const registerSchema = Joi.object({
  name: Joi.string().required().trim().min(2).max(100).messages({
    'any.required': 'Name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must be at most 100 characters'
  }),
  email: Joi.string().email().required().max(255).messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  password: passwordSchema.required().messages({
    'any.required': 'Password is required'
  }),
  // NOTE: role is NOT accepted from public registration — always forced to Employee
  department: Joi.string().hex().length(24).optional(),
}).options({ allowUnknown: false });

export const loginSchema = Joi.object({
  email: Joi.string().email().required().max(255).messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  password: Joi.string().required().max(128).messages({
    'any.required': 'Password is required'
  })
}).options({ allowUnknown: false });

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().max(255).messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  })
}).options({ allowUnknown: false });

export const verifyResetOtpSchema = Joi.object({
  email: Joi.string().email().required().max(255).messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({
    'any.required': 'OTP is required',
    'string.pattern.base': 'OTP must be exactly 6 numeric digits'
  })
}).options({ allowUnknown: false });

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().max(255).messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  password: passwordSchema.required().messages({
    'any.required': 'Password is required'
  })
}).options({ allowUnknown: false });

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().max(128).messages({
    'any.required': 'Current password is required'
  }),
  newPassword: passwordSchema.required().messages({
    'any.required': 'New password is required'
  })
}).options({ allowUnknown: false });

export const updateProfileSchema = Joi.object({
  name: Joi.string().optional().trim().min(2).max(100),
  phoneNumber: Joi.string().optional().trim().max(20).pattern(/^[\+\d\s\-()]+$/),
  avatar: Joi.string().optional().trim().uri().max(500)
}).options({ allowUnknown: false });

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
}).options({ allowUnknown: false });
