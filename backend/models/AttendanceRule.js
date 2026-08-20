import mongoose from "mongoose";
const attendanceRuleSchema = new mongoose.Schema({
  shiftStartTime: { type: String, default: '09:00' },
  shiftEndTime: { type: String, default: '18:00' },
  gracePeriodMinutes: { type: Number, default: 15 },
  halfDayMinHours: { type: Number, default: 4 },
  fullDayMinHours: { type: Number, default: 8 },
  latePenaltyEnabled: { type: Boolean, default: true },
  overtimeAllowed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('AttendanceRule', attendanceRuleSchema);