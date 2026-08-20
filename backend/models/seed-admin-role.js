import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './models/Role.js';
import User from './models/user.js';
import { ALL_PERMISSIONS } from './config/permissions.js';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  let adminRole = await Role.findOne({ role: { $regex: /^admin$/i } });
  if (!adminRole) {
    adminRole = await Role.create({
      role: 'Admin',
      status: 'active',
      permissions: ALL_PERMISSIONS
    });
    console.log('Admin role created:', adminRole._id);
  }

  const result = await User.updateMany(
    { role: 'admin' },  // matches the plain string
    { $set: { role: adminRole._id } }
  );
  console.log('Users migrated to real Admin role:', result.modifiedCount);

  process.exit(0);
}

seed();