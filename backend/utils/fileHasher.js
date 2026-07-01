import crypto from 'crypto';
import fs from 'fs';

export const computeHash = (file) => {
  try {
    if (file.path && fs.existsSync(file.path)) {
      const fileBuffer = fs.readFileSync(file.path);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }
  } catch (error) {
    console.error('Error hashing file:', error.message);
  }
  // Fallback unique hash using file details
  return crypto.createHash('sha256')
    .update(file.originalname + file.size + Date.now().toString())
    .digest('hex');
};
export default computeHash;
