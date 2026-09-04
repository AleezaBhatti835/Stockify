import mongoose from 'mongoose';

const labourAccountSchema = new mongoose.Schema({
  labour: { type: mongoose.Schema.Types.ObjectId, ref: 'Labour', required: true },
  invoiceNumber: { type: String },
  transactionType: { type: String, required: true }, 
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceModel: { type: String },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('LabourAccount', labourAccountSchema);