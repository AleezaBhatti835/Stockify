import mongoose from 'mongoose';
const customerTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true 
    }
}, { timestamps: true });

export default mongoose.model('CustomerType', customerTypeSchema);