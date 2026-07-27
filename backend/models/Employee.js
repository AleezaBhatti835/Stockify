// models/Employee.js
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  // This links the employee to a specific Designation in the DB
  designation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Designation', 
    required: true 
  },
  status: { type: String, default: 'active' }, // For soft deletion
pic: { type: String, default: '' }
});

export default mongoose.model('Employee', employeeSchema);