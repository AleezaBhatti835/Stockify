import mongoose from 'mongoose';

const employeeLoanSchema = new mongoose.Schema({
  loanNumber: { type: String, required: true, unique: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  amount: { type: Number, required: true, min: 1 },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  status: { type: String, enum: ['Active', 'Cleared', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.model('EmployeeLoan', employeeLoanSchema);