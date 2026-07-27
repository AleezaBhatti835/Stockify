// models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  uomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UOM',
    required: true
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  retailPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  openingStockQuantity: { type: Number, default: 0 },
  expiryDate: {
    type: Date
  },
openingStockLocked: { type: Boolean, default: false },
  
  reorderQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
}, {
  timestamps: true
});

export default mongoose.model('Product', productSchema);