import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchNumber: { type: String, required: true }, // e.g., BATCH-001 ya supplier ka diya hua batch no.
  purchasePrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 0 }, // Is batch ki current quantity
  originalQuantity: { type: Number, required: true }, // Kitni aayi thi shuru mein
  expiryDate: { type: Date, required: true },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' }
}, { timestamps: true });

export default mongoose.model('Batch', batchSchema);