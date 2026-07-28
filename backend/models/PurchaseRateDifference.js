import mongoose from 'mongoose';
const purchaseRateDifferenceSchema = new mongoose.Schema({
  differenceNumber: { type: String, required: true, unique: true }, // e.g., PRD-1001
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  invoiceNumber: { type: String, required: true },
  netDifference: { type: Number, required: true }, // Positive = Rate Increased, Negative = Rate Decreased
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    purchasedQuantity: { type: Number, required: true },
    prevRate: { type: Number, required: true },
    newRate: { type: Number, required: true },
    totalDifference: { type: Number, required: true }
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('PurchaseRateDifference', purchaseRateDifferenceSchema);