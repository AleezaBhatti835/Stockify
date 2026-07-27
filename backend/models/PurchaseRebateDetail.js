import mongoose from 'mongoose';

const purchaseRebateDetailSchema = new mongoose.Schema({
  rebate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseRebate',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be greater than zero']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

export default mongoose.model('PurchaseRebateDetail', purchaseRebateDetailSchema);