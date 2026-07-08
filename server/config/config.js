import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const requiredEnvs = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingEnvs = [];

requiredEnvs.forEach((envName) => {
  if (!process.env[envName] || process.env[envName].includes('mock_')) {
    // If it's a required variable but has a mock placeholder in non-development modes, flag it
    if (process.env.NODE_ENV === 'production') {
      missingEnvs.push(envName);
    }
  }
  if (!process.env[envName]) {
    missingEnvs.push(envName);
  }
});

if (missingEnvs.length > 0) {
  console.error('\n❌ [Configuration Error] Missing required environment variables:');
  missingEnvs.forEach((env) => {
    console.error(`   - ${env}`);
  });
  console.error('Please configure these in your server/.env file.\n');
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '2525', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'no-reply@zerohunger.com',
  }
};

export default config;
