import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
  permissions: { type: [String], default: [] }, // NEW: Permissions array
  status: { type: String, default: 'Active' }
}, { 
  timestamps: true 
});

export default mongoose.model('Role', roleSchema);