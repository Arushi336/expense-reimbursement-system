import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if credentials are mock or empty
const isMock = !process.env.CLOUDINARY_CLOUD_NAME || 
               process.env.CLOUDINARY_CLOUD_NAME === 'mock_cloud_name';

if (!isMock) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.pdf']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `receipt-${randomName}${ext}`);
  }
});

const parser = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,                 // max 10 files
    fields: 25                 // max 25 text fields
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Strict MIME & Extension checks
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Invalid file type: Only PNG, JPEG, JPG, and PDF are allowed'), false);
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid file extension: Only .png, .jpg, .jpeg, and .pdf are allowed'), false);
    }
    
    // Validate field name matches expected receipt patterns
    if (file.fieldname !== 'receipt' && !/^receipt_\d+$/.test(file.fieldname) && file.fieldname !== 'receipts') {
      return cb(new Error(`Unexpected multipart field name: ${file.fieldname}`), false);
    }
    
    cb(null, true);
  }
});

export { parser, cloudinary, isMock };
