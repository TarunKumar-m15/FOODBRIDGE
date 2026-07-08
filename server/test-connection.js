import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Trying to connect to:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then((conn) => {
    console.log('SUCCESS! Connected to host:', conn.connection.host);
    console.log('Connected database name:', conn.connection.name);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILURE! Connection error details:');
    console.error(err);
    process.exit(1);
  });
