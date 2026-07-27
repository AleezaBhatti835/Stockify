// models/StockAdjustment.js
import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema({
  adjustmentNumber: { type: String, unique: true }, // e.g. ADJ-0001
  invoiceNumber: { type: String },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  adjustmentType: { type: String, enum: ['Increase', 'Decrease'], required: true },
  quantity: { type: Number, required: true, min: 1 }, // how much was adjusted
  previousQuantity: { type: Number, required: true }, // stock before adjustment
  newQuantity: { type: Number, required: true }, // stock after adjustment
  reason: {
    type: String,
    enum: ['Damaged', 'Lost / Stolen', 'Expired', 'Found / Recount', 'Correction', 'Other'],
    required: true
  },
  notes: { type: String, trim: true }
}, { timestamps: true });

export default mongoose.model('StockAdjustment', stockAdjustmentSchema);