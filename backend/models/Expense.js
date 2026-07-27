import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: [true, 'Expense category is required']
  },
  expenseName: {
    type: String,
    required: [true, 'Expense name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  addedBy: {
    type: String,
    required: [true, 'Added by is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);