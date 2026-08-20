import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true
    },
    clockIn: {
        type: String, // Format: HH:mm (e.g., '09:00')
        default: ''
    },
    clockOut: {
        type: String, // Format: HH:mm (e.g., '18:00')
        default: ''
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Leave', 'Half-day', 'Late', ''],
        default: 'Present'
    },
    remarks: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ensures an employee only has one attendance record per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;