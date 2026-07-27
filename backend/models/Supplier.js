import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  ntn: { type: String },
  status: {
    type: String,
    default: 'Active'
  },
  pic: { type: String }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;