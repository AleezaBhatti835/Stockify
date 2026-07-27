import mongoose from 'mongoose';

const purchaseRebateSchema = new mongoose.Schema({
  rebateNumber: {
    type: String,
    required: true,
    unique: true
  },
  purchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
    required: [true, 'Original purchase is required']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
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

export default mongoose.model('PurchaseRebate', purchaseRebateSchema);