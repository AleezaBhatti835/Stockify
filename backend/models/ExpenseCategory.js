import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

export default mongoose.model('ExpenseCategory', expenseCategorySchema);