import mongoose from 'mongoose';

const employeeAccountSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  invoiceNumber: { type: String },
  transactionType: { type: String }, 
  debit: { type: Number, default: 0 }, 
  credit: { type: Number, default: 0 }, 
  date: { type: Date, default: Date.now },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('EmployeeAccount', employeeAccountSchema);