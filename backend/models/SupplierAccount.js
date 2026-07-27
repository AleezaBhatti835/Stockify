import mongoose from 'mongoose';

const supplierAccountSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  transactionType: {
    type: String,
    enum: {
      values: ['Purchase', 'Payment', 'Refund', 'Purchase Return','Purchase Rebate'],
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
    enum: ['Purchase', 'PurchaseReturn','PurchaseRebate']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// REMOVED the 'validate' guard so we can now have debit and credit on the same row!

// Calculate true running balance before saving
supplierAccountSchema.pre('save', async function() {
  if (this.isNew) {
    const session = this.$session(); 

    // Find the most recent transaction for this specific supplier
    const lastTransaction = await this.constructor.findOne(
      { supplier: this.supplier },
      {},
      { sort: { date: -1, createdAt: -1 }, session: session } 
    );

    const previousBalance = lastTransaction ? lastTransaction.balance : 0;

    // The math still works perfectly! 
    // Old Balance + The new bill (debit) - The cash paid today (credit)
    this.balance = previousBalance + this.debit - this.credit;
  }
});

export default mongoose.model('SupplierAccount', supplierAccountSchema);