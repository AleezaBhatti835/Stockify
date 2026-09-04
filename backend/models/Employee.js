import mongoose from 'mongoose';
const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  cnic: { type: String },
  address: { type: String },
  pic: { type: String },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', required: false },
  joiningDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  
  employeeType: { type: String, enum: ['Employee', 'Salesman'], default: 'Employee' },
  commission: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Employee', employeeSchema);