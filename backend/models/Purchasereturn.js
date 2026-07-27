import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },

});

const purchaseReturnSchema = new mongoose.Schema({
  returnNumber: { type: String, unique: true },
  // Make purchase optional by removing required: true
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: false },
  invoiceNumber: {
    type: String, 
    required: false
  },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  returnDate: { type: Date, default: Date.now },
  items: [returnItemSchema],
  totalAmount: { type: Number, required: true },
  refundMethod: {
    type: String,
    enum: ['Credit Note', 'Refund'],
    default: 'Credit Note'
  },
  status: {
    type: String,
   
  },
  notes: { type: String },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('PurchaseReturn', purchaseReturnSchema);