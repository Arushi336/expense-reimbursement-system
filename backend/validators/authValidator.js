import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Password is required',
    'string.min': 'Password must be at least 6 characters'
  }),
  role: Joi.string().valid('Employee', 'HOD', 'Finance', 'Accounts', 'Admin').optional(),
  departmentId: Joi.string().hex().length(24).optional(),
  allottedBudget: Joi.number().min(0).optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Please enter a valid email address'
  })
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required().messages({
    'any.required': 'New password is required',
    'string.min': 'New password must be at least 6 characters'
  })
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'any.required': 'New password is required',
    'string.min': 'New password must be at least 6 characters'
  })
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().optional().trim(),
  phoneNumber: Joi.string().optional().trim(),
  avatar: Joi.string().optional().trim()
});
