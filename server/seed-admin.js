import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodbridge');
    console.log('MongoDB Connected for seeding...');

    // 1) Seed standard admin
    const adminEmail = 'admin@zerohunger.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const admin = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: 'adminpassword123',
        role: 'admin',
        phone: '+100000000',
        isVerified: true,
        status: 'active'
      });
      console.log('✓ Default Admin User successfully created!');
      console.log(`  Email:    ${admin.email}`);
      console.log('  Password: adminpassword123');
    } else {
      console.log(`ℹ Admin account already exists: ${adminEmail}`);
    }

    // 2) Seed super-admin
    const superAdminEmail = 'superadmin@zerohunger.com';
    const existingSuperAdmin = await User.findOne({ email: superAdminEmail });

    if (!existingSuperAdmin) {
      const superAdmin = await User.create({
        name: 'Super Administrator',
        email: superAdminEmail,
        password: 'superadminpassword123',
        role: 'super-admin',
        phone: '+188888888',
        isVerified: true,
        status: 'active'
      });
      console.log('✓ Default Super Admin User successfully created!');
      console.log(`  Email:    ${superAdmin.email}`);
      console.log('  Password: superadminpassword123');
    } else {
      console.log(`ℹ Super Admin account already exists: ${superAdminEmail}`);
    }

    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
