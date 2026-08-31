import mongoose from 'mongoose';

const salaryConfigSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  employeeType: { 
    type: String, 
    default: 'Staff' 
  },
  monthlySalary: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  allowanceAmount: { 
    type: Number, 
    default: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  salaryWithAttendance: { 
    type: String, 
    default: 'Yes' 
  },
  wefDate: { 
    type: Date 
  },
  notes: { 
    type: String 
  }
}, { timestamps: true });

const SalaryConfig = mongoose.models.SalaryConfig || mongoose.model('SalaryConfig', salaryConfigSchema);

export default SalaryConfig;