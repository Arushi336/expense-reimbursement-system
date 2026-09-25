export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({ success: false, message: 'Validation Failed', errors });
    }
    req.body = value;
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({ success: false, message: 'Validation Failed', errors });
    }
    req.query = value; // Use sanitized/validated values
    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false, allowUnknown: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({ success: false, message: 'Validation Failed', errors });
    }
    req.params = value;
    next();
  };
};
