import crypto from 'crypto';

// ── Request ID middleware ──────────────────────────────────────────────
export const requestId = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

// ── Request logging middleware ─────────────────────────────────────────
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100)
    };
    
    if (req.user) {
      logData.userId = req.user._id;
      logData.role = req.user.role;
    }
    
    // Log errors at error level, everything else at info
    if (res.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(logData));
    }
    // Don't log every successful request in production to reduce noise
  });
  
  next();
};

// ── Central Error Handler ──────────────────────────────────────────────
export const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Log detailed error internally (never to client)
  console.error(`[ERROR] requestId=${req.requestId || 'unknown'}`, {
    message: err.message,
    name: err.name,
    code: err.code,
    ...(isProd ? {} : { stack: err.stack })
  });

  let statusCode = 500;
  let message = 'An unexpected error occurred';

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value detected';
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Multer / Upload Error
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the maximum limit of 5MB';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Maximum number of files exceeded';
    } else {
      message = 'File upload error';
    }
  }

  if (err.message && err.message.includes('Only PNG, JPEG, JPG, and PDF')) {
    statusCode = 400;
    message = err.message;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Express body parser errors
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
  }

  // Send safe response — NEVER expose stack traces, paths, or internals in production
  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(isProd ? {} : { stack: err.stack })
  });
};
