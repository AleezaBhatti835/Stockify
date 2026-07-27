import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  designation: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    default: 'Active' 
  }
});

export default mongoose.model('Designation', designationSchema);