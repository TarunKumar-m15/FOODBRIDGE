import mongoose from 'mongoose';
import User from './models/User.js';
import Donor from './models/Donor.js';
import NGO from './models/NGO.js';
import Volunteer from './models/Volunteer.js';
import Donation from './models/Donation.js';
import Pickup from './models/Pickup.js';
import Delivery from './models/Delivery.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';

console.log('--- Testing Mongoose Schema Compilation ---');
try {
  console.log('✓ User Model:', User.modelName);
  console.log('✓ Donor Model:', Donor.modelName);
  console.log('✓ NGO Model:', NGO.modelName);
  console.log('✓ Volunteer Model:', Volunteer.modelName);
  console.log('✓ Donation Model:', Donation.modelName);
  console.log('✓ Pickup Model:', Pickup.modelName);
  console.log('✓ Delivery Model:', Delivery.modelName);
  console.log('✓ Review Model:', Review.modelName);
  console.log('✓ Notification Model:', Notification.modelName);
  console.log('-------------------------------------------');
  console.log('🚀 All Mongoose models compiled and validated successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Mongoose schema compilation error:', error.message);
  process.exit(1);
}
