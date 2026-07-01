import Joi from 'joi';

export const createClaimSchema = Joi.object({
  title: Joi.string().required().trim().messages({
    'any.required': 'Expense title is required'
  }),
  categoryId: Joi.string().required().messages({
    'any.required': 'Category ID is required'
  }),
  merchant: Joi.string().required().trim().messages({
    'any.required': 'Merchant name is required'
  }),
  amount: Joi.number().positive().required().messages({
    'any.required': 'Amount is required',
    'number.positive': 'Amount must be greater than zero'
  }),
  date: Joi.date().required().messages({
    'any.required': 'Transaction date is required'
  }),
  description: Joi.string().allow('').optional(),
  preApproved: Joi.boolean().optional(),
  receiptHash: Joi.string().allow('').optional(),
  items: Joi.array().items(Joi.object({
    itemName: Joi.string().required(),
    amount: Joi.number().positive().required(),
    description: Joi.string().allow('').optional()
  })).optional()
});

export const approvalActionSchema = Joi.object({
  action: Joi.string().valid('Approve', 'Reject', 'Return for Correction').required().messages({
    'any.required': 'Review action is required',
    'any.only': 'Action must be Approve, Reject, or Return for Correction'
  }),
  remarks: Joi.string().required().trim().messages({
    'any.required': 'Decision remarks / comment is required'
  })
});
