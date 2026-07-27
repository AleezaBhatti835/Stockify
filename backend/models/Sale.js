import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: function () {
      // A held sale can be created before a customer is picked (Walk-in),
      // but a Completed sale must always have a customer.
      return this.status !== 'Hold';
    }
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percent', 'cash'],
    default: 'percent'
  },
  discountValue: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Credit'],
    default: 'Credit'
  },
  status: {
    type: String,
    enum: ['Hold', 'Completed', 'Cancelled'],
    default: 'Completed'
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

export default mongoose.model('Sale', saleSchema);