import mongoose from 'mongoose';

const salaryConfigSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true, 
    unique: true // Ek employee ki ek hi active config hogi
  },
  basicSalary: { type: Number, required: true, min: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  effectiveDate: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('SalaryConfig', salaryConfigSchema);