import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },
  pic: { type: String }, 
  cnic: { type: String },
  city: { type: String }, 
  customerTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerType',
        default: null
    },
  status: { 
    type: String, 
    default: 'active' 
  }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);