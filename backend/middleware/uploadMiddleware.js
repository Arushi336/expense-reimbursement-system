import { parser, cloudinary, isMock } from '../config/cloudinary.js';
import fs from 'fs';
import crypto from 'crypto';

// Define explicit multipart fields to eliminate unsafe parser.any()
const uploadFields = parser.fields([
  { name: 'receipt', maxCount: 1 },
  { name: 'receipts', maxCount: 10 },
  ...Array.from({ length: 20 }, (_, i) => ({ name: `receipt_${i}`, maxCount: 1 }))
]);

export const uploadReceipt = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next();
  }
  uploadFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload validation error'
      });
    }

    // Flatten files from fields map into an array
    const allFiles = [];
    if (req.files && typeof req.files === 'object') {
      Object.values(req.files).forEach(fileArr => {
        if (Array.isArray(fileArr)) {
          allFiles.push(...fileArr);
        }
      });
    }

    req.files = allFiles;
    if (allFiles.length > 0) {
      req.file = allFiles[0];
    }

    if (allFiles.length === 0) {
      return next();
    }

    try {
      await Promise.all(allFiles.map(async (file) => {
        // Pre-compute receipt hash while file is on disk
        if (file.path && fs.existsSync(file.path)) {
          const buffer = fs.readFileSync(file.path);
          file.receiptHash = crypto.createHash('sha256').update(buffer).digest('hex');
        }

        if (isMock) {
          // Store relative path; in production access will be governed by /api/claims/:id/receipt
          file.secure_url = `/uploads/${file.filename}`;
        } else {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'eers_receipts',
            resource_type: 'auto'
          });

          file.secure_url = result.secure_url;
          file.filename = result.public_id;
          file.public_id = result.public_id;

          await fs.promises.unlink(file.path).catch(() => {});
        }
      }));

      next();
    } catch (uploadError) {
      // Clean up any remaining temporary files on disk
      if (allFiles && allFiles.length > 0) {
        await Promise.all(allFiles.map(f => f.path && fs.promises.unlink(f.path).catch(() => {})));
      }
      return next(uploadError);
    }
  });
};
