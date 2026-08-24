import mongoose from 'mongoose';

const employeeLoanRecoverySchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const EmployeeLoanRecovery = mongoose.model('EmployeeLoanRecovery', employeeLoanRecoverySchema);
export default EmployeeLoanRecovery;