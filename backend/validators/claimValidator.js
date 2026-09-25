import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createClaimSchema = Joi.object({
  title: Joi.string().required().trim().min(2).max(200).messages({
    'any.required': 'Expense title is required',
    'string.max': 'Title must be at most 200 characters'
  }),
  categoryId: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Category ID is required',
    'string.pattern.base': 'Invalid Category ID format'
  }),
  merchant: Joi.string().required().trim().max(200).messages({
    'any.required': 'Merchant name is required'
  }),
  amount: Joi.number().positive().max(10000000).required().messages({
    'any.required': 'Amount is required',
    'number.positive': 'Amount must be greater than zero',
    'number.max': 'Amount exceeds maximum allowed'
  }),
  date: Joi.date().required().max('now').messages({
    'any.required': 'Transaction date is required',
    'date.max': 'Date cannot be in the future'
  }),
  description: Joi.string().allow('').optional().max(2000),
  isDraft: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  departmentId: Joi.string().pattern(objectIdPattern).optional(),
  preApproved: Joi.boolean().optional(),
  receiptHash: Joi.string().allow('').optional().max(128),
  items: Joi.alternatives().try(
    Joi.string().max(50000), // JSON string
    Joi.array().items(Joi.object({
      title: Joi.string().max(200).optional(),
      itemName: Joi.string().max(200).optional(),
      categoryId: Joi.string().pattern(objectIdPattern).optional(),
      category: Joi.string().pattern(objectIdPattern).optional(),
      merchant: Joi.string().max(200).optional(),
      amount: Joi.number().positive().max(10000000).required(),
      date: Joi.date().optional(),
      description: Joi.string().allow('').optional().max(2000),
      receiptUrl: Joi.string().allow('').optional().max(500),
      receiptPublicId: Joi.string().allow('').optional().max(500),
      receiptHash: Joi.string().allow('').optional().max(128)
    }).unknown(false)).max(50)
  ).optional()
}).options({ allowUnknown: false });

export const approvalActionSchema = Joi.object({
  action: Joi.string().valid('Approve', 'Reject', 'Return for Correction').required().messages({
    'any.required': 'Review action is required',
    'any.only': 'Action must be Approve, Reject, or Return for Correction'
  }),
  remarks: Joi.string().required().trim().min(1).max(2000).messages({
    'any.required': 'Decision remarks / comment is required'
  })
}).options({ allowUnknown: false });

export const paymentSchema = Joi.object({
  transactionId: Joi.string().required().trim().min(3).max(100).messages({
    'any.required': 'Bank Transaction ID is required'
  }),
  method: Joi.string().valid('Bank Transfer', 'UPI', 'NEFT', 'RTGS', 'Cheque').optional().default('Bank Transfer')
}).options({ allowUnknown: false });

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).max(10000).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  sort: Joi.string().valid('createdAt', '-createdAt', 'amount', '-amount', 'date', '-date').optional(),
  search: Joi.string().max(200).optional().trim()
}).options({ allowUnknown: true }); // Allow other filter params

export const objectIdParamSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid resource ID format'
  })
});

export const claimIdParamSchema = Joi.object({
  claimId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid claim ID format'
  })
});
