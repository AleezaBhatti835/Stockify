import mongoose from 'mongoose';

const saleRateDifferenceSchema = new mongoose.Schema({
  differenceNumber: { type: String, required: true, unique: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  invoiceNumber: { type: String, required: true },
  netDifference: { type: Number, required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    soldQuantity: { type: Number, required: true },
    prevRate: { type: Number, required: true },
    newRate: { type: Number, required: true },
    totalDifference: { type: Number, required: true }
  }]
}, { timestamps: true });

export default mongoose.model('SaleRateDifference', saleRateDifferenceSchema);