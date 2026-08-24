import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true // e.g., "Eid-ul-Fitr", "Independence Day"
    }
}, { timestamps: true });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;