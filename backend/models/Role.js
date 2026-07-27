import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  role: { type: String, required: true, unique: true },
status: { type: String, default: 'Active' }}, { 
  timestamps: true // createdAt and updatedAt
});

export default mongoose.model('Role', roleSchema);