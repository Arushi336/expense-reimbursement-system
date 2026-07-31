import { parser, cloudinary, isMock } from '../config/cloudinary.js';
import fs from 'fs';
import crypto from 'crypto';

export const uploadReceipt = (req, res, next) => {
  parser.single('receipt')(req, res, async (err) => {
    if (err) {
      return next(err);
    }
    if (!req.file) {
      return next();
    }

    try {
      // Pre-compute receipt hash while file is on disk
      if (req.file.path && fs.existsSync(req.file.path)) {
        const buffer = fs.readFileSync(req.file.path);
        req.file.receiptHash = crypto.createHash('sha256').update(buffer).digest('hex');
      }
    } catch (hashErr) {
      console.error('Error pre-computing receipt hash:', hashErr);
    }

    if (isMock) {
      req.file.secure_url = `/uploads/${req.file.filename}`;
      return next();
    }

    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'eers_receipts',
        resource_type: 'auto'
      });

      req.file.secure_url = result.secure_url;
      req.file.filename = result.public_id;
      req.file.public_id = result.public_id;

      // Delete temporary uploaded file after successful Cloudinary upload
      await fs.promises.unlink(req.file.path).catch(() => {});
      next();
    } catch (uploadError) {
      // Clean up temporary uploaded file on failure
      await fs.promises.unlink(req.file.path).catch(() => {});
      return next(uploadError);
    }
  });
};
