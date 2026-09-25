import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('FATAL: MONGO_URI environment variable is not set');
    process.exit(1);
  }
  
  // Never log the full connection string (contains credentials)
  const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  
  try {
    const conn = await mongoose.connect(mongoUri, {
      // Production-safe defaults
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
