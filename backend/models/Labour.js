import mongoose from 'mongoose';

const labourSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  cnic: { type: String },
  address: { type: String },
  pic: { type: String },
  status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] }
}, { timestamps: true });

export default mongoose.model('Labour', labourSchema);