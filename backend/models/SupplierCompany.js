import mongoose from 'mongoose';

const supplierCompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  contact: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  status: { type: String, default: 'active' }
}, { timestamps: true });

export default mongoose.model('SupplierCompany', supplierCompanySchema);