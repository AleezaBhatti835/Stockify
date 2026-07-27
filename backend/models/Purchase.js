import mongoose from 'mongoose';

const purchaseDetailSchema = new mongoose.Schema({
  
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  expiryDate: { type: Date }, 
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  invoiceNumber: { type: String }, 
  purchaseDate: { type: Date, default: Date.now },
  totalAmount: { type: Number, required: true },
  items: [purchaseDetailSchema], 
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Completed', 'Pending', 'Returned'], default: 'Completed' }
}, { timestamps: true });

export default mongoose.model('Purchase', purchaseSchema);