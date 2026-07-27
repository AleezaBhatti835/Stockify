import mongoose from 'mongoose';

const employeeAccountSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required']
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  transactionType: {
    type: String,
    enum: {
      values: ['Salary', 'Advance', 'Payment', 'Bonus', 'Deduction'],
      message: '{VALUE} is not a valid transaction type'
    },
    required: [true, 'Transaction type is required']
  },
  debit: {
    type: Number,
    default: 0,
    min: [0, 'Debit cannot be negative']
  },
  credit: {
    type: Number,
    default: 0,
    min: [0, 'Credit cannot be negative']
  },
  notes: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('EmployeeAccount', employeeAccountSchema);