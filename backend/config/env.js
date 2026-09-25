import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate .env in backend directory or project root directory
const backendEnvPath = path.resolve(__dirname, '..', '.env');
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
dotenv.config();

// ── Production Fail-Fast: Required Secrets ────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGO_URI'
];

const REQUIRED_SMTP_SECRETS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL'
];

const REQUIRED_CLOUDINARY_SECRETS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

// Forbidden fallback values — if any env var resolves to these, treat as missing
const FORBIDDEN_VALUES = [
  'supersecret',
  'supersecretenterpriseexpensereimbursementsystemkey2026',
  'supersecretrefreshkey2026',
  'password123',
  'changeme',
  'your-secret-here'
];

if (isProd) {
  const missing = [];

  for (const key of REQUIRED_SECRETS) {
    const val = process.env[key];
    if (!val || FORBIDDEN_VALUES.some(f => val.toLowerCase().includes(f.toLowerCase()))) {
      missing.push(key);
    }
  }

  // Check SMTP secrets if SMTP is expected to be enabled
  if (process.env.SMTP_ENABLED !== 'false') {
    for (const key of REQUIRED_SMTP_SECRETS) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  // Check Cloudinary secrets if Cloudinary is expected
  if (process.env.CLOUDINARY_ENABLED === 'true') {
    for (const key of REQUIRED_CLOUDINARY_SECRETS) {
      if (!process.env[key] || process.env[key] === 'mock_cloud_name') {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('FATAL: Missing required production environment variables:');
    missing.forEach(k => console.error(`  ✗ ${k}`));
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Application CANNOT start in production without these secrets.');
    console.error('Set them as environment variables or in .env (never commit .env).');
    process.exit(1);
  }
}

export default process.env;
