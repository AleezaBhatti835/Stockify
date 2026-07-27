import mongoose from 'mongoose';

const saleReturnSchema = new mongoose.Schema({
  returnNumber: { type: String, required: true, unique: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null }, // Null if without invoice
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    reason: { type: String, default: 'Customer Return' }
  }],
  totalAmount: { type: Number, required: true },
  returnDate: { type: Date, default: Date.now },
  isBlindReturn: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('SaleReturn', saleReturnSchema);