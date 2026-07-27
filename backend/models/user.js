
import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cnic: { type: String },
  contact: { type: String },
  address: { type: String },
  status: { type: String,  default: 'Active' },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true }, 
  pic: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema);