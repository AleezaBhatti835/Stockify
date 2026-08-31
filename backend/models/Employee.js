// models/Employee.js
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
joiningDate: { type: Date, default: Date.now },  designation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Designation', 
    required: true 
  },
    address: { type: String },
  cnic: { type: String },

  status: { type: String, default: 'active' }, 
pic: { type: String, default: '' }
});

export default mongoose.model('Employee', employeeSchema);