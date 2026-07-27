import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  movementType: { type: String, enum: ['IN', 'OUT'], required: true },
  quantity: { type: Number, required: true },
  referenceType: { type: String, enum: ['Purchase', 'Sale', 'Return',   'StockAdjustment','PurchaseReturn', 'SaleReturn', 'StockBreakage'] },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // Can be Purchase ID, Sale ID, etc.
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('StockMovement', stockMovementSchema);