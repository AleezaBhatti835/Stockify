import mongoose from 'mongoose';

const transporterSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  companyName: { type: String },
  vehicleNumber: { type: String },
  vehicleModel: { type: String }, 
  contact: { type: String, required: true },
  cnic: { type: String },
  address: { type: String },
  pic: { type: String },
  status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] }
}, { timestamps: true });

export default mongoose.model('Transporter', transporterSchema);