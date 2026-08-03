import { parser, cloudinary, isMock } from '../config/cloudinary.js';
import fs from 'fs';
import crypto from 'crypto';

export const uploadReceipt = (req, res, next) => {
  parser.any()(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    if (!req.files || req.files.length === 0) {
      return next();
    }

    try {
      await Promise.all(req.files.map(async (file) => {
        // Pre-compute receipt hash while file is on disk
        if (file.path && fs.existsSync(file.path)) {
          const buffer = fs.readFileSync(file.path);
          file.receiptHash = crypto.createHash('sha256').update(buffer).digest('hex');
        }

        if (isMock) {
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

      // Set req.file to first file for backward compatibility
      if (req.files.length > 0) {
        req.file = req.files[0];
      }

      next();
    } catch (uploadError) {
      if (req.files) {
        await Promise.all(req.files.map(f => f.path && fs.promises.unlink(f.path).catch(() => {})));
      }
      return next(uploadError);
    }
  });
};
