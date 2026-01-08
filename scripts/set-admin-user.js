/**
 * Migration script to set isAdmin flag for the admin user
 * Run this script once to update existing admin user in the database
 * 
 * Usage:
 *   node scripts/set-admin-user.js
 * 
 * Or with MongoDB directly:
 *   mongosh your-database-name --eval "db.users.updateOne({email: process.env.ADMIN_EMAIL || 'contact.lunai.studio@gmail.com'}, {$set: {isAdmin: true}})"
 * 
 * The admin email is read from ADMIN_EMAIL environment variable in .env file
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  console.error('❌ ADMIN_EMAIL is not set in .env file');
  console.error('   Please add ADMIN_EMAIL=your-email@example.com to your .env file');
  process.exit(1);
}

async function setAdminUser() {
  try {
    console.log(`🔧 Setting admin privileges for: ${ADMIN_EMAIL}`);
    console.log('');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lunai';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import User model (adjust path as needed)
    const { User } = require('../server/dist/models/user.model.js');

    // Update admin user
    const result = await User.updateOne(
      { email: ADMIN_EMAIL.toLowerCase() },
      { $set: { isAdmin: true } }
    );

    if (result.matchedCount === 0) {
      console.log(`⚠️  No user found with email: ${ADMIN_EMAIL}`);
      console.log('   The user may not exist yet. They will be automatically set as admin when they register.');
    } else if (result.modifiedCount === 0) {
      console.log(`✅ User ${ADMIN_EMAIL} already has isAdmin set to true`);
    } else {
      console.log(`✅ Successfully set isAdmin=true for ${ADMIN_EMAIL}`);
    }

    // Verify
    const adminUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (adminUser) {
      console.log(`\n📋 User details:`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   isAdmin: ${adminUser.isAdmin}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Migration completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdminUser();

