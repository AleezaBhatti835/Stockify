import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierCompany', default: null },
  companyName: { type: String, default: '' }, 
  contactPerson: { type: String, required: true }, 
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  cnic: { type: String, default: '' },
  status: {
    type: String,
    default: 'Active'
  },
  pic: { type: String, default: '' }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;