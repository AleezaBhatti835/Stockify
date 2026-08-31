import mongoose from 'mongoose';

const salaryCalendarSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: String, required: true },
  monthIndex: { type: Number, required: true } ,
  status: { type: String, default: 'In Active' }
}, { timestamps: true });

const SalaryCalendar = mongoose.models.SalaryCalendar || mongoose.model('SalaryCalendar', salaryCalendarSchema);

export default SalaryCalendar;