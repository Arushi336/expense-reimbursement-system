import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import connectDB from './config/db.js';
import { errorHandler, requestId, requestLogger } from './middleware/errorMiddleware.js';
import { ensureBootstrapData } from './scripts/bootstrapDefaults.js';
import { verifySmtpConnection } from './config/nodemailer.js';

// Route Imports
import authRoutes from './routes/auth.js';
import claimRoutes from './routes/claims.js';
import approvalRoutes from './routes/approvals.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import reportsRoutes from './routes/reports.js';

// ES Module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── Request ID & Logging ────────────────────────────────────────────────
app.use(requestId);
app.use(requestLogger);

// ── Security Headers (Helmet) ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: isProd ? 'same-origin' : 'cross-origin' },
  contentSecurityPolicy: isProd ? undefined : false, // Disable CSP in dev for Swagger
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ── Trust proxy (for rate limiter IP detection behind reverse proxy) ────
if (isProd) {
  app.set('trust proxy', 1);
}

// ── Global Rate Limiter ─────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 200 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again after 15 minutes.' }
});
app.use('/api', globalLimiter);

// ── Auth-specific strict rate limits ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 5000, // Very strict for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-reset-otp', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/refresh', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 5000,
  message: { success: false, message: 'Too many refresh attempts.' }
}));

// ── Input Sanitization ──────────────────────────────────────────────────
app.use(mongoSanitize());
app.use(xss());

// ── Health Check (Liveness & Readiness Probes) ───────────────────────────
// Placed before CORS and rate-limiters for reliable infrastructure monitoring
app.get('/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  
  const health = {
    status: dbState === 1 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  };
  
  const statusCode = dbState === 1 ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/health/ready', async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (dbReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'database not connected' });
  }
});

// ── CORS (explicit allowlist) ───────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, mobile, and non-browser requests with no origin
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  maxAge: 600
}));

// ── Body Parsing with Size Limits ───────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Static uploads: DISABLED in production ──────────────────────────────
// In production, serve receipts through authenticated controllers only
if (!isProd) {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// ── Swagger API Documentation ───────────────────────────────────────────
// Only available in non-production environments
if (!isProd) {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'EERS Enterprise API Portal',
        version: '1.0.0',
        description: 'REST API Specs for Employee Expense Reimbursement System (EERS)',
        contact: { name: 'Enterprise IT Support Team' }
      },
      servers: [
        { url: `http://localhost:${process.env.PORT || 5000}`, description: 'Local Development Server' }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token: Bearer <token>'
          }
        }
      }
    },
    apis: [path.join(__dirname, './routes/*.js')]
  };

  const swaggerSpec = swaggerJSDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ── Mount Application Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportsRoutes);

// Base route
app.get('/', (req, res) => {
  if (isProd) {
    res.status(200).json({ message: 'EERS API', version: '1.0.0' });
  } else {
    res.redirect('/api-docs');
  }
});

// ── Central Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

// ── Server Startup ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();
    await ensureBootstrapData();

    // Verify SMTP Connection at startup
    await verifySmtpConnection();

    server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      if (!isProd) {
        console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
      }
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('FATAL: Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();

// ── Graceful Shutdown ───────────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
      } catch (err) {
        console.error('Error closing MongoDB:', err.message);
      }
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // In production, we should log but NOT crash for unhandled rejections
});

process.on('uncaughtException', (err) => {
  console.error('FATAL Uncaught Exception:', err.message);
  // Uncaught exceptions are unrecoverable — shutdown gracefully
  gracefulShutdown('uncaughtException');
});

export default app;
