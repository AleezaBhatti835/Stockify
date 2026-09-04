import mongoose from 'mongoose';

const cashRegisterSchema = new mongoose.Schema({
  openingDate: {
    type: Date,
    default: Date.now
  },
  closingDate: {
    type: Date,
    default: null
  },
  openingAmount: {
    type: Number,
    default: 0
  },
  salesAmount: {
    type: Number,
    default: 0
  },
  totalReturn: {
    type: Number,
    default: 0
  },
  purchaseAmount: {
    type: Number,
    default: 0
  },
  purchaseReturnAmount: { 
    type: Number, 
    default: 0 
  },
  expenseAmount: {
    type: Number,
    default: 0
  },
  closingAmount: {
    type: Number,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('CashRegister', cashRegisterSchema);