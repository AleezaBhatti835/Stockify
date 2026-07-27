import mongoose from 'mongoose';

const saleDetailSchema = new mongoose.Schema({
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  lineTotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

export default mongoose.model('SaleDetail', saleDetailSchema);