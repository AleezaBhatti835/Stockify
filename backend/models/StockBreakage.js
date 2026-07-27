// In models/StockBreakage.js
import mongoose from "mongoose";
const stockBreakageSchema = new mongoose.Schema({
  breakageNumber: { type: String, required: true, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Must be populated
  quantity: { type: Number, required: true },
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  invoiceNumber: { type: String },
  notes: { type: String },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('StockBreakage', stockBreakageSchema);