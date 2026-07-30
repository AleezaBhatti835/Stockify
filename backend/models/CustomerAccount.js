import mongoose from 'mongoose';

const customerAccountSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  transactionType: {
    type: String,
    enum: {
      values: ['Sale', 'Payment', 'Refund', 'Sale Return','Sales Rebate','Sale Rate Difference'],
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
  balance: {
    type: Number,
    default: 0
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    enum: ['Sale', 'SaleReturn','SalesRebate','SaleRateDifference']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Running balance, same pattern as SupplierAccount
// For customers: Debit = customer owes us more (sale), Credit = customer paid us / we owe them (payment, refund)
customerAccountSchema.pre('save', async function () {
  if (this.isNew) {
    const session = this.$session();

    const lastTransaction = await this.constructor.findOne(
      { customer: this.customer },
      {},
      { sort: { date: -1, createdAt: -1 }, session: session }
    );

    const previousBalance = lastTransaction ? lastTransaction.balance : 0;

    this.balance = previousBalance + this.debit - this.credit;
  }
});

export default mongoose.model('CustomerAccount', customerAccountSchema);