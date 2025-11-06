/**
 * Admin User Creation Script
 * Run this script to create an admin user in MongoDB
 * 
 * Usage:
 *   npm run create-admin
 *   or
 *   ts-node src/scripts/createAdmin.ts
 */

import mongoose from 'mongoose';
import User from '../infrastructure/db/models/User';
import config from '../config/env';

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    if (!config.mongoURI) {
      throw new Error('MongoDB URI is not configured. Please set MONGODB_URI in your .env file');
    }

    await mongoose.connect(config.mongoURI);
    console.log('✅ Connected to MongoDB');

    // Drop old phone index if it exists (from previous schema version)
    try {
      const UserModel = mongoose.model('User');
      const indexes = await UserModel.collection.getIndexes();
      if (indexes.phone_1) {
        await UserModel.collection.dropIndex('phone_1');
        console.log('✅ Dropped old phone index');
      }
    } catch (err: any) {
      // Index might not exist, that's fine
      if (!err.message.includes('index not found')) {
        console.log('⚠️  Could not drop phone index:', err.message);
      }
    }

    // Default admin credentials (change these!)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@evolvix.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
    const adminName = process.env.ADMIN_NAME || 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    
    if (existingAdmin) {
      if (existingAdmin.roles.includes('admin')) {
        // Reset password for existing admin
        console.log('⚠️  Admin user already exists:', adminEmail);
        console.log('🔄 Resetting password...');
        
        // Delete and recreate to ensure password is properly hashed
        await User.deleteOne({ _id: existingAdmin._id });
        console.log('🗑️  Deleted existing admin user');
        
        // Create new admin user with fresh password (will be hashed by pre-save hook)
        await User.create({
          fullName: existingAdmin.fullName || adminName,
          email: adminEmail.toLowerCase(),
          password: adminPassword, // Will be hashed automatically by pre-save hook
          roles: ['admin'],
          primaryRole: 'admin',
          isActive: true,
          isEmailVerified: true,
        });
        
        console.log('✅ Password reset successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        await mongoose.connection.close();
        process.exit(0);
      } else {
        // Update existing user to admin
        existingAdmin.roles = ['admin'];
        existingAdmin.primaryRole = 'admin';
        existingAdmin.isActive = true;
        existingAdmin.isEmailVerified = true;
        
        // Set password (will be hashed by pre-save hook)
        existingAdmin.password = adminPassword;
        
        await existingAdmin.save();
        console.log('✅ Updated existing user to admin:', adminEmail);
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        await mongoose.connection.close();
        process.exit(0);
      }
    }

    // Create new admin user (password will be hashed by pre-save hook)
    await User.create({
      fullName: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword, // Will be hashed automatically by pre-save hook
      roles: ['admin'],
      primaryRole: 'admin',
      isActive: true,
      isEmailVerified: true,
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change these credentials in production!');
    console.log('You can set custom credentials using environment variables:');
    console.log('  ADMIN_EMAIL=your@email.com');
    console.log('  ADMIN_PASSWORD=YourSecurePassword');
    console.log('\nNow you can login at: http://localhost:3000/admin/login\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  createAdmin();
}

export default createAdmin;

