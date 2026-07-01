import { parser } from '../config/cloudinary.js';

// Expose multer parser as middleware
export const uploadReceipt = parser.single('receipt');
