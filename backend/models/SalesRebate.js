import mongoose from 'mongoose';

const salesRebateSchema = new mongoose.Schema({
  rebateNumber: {
    type: String,
    required: true,
    unique: true
  },
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: [true, 'Original sale is required']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  rebateDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

export default mongoose.model('SalesRebate', salesRebateSchema);