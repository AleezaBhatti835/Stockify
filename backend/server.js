import 'dotenv/config';
import express, { json } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
export const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      let token = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (!token && req.query && req.query.token) {
        token = req.query.token;
      }

      if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
      }

      // STRICT POPULATION
      const user = await User.findById(decoded.userId).populate('role');
      if (!user || user.status === 'Inactive') {
        return res.status(401).json({ success: false, message: 'Unauthorized: User not found or inactive' });
      }

      let roleName = user.role?.role || user.role?.name || '';

      // 1. STRICT ADMIN CHECK (Exact match, no includes)
      if (user.email === 'admin@gmail.com' || roleName.trim().toLowerCase() === 'admin') {
        req.user = user;
        return next();
      }

      // 2. STRICT PERMISSION CHECK
      const userPermissions = user.role?.permissions || [];
      if (requiredPermission && !userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You do not have the '${requiredPermission}' permission.`
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authorization Middleware Error:', error);
      return res.status(500).json({ success: false, message: 'Server authorization error' });
    }
  };
};
import User from './models/user.js';
import Role from './models/Role.js';
import Customer from './models/Customer.js';
import Supplier from './models/Supplier.js';
import Designation from './models/Designation.js';
import Employee from './models/Employee.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import UOM from './models/UOM.js';
import Purchase from './models/Purchase.js';
import StockMovement from './models/StockMovement.js';
import SupplierAccount from './models/SupplierAccount.js';
import Counter from './models/Counter.js';
import PurchaseReturn from './models/Purchasereturn.js';
import StockAdjustment from './models/StockAdjustment.js';
import Sale from './models/Sale.js';
import SaleDetail from './models/SaleDetail.js';
import CustomerAccount from './models/CustomerAccount.js';
import PrintSettings from './models/Printsettings.js';
import Client from './models/Client.js';
import CashRegister from './models/CashRegister.js';
import CustomerType from './models/CustomerType.js';
import Holiday from './models/Holiday.js';
import SaleReturn from './models/SaleReturn.js';
import EmployeeAccount from './models/EmployeeAccount.js';
import ExpenseCategory from './models/ExpenseCategory.js';
import Expense from './models/Expense.js';
import StockBreakage from './models/StockBreakage.js';
import PurchaseRebate from './models/PurchaseRebate.js';
import PurchaseRebateDetail from './models/PurchaseRebateDetail.js';
import PurchaseRateDifference from './models/PurchaseRateDifference.js'
import SalesRebate from './models/SalesRebate.js';
import SalesRebateDetail from './models/SalesRebateDetail.js';
import SalaryCalendar from './models/Calendar.js';
import SaleRateDifference from './models/SaleRateDifference.js';
import Attendance from './models/Attendance.js';
import EmployeeLoanRecovery from './models/EmployeeLoanRecovery.js';
import AttendanceRule from './models/AttendanceRule.js';
import Batch from './models/Batch.js';
import EmployeeLoan from './models/EmployeeLoan.js';
import SalaryConfig from './models/SalaryConfig.js';
console.log("Checking URI:", process.env.MONGO_URI);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory at', uploadDir);
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Connection error:', err));

const VALID_SIZES = ['A4', 'A5', 'Thermal58'];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/api/upload', authorize('settings_edit'), upload.single('image'), (req, res) => {  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
  const { email, password, rememberMe } = req.body; 
  try {
    const user = await User.findOne({ email }).populate('role');

    if (user && user.password === password) {
      
      if (user.resetAttempts > 0 || user.resetPasswordToken) {
        user.resetAttempts = 0;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
      }

      const { password: _pw, ...userData } = user.toObject();
            const expiresIn = rememberMe ? '30d' : '1d';

      const token = jwt.sign(
        { userId: user._id, role: user.role }, 
        process.env.JWT_SECRET || 'secret_key', 
        { expiresIn: expiresIn }
      );

      return res.json({ success: true, user: userData, token });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== GET LAST INVOICE NUMBER ====================
app.get('/api/purchases/last-invoice', authorize('purchases_view'), async (req, res) => {  try {
    const lastPurchase = await Purchase.findOne()
      .sort({ createdAt: 1 })
      .select('invoiceNumber');

    let lastInvoiceNumber = null;
    if (lastPurchase && lastPurchase.invoiceNumber) {
      lastInvoiceNumber = lastPurchase.invoiceNumber;
    }

    res.json({ lastInvoiceNumber });
  } catch (error) {
    console.error('Error fetching last invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROLES ====================
app.post('/api/roles', authorize('roles_add'), async (req, res) => {  try {
    const { role, permissions } = req.body;
    const newRole = await Role.create({
      role: role.trim(),
      permissions: permissions || []
    });
    return res.status(201).json(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    return res.status(400).json({ message: 'Save failed', error: error.message });
  }
});

app.put('/api/roles/:id', authorize('roles_edit'), async (req, res) => {  if (!req.params.id || req.params.id === 'null') {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  try {
    const { role, permissions } = req.body;
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { 
        role: role ? role.trim() : undefined,
        permissions: permissions || []
      },
      { returnDocument: 'after' }
    );
    return res.json(updatedRole);
  } catch (error) {
    console.error("Backend PUT Error:", error);
    return res.status(500).json({ message: 'Error updating role', error: error.message });
  }
});

app.get('/api/roles/:id/users', authorize('roles_view'), async (req, res) => {  try {
    const users = await User.find({ role: req.params.id, status: { $ne: 'Inactive' } }).select('name email');
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/roles', authorize('dashboard_view'), async (req, res) => {  try {
    const roles = await Role.find({ status: { $ne: 'Inactive' } });
    return res.json({ success: true, roles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});



app.delete('/api/roles/:id', authorize('roles_delete'), async (req, res) => {  const { id } = req.params;
  try {
    const activeUsers = await User.find({ role: id, status: { $ne: 'Inactive' } });

    if (activeUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role: It is currently assigned to active users.'
      });
    }

    const deletedRole = await Role.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );

    if (deletedRole) {
      return res.json({ success: true, message: 'Role deleted successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
  } catch (error) {
    console.error("Delete Role Error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== USERS ====================
app.post('/api/users', authorize('users_add'), async (req, res) => {  try {
    const newUser = await User.create(req.body);
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(400).json({ message: 'Error creating user', error });
  }
});

app.get('/api/users', authorize('users_view'), async (req, res) => {  try {
    const users = await User.find({ status: { $ne: 'Inactive' } }).populate('role');
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
});

app.put('/api/users/:id', authorize('users_edit'), async (req, res) => {  if (!req.params.id || req.params.id === 'null') {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    return res.json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating user', error });
  }
});

app.delete('/api/users/:id', authorize('users_delete'), async (req, res) => {  try {
    await User.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { returnDocument: 'after' });
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting user', error });
  }
});

// ==================== RESET PASSWORD ====================
app.put('/api/users/:id/reset-password', authorize('users_edit'), async (req, res) => {  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.password !== currentPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ success: false, message: 'Server error while resetting password.' });
  }
});

// ==================== CUSTOMERS ====================
app.get('/api/customers', authorize('customers_view'), async (req, res) => {  try {
    const customers = await Customer.find({ status: { $ne: 'Inactive' } })
      .populate('customerTypeId', 'name');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

app.post('/api/customers', authorize('customers_add'), async (req, res) => {  try {
    const newCustomer = await Customer.create(req.body);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating customer', error });
  }
});

app.put('/api/customers/:id', authorize('customers_edit'), async (req, res) => {  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer', error });
  }
});

app.delete('/api/customers/:id', authorize('customers_delete'), async (req, res) => {  try {
    await Customer.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { returnDocument: 'after' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting customer', error });
  }
});

// ==================== SUPPLIERS ====================
app.get('/api/suppliers', authorize('suppliers_view'), async (req, res) => {  try {
    const suppliers = await Supplier.find({ status: { $ne: 'Inactive' } });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
});

app.post('/api/suppliers', authorize('suppliers_add'), async (req, res) => {  try {
    const newSupplier = await Supplier.create(req.body);
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error("MONGOOSE ERROR:", error.message, error);
    res.status(400).json({ message: 'Error creating supplier', error });
  }
});

app.put('/api/suppliers/:id', authorize('suppliers_edit'), async (req, res) => {  try {
    const updatedSupplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(updatedSupplier);
  } catch (error) {
    res.status(400).json({ message: 'Error updating supplier', error });
  }
});

app.delete('/api/suppliers/:id', authorize('suppliers_delete'), async (req, res) => {  try {
    await Supplier.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { returnDocument: 'after' });
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting supplier', error });
  }
});

// ==================== DESIGNATIONS ====================
app.post('/api/designations', authorize('settings_edit'), async (req, res) => {  try {
    const newDesignation = await Designation.create(req.body);
    return res.status(201).json(newDesignation);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating designation', error });
  }
});

app.get('/api/designations', authorize('settings_view'), async (req, res) => {  try {
    const designations = await Designation.find({ status: { $ne: 'inactive' } });
    return res.json(designations);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/designations/:id', authorize('settings_edit'), async (req, res) => {  if (!req.params.id) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  try {
    const updatedDesignation = await Designation.findByIdAndUpdate(
      req.params.id,
      { designation: req.body.designation },
      { returnDocument: 'after' }
    );
    return res.json(updatedDesignation);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating designation', error });
  }
});

app.delete('/api/designations/:id', authorize('settings_edit'), async (req, res) => {  const { id } = req.params;
  try {
    const employeeUsingDesignation = await Employee.findOne({ designation: id });

    if (employeeUsingDesignation) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete: This designation is currently assigned to one or more employees.'
      });
    }

    const deletedDesignation = await Designation.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );

    if (deletedDesignation) {
      return res.json({ success: true, message: 'Designation deleted successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }
  } catch (error) {
    console.error('Error deleting designation:', error);
    return res.status(500).json({ success: false, message: 'Server error while deleting designation' });
  }
});

// ==================== EMPLOYEES ====================
app.post('/api/employees', authorize('employees_add'), async (req, res) => {  try {
    const newEmployee = await Employee.create(req.body);
    const populatedEmployee = await Employee.findById(newEmployee._id).populate('designation');
    return res.status(201).json(populatedEmployee);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating employee', error });
  }
});

app.get('/api/employees', authorize('employees_view'), async (req, res) => {  try {
    const employees = await Employee.find({ status: { $ne: 'inactive' } }).populate('designation');
    return res.json(employees);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
app.put('/api/employees/:id', authorize('employees_edit'), async (req, res) => {
  try {
    const { status, joiningDate, ...rest } = req.body;
    const existingEmp = await User.findById ? await mongoose.model('Employee').findById(req.params.id) : null;

    let updateData = { ...rest, status };
    
    // Agar employee pehle inactive tha aur ab dobara 'Active' kiya gaya hai,
    // aur admin ne nayi joining date nahi di, toh system auto aaj ki date set kar dega.
    if (existingEmp && existingEmp.status === 'inactive' && status === 'Active') {
        updateData.joiningDate = joiningDate || new Date();
    } else if (joiningDate) {
        updateData.joiningDate = joiningDate;
    }

    const updatedEmployee = await mongoose.model('Employee').findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after' }
    ).populate('designation');
    
    return res.json(updatedEmployee);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
});

app.delete('/api/employees/:id', authorize('employees_delete'), async (req, res) => {  try {
    const deletedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );
    if (deletedEmployee) {
      return res.json({ success: true, message: 'Employee deactivated successfully' });
    } else {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== EMPLOYEE PAYMENTS/ENTRIES (Add Entry) ====================
app.post('/api/employee-payments', authorize('employee_account_add'), async (req, res) => {
  const { employeeId, amount, type, transactionType, date, notes } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!employeeId) throw new Error('Employee is required.');
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error('Amount must be greater than zero.');
    if (!['Debit', 'Credit'].includes(type)) throw new Error('Type must be Debit or Credit.');

    const employee = await Employee.findById(employeeId).session(session);
    if (!employee) throw new Error('Employee not found.');

    let finalTxnType = transactionType || (type === 'Debit' ? 'Salary' : 'Payment');

    if (finalTxnType === 'Loan Return') {
      finalTxnType = 'Loan Recovery';
    }

    // --- STRICT LOAN VALIDATION ---
    const empLedger = await EmployeeAccount.find({ employee: employeeId }).session(session);
    
    let totalLoanGiven = 0;
    let totalLoanReturned = 0;
    
    empLedger.forEach(e => {
      if (e.transactionType === 'Loan' || e.transactionType === 'Advance') {
        totalLoanGiven += (e.credit || 0);
      }
      if (e.transactionType === 'Loan Return' || e.transactionType === 'Loan Recovery') {
        totalLoanReturned += (e.debit || 0);
      }
    });
    
    const outstandingLoan = totalLoanGiven - totalLoanReturned;

    if (finalTxnType === 'Loan Recovery') {
      if (outstandingLoan <= 0) {
        throw new Error('This employee has no outstanding loan or advance.');
      }
      if (amt > outstandingLoan) {
        throw new Error(`Cannot return more than the outstanding loan (PKR ${outstandingLoan.toFixed(2)}).`);
      }
    }

    // --- AUTO-GENERATE SMART INVOICE NUMBER ---
    let prefix = 'EMP-';
    if (finalTxnType === 'Loan Recovery') prefix = 'LN-REC-';
    else if (finalTxnType === 'Payment') prefix = 'PAY-';
    else if (finalTxnType === 'Loan' || finalTxnType === 'Advance') prefix = 'LN-';

    const counter = await Counter.findOneAndUpdate(
      { name: `empEntry_${prefix}` },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );
    const invoiceNumber = `${prefix}${counter.seq}`;

    // --- SAVE ENTRY ---
    const entry = await EmployeeAccount.create([{
      employee: employeeId,
      invoiceNumber,
      transactionType: finalTxnType,
      debit: type === 'Debit' ? amt : 0,
      credit: type === 'Credit' ? amt : 0,
      date: date || new Date(),
      notes
    }], { session });

    // --- CASH REGISTER UPDATE ---
    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      if (finalTxnType === 'Loan Recovery') {
         // Cash in
         activeRegister.salesAmount = (activeRegister.salesAmount || 0) + amt;
      } else if (finalTxnType === 'Payment' || finalTxnType === 'Loan' || finalTxnType === 'Advance') {
         // Cash out
         activeRegister.purchaseAmount = (activeRegister.purchaseAmount || 0) + amt;
      }
      await activeRegister.save({ session });
    }

    await session.commitTransaction();
    return res.status(201).json({ success: true, message: 'Entry recorded successfully', entry: entry[0] });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error recording employee entry:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// ==================== EMPLOYEE LEDGER ====================
app.get('/api/employee-ledger', authorize('employee_account_view'), async (req, res) => {
  try {
    const { employeeId, fromDate, toDate } = req.query;

    const filter = {};
    if (employeeId) filter.employee = employeeId;

    const allEntries = await EmployeeAccount.find(filter)
      .populate('employee', 'name designation')
      .sort({ date: 1, createdAt: 1 });

    let runningBalance = 0;
    const rows = [];
    let srNo = 0;

    for (const entry of allEntries) {
      const previousBalance = runningBalance;
      const balance = (entry.debit || 0) - (entry.credit || 0);
      runningBalance += balance;

      const entryDate = new Date(entry.date);
      const inRange =
        (!fromDate || entryDate >= new Date(fromDate)) &&
        (!toDate || entryDate <= new Date(new Date(toDate).setHours(23, 59, 59, 999)));

      if (inRange) {
        srNo += 1;
        
        let attendanceStats = { absent: 0, leave: 0, halfDay: 0, deductionAmount: 0 };
        
        // 💡 THE ULTIMATE FIX: Sirf Salary entries ke liye exact month ki attendance fetch karna
        if (entry.transactionType === 'Salary' && entry.employee) {
          let yearMonthPrefix = "";
          
          // 1. Notes mein se exact Month aur Year nikalna (e.g. "Salary for August 2026")
          const noteMatch = entry.notes ? entry.notes.match(/Salary for ([A-Za-z]+) (\d{4})/i) : null;
          
          if (noteMatch) {
            const monthName = noteMatch[1];
            const yearNum = noteMatch[2];
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const mIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase()) + 1;
            yearMonthPrefix = `${yearNum}-${String(mIndex).padStart(2, '0')}`;
          } else {
            // Backup fallback (agar note format alag ho)
            const eDate = new Date(entry.date);
            const year = eDate.getFullYear();
            const monthNum = eDate.getMonth() + 1;
            yearMonthPrefix = `${year}-${String(monthNum).padStart(2, '0')}`;
          }

          // 2. Safe Employee ID Extraction
          const empIdToSearch = entry.employee._id ? entry.employee._id.toString() : entry.employee.toString();

          // 3. Exact ussi maheene ki attendance fetch karna
          const attendances = await mongoose.model('Attendance').find({
            employeeId: empIdToSearch,
            date: { $regex: new RegExp(`^${yearMonthPrefix}`) }
          });

          attendances.forEach(att => {
            if (att.status === 'Absent') attendanceStats.absent++;
            else if (att.status === 'Leave') attendanceStats.leave++;
            else if (att.status === 'Half-day') attendanceStats.halfDay++;
          });

          // 4. Notes mein se deduction penalty nikalna
          if (entry.notes) {
            const deductionMatch = entry.notes.match(/Deducted Rs\.\s*(\d+)/i);
            if (deductionMatch) {
               attendanceStats.deductionAmount = Number(deductionMatch[1]);
            }
          }
        }

        rows.push({
          srNo,
          _id: entry._id,
          date: entry.date,
          invoiceNumber: entry.invoiceNumber,
          transactionType: entry.transactionType,
          employee: entry.employee,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          balance,
          previousBalance,
          net: runningBalance,
          notes: entry.notes,
          attendanceStats // 💡 Real Stats successfully injected
        });
      }
    }

    return res.json({ success: true, rows, closingBalance: runningBalance });
  } catch (error) {
    console.error('Error fetching employee ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== UOM (Unit of Measure) ====================
app.get('/api/uoms', authorize('uom_view'), async (req, res) => {  try {
    const uoms = await UOM.find({ status: 'active' }).sort({ name: 1 });
    res.json(uoms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/uoms', authorize('uom_add'), async (req, res) => {  try {
    const { code, name, abbreviation } = req.body;

    const existing = await UOM.findOne({
      $or: [
        { code: { $regex: new RegExp(`^${code}$`, 'i') } },
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'UOM with this code or name already exists!' });
    }

    const uom = new UOM({ code, name, abbreviation });
    await uom.save();
    res.status(201).json(uom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/uoms/:id', authorize('uom_edit'), async (req, res) => {  try {
    const { code, name, abbreviation } = req.body;
    const id = req.params.id;

    const existing = await UOM.findOne({
      $or: [
        { code: { $regex: new RegExp(`^${code}$`, 'i') } },
        { name: { $regex: new RegExp(`^${name}$`, 'i') } }
      ],
      _id: { $ne: id }
    });

    if (existing) {
      return res.status(400).json({ message: 'UOM with this code or name already exists!' });
    }

    const uom = await UOM.findByIdAndUpdate(
      id,
      { code, name, abbreviation },
      { returnDocument: 'after' }
    );

    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }

    res.json(uom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/uoms/:id', authorize('uom_delete'), async (req, res) => {  try {
    const uom = await UOM.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );

    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }

    res.json({ message: 'UOM deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== CATEGORIES ====================
app.get('/api/categories', authorize('categories_view'), async (req, res) => {  try {
    const categories = await Category.find({ status: 'active' }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/categories', authorize('categories_add'), async (req, res) => {  try {
    const { name, description } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ message: 'Category already exists!' });
    }

    const category = new Category({ name, description });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/categories/:id', authorize('categories_edit'), async (req, res) => {  try {
    const { name, description } = req.body;
    const id = req.params.id;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });

    if (existing) {
      return res.status(400).json({ message: 'Category already exists!' });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { returnDocument: 'after' }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/categories/:id', authorize('categories_delete'), async (req, res) => {  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PRODUCTS ====================
app.get('/api/products', authorize('products_view'), async (req, res) => { 
  try {
    const products = await Product.find({ status: 'active' })
      .populate('categoryId', 'name')
      .populate('uomId', 'name abbreviation')
      .populate('approvedSuppliers.supplier', 'companyName name contactPerson')
      .sort({ name: 1 });
      
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/products', authorize('products_add'), async (req, res) => {  try {
    const product = new Product(req.body);

    if (product.quantity > 0) {
      product.openingStockLocked = true;
    }

    await product.save();
    const populated = await Product.findById(product._id)
      .populate('categoryId', 'name')
      .populate('uomId', 'name abbreviation');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/products/:id', authorize('products_edit'), async (req, res) => {  try {
    const id = req.params.id;
    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { returnDocument: 'after' }
    )
      .populate('categoryId', 'name')
      .populate('uomId', 'name abbreviation');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/products/:id', authorize('products_delete'), async (req, res) => {  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== DELETED PRODUCTS APIS ====================

app.get('/api/products/deleted', authorize('products_view'), async (req, res) => {  try {
    const products = await Product.find({ status: 'inactive' })
      .populate('categoryId', 'name')
      .populate('uomId', 'name abbreviation')
      .sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Activate a deleted product
app.put('/api/products/:id/activate', authorize('products_edit'), async (req, res) => {  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { returnDocument: 'after' }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product activated successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ==================== OPENING STOCK ====================
app.post('/api/products/:id/opening-stocks', authorize('products_edit'), async (req, res) => {  const { quantity } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // CORE VALIDATION
    if (product.openingStockLocked) {
      return res.status(400).json({
        success: false,
        message: `Opening stock already set for "${product.name}"`
      });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    }

    product.quantity += quantity;
    product.openingStockQuantity = quantity;
    product.openingStockLocked = true; 

    await product.save();

    res.json({ success: true, message: 'Opening stock added successfully.', product });
  } catch (error) {
    console.error('Error adding opening stock:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADD PURCHASE (POST) ====================
app.post('/api/purchases', authorize('purchases_add'), async (req, res) => {  const { supplierId, invoiceNumber, purchaseDate, items, totalAmount, paidAmount } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const counter = await Counter.findOneAndUpdate(
      { name: 'purchaseNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );

    const autoPurchaseNumber = `PO-${counter.seq}`;
    const newPurchase = new Purchase({
      purchaseNumber: autoPurchaseNumber,
      invoiceNumber: invoiceNumber, 
      supplier: supplierId,
      purchaseDate,
      totalAmount,
      paidAmount: Number(paidAmount) || 0,
      items
    });
    const savedPurchase = await newPurchase.save({ session });

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      const isApproved = product.approvedSuppliers?.some(
        s => (s.supplier?._id || s.supplier).toString() === supplierId.toString()
      );

      if (!isApproved) {
        throw new Error(`Product "${product.name}" is not approved for the selected supplier.`);
      }

      product.quantity += item.quantity;
      product.costPrice = item.unitPrice;
      product.openingStockLocked = true;
      await product.save({ session });

      const batchNo = item.batchNumber || `B-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await Batch.create([{
        product: item.product,
        batchNumber: batchNo,
        purchasePrice: item.unitPrice,
        quantity: item.quantity,
        originalQuantity: item.quantity,
        expiryDate: item.expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        purchaseId: savedPurchase._id
      }], { session });

      await StockMovement.create([{
        product: item.product,
        movementType: 'IN',
        quantity: item.quantity,
        referenceType: 'Purchase',
        referenceId: savedPurchase._id
      }], { session });
    }

    const paid = Number(paidAmount) || 0;
    if (paid < 0) throw new Error('Paid amount cannot be negative.');
    if (paid > totalAmount) throw new Error('Paid amount cannot exceed the total purchase amount.');

    const singleEntry = new SupplierAccount({
      supplier: supplierId,
      invoiceNumber: invoiceNumber,
      transactionType: 'Purchase',
      debit: totalAmount,
      credit: paid,
      referenceId: savedPurchase._id,
      referenceModel: 'Purchase',
      date: purchaseDate
    });

    await singleEntry.save({ session });

    if (paid > 0) {
      const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
      if (activeRegister) {
        activeRegister.purchaseAmount = (activeRegister.purchaseAmount || 0) + paid;
        await activeRegister.save({ session });
      }
    }

    await session.commitTransaction();
    return res.status(201).json({ success: true, message: 'Purchase added successfully', purchase: savedPurchase });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error adding purchase:", error);
    return res.status(500).json({ success: false, message: 'Server error while adding purchase', error: error.message });
  } finally {
    session.endSession();
  }
});

// ==================== GET PURCHASES ====================
app.get('/api/purchases', authorize('purchases_view'), async (req, res) => {  try {
    const purchases = await Purchase.find()
      .populate('supplier')
      .populate('items.product')
      .sort({ purchaseDate: -1 });

    res.json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ success: false, message: 'Server error while fetching purchases', error: error.message });
  }
});

// ==================== SEARCH PURCHASE BY INVOICE NUMBER ====================
app.get('/api/purchases/search', authorize('purchases_view'), async (req, res) => {  // Now extracting invoiceNumber from the query parameters
  const { invoiceNumber } = req.query;

  if (!invoiceNumber || !invoiceNumber.trim()) {
    return res.status(400).json({ success: false, message: 'Invoice number is required.' });
  }

  try {
    const purchase = await Purchase.findOne({
      invoiceNumber: { $regex: new RegExp(`^${invoiceNumber.trim()}$`, 'i') }
    })
      .populate('items.product')
      .populate('supplier');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'No purchase found with that invoice number.' });
    }

    const existingReturns = await PurchaseReturn.find({
      purchase: purchase._id,
      status: { $ne: 'Cancelled' }
    });

    const alreadyReturnedMap = {};
    existingReturns.forEach(ret => {
      ret.items.forEach(item => {
        const key = item.product.toString();
        alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + item.quantity;
      });
    });

    const items = purchase.items.map(item => {
      const key = item.product._id.toString();
      const alreadyReturned = alreadyReturnedMap[key] || 0;
      return {
        product: item.product,
        purchaseQty: item.quantity,
        returnQty: alreadyReturned,
        maxReturnable: item.quantity - alreadyReturned,
        unitPrice: item.unitPrice
      };
    });

    return res.json({
      success: true,
      purchase: {
        _id: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        invoiceNumber: purchase.invoiceNumber,
        supplier: purchase.supplier
      },
      items
    });
  } catch (error) {
    console.error('Error searching purchase:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== PURCHASE RETURNS ====================

app.get('/api/purchases/:id/returnable-items', authorize('purchase_returns_view'), async (req, res) => {  try {
    const purchase = await Purchase.findById(req.params.id).populate('items.product').populate('supplier');
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const existingReturns = await PurchaseReturn.find({
      purchase: purchase._id,
      status: { $nin: ['Rejected', 'Cancelled'] }
    });

    const alreadyReturnedMap = {};
    existingReturns.forEach(ret => {
      ret.items.forEach(item => {
        const key = item.product.toString();
        alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + item.quantity;
      });
    });

    const returnableItems = purchase.items.map(item => {
      const key = item.product._id.toString();
      const alreadyReturned = alreadyReturnedMap[key] || 0;
      return {
        product: item.product,
        purchasedQuantity: item.quantity,
        unitPrice: item.unitPrice,
        alreadyReturned,
        maxReturnable: item.quantity - alreadyReturned
      };
    });

    res.json({
      success: true,
      purchase: {
        _id: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        invoiceNumber: purchase.invoiceNumber,
        supplier: purchase.supplier
      },
      items: returnableItems
    });
  } catch (error) {
    console.error('Error fetching returnable items:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create a new purchase return
app.post('/api/purchase-returns', authorize('purchase_returns_add'), async (req, res) => {
  const { purchaseId, supplierId, items, refundMethod, notes, submitForApproval } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required.' });
    }

    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Original purchase not found.' });
    }

    // Validate requested quantities
    const existingReturns = await PurchaseReturn.find({
      purchase: purchaseId,
      status: { $nin: ['Rejected', 'Cancelled'] }
    });
    const alreadyReturnedMap = {};
    existingReturns.forEach(ret => {
      ret.items.forEach(item => {
        const key = item.product.toString();
        alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + item.quantity;
      });
    });

    for (const reqItem of items) {
      const originalItem = purchase.items.find(pi => pi.product.toString() === reqItem.product);
      if (!originalItem) {
        return res.status(400).json({ success: false, message: `Product ${reqItem.product} was not part of this purchase.` });
      }
      const alreadyReturned = alreadyReturnedMap[reqItem.product] || 0;
      const maxReturnable = originalItem.quantity - alreadyReturned;
      if (reqItem.quantity > maxReturnable) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${reqItem.quantity} units — only ${maxReturnable} remain returnable for this product.`
        });
      }
    }

    // Generate PR-XXXX return number
    const counter = await Counter.findOneAndUpdate(
      { name: 'returnNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, returnDocument: 'after' }
    );
    const returnNumber = `PR-${counter.seq.toString()}`;

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    const newReturn = await PurchaseReturn.create({
      returnNumber,
      purchase: purchaseId,
      supplier: supplierId,
      items,
      totalAmount,
      refundMethod: refundMethod || 'Credit Note',
      notes,
      status: submitForApproval ? 'Pending Approval' : 'Draft'
    });

    return res.status(201).json({ success: true, message: 'Purchase return created', purchaseReturn: newReturn });
  } catch (error) {
    console.error('Error creating purchase return:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// List all purchase returns
app.get('/api/purchase-returns', authorize('purchase_returns_view'), async (req, res) => {  try {
    const returns = await PurchaseReturn.find()
      .populate('supplier')
      .populate('purchase', 'purchaseNumber invoiceNumber')
      .populate('items.product')
      .sort({ createdAt: 1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a single purchase return
app.get('/api/purchase-returns/:id', authorize('purchase_returns_view'), async (req, res) => {   try {
    const purchaseReturn = await PurchaseReturn.findById(req.params.id)
      .populate('supplier')
      .populate('purchase')
      .populate('items.product');
    if (!purchaseReturn) {
      return res.status(404).json({ success: false, message: 'Purchase return not found' });
    }
    res.json(purchaseReturn);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Allowed status transitions
const ALLOWED_TRANSITIONS = {
  'Draft': ['Pending Approval', 'Cancelled'],
  'Pending Approval': ['Approved', 'Rejected'],
  'Approved': ['Shipped to Supplier', 'Cancelled'],
  'Shipped to Supplier': ['Completed'],
  'Completed': [],
  'Rejected': [],
  'Cancelled': []
};

// Update a purchase return's status
app.put('/api/purchase-returns/:id/status', authorize('purchase_returns_edit'), async (req, res) => {  const { status: newStatus } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const purchaseReturn = await PurchaseReturn.findById(req.params.id).session(session);
    if (!purchaseReturn) {
      throw new Error('Purchase return not found');
    }

    const currentStatus = purchaseReturn.status;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      throw new Error(`Cannot move from "${currentStatus}" to "${newStatus}".`);
    }

    // Side effect: when goods leave the warehouse
    if (newStatus === 'Shipped to Supplier') {
      for (const item of purchaseReturn.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }
        if (product.quantity < item.quantity) {
          throw new Error(`Not enough stock of "${product.name}" to ship this return (have ${product.quantity}, need ${item.quantity}).`);
        }
        product.quantity -= item.quantity;
        await product.save({ session });

        await StockMovement.create([{
          product: item.product,
          movementType: 'OUT',
          quantity: item.quantity,
          referenceType: 'PurchaseReturn',
          referenceId: purchaseReturn._id
        }], { session });
      }
    }

    if (newStatus === 'Completed') {
      await SupplierAccount.create([{
        supplier: purchaseReturn.supplier,
        invoiceNumber: purchaseReturn.returnNumber,
        transactionType: 'Purchase Return',
        debit: 0,
        credit: purchaseReturn.totalAmount,
        referenceId: purchaseReturn._id,
        referenceModel: 'PurchaseReturn',
        date: new Date()
      }], { session });
    }
    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.salesAmount += Number(paidAmount);
      await activeRegister.save({ session });
    }

    purchaseReturn.status = newStatus;
    await purchaseReturn.save({ session });

    await session.commitTransaction();
    return res.json({ success: true, message: `Status updated to ${newStatus}`, purchaseReturn });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating purchase return status:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// ==================== COMPLETE PURCHASE RETURN (One-Step) ====================
app.post('/api/purchase-returns/complete', authorize('purchase_returns_add'), async (req, res) => {   const { purchaseId, supplierId, invoiceNumber, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) {
      throw new Error('At least one item with a return quantity is required.');
    }

    const purchase = await Purchase.findById(purchaseId).session(session);
    if (!purchase) {
      throw new Error('Original purchase not found.');
    }

    // Re-validate quantities
    const existingReturns = await PurchaseReturn.find({
      purchase: purchaseId,
      status: { $ne: 'Cancelled' }
    }).session(session);

    const alreadyReturnedMap = {};
    existingReturns.forEach(ret => {
      ret.items.forEach(item => {
        const key = item.product.toString();
        alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + item.quantity;
      });
    });

    for (const reqItem of items) {
      const originalItem = purchase.items.find(pi => pi.product.toString() === reqItem.product);
      if (!originalItem) {
        throw new Error(`Product ${reqItem.product} was not part of this purchase.`);
      }
      if (!reqItem.quantity || reqItem.quantity <= 0) {
        throw new Error('Return quantity must be greater than zero.');
      }
      const alreadyReturned = alreadyReturnedMap[reqItem.product] || 0;
      const maxReturnable = originalItem.quantity - alreadyReturned;
      if (reqItem.quantity > maxReturnable) {
        throw new Error(`Cannot return ${reqItem.quantity} units — only ${maxReturnable} remain returnable for this product.`);
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    // Generate PR-XXXX return number
    const counter = await Counter.findOneAndUpdate(
      { name: 'returnNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const returnNumber = `PR-${counter.seq.toString()}`;

    // Create the return record directly as Completed
    const created = await PurchaseReturn.create([{
      returnNumber,
      purchase: purchaseId,
      supplier: supplierId,
      items: items.map(i => ({
        product: i.product,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.quantity * i.unitPrice,
        reason: i.reason || 'Other'
      })),
      totalAmount,
      status: 'Completed',
      approvedAt: new Date()
    }], { session });
    const savedReturn = created[0];

    // Deduct stock and log the movement
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Not enough stock of "${product.name}" to return (have ${product.quantity}, need ${item.quantity}).`);
      }
      product.quantity -= item.quantity;
      await product.save({ session });

      await StockMovement.create([{
        product: item.product,
        movementType: 'OUT',
        quantity: item.quantity,
        referenceType: 'PurchaseReturn',
        referenceId: savedReturn._id
      }], { session });
    }

    // LEDGER MATH
    const priorEntries = await SupplierAccount.find({ supplier: supplierId }).session(session);
    const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

    await SupplierAccount.create([{
      supplier: supplierId,
      invoiceNumber,
      transactionType: 'Purchase Return',
      debit: 0,
      credit: totalAmount,
      referenceId: savedReturn._id,
      referenceModel: 'PurchaseReturn',
      date: new Date()
    }], { session });

    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.purchaseReturnAmount = (activeRegister.purchaseReturnAmount || 0) + totalAmount;
      await activeRegister.save({ session });
    }

    const newBalance = previousBalance - totalAmount;

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Return completed successfully',
      purchaseReturn: savedReturn,
      previousBalance,
      returnAmount: totalAmount,
      newBalance
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing purchase return:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// ==================== BLIND RETURN (Without Invoice) ====================
app.post('/api/purchase-returns/blind-return', authorize('purchase_returns_add'), async (req, res) => {  const { supplierId, returnDate, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) {
      throw new Error('At least one item with a return quantity is required.');
    }

    if (!supplierId) {
      throw new Error('Supplier is required for blind return.');
    }

    // Validate stock for each item
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Not enough stock of "${product.name}" to return (have ${product.quantity}, need ${item.quantity}).`);
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    // Generate PR-XXXX return number
    const counter = await Counter.findOneAndUpdate(
      { name: 'returnNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const returnNumber = `PR-${counter.seq.toString()}`;

    // Create a blind return (no purchase reference)
    const created = await PurchaseReturn.create([{
      returnNumber,
      purchase: null, // No purchase reference for blind returns
      supplier: supplierId,
      items: items.map(i => ({
        product: i.product,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.quantity * i.unitPrice,
        reason: 'Blind Return'
      })),
      totalAmount,
      status: 'Completed',
      approvedAt: new Date(),
      isBlindReturn: true 
    }], { session });
    const savedReturn = created[0];

    // Deduct stock and log the movement
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }
      product.quantity -= item.quantity;
      await product.save({ session });

      await StockMovement.create([{
        product: item.product,
        movementType: 'OUT',
        quantity: item.quantity,
        referenceType: 'PurchaseReturn',
        referenceId: savedReturn._id,
        notes: 'Blind return without invoice'
      }], { session });
    }

    // LEDGER MATH for blind return
    const priorEntries = await SupplierAccount.find({ supplier: supplierId }).session(session);
    const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

    await SupplierAccount.create([{
      supplier: supplierId,
      invoiceNumber: `BLIND-${returnNumber}`,
      transactionType: 'Purchase Return',
      debit: 0,
      credit: totalAmount,
      referenceId: savedReturn._id,
      referenceModel: 'PurchaseReturn',
      date: returnDate || new Date()
    }], { session });

    const newBalance = previousBalance - totalAmount;

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Blind return completed successfully',
      purchaseReturn: savedReturn,
      previousBalance,
      returnAmount: totalAmount,
      newBalance
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing blind return:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// ==================== SUPPLIER PAYMENTS ====================
app.post('/api/supplier-payments', authorize('supplier_account_add'), async (req, res) => {  const { supplierId, amount, type, invoiceNumber, date, notes } = req.body;

  try {
    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Supplier is required.' });
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const txnType = type === 'Debit' ? 'Debit' : 'Credit'; // default Credit (normal payment)

    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      const counter = await Counter.findOneAndUpdate(
        { name: 'supplierPaymentNumber' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true, returnDocument: 'after' }
      );
      finalInvoiceNumber = `SP-${counter.seq}`;
    }

    const entry = await SupplierAccount.create({
      supplier: supplierId,
      invoiceNumber: finalInvoiceNumber,
      transactionType: 'Payment',
      debit: txnType === 'Debit' ? amt : 0,
      credit: txnType === 'Credit' ? amt : 0,
      date: date || new Date(),
      notes
    });

    return res.status(201).json({ success: true, message: 'Payment recorded successfully', entry });
  } catch (error) {
    console.error('Error recording supplier payment:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});


// ==================== SUPPLIER LEDGER (Full ledger with filters) ====================
app.get('/api/supplier-ledger', authorize('supplier_account_view'), async (req, res) => {  try {
    const { supplierId, fromDate, toDate } = req.query;

    const filter = {};
    if (supplierId) filter.supplier = supplierId;

    const allEntries = await SupplierAccount.find(filter)
      .populate('supplier', 'companyName contactPerson')
      .sort({ date: 1, createdAt: 1 });

    let runningBalance = 0;
    const rows = [];
    let srNo = 0;

    for (const entry of allEntries) {
      const previousBalance = runningBalance;
      const balance = (entry.debit || 0) - (entry.credit || 0);
      runningBalance += balance;

      const entryDate = new Date(entry.date);
      const inRange =
        (!fromDate || entryDate >= new Date(fromDate)) &&
        (!toDate || entryDate <= new Date(new Date(toDate).setHours(23, 59, 59, 999)));

      if (inRange) {
        srNo += 1;
        rows.push({
          srNo,
          _id: entry._id,
          date: entry.date,
          invoiceNumber: entry.invoiceNumber,
          transactionType: entry.transactionType,
          supplier: entry.supplier,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          balance,
          previousBalance,
          net: runningBalance
        });
      }
    }

    return res.json({ success: true, rows, closingBalance: runningBalance });
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
// Get a supplier's full ledger
app.get('/api/suppliers/:id/ledger', authorize('supplier_account_view'), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const entries = await SupplierAccount.find({ supplier: req.params.id }).sort({ date: 1, createdAt: 1 });

    let runningBalance = 0;
    const ledger = entries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      return {
        _id: entry._id,
        invoiceNumber: entry.invoiceNumber,
        transactionType: entry.transactionType,
        debit: entry.debit,
        credit: entry.credit,
        runningBalance,
        date: entry.date
      };
    });

    return res.json({
      success: true,
      supplier: { _id: supplier._id, name: supplier.contactPerson || supplier.companyName },
      ledger,
      currentBalance: runningBalance
    });
  } catch (error) {
    console.error('Error fetching supplier ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
// ==================== CUSTOMER PAYMENTS (Add Payment) ====================
app.post('/api/customer-payments', authorize('customer_account_add'), async (req, res) => {  const { customerId, amount, type, date, notes } = req.body;

  try {
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer is required.' });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }
    if (!['Debit', 'Credit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be Debit or Credit.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const counter = await Counter.findOneAndUpdate(
      { name: 'customerPaymentNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, returnDocument: 'after' }
    );
    const invoiceNumber = `CA-${counter.seq}`;

    const entry = await CustomerAccount.create({
      customer: customerId,
      invoiceNumber,
      transactionType: 'Payment',
      debit: type === 'Debit' ? amt : 0,
      credit: type === 'Credit' ? amt : 0,
      date: date || new Date(),
      notes
    });

    return res.status(201).json({ success: true, message: 'Payment recorded successfully', entry });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== CUSTOMER LEDGER (Full ledger with filters) ====================
app.get('/api/customer-ledger', authorize('customer_account_view'), async (req, res) => {  try {
    const { customerId, fromDate, toDate } = req.query;

    const filter = {};
    if (customerId) filter.customer = customerId;

    // Fetch ALL entries in date-ascending order — needed so "previous balance"
    // is correct even for rows that fall inside the filtered date range.
    const allEntries = await CustomerAccount.find(filter)
      .populate('customer', 'name customerName')
      .sort({ date: 1, createdAt: 1 });

    let runningBalance = 0;
    const rows = [];
    let srNo = 0;

    for (const entry of allEntries) {
      const previousBalance = runningBalance;
      const balance = (entry.debit || 0) - (entry.credit || 0);
      runningBalance += balance;

      const entryDate = new Date(entry.date);
      const inRange =
        (!fromDate || entryDate >= new Date(fromDate)) &&
        (!toDate || entryDate <= new Date(new Date(toDate).setHours(23, 59, 59, 999)));

      if (inRange) {
        srNo += 1;
        rows.push({
          srNo,
          _id: entry._id,
          date: entry.date,
          invoiceNumber: entry.invoiceNumber,
          transactionType: entry.transactionType,
          customer: entry.customer,
          debit: entry.debit || 0,
          credit: entry.credit || 0,
          balance,
          previousBalance,
          net: runningBalance
        });
      }
    }

    return res.json({ success: true, rows, closingBalance: runningBalance });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a customer's full ledger
app.get('/api/customers/:id/ledger', authorize('customer_account_view'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const entries = await CustomerAccount.find({ customer: req.params.id }).sort({ date: 1, createdAt: 1 });

    let runningBalance = 0;
    const ledger = entries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      return {
        _id: entry._id,
        invoiceNumber: entry.invoiceNumber,
        transactionType: entry.transactionType,
        debit: entry.debit,
        credit: entry.credit,
        runningBalance,
        date: entry.date
      };
    });

    return res.json({
      success: true,
      customer: { _id: customer._id, name: customer.name || customer.name },
      ledger,
      currentBalance: runningBalance
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create a stock adjustment (increase or decrease)
app.post('/api/stock-adjustment', authorize('stock_adjustment_add'), async (req, res) => {  const { productId, adjustmentType, quantity, reason, notes, invoiceNumber } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!productId) throw new Error('Product is required.');
    if (!['Increase', 'Decrease'].includes(adjustmentType)) {
      throw new Error('Adjustment type must be either "Increase" or "Decrease".');
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero.');
    if (!reason) throw new Error('Reason is required.');

    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error('Product not found.');

    const previousQuantity = product.quantity;
    let newQuantity;

    if (adjustmentType === 'Increase') {
      newQuantity = previousQuantity + qty;
    } else {
      // Decrease — never allow stock to go negative
      if (qty > previousQuantity) {
        throw new Error(`Cannot decrease by ${qty} units — only ${previousQuantity} units in stock.`);
      }
      newQuantity = previousQuantity - qty;
    }

    product.quantity = newQuantity;
    await product.save({ session });

    // Auto-incrementing adjustment number, same pattern as Purchases/Returns
    const counter = await Counter.findOneAndUpdate(
      { name: 'adjustmentNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const adjustmentNumber = `ADJ-${counter.seq.toString()}`;

    const created = await StockAdjustment.create([{
      adjustmentNumber,
      product: productId,
      invoiceNumber,
      adjustmentType,
      quantity: qty,
      previousQuantity,
      newQuantity,
      reason,
      notes
    }], { session });
    const savedAdjustment = created[0];

    // Log it in the shared StockMovement audit trail, same as Purchase/Return do
    await StockMovement.create([{
      product: productId,
      movementType: adjustmentType === 'Increase' ? 'IN' : 'OUT',
      invoiceNumber,
      quantity: qty,
      referenceType: 'StockAdjustment',
      referenceId: savedAdjustment._id,
      notes: `${reason}${notes ? ' — ' + notes : ''}`
    }], { session });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: `Stock ${adjustmentType.toLowerCase()}d successfully.`,
      adjustment: savedAdjustment
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating stock adjustment:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

app.post('/api/stock-adjustment/batch', authorize('stock_adjustment_add'), async (req, res) => {  const { adjustments } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      throw new Error('At least one adjustment is required.');
    }

    // ONE invoice/batch number for the WHOLE batch — generated by backend, not guessed by frontend
    const batchCounter = await Counter.findOneAndUpdate(
      { name: 'adjustmentInvoiceNumber' },
      { $inc: { seq: 1 } },
      { upsert: true, session, returnDocument: 'after' }
    );
    const invoiceNumber = `ADJ-${batchCounter.seq.toString()}`;

    const savedAdjustments = [];

    for (const item of adjustments) {
      const { productId, adjustmentType, quantity, reason, notes } = item;

      if (!productId) throw new Error('Product is required for all items.');
      if (!['Increase', 'Decrease'].includes(adjustmentType)) {
        throw new Error('Adjustment type must be either "Increase" or "Decrease".');
      }
      const qty = Number(quantity);
      if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero for all items.');
      if (!reason) throw new Error('Reason is required for all items.');

      const product = await Product.findById(productId).session(session);
      if (!product) throw new Error(`Product not found: ${productId}`);

      const previousQuantity = product.quantity;
      let newQuantity;

      if (adjustmentType === 'Increase') {
        newQuantity = previousQuantity + qty;
      } else {
        if (qty > previousQuantity) {
          throw new Error(`Cannot decrease "${product.name}" by ${qty} — only ${previousQuantity} units in stock.`);
        }
        newQuantity = previousQuantity - qty;
      }

      product.quantity = newQuantity;
      await product.save({ session });

      const lineCounter = await Counter.findOneAndUpdate(
        { name: 'adjustmentNumber' },
        { $inc: { seq: 1 } },
        { upsert: true, session, returnDocument: 'after' }
      );
      const adjustmentNumber = `ADJ-${lineCounter.seq.toString()}`;

      const created = await StockAdjustment.create([{
        adjustmentNumber,
        invoiceNumber,
        product: productId,
        adjustmentType,
        quantity: qty,
        previousQuantity,
        newQuantity,
        reason,
        notes
      }], { session });
      const savedAdjustment = created[0];

      await StockMovement.create([{
        product: productId,
        movementType: adjustmentType === 'Increase' ? 'IN' : 'OUT',
        quantity: qty,
        referenceType: 'StockAdjustment',
        referenceId: savedAdjustment._id,
        notes: `${reason}${notes ? ' — ' + notes : ''}`
      }], { session });

      savedAdjustments.push(savedAdjustment);
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: `${savedAdjustments.length} adjustment(s) saved successfully.`,
      invoiceNumber,
      adjustments: savedAdjustments
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in batch stock adjustment:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// List all stock adjustments (history)
app.get('/api/stock-adjustment', authorize('stock_adjustment_view'), async (req, res) => {  try {
    const adjustments = await StockAdjustment.find()
      .populate('product', 'name')
      .sort({ createdAt: 1 });
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single product's adjustment history (optional, useful for a product detail view)
app.get('/api/products/:id/stock-adjustment', authorize('stock_adjustment_view'), async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find({ product: req.params.id })
      .populate('product', 'name')
      .sort({ createdAt: 1 });
    res.json(adjustments);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== SALES (POS) ====================

// Create a sale — one-shot, instant stock deduction (POS style, no draft workflow)
app.post('/api/sales', authorize('pos_add'), async (req, res) => {  const { customerId, items, discount, paidAmount, notes, saleDate } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!customerId) throw new Error('Customer is required.');
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required.');
    }
    const activeRegister = await CashRegister.findOne({ closingDate: null });
    if (activeRegister) {
      activeRegister.salesAmount += Number(paidAmount);
      await activeRegister.save();
    }
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) throw new Error('Customer not found.');

    // Validate stock and compute line totals first (fail fast before writing anything)
    let subtotal = 0;
    const preparedItems = [];

    for (const item of items) {
      if (!item.product) throw new Error('Product is required for all items.');
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const lineDiscount = Number(item.discount) || 0;

      if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero for all items.');
      if (unitPrice < 0) throw new Error('Unit price cannot be negative.');

      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (product.quantity < qty) {
        throw new Error(`Not enough stock of "${product.name}" (have ${product.quantity}, need ${qty}).`);
      }

      const lineTotal = (qty * unitPrice) - lineDiscount;
      subtotal += lineTotal;

      preparedItems.push({ product, qty, unitPrice, lineDiscount, lineTotal });
    }

    const overallDiscount = Number(discount) || 0;
    const totalAmount = subtotal - overallDiscount;

    if (totalAmount < 0) throw new Error('Total amount cannot be negative.');

    const paid = Number(paidAmount) || 0;
    if (paid < 0) throw new Error('Paid amount cannot be negative.');
    if (paid > totalAmount) throw new Error('Paid amount cannot exceed the total sale amount.');

    // Generate SL-XXXX sale number
    const counter = await Counter.findOneAndUpdate(
      { name: 'saleNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const saleNumber = `SL-${counter.seq.toString()}`;

    let paymentStatus = 'Credit';
    if (paid >= totalAmount && totalAmount > 0) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'Partial';

    const balance = totalAmount - paid;

    const createdSale = await Sale.create([{
      saleNumber,
      customer: customerId,
      saleDate: saleDate || new Date(),
      subtotal,
      discount: overallDiscount,
      totalAmount,
      paidAmount: paid,
      balance,
      paymentStatus,
      status: 'Completed',
      notes
    }], { session });
    const savedSale = createdSale[0];

   // Deduct stock, create SaleDetail rows, log StockMovement
    for (const prepared of preparedItems) {
      // 1. Master product se total quantity minus karein
      prepared.product.quantity -= prepared.qty;
      await prepared.product.save({ session });

      // 2. FEFO Logic: Find batches for this product that have stock, sorted by Expiry Date (Ascending)
      const batches = await Batch.find({ 
        product: prepared.product._id, 
        quantity: { $gt: 0 } 
      }).sort({ expiryDate: 1 }).session(session);

      let quantityToDeduct = prepared.qty;

      // 3. Deduct from batches one by one until order is fulfilled
      for (const batch of batches) {
        if (quantityToDeduct <= 0) break;

        if (batch.quantity >= quantityToDeduct) {
          // This batch has enough stock to fulfill the remaining required quantity
          batch.quantity -= quantityToDeduct;
          quantityToDeduct = 0;
          await batch.save({ session });
        } else {
          // This batch doesn't have enough stock, take whatever is left and move to the next batch
          quantityToDeduct -= batch.quantity;
          batch.quantity = 0;
          await batch.save({ session });
        }
      }

      if (quantityToDeduct > 0) {
        // Fallback safety (Ideally shouldn't happen if master product quantity check passed)
        throw new Error(`Critical Error: Master stock mismatch for "${prepared.product.name}". Not enough batch stock available.`);
      }

      // Record Sale Detail
      await SaleDetail.create([{
        sale: savedSale._id,
        product: prepared.product._id,
        quantity: prepared.qty,
        unitPrice: prepared.unitPrice,
        discount: prepared.lineDiscount,
        lineTotal: prepared.lineTotal
      }], { session });

      // Log Movement
      await StockMovement.create([{
        product: prepared.product._id,
        movementType: 'OUT',
        quantity: prepared.qty,
        referenceType: 'Sale',
        referenceId: savedSale._id
      }], { session });
    }
        // Ledger entry — debit what they owe, credit what they paid now
    await CustomerAccount.create([{
      customer: customerId,
      invoiceNumber: saleNumber,
      transactionType: 'Sale',
      debit: totalAmount,
      credit: paid,
      referenceId: savedSale._id,
      referenceModel: 'Sale',
      date: savedSale.saleDate
    }], { session });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      sale: savedSale
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating sale:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

app.get('/api/sales', authorize('pos_view'), async (req, res) => {  try {
    const sales = await Sale.find()
      .populate('customer')
      .sort({ saleDate: -1, createdAt: 1 })
      .lean();

    const saleIds = sales.map(s => s._id);
    const allDetails = await SaleDetail.find({ sale: { $in: saleIds } }).populate('product', 'name');

    const detailsBySale = {};
    allDetails.forEach(d => {
      const key = d.sale.toString();
      if (!detailsBySale[key]) detailsBySale[key] = [];
      detailsBySale[key].push(d);
    });

    const result = sales.map(s => ({
      ...s,
      items: detailsBySale[s._id.toString()] || []
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get('/api/sales/search', authorize('pos_view'), async (req, res) => {  const { invoiceNumber } = req.query; // this is actually the saleNumber, e.g. "SL-12"

  if (!invoiceNumber || !invoiceNumber.trim()) {
    return res.status(400).json({ success: false, message: 'Invoice number is required.' });
  }

  try {
    const sale = await Sale.findOne({
      saleNumber: { $regex: new RegExp(`^${invoiceNumber.trim()}$`, 'i') },
      status: { $nin: ['Hold', 'Cancelled'] } // can't return against a held or already-cancelled sale
    }).populate('customer');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: `No sale found with invoice number "${invoiceNumber}".`
      });
    }

    const saleDetails = await SaleDetail.find({ sale: sale._id }).populate('product');

    if (!saleDetails || saleDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No items found for invoice "${sale.saleNumber}".`
      });
    }

    // Subtract quantities already returned against this sale (across all prior sale returns)
    const existingReturns = await SaleReturn.find({ sale: sale._id });
    const alreadyReturnedMap = {};
    existingReturns.forEach(ret => {
      ret.items.forEach(item => {
        const key = item.product.toString();
        alreadyReturnedMap[key] = (alreadyReturnedMap[key] || 0) + item.quantity;
      });
    });

    const items = saleDetails.map(detail => {
      const key = detail.product._id.toString();
      const alreadyReturned = alreadyReturnedMap[key] || 0;
      const saleQty = detail.quantity;
      return {
        product: detail.product,
        saleQty,
        returnQty: alreadyReturned,
        maxReturnable: saleQty - alreadyReturned,
        unitPrice: detail.unitPrice
      };
    });

    return res.json({
      success: true,
      sale: {
        _id: sale._id,
        saleNumber: sale.saleNumber,
        invoiceNumber: sale.saleNumber, // alias so the existing frontend fields keep working
        customer: sale.customer,
        saleDate: sale.saleDate,
        createdAt: sale.createdAt
      },
      items
    });
  } catch (error) {
    console.error('Error searching sale:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.post('/api/sales/hold', authorize('pos_add'), async (req, res) => {  const { customerId, items, discount, discountType, discountValue, paidAmount, notes, saleDate } = req.body;

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required to hold a sale.');
    }

    let subtotal = 0;
    const preparedItems = [];

    for (const item of items) {
      if (!item.product) throw new Error('Product is required for all items.');
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const lineDiscount = Number(item.discount) || 0;

      if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero for all items.');
      if (unitPrice < 0) throw new Error('Unit price cannot be negative.');

      const lineTotal = (qty * unitPrice) - lineDiscount;
      subtotal += lineTotal;

      preparedItems.push({ product: item.product, qty, unitPrice, lineDiscount, lineTotal });
    }

    const overallDiscount = Number(discount) || 0;
    const totalAmount = subtotal - overallDiscount;
    const paid = Number(paidAmount) || 0;
    const balance = totalAmount - paid;

    // Separate HO-XXXX sequence so hold numbers never collide with SL-XXXX sale numbers
    const counter = await Counter.findOneAndUpdate(
      { name: 'holdNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, returnDocument: 'after' }
    );
    const saleNumber = `HO-${counter.seq.toString()}`;

    const savedSale = await Sale.create({
      saleNumber,
      customer: customerId || undefined,
      saleDate: saleDate || new Date(),
      subtotal,
      discount: overallDiscount,
      discountType: discountType || 'percent',
      discountValue: Number(discountValue) || 0,
      totalAmount,
      paidAmount: paid,
      balance,
      paymentStatus: 'Credit',
      status: 'Hold',
      notes
    });

    for (const prepared of preparedItems) {
      await SaleDetail.create({
        sale: savedSale._id,
        product: prepared.product,
        quantity: prepared.qty,
        unitPrice: prepared.unitPrice,
        discount: prepared.lineDiscount,
        lineTotal: prepared.lineTotal
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Sale held successfully',
      sale: savedSale
    });
  } catch (error) {
    console.error('Error holding sale:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// List all held sales — for the POS "Hold List" table (includes item count per hold)
app.get('/api/sales/hold', authorize('pos_view'), async (req, res) => {  try {
    const holds = await Sale.find({ status: 'Hold' })
      .populate('customer')
      .sort({ createdAt: 1 })
      .lean();

    const saleIds = holds.map(h => h._id);
    const counts = await SaleDetail.aggregate([
      { $match: { sale: { $in: saleIds } } },
      { $group: { _id: '$sale', itemsCount: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.itemsCount; });

    const result = holds.map(h => ({ ...h, itemsCount: countMap[h._id.toString()] || 0 }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching held sales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


app.delete('/api/sales/:id/hold', authorize('pos_delete'), async (req, res) => {  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) throw new Error('Held sale not found.');
    if (sale.status !== 'Hold') throw new Error('This sale is not on hold.');

    await SaleDetail.deleteMany({ sale: sale._id });
    await Sale.deleteOne({ _id: sale._id });

    return res.json({ success: true, message: 'Held sale removed.' });
  } catch (error) {
    console.error('Error deleting held sale:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Get a single sale with its line items (for view/print)
app.get('/api/sales/:id', authorize('pos_view'), async (req, res) => {  try {
    const sale = await Sale.findById(req.params.id).populate('customer');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const items = await SaleDetail.find({ sale: sale._id }).populate('product');

    res.json({ success: true, sale, items });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel/void a sale — restores stock, reverses ledger entry (audit trail preserved, nothing deleted)
app.put('/api/sales/:id/cancel', authorize('pos_delete'), async (req, res) => {  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) throw new Error('Sale not found.');
    if (sale.status === 'Cancelled') throw new Error('This sale is already cancelled.');

    const items = await SaleDetail.find({ sale: sale._id }).session(session);

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);

      product.quantity += item.quantity;
      await product.save({ session });

      await StockMovement.create([{
        product: item.product,
        movementType: 'IN',
        quantity: item.quantity,
        referenceType: 'Sale',
        referenceId: sale._id,
        notes: 'Sale Cancelled'
      }], { session });
    }

    // Reverse the ledger: credit back the total owed, debit back what was paid
    await CustomerAccount.create([{
      customer: sale.customer,
      invoiceNumber: sale.saleNumber,
      transactionType: 'Refund',
      debit: sale.paidAmount,
      credit: sale.totalAmount,
      referenceId: sale._id,
      referenceModel: 'Sale',
      date: new Date()
    }], { session });

    sale.status = 'Cancelled';
    await sale.save({ session });

    await session.commitTransaction();
    return res.json({ success: true, message: 'Sale cancelled and stock restored.', sale });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error cancelling sale:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});


app.get('/api/print-settings', authorize(), async (req, res) => { 
  try {
    let settings = await PrintSettings.findOne();
    if (!settings) {
      settings = await PrintSettings.create({});
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching print settings:', err);
    res.status(500).json({ message: 'Failed to fetch print settings' });
  }
});

app.put('/api/print-settings', authorize('dashboard_view'), async (req, res) => {  try {
    const {
      paperSize,
      printerName,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      showLogo,
      showCompanyName,
      footerText,
      defaultCopies,
      thermalFontSize,
    } = req.body;

    const VALID_SIZES = ['A4', 'A5', 'Thermal58'];

    if (paperSize && !VALID_SIZES.includes(paperSize)) {
      return res.status(400).json({
        message: `Invalid paperSize. Must be one of: ${VALID_SIZES.join(', ')}`,
      });
    }

    let settings = await PrintSettings.findOne();
    if (!settings) {
      settings = new PrintSettings({});
    }

    if (paperSize !== undefined) settings.paperSize = paperSize;
    if (printerName !== undefined) settings.printerName = printerName;
    if (marginTop !== undefined) settings.marginTop = marginTop;
    if (marginBottom !== undefined) settings.marginBottom = marginBottom;
    if (marginLeft !== undefined) settings.marginLeft = marginLeft;
    if (marginRight !== undefined) settings.marginRight = marginRight;
    if (showLogo !== undefined) settings.showLogo = showLogo;
    if (showCompanyName !== undefined) settings.showCompanyName = showCompanyName;
    if (footerText !== undefined) settings.footerText = footerText;
    if (defaultCopies !== undefined) settings.defaultCopies = defaultCopies;
    if (thermalFontSize !== undefined) settings.thermalFontSize = thermalFontSize;

    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error('Error updating print settings:', err);
    res.status(500).json({ message: 'Failed to update print settings' });
  }
});

// ==========================================
// CLIENT DETAILS ROUTES (Single Entry Logic)
// ==========================================

// 1. GET Client
app.get('/api/client', authorize('settings_view'), async (req, res) => {  try {
    const clients = await Client.find();

    res.status(200).json(clients);
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching client details.' });
  }
});

// 2. POST Client (Add New - Restricted to 1)
app.post('/api/client', authorize('settings_edit'), async (req, res) => {  try {
    const existingCount = await Client.countDocuments();
    if (existingCount >= 1) {
      return res.status(400).json({
        success: false,
        message: 'A client already exists. You can only have one client. Please delete the existing one first.'
      });
    }

    const { businessName, contact, address, logo } = req.body;

    const newClient = new Client({
      businessName,
      contact,
      address,
      logo
    });

    await newClient.save();
    res.status(201).json({ success: true, client: newClient });
  } catch (err) {
    console.error('Error adding client:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. PUT Client (Edit Existing)
app.put('/api/client/:id', authorize('settings_edit'), async (req, res) => {  try {
    const { id } = req.params;
    const { businessName, contact, address, logo } = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { businessName, contact, address, logo },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    res.status(200).json({ success: true, client: updatedClient });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. DELETE Client
app.delete('/api/client/:id', authorize('settings_edit'), async (req, res) => {  try {
    const { id } = req.params;

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    res.status(200).json({ success: true, message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== CASH REGISTER ROUTES ====================
app.get('/api/cash-register/status', authorize('cash_register_view'), async (req, res) => {  try {
    const activeRegister = await CashRegister.findOne({ closingDate: null });

    if (activeRegister) {
      return res.json({
        isOpen: true,
        registerDetails: activeRegister
      });
    } else {
      return res.json({
        isOpen: false
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error checking status' });
  }
});

// 2. Open Cash Register
app.post('/api/cash-register/open', authorize('cash_register_manage'), async (req, res) => {  try {
    const { openingAmount } = req.body;

    const existing = await CashRegister.findOne({ closingDate: null });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Register is already open.' });
    }

    const newRegister = new CashRegister({
      openingAmount: openingAmount || 0,
      salesAmount: 0,
      totalReturn: 0
    });

    await newRegister.save();
    res.json({ success: true, registerDetails: newRegister });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error opening register' });
  }
});

// 3. Close Cash Register 
app.post('/api/cash-register/close', authorize('cash_register_manage'), async (req, res) => {  try {
    const activeRegister = await CashRegister.findOne({ closingDate: null });

    if (!activeRegister) {
      return res.status(400).json({ success: false, message: 'No open register found.' });
    }
    const closingAmount =
      (activeRegister.openingAmount + activeRegister.salesAmount + (activeRegister.purchaseReturnAmount || 0))
      - activeRegister.totalReturn
      - (activeRegister.purchaseAmount || 0);
    activeRegister.closingDate = new Date();
    activeRegister.closingAmount = closingAmount;

    await activeRegister.save();
    res.json({ success: true, message: 'Register closed successfully', registerDetails: activeRegister });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error closing register' });
  }
});

// ==================== CASH REGISTER HISTORY (for reports) ====================
app.get('/api/cash-register/history', authorize('cash_register_view'), async (req, res) => {  try {
    const registers = await CashRegister.find().sort({ createdAt: 1 });
    res.json({ success: true, registers });
  } catch (err) {
    console.error('Error fetching register history:', err);
    res.status(500).json({ success: false, message: 'Server error fetching register history' });
  }
});

app.post('/api/customer-types', authorize('customers_add'), async (req, res) => {  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Type name is required' });

    const newType = new CustomerType({ name });
    await newType.save();

    res.status(201).json(newType);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This Customer Type already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/customer-types', authorize('customers_view'), async (req, res) => {  try {
    const types = await CustomerType.find().sort({ createdAt: 1 });
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/customer-types/:id', authorize('customers_edit'), async (req, res) => {  try {
    const { name } = req.body;
    const updatedType = await CustomerType.findByIdAndUpdate(
      req.params.id,
      { name },
      { returnDocument: 'after' }
    );

    if (!updatedType) return res.status(404).json({ success: false, message: 'Customer Type not found' });
    res.status(200).json(updatedType);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/customer-types/:id', authorize('customers_delete'), async (req, res) => {  try {
    const deletedType = await CustomerType.findByIdAndDelete(req.params.id);
    if (!deletedType) return res.status(404).json({ success: false, message: 'Customer Type not found' });

    res.status(200).json({ success: true, message: 'Customer Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== SALE RETURNS ====================

// 1. Return WITH Invoice
app.post('/api/sale-returns/complete', authorize('sale_returns_add'), async (req, res) => {
  const { saleId, customerId, invoiceNumber, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) throw new Error('At least one item is required.');

    const sale = await Sale.findById(saleId).session(session);
    if (!sale) throw new Error('Original sale not found.');

    let totalAmount = 0;
    const preparedItems = [];

    // 1. Calculate total & validate
    for (const reqItem of items) {
      if (!reqItem.quantity || reqItem.quantity <= 0) throw new Error('Quantity must be > 0');
      const itemTotal = reqItem.quantity * reqItem.unitPrice;
      totalAmount += itemTotal;

      preparedItems.push({
        product: reqItem.product,
        quantity: reqItem.quantity,
        unitPrice: reqItem.unitPrice,
        totalPrice: itemTotal
      });
    }

    // 2. Generate Return Number (SR-XXXX)
    const counter = await Counter.findOneAndUpdate(
      { name: 'saleReturnNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const returnNumber = `SR-${counter.seq.toString()}`;

    // 3. Create Sale Return Record
    const created = await SaleReturn.create([{
      returnNumber,
      sale: saleId,
      customer: customerId,
      items: preparedItems,
      totalAmount,
      returnDate: new Date(),
      isBlindReturn: false
    }], { session });
    const savedReturn = created[0];

    // 4. Update Stock & Log Movement (Stock IN)
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found.`);

      product.quantity += item.quantity; // Restore Stock
      await product.save({ session });

      await StockMovement.create([{
        product: item.product,
        movementType: 'IN', // Stock comes back in
        quantity: item.quantity,
        referenceType: 'SaleReturn',
        referenceId: savedReturn._id,
        notes: `Returned against invoice ${invoiceNumber}`
      }], { session });
    }

    // 5. Update Cash Register (Refunded Cash goes to totalReturn)
    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.totalReturn += totalAmount; // This reduces expected cash
      await activeRegister.save({ session });
    }

    // 6. Update Customer Ledger (Credit the customer balance)
    const priorEntries = await CustomerAccount.find({ customer: customerId }).session(session);
    const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

    await CustomerAccount.create([{
      customer: customerId,
      invoiceNumber: `BLIND-${returnNumber}`,
      transactionType: 'Sale Return',
      debit: 0,
      credit: totalAmount, // Refund lowers what they owe us
      referenceId: savedReturn._id,
      referenceModel: 'SaleReturn',
      date: new Date()
    }], { session });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Sale return completed successfully',
      saleReturn: savedReturn,
      previousBalance,
      returnAmount: totalAmount,
      newBalance: previousBalance - totalAmount
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing sale return:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});


// 2. Return WITHOUT Invoice (Blind Return)
app.post('/api/sale-returns/blind-return', authorize('sale_returns_add'), async (req, res) => {  const { customerId, returnDate, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) throw new Error('At least one item is required.');
    if (!customerId) throw new Error('Customer is required.');

    let totalAmount = 0;
    const preparedItems = [];

    for (const reqItem of items) {
      if (!reqItem.quantity || reqItem.quantity <= 0) throw new Error('Quantity must be > 0');
      const itemTotal = reqItem.quantity * reqItem.unitPrice;
      totalAmount += itemTotal;

      preparedItems.push({
        product: reqItem.product,
        quantity: reqItem.quantity,
        unitPrice: reqItem.unitPrice,
        totalPrice: itemTotal,
        reason: 'Blind Return'
      });
    }

    // Generate Return Number
    const counter = await Counter.findOneAndUpdate(
      { name: 'saleReturnNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const returnNumber = `SR-${counter.seq.toString()}`;

    // Create Sale Return
    const created = await SaleReturn.create([{
      returnNumber,
      sale: null,
      customer: customerId,
      items: preparedItems,
      totalAmount,
      returnDate: returnDate || new Date(),
      isBlindReturn: true
    }], { session });
    const savedReturn = created[0];

    // Update Stock & Movement (Stock IN)
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found.`);

      product.quantity += item.quantity;
      await product.save({ session });

      await StockMovement.create([{
        product: item.product,
        movementType: 'IN',
        quantity: item.quantity,
        referenceType: 'SaleReturn',
        referenceId: savedReturn._id,
        notes: `Blind return without invoice`
      }], { session });
    }

    // Update Cash Register
    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.totalReturn += totalAmount;
      await activeRegister.save({ session });
    }

    // Update Customer Ledger
    const priorEntries = await CustomerAccount.find({ customer: customerId }).session(session);
    const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

    await CustomerAccount.create([{
      customer: customerId,
      invoiceNumber: `${returnNumber}`,
      transactionType: 'Sale Return',
      debit: 0,
      credit: totalAmount,
      referenceId: savedReturn._id,
      referenceModel: 'SaleReturn',
      date: returnDate || new Date()
    }], { session });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Blind return completed successfully',
      saleReturn: savedReturn,
      previousBalance,
      returnAmount: totalAmount,
      newBalance: previousBalance - totalAmount
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing blind return:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// 3. Get All Sale Returns (List)
app.get('/api/sale-returns', authorize('sale_returns_view'), async (req, res) => {  try {
    const saleReturns = await SaleReturn.find()
      .populate('customer', 'name customerName phone address')
      .populate('sale', 'saleNumber invoiceNumber')
      .populate('items.product', 'name barcode')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      saleReturns: saleReturns
    });
  } catch (error) {
    console.error("Error fetching sale returns:", error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sale returns.',
      error: error.message
    });
  }
});
app.get('/api/sales/check-customer-purchase', authorize('pos_view'), async (req, res) => {  try {
    const { customerId, productId } = req.query;
    const saleExists = await Sale.findOne({
      customer: customerId,
      status: { $nin: ['Hold', 'Cancelled'] },
      'items.product': productId
    });

    res.json({ success: true, hasPurchased: !!saleExists });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// ==================== EXPENSE CATEGORIES ====================
app.get('/api/expense-categories', authorize('expense_category_view'), async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({ status: { $ne: 'inactive' } }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/expense-categories', authorize('expense_category_add'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const existing = await ExpenseCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      status: { $ne: 'inactive' }
    });
    if (existing) {
      return res.status(400).json({ message: 'This category already exists!' });
    }

    const category = new ExpenseCategory({ name: name.trim() });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/expense-categories/:id', authorize('expense_category_edit'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const existing = await ExpenseCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      status: { $ne: 'inactive' },
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ message: 'This category already exists!' });
    }

    const category = await ExpenseCategory.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { returnDocument: 'after' }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/expense-categories/:id', authorize('expense_category_delete'), async (req, res) => {
  try {
    const inUse = await Expense.findOne({ category: req.params.id, status: { $ne: 'inactive' } });
    if (inUse) {
      return res.status(400).json({
        message: 'Cannot delete: This category is currently used by one or more expenses.'
      });
    }

    const category = await ExpenseCategory.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== EXPENSES ====================
app.get('/api/expenses', authorize('expenses_view'), async (req, res) => {
  try {
    const expenses = await Expense.find({ status: { $ne: 'inactive' } })
      .populate('category', 'name')
      .sort({ date: -1, createdAt: 1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/expenses', authorize('expenses_add'), async (req, res) => {
  try {
    const { category, expenseName, date, amount, addedBy, description } = req.body;

    if (!category) return res.status(400).json({ message: 'Expense category is required.' });
    if (!expenseName || !expenseName.trim()) return res.status(400).json({ message: 'Expense name is required.' });
    if (!date) return res.status(400).json({ message: 'Date is required.' });
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }
    if (!addedBy || !addedBy.trim()) return res.status(400).json({ message: 'Added by is required.' });

    const expense = new Expense({
      category,
      expenseName: expenseName.trim(),
      date,
      amount: Number(amount),
      addedBy: addedBy.trim(),
      description: description ? description.trim() : ''
    });

    await expense.save();
    const populated = await Expense.findById(expense._id).populate('category', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/expenses/:id', authorize('expenses_edit'), async (req, res) => {
  try {
    const { category, expenseName, date, amount, addedBy, description } = req.body;

    if (!category) return res.status(400).json({ message: 'Expense category is required.' });
    if (!expenseName || !expenseName.trim()) return res.status(400).json({ message: 'Expense name is required.' });
    if (!date) return res.status(400).json({ message: 'Date is required.' });
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }
    if (!addedBy || !addedBy.trim()) return res.status(400).json({ message: 'Added by is required.' });

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        category,
        expenseName: expenseName.trim(),
        date,
        amount: Number(amount),
        addedBy: addedBy.trim(),
        description: description ? description.trim() : ''
      },
      { returnDocument: 'after' }
    ).populate('category', 'name');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/expenses/:id', authorize('expenses_delete'), async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { returnDocument: 'after' }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== STOCK BREAKAGE ====================
// List all breakage records (main table)
app.get('/api/stock-breakage', authorize('stock_breakage_view'), async (req, res) => {  try {
    const records = await StockBreakage.find()
      .populate('product', 'name categoryId uomId') // Make sure to populate product
      .sort({ createdAt: 1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add multiple broken products at once — ONE breakageNumber for the whole batch
app.post('/api/stock-breakage/batch', authorize('stock_breakage_add'), async (req, res) => {  const { items, notes } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one broken product is required.');
    }

    const preparedItems = [];

    for (const item of items) {
      // Allow frontend to pass 'product' or 'productId' safely
      const productId = item.productId || item.product;
      if (!productId) throw new Error('Product is required for all items.');

      const qty = Number(item.quantity);
      if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero for all items.');

      const product = await Product.findById(productId).session(session);
      if (!product) throw new Error(`Product not found: ${productId}`);

      if (product.quantity < qty) {
        throw new Error(`Cannot mark "${product.name}" as broken — only ${product.quantity} units in stock.`);
      }

      const previousQuantity = product.quantity;
      const newQuantity = previousQuantity - qty;
      product.quantity = newQuantity;
      await product.save({ session });

      preparedItems.push({ product: productId, quantity: qty, previousQuantity, newQuantity });
    }

    // ONE counter increment / ONE breakage number for the entire batch
    const counter = await Counter.findOneAndUpdate(
      { name: 'breakageNumber' },
      { $inc: { seq: 1 } },
      { upsert: true, session, returnDocument: 'after' }
    );
    const breakageNumber = `BRK-${counter.seq.toString()}`;

    // 1. Create a flat document for EACH product in the batch, sharing the breakageNumber
    const breakageDocs = preparedItems.map(item => ({
      breakageNumber: breakageNumber,
      invoiceNumber: breakageNumber, // Setting invoiceNumber so frontend grouping works flawlessly
      product: item.product,
      quantity: item.quantity,
      previousQuantity: item.previousQuantity,
      newQuantity: item.newQuantity,
      notes: notes
    }));

    // 2. Insert all breakage documents at once
    const createdRecords = await StockBreakage.insertMany(breakageDocs, { session });

    // 3. Individual StockMovement entry per product, referencing its specific breakage record ID
    for (let i = 0; i < preparedItems.length; i++) {
      const item = preparedItems[i];
      const savedRecord = createdRecords[i];

      await StockMovement.create([{
        product: item.product,
        movementType: 'OUT',
        quantity: item.quantity,
        referenceType: 'StockBreakage',
        referenceId: savedRecord._id,
        notes: notes ? `Broken stock (${breakageNumber}) — ${notes}` : `Broken stock (${breakageNumber})`
      }], { session });
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: `Broken stock recorded successfully (${breakageNumber}).`,
      records: createdRecords // Return the array of created records
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error recording stock breakage:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// ==================== PURCHASE REBATE ====================
app.get('/api/purchases/:id/rebatable-items', authorize('purchase_rebates_view'), async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('items.product').populate('supplier');
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const existingRebates = await PurchaseRebate.find({ purchase: purchase._id });
    const rebateIds = existingRebates.map(r => r._id);
    const existingDetails = await PurchaseRebateDetail.find({ rebate: { $in: rebateIds } });

    const alreadyRebatedMap = {};
    existingDetails.forEach(detail => {
      const key = detail.product.toString();
      alreadyRebatedMap[key] = (alreadyRebatedMap[key] || 0) + detail.quantity;
    });

    const rebatableItems = purchase.items.map(item => {
      const key = item.product._id.toString();
      const alreadyRebated = alreadyRebatedMap[key] || 0;
      return {
        product: item.product,
        purchasedQuantity: item.quantity,
        unitPrice: item.unitPrice,
        alreadyRebated,
        maxRebatable: item.quantity - alreadyRebated
      };
    });

    res.json({
      success: true,
      purchase: {
        _id: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        invoiceNumber: purchase.invoiceNumber,
        supplier: purchase.supplier
      },
      items: rebatableItems
    });
  } catch (error) {
    console.error('Error fetching rebatable items:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
// Complete a purchase rebate — one-step, supplier ledger only, NO stock/StockMovement effect
app.post('/api/purchase-rebates/complete', authorize('purchase_rebates_add'), async (req, res) => {  const { purchaseId, supplierId, invoiceNumber, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) {
      throw new Error('At least one item with a rebate quantity is required.');
    }

    const purchase = await Purchase.findById(purchaseId).session(session);
    if (!purchase) {
      throw new Error('Original purchase not found.');
    }

    // Re-validate quantities against already-rebated amounts
    const existingRebates = await PurchaseRebate.find({ purchase: purchaseId }).session(session);
    const rebateIds = existingRebates.map(r => r._id);
    const existingDetails = await PurchaseRebateDetail.find({ rebate: { $in: rebateIds } }).session(session);

    const alreadyRebatedMap = {};
    existingDetails.forEach(detail => {
      const key = detail.product.toString();
      alreadyRebatedMap[key] = (alreadyRebatedMap[key] || 0) + detail.quantity;
    });

    for (const reqItem of items) {
      const originalItem = purchase.items.find(pi => pi.product.toString() === reqItem.product);
      if (!originalItem) {
        throw new Error(`Product ${reqItem.product} was not part of this purchase.`);
      }
      if (!reqItem.quantity || reqItem.quantity <= 0) {
        throw new Error('Rebate quantity must be greater than zero.');
      }
      const alreadyRebated = alreadyRebatedMap[reqItem.product] || 0;
      const maxRebatable = originalItem.quantity - alreadyRebated;
      if (reqItem.quantity > maxRebatable) {
        throw new Error(`Cannot rebate ${reqItem.quantity} units — only ${maxRebatable} remain rebatable for this product.`);
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    // Generate PRB-XXXX rebate number
    const counter = await Counter.findOneAndUpdate(
      { name: 'rebateNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const rebateNumber = `PRB-${counter.seq.toString()}`;

    const createdRebate = await PurchaseRebate.create([{
      rebateNumber,
      purchase: purchaseId,
      supplier: supplierId,
      invoiceNumber,
      totalAmount
    }], { session });
    const savedRebate = createdRebate[0];

    // Line items — NO stock/product/StockMovement changes here
    for (const item of items) {
      await PurchaseRebateDetail.create([{
        rebate: savedRebate._id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice
      }], { session });
    }

    // LEDGER — credit the supplier (reduces what we owe them), NO cash/register movement
    const priorEntries = await SupplierAccount.find({ supplier: supplierId }).session(session);
    const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

    await SupplierAccount.create([{
      supplier: supplierId,
      invoiceNumber: `PRB-${invoiceNumber}`,
      transactionType: 'Purchase Rebate',
      debit: 0,
      credit: totalAmount,
      referenceId: savedRebate._id,
      referenceModel: 'PurchaseRebate',
      date: new Date()
    }], { session });

    const newBalance = previousBalance - totalAmount;

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Rebate recorded successfully',
      purchaseRebate: savedRebate,
      previousBalance,
      rebateAmount: totalAmount,
      newBalance
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing purchase rebate:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

app.get('/api/purchase-rebates', authorize('purchase_rebates_view'), async (req, res) => {  try {
    const rebates = await PurchaseRebate.find()
      .populate('supplier')
      .populate('purchase', 'purchaseNumber invoiceNumber')
      .sort({ createdAt: 1 })
      .lean();

    const rebateIds = rebates.map(r => r._id);
    const allDetails = await PurchaseRebateDetail.find({ rebate: { $in: rebateIds } })
      .populate('product', 'name');

    const detailsByRebate = {};
    allDetails.forEach(d => {
      const key = d.rebate.toString();
      if (!detailsByRebate[key]) detailsByRebate[key] = [];
      detailsByRebate[key].push(d);
    });

    const result = rebates.map(r => ({
      ...r,
      items: detailsByRebate[r._id.toString()] || []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a single rebate with its line items (for the View modal)
app.get('/api/purchase-rebates/:id', authorize('purchase_rebates_view'), async (req, res) => {  try {
    const rebate = await PurchaseRebate.findById(req.params.id)
      .populate('supplier')
      .populate('purchase', 'purchaseNumber invoiceNumber');
    if (!rebate) {
      return res.status(404).json({ success: false, message: 'Purchase rebate not found' });
    }

    const details = await PurchaseRebateDetail.find({ rebate: rebate._id }).populate('product', 'name');

    res.json({ success: true, rebate, details });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// 1. Complete Purchase Rate Difference & Hit Supplier Account
app.post('/api/purchase-rate-difference/complete', authorize('purchase_rate_difference_add'), async (req, res) => {  const { purchaseId, supplierId, invoiceNumber, netDifference, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) {
      throw new Error('At least one item with a rate difference is required.');
    }

    const purchase = await Purchase.findById(purchaseId).session(session);
    if (!purchase) {
      throw new Error('Original purchase not found.');
    }

    // Generate unique PRD-XXXX difference number
    const counter = await Counter.findOneAndUpdate(
      { name: 'rateDifferenceNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const differenceNumber = `PRD-${counter.seq.toString()}`;

    // Create the Rate Difference record
    const createdRateDiff = await PurchaseRateDifference.create([{
      differenceNumber,
      purchaseId,
      supplierId,
      invoiceNumber,
      netDifference,
      items: items.map(item => ({
        product: item.product,
        purchasedQuantity: item.purchasedQuantity,
        prevRate: item.prevRate,
        newRate: item.newRate,
        totalDifference: item.totalDifference
      }))
    }], { session });
    const savedRateDiff = createdRateDiff[0];

    // HIT THE SUPPLIER ACCOUNT (Ledger Math)
    if (netDifference !== 0) {
      const priorEntries = await SupplierAccount.find({ supplier: supplierId }).session(session);
      const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

      // netDifference > 0 means rate increased (we owe them more -> Credit)
      // netDifference < 0 means rate decreased (we owe them less -> Debit)
     const debitAmount = netDifference > 0 ? netDifference : 0;
      const creditAmount = netDifference < 0 ? Math.abs(netDifference) : 0;

      await SupplierAccount.create([{
        supplier: supplierId,
        invoiceNumber: `DIFF-${invoiceNumber}`,
        transactionType: 'Purchase Rate Difference', 
        debit: debitAmount, 
        credit: creditAmount, 
        referenceId: savedRateDiff._id,
        referenceModel: 'PurchaseRateDifference', 
        date: new Date()
      }], { session });}

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Rate difference recorded and supplier account updated successfully.',
      rateDifference: savedRateDiff
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing rate difference:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// ==================== SPECIFIC SEARCH FOR RATE DIFFERENCE ====================
app.get('/api/purchase-rate-difference/search', authorize('purchase_rate_difference_view'), async (req, res) => {
  const { invoiceNumber } = req.query;

  if (!invoiceNumber || !invoiceNumber.trim()) {
    return res.status(400).json({ success: false, message: 'Invoice number is required.' });
  }

  try {
    const purchase = await Purchase.findOne({
      invoiceNumber: { $regex: new RegExp(`^${invoiceNumber.trim()}$`, 'i') }
    })
      .populate('items.product')
      .populate('supplier');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'No purchase found with that invoice number.' });
    }

    return res.json({
      success: true,
      purchase: {
        _id: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        invoiceNumber: purchase.invoiceNumber,
        supplier: purchase.supplier,
        items: purchase.items
      }
    });
  } catch (error) {
    console.error('Error searching purchase for rate difference:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// 2. List all Rate Difference records (Main table view)
app.get('/api/purchase-rate-difference', authorize('purchase_rate_difference_view'), async (req, res) => {  try {
    const records = await PurchaseRateDifference.find()
      .populate('supplierId', 'companyName contactPerson')
      .populate('purchaseId', 'purchaseNumber invoiceNumber')
      .populate('items.product', 'name')
      .sort({ createdAt: 1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching rate differences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
app.get('/api/purchase-rate-difference/:id', authorize('purchase_rate_difference_view'), async (req, res) => {  try {
    const record = await PurchaseRateDifference.findById(req.params.id)
      .populate('supplierId', 'companyName contactPerson')
      .populate('purchaseId', 'purchaseNumber invoiceNumber')
      .populate('items.product', 'name');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Rate difference record not found' });
    }

    res.json({ success: true, record });
  } catch (error) {
    console.error('Error fetching single rate difference:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ==================== SALES REBATE ====================

app.get('/api/sales/:id/rebatable-items', authorize('sales_rebates_view'), async (req, res) => {  try {
    const sale = await Sale.findById(req.params.id).populate('customer');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const saleDetails = await SaleDetail.find({ sale: sale._id }).populate('product');
    if (!saleDetails || saleDetails.length === 0) {
      return res.status(404).json({ success: false, message: 'No items found for this sale.' });
    }

    // Subtract quantities already rebated (across all prior sales rebates on this sale)
    const existingRebates = await SalesRebate.find({ sale: sale._id });
    const rebateIds = existingRebates.map(r => r._id);
    const existingDetails = await SalesRebateDetail.find({ rebate: { $in: rebateIds } });

    const alreadyRebatedMap = {};
    existingDetails.forEach(detail => {
      const key = detail.product.toString();
      alreadyRebatedMap[key] = (alreadyRebatedMap[key] || 0) + detail.quantity;
    });

    const items = saleDetails.map(detail => {
      const key = detail.product._id.toString();
      const alreadyRebated = alreadyRebatedMap[key] || 0;
      const saleQty = detail.quantity;
      return {
        product: detail.product,
        saleQty,
        alreadyRebated,
        maxRebatable: saleQty - alreadyRebated,
        unitPrice: detail.unitPrice
      };
    });

    return res.json({
      success: true,
      sale: {
        _id: sale._id,
        saleNumber: sale.saleNumber,
        invoiceNumber: sale.saleNumber,
        customer: sale.customer,
        saleDate: sale.saleDate,
        createdAt: sale.createdAt
      },
      items
    });
  } catch (error) {
    console.error('Error fetching rebatable items:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Complete a sales rebate — one-step, customer ledger only, NO stock/StockMovement effect
app.post('/api/sales-rebates/complete', authorize('sales_rebates_add'), async (req, res) => {  const { saleId, customerId, invoiceNumber, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) {
      throw new Error('At least one item with a rebate quantity is required.');
    }

    const sale = await Sale.findById(saleId).session(session);
    if (!sale) {
      throw new Error('Original sale not found.');
    }

    const saleDetails = await SaleDetail.find({ sale: saleId }).session(session);

    // Re-validate quantities against already-rebated amounts
    const existingRebates = await SalesRebate.find({ sale: saleId }).session(session);
    const rebateIds = existingRebates.map(r => r._id);
    const existingDetails = await SalesRebateDetail.find({ rebate: { $in: rebateIds } }).session(session);

    const alreadyRebatedMap = {};
    existingDetails.forEach(detail => {
      const key = detail.product.toString();
      alreadyRebatedMap[key] = (alreadyRebatedMap[key] || 0) + detail.quantity;
    });

    for (const reqItem of items) {
      const originalItem = saleDetails.find(sd => sd.product.toString() === reqItem.product);
      if (!originalItem) {
        throw new Error(`Product ${reqItem.product} was not part of this sale.`);
      }
      if (!reqItem.quantity || reqItem.quantity <= 0) {
        throw new Error('Rebate quantity must be greater than zero.');
      }
      const alreadyRebated = alreadyRebatedMap[reqItem.product] || 0;
      const maxRebatable = originalItem.quantity - alreadyRebated;
      if (reqItem.quantity > maxRebatable) {
        throw new Error(`Cannot rebate ${reqItem.quantity} units — only ${maxRebatable} remain rebatable for this product.`);
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    // Generate SRB-XXXX rebate number
    const counter = await Counter.findOneAndUpdate(
      { name: 'salesRebateNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const rebateNumber = `SRB-${counter.seq.toString()}`;

    const createdRebate = await SalesRebate.create([{
      rebateNumber,
      sale: saleId,
      customer: customerId,
      invoiceNumber,
      totalAmount
    }], { session });
    const savedRebate = createdRebate[0];

    // Line items — NO stock/product/StockMovement changes here
    for (const item of items) {
      await SalesRebateDetail.create([{
        rebate: savedRebate._id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice
      }], { session });
    }

    // LEDGER — credit the customer (reduces what they owe us), NO cash/register movement
    const priorEntries = await CustomerAccount.find({ customer: customerId }).session(session);
    const previousBalance = priorEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);

    await CustomerAccount.create([{
      customer: customerId,
      invoiceNumber: `SRB-${invoiceNumber}`,
      transactionType: 'Sales Rebate',
      debit: 0,
      credit: totalAmount,
      referenceId: savedRebate._id,
      referenceModel: 'SalesRebate',
      date: new Date()
    }], { session });

    const newBalance = previousBalance - totalAmount;

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Rebate recorded successfully',
      salesRebate: savedRebate,
      previousBalance,
      rebateAmount: totalAmount,
      newBalance
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing sales rebate:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// List all sales rebates (main table)
app.get('/api/sales-rebates', authorize('sales_rebates_view'), async (req, res) => {  try {
    const rebates = await SalesRebate.find()
      .populate('customer')
      .populate('sale', 'saleNumber')
      .sort({ createdAt: 1 })
      .lean();

    const rebateIds = rebates.map(r => r._id);
    const allDetails = await SalesRebateDetail.find({ rebate: { $in: rebateIds } })
      .populate('product', 'name');

    const detailsByRebate = {};
    allDetails.forEach(d => {
      const key = d.rebate.toString();
      if (!detailsByRebate[key]) detailsByRebate[key] = [];
      detailsByRebate[key].push(d);
    });

    const result = rebates.map(r => ({
      ...r,
      items: detailsByRebate[r._id.toString()] || []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a single rebate with its line items (for the View modal)
app.get('/api/sales-rebates/:id', authorize('sales_rebates_view'), async (req, res) => {  try {
    const rebate = await SalesRebate.findById(req.params.id)
      .populate('customer')
      .populate('sale', 'saleNumber');
    if (!rebate) {
      return res.status(404).json({ success: false, message: 'Sales rebate not found' });
    }

    const details = await SalesRebateDetail.find({ rebate: rebate._id }).populate('product', 'name');

    res.json({ success: true, rebate, details });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});



// 3. GET ALL SALE RATE DIFFERENCES
app.get('/api/sale-rate-difference', authorize('sale_rate_difference_view'), async (req, res) => {  try {
    const records = await SaleRateDifference.find()
      .populate('customerId', 'name customerName')
      .populate('saleId', 'saleNumber invoiceNumber')
      .populate('items.product', 'name')
      .sort({ createdAt: 1 }); 

    res.json(records);
  } catch (error) {
    console.error('Error fetching sale rate differences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. GET SINGLE SALE RATE DIFFERENCE
app.get('/api/sale-rate-difference/:id', authorize('sale_rate_difference_view'), async (req, res) => {  try {
    const record = await SaleRateDifference.findById(req.params.id)
      .populate('customerId', 'name customerName')
      .populate('saleId', 'saleNumber invoiceNumber')
      .populate('items.product', 'name');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Sale rate difference record not found' });
    }

    res.json({ success: true, record });
  } catch (error) {
    console.error('Error fetching single sale rate difference:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. COMPLETE SALE RATE DIFFERENCE & UPDATE LEDGER
app.post('/api/sale-rate-difference/complete', authorize('sale_rate_difference_add'), async (req, res) => {  const { saleId, customerId, invoiceNumber, netDifference, items } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!items || items.length === 0) {
      throw new Error('At least one item with a rate difference is required.');
    }

    const sale = await Sale.findById(saleId).session(session);
    if (!sale) {
      throw new Error('Original sale not found.');
    }

    // Generate unique SRD-XXXX difference number
    const counter = await Counter.findOneAndUpdate(
      { name: 'saleRateDifferenceNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session, returnDocument: 'after' }
    );
    const differenceNumber = `SRD-${counter.seq.toString()}`;

    // Create the Rate Difference record
    const createdRateDiff = await SaleRateDifference.create([{
      differenceNumber,
      saleId,
      customerId: customerId || undefined,
      invoiceNumber,
      netDifference,
      items: items.map(item => ({
        product: item.product,
        soldQuantity: item.soldQuantity,
        prevRate: item.prevRate,
        newRate: item.newRate,
        totalDifference: item.totalDifference
      }))
    }], { session });
    const savedRateDiff = createdRateDiff[0];

    // HIT THE CUSTOMER ACCOUNT (Ledger Math)
    // Only hit ledger if it's NOT a walk-in customer (i.e., customerId exists)
    if (netDifference !== 0 && customerId) {

      // netDifference > 0 means rate increased (customer owes us MORE -> Debit)
      // netDifference < 0 means rate decreased (customer owes us LESS / we owe them -> Credit)
      const debitAmount = netDifference > 0 ? netDifference : 0;
      const creditAmount = netDifference < 0 ? Math.abs(netDifference) : 0;

      await CustomerAccount.create([{
        customer: customerId,
        invoiceNumber: `DIFF-${invoiceNumber}`,
        transactionType: 'Sale Rate Difference',
        debit: debitAmount,
        credit: creditAmount,
        referenceId: savedRateDiff._id,
        referenceModel: 'SaleRateDifference',
        date: new Date()
      }], { session });
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: 'Sale rate difference recorded and customer account updated successfully.',
      rateDifference: savedRateDiff
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing sale rate difference:', error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

app.get('/api/users/:id', authorize(), async (req, res) => {
  try {
    const isRequestingSelf = req.user._id.toString() === req.params.id;
    
    let roleName = '';
    if (typeof req.user.role === 'string') {
      roleName = req.user.role;
    } else if (req.user.role && typeof req.user.role === 'object') {
      roleName = req.user.role.role || req.user.role.name || '';
    }

    const isAdmin = roleName.trim().toLowerCase() === 'admin' || req.user.email === 'admin@gmail.com';
    const hasViewPermission = req.user.role?.permissions?.includes('users_view') || isAdmin;

    if (!isRequestingSelf && !hasViewPermission) {
       return res.status(403).json({ message: 'Forbidden: You do not have permission to view other users.' });
    }

    const user = await User.findById(req.params.id).populate('role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user without sending the password
    const { password: _pw, ...userData } = user.toObject();
    return res.json(userData);
  } catch (error) {
    console.error("Error fetching single user:", error);
    return res.status(500).json({ message: 'Server error', error });
  }
});

// ==================== PROFIT AND LOSS REPORT ====================
app.get('/api/reports/profit-loss', authorize('report_profit_loss_view'), async (req, res) => {
  const { fromDate, toDate } = req.query;

  try {
    const dateMatch = {};
    if (fromDate && toDate) {
      dateMatch.$gte = new Date(fromDate);
      dateMatch.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    }

    // Match conditions for different date fields in your models
    const saleDateFilter = dateMatch.$gte ? { saleDate: dateMatch } : {};
    const expenseDateFilter = dateMatch.$gte ? { date: dateMatch } : {};
    const createdDateFilter = dateMatch.$gte ? { createdAt: dateMatch } : {};

    // ==================== 1. TOTAL SALES ====================
    const salesAgg = await Sale.aggregate([
      { $match: { status: 'Completed', ...saleDateFilter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const TotalSales = salesAgg[0]?.total || 0;

    // ==================== 2. SALES RETURNS ====================
    const saleReturnsAgg = await SaleReturn.aggregate([
      { $match: { ...createdDateFilter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalSaleReturns = saleReturnsAgg[0]?.total || 0;

    // ==================== 3. TOTAL EXPENSES ====================
    // 3A. General Expenses
    const expensesAgg = await Expense.aggregate([
      { $match: { status: { $ne: 'inactive' }, ...expenseDateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const regularExpenses = expensesAgg[0]?.total || 0;

    // 3B. Employee Salaries
    const salariesAgg = await EmployeeAccount.aggregate([
      { $match: { transactionType: 'Salary', ...expenseDateFilter } },
      { $group: { _id: null, total: { $sum: '$debit' } } }
    ]);
    const totalSalaries = salariesAgg[0]?.total || 0;

    const totalExpenses = regularExpenses + totalSalaries;

    // ==================== SEND RESPONSE ====================
    return res.json({
      success: true,
      data: {
        revenue: {
          TotalSales,
          totalSaleReturns
        },
        expenses: {
          totalExpenses
        }
      }
    });

  } catch (error) {
    console.error('Error generating Profit and Loss report:', error);
    return res.status(500).json({ success: false, message: 'Server error generating report.', error: error.message });
  }
});

// ==================== PAYABLE & RECEIVABLE REPORT ====================
app.get('/api/reports/balances', authorize('report_payable_receivable_view'), async (req, res) => {
  try {
    // 1. CUSTOMERS BALANCE
    // Sale: Debit = Goods given (Receivable), Credit = Payment received
    // Balance (Debit - Credit) > 0 means Receivable (Amount we need to collect)
    const customersAg = await CustomerAccount.aggregate([
      { $group: { _id: '$customer', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'info' } },
      { $unwind: '$info' },
      { $lookup: { from: 'customertypes', localField: 'info.customerTypeId', foreignField: '_id', as: 'typeInfo' } },
      { $unwind: { path: '$typeInfo', preserveNullAndEmptyArrays: true } }
    ]);

    const customers = customersAg.map(c => {
      const bal = (c.totalDebit || 0) - (c.totalCredit || 0);
      return {
        id: c._id,
        entityGroup: 'Customer',
        name: c.info.name || c.info.customerName || 'Unknown Customer',
        designation: c.typeInfo?.name || 'Standard',
        payable: bal < 0 ? Math.abs(bal) : 0,    // If negative, it means we owe them money (Advance received)
        receivable: bal > 0 ? bal : 0,           // If positive, it means they owe us
        netBalance: bal
      };
    }).filter(c => c.netBalance !== 0);

// 2. SUPPLIERS BALANCE
    // Purchase: Debit = Goods received (Payable), Credit = Payment sent
    // Balance (Debit - Credit) > 0 means Payable (Amount we need to pay)
    const suppliersAg = await SupplierAccount.aggregate([
      { $group: { _id: '$supplier', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
      { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'info' } },
      { $unwind: '$info' }
    ]);

    const suppliers = suppliersAg.map(s => {
      const bal = (s.totalDebit || 0) - (s.totalCredit || 0);
      return {
        id: s._id,
        entityGroup: 'Supplier',
        // Show Contact Person under 'Name'. If empty, fallback to Company Name.
        name: s.info.contactPerson || s.info.companyName || 'Unknown Supplier',
        
        // FIX: Show actual Company Name under the 'Company' column
        designation: s.info.companyName || '-', 
        
        payable: bal > 0 ? bal : 0,
        receivable: bal < 0 ? Math.abs(bal) : 0,
        netBalance: bal
      };
    }).filter(s => s.netBalance !== 0);

    // 3. EMPLOYEES BALANCE
    // Salary: Debit = Salary applied (Payable), Credit = Salary paid
    // Balance (Debit - Credit) > 0 means Payable (Amount we need to pay)
    const employeesAg = await EmployeeAccount.aggregate([
      { $group: { _id: '$employee', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } },
      { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'info' } },
      { $unwind: '$info' },
      { $lookup: { from: 'designations', localField: 'info.designation', foreignField: '_id', as: 'desigInfo' } },
      { $unwind: { path: '$desigInfo', preserveNullAndEmptyArrays: true } }
    ]);

    const employees = employeesAg.map(e => {
      const bal = (e.totalDebit || 0) - (e.totalCredit || 0);
      return {
        id: e._id,
        entityGroup: 'Employee',
        name: e.info.name || 'Unknown Employee',
        designation: e.desigInfo?.designation || 'Staff',
        payable: bal > 0 ? bal : 0,
        receivable: bal < 0 ? Math.abs(bal) : 0,
        netBalance: bal
      };
    }).filter(e => e.netBalance !== 0);

    // Combine all entities into a single list
    const allBalances = [...customers, ...suppliers, ...employees];

    res.json({ success: true, data: allBalances });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== BUSINESS CAPITAL REPORT ====================
app.get('/api/reports/business-capital', authorize('report_business_capital_view'), async (req, res) => {
  try {
    // 1. CURRENT STOCK VALUE
    // Calculate total value of all active inventory
    const stockAgg = await Product.aggregate([
      { $match: { status: 'active', quantity: { $gt: 0 } } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } }
    ]);
    const currentStockValue = stockAgg[0]?.totalValue || 0;

    // 2. CUSTOMER BALANCES (Receivables & Payables)
    const customerAgg = await CustomerAccount.aggregate([
      { $group: { _id: '$customer', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);
    let customerReceivables = 0; // Asset: Amount customers owe us
    let customerPayables = 0;    // Liability: Advance payments received from customers

    customerAgg.forEach(c => {
      const balance = (c.totalDebit || 0) - (c.totalCredit || 0);
      if (balance > 0) customerReceivables += balance;
      else if (balance < 0) customerPayables += Math.abs(balance);
    });

    // 3. SUPPLIER BALANCES (Receivables & Payables)
    const supplierAgg = await SupplierAccount.aggregate([
      { $group: { _id: '$supplier', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);
    let supplierPayables = 0;    // Liability: Amount we owe to suppliers
    let supplierReceivables = 0; // Asset: Advance payments given to suppliers

    supplierAgg.forEach(s => {
      const balance = (s.totalCredit || 0) - (s.totalDebit || 0);
      if (balance > 0) supplierPayables += balance;
      else if (balance < 0) supplierReceivables += Math.abs(balance);
    });

    // 4. EMPLOYEE BALANCES (Receivables & Payables)
    const employeeAgg = await EmployeeAccount.aggregate([
      { $group: { _id: '$employee', totalDebit: { $sum: '$debit' }, totalCredit: { $sum: '$credit' } } }
    ]);
    let employeePayables = 0;    // Liability: Unpaid salaries we owe to employees
    let employeeReceivables = 0; // Asset: Advance payments given to employees

    employeeAgg.forEach(e => {
      // Debit = Salary (Increase in liability), Credit = Payment (Decrease in liability)
      const balance = (e.totalDebit || 0) - (e.totalCredit || 0);
      if (balance > 0) employeePayables += balance;
      else if (balance < 0) employeeReceivables += Math.abs(balance);
    });

    // 5. FINAL BUSINESS CAPITAL FORMULA
    // Formula: Capital = Total Assets - Total Liabilities
    const totalAssets = currentStockValue + customerReceivables + supplierReceivables + employeeReceivables;
    const totalLiabilities = customerPayables + supplierPayables + employeePayables;
    
    const businessCapital = totalAssets - totalLiabilities;

    // Return structured data to the frontend
    res.json({
      success: true,
      data: {
        currentStockValue,
        customerReceivables,
        customerPayables,
        supplierReceivables,
        supplierPayables,
        employeeReceivables,
        employeePayables,
        businessCapital
      }
    });

  } catch (error) {
    console.error('Error calculating business capital:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// ==================== GET STOCK MOVEMENTS ====================
app.get('/api/stock-movements', authorize('report_stock_movement_view'), async (req, res) => {
  try {
    const movements = await StockMovement.find()
      .populate('product', 'name productCode code')
      .sort({ createdAt: 1 });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ==================== DASHBOARD SUMMARY API ====================
app.get('/api/dashboard/summary', authorize(), async (req, res) => {
  try {
    // 1. Get Counts
    const customers = await Customer.countDocuments({ status: { $ne: 'Inactive' } }); 
    const suppliers = await Supplier.countDocuments({ status: { $ne: 'inactive' } });
    const employees = await Employee.countDocuments({ status: { $ne: 'inactive' } }); 
    const products = await Product.countDocuments({ status: { $ne: 'inactive' } });

    // 2. Get Overall Financial Totals
    const salesAgg = await Sale.aggregate([
      { $match: { status: { $nin: ['Hold', 'Cancelled'] } } }, 
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const purchasesAgg = await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const expensesAgg = await Expense.aggregate([
      { $match: { status: { $ne: 'inactive' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const sales = salesAgg[0]?.total || 0;
    const purchases = purchasesAgg[0]?.total || 0;
    const expenses = expensesAgg[0]?.total || 0;

  
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Group Sales by Month
    const monthlySales = await Sale.aggregate([
      { $match: { status: { $nin: ['Hold', 'Cancelled'] }, saleDate: { $gte: sixMonthsAgo } } },
      { $group: {
          _id: { year: { $year: "$saleDate" }, month: { $month: "$saleDate" } },
          total: { $sum: '$totalAmount' }
      }}
    ]);

    // Group Purchases by Month
    const monthlyPurchases = await Purchase.aggregate([
      { $match: { purchaseDate: { $gte: sixMonthsAgo } } },
      { $group: {
          _id: { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } },
          total: { $sum: '$totalAmount' }
      }}
    ]);

    // Group Expenses by Month
    const monthlyExpenses = await Expense.aggregate([
      { $match: { status: { $ne: 'inactive' }, date: { $gte: sixMonthsAgo } } },
      { $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: '$amount' }
      }}
    ]);

    const chartData = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1; // Month 1-12
      const y = d.getFullYear();
      const monthLabel = monthNames[m - 1];

      // Match aggregated data or set to 0
      const s = monthlySales.find(x => x._id.year === y && x._id.month === m)?.total || 0;
      const p = monthlyPurchases.find(x => x._id.year === y && x._id.month === m)?.total || 0;
      const e = monthlyExpenses.find(x => x._id.year === y && x._id.month === m)?.total || 0;

      chartData.push({
        name: monthLabel,
        sales: s,
        purchases: p,
        expenses: e,
        profit: s - p - e
      });
    }

    res.json({
      success: true,
      stats: { customers, suppliers, employees, products, sales, purchases, expenses },
      chartData: chartData
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== ATTENDANCE ROUTES ====================

// GET: Fetch attendance report with date filters
app.get('/api/attendance/report', authorize('employees_view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, employeeId } = req.query;
    let filter = {};

    // Date Range Filter
    if (dateFrom && dateTo) {
      filter.date = { $gte: dateFrom, $lte: dateTo };
    } else if (dateFrom) {
      filter.date = { $gte: dateFrom };
    } else if (dateTo) {
      filter.date = { $lte: dateTo };
    }

    // Specific Employee Filter
    if (employeeId) {
      filter.employeeId = employeeId;
    }

    const records = await Attendance.find(filter)
      .populate('employeeId', 'name designation')
      .sort({ date: -1 });

    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching attendance report' });
  }
});

// POST: Bulk save/update attendance (Single or All)
app.post('/api/attendance', authorize('employees_edit'), async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Date and records are required.' });
    }

    // Validate that every record has a valid employeeId
    for (const record of records) {
      const empId = record.employeeId || record.employee;
      if (!empId) {
        return res.status(400).json({ success: false, message: 'Validation error: employeeId is missing.' });
      }
    }

    // Prepare bulk operations for upsert
    const bulkOps = records.map(record => {
      const empId = record.employeeId || record.employee;
      return {
        updateOne: {
          filter: { employeeId: empId, date: date },
          update: { 
            $set: { 
              clockIn: record.clockIn || '',
              clockOut: record.clockOut || '',
              status: record.status || 'Present', 
              remarks: record.remarks || '' 
            } 
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
    }

    res.status(200).json({ success: true, message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE: Remove an attendance record by ID
app.delete('/api/attendance/:id', authorize('employees_edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Attendance.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    res.status(200).json({ success: true, message: 'Attendance deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// GET: Fetch attendance rules
app.get('/api/attendance-rules', authorize('settings_view'), async (req, res) => {
  try {
    let rule = await AttendanceRule.findOne();
    if (!rule) {
      rule = await AttendanceRule.create({});
    }
    res.status(200).json({ success: true, rule });
  } catch (error) {
    console.error('Error fetching rules:', error); 
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT: Update attendance rules
app.put('/api/attendance-rules', authorize('settings_edit'), async (req, res) => {
  try {
    let rule = await AttendanceRule.findOne();
    if (!rule) {
      rule = new AttendanceRule(req.body);
    } else {
      Object.assign(rule, req.body);
    }
    await rule.save();
    res.status(200).json({ success: true, message: 'Rules updated successfully', rule });
  } catch (error) {
    console.error('Error updating rules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Fetch Attendance Summary Report (For Payroll / Analytics)
app.get('/api/reports/attendance-summary', authorize('reports_view'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ success: false, message: 'Date range is required' });
    }

    // 1. Fetch all attendance records in the date range
    const records = await Attendance.find({
      date: { $gte: dateFrom, $lte: dateTo }
    }).populate('employeeId', 'name designation');

    const summaryMap = {};

    records.forEach(rec => {
      const emp = rec.employeeId;
      if (!emp) return;
      
      const empId = emp._id.toString();

      if (!summaryMap[empId]) {
        summaryMap[empId] = {
          employeeId: empId,
          name: emp.name,
          designation: emp.designation?.designation || 'Staff',
          totalDays: 0,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          leave: 0
        };
      }

      summaryMap[empId].totalDays += 1;
      
      if (rec.status === 'Present') summaryMap[empId].present += 1;
      else if (rec.status === 'Absent') summaryMap[empId].absent += 1;
      else if (rec.status === 'Late') summaryMap[empId].late += 1;
      else if (rec.status === 'Half-day') summaryMap[empId].halfDay += 1;
      else if (rec.status === 'Leave') summaryMap[empId].leave += 1;
    });

    const summaryArray = Object.values(summaryMap).sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ success: true, summary: summaryArray });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching summary' });
  }
});

// ==================== EXPIRY REPORT API ====================
app.get('/api/reports/expiring-stock', authorize('report_view'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30; 
    
    const currentDate = new Date();
    const targetDate = new Date();
    targetDate.setDate(currentDate.getDate() + days);

    const expiringBatches = await Batch.find({
      quantity: { $gt: 0 },
      expiryDate: { $lte: targetDate } 
    })
    .populate('product', 'name categoryId')
    .sort({ expiryDate: 1 }); 

    const formattedBatches = expiringBatches.map(batch => {
      const isExpired = new Date(batch.expiryDate) < currentDate;
      return {
        _id: batch._id,
        productName: batch.product?.name || 'Unknown',
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        purchasePrice: batch.purchasePrice,
        expiryDate: batch.expiryDate,
        status: isExpired ? 'Expired' : 'Expiring Soon'
      };
    });

    res.status(200).json({ success: true, data: formattedBatches });
  } catch (error) {
    console.error('Error fetching expiring stock:', error);
    res.status(500).json({ success: false, message: 'Server error generating expiry report.' });
  }
});

// ==================== BATCH MANAGEMENT ====================
// Get all active batches
app.get('/api/batches', authorize('products_view'), async (req, res) => {
  try {
    const batches = await Batch.find({ quantity: { $gt: 0 } })
      .populate('product', 'name categoryId')
      .sort({ expiryDate: 1 });
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update specific batch expiry date
app.put('/api/batches/:id/expiry', authorize('products_edit'), async (req, res) => {
  try {
    const { expiryDate } = req.body;
    if (!expiryDate) return res.status(400).json({ success: false, message: 'Expiry date is required' });

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { expiryDate },
      { returnDocument: 'after' }
    ).populate('product', 'name');

    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    res.json({ success: true, message: 'Batch expiry updated successfully', batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EMPLOYEE LOAN / ADVANCE ====================

app.get('/api/employee-loans', authorize('employee_account_view'), async (req, res) => {
  try {
    const loans = await EmployeeLoan.find({ status: { $ne: 'Inactive' } })
      .populate('employee', 'name designation')
      .sort({ _id: 1 });;
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Issue new loan
app.post('/api/employee-loans', authorize('employee_account_add'), async (req, res) => {
  const { employeeId, amount, date, notes } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!employeeId) throw new Error('Employee is required.');
    const loanAmount = Number(amount);
    if (!loanAmount || loanAmount <= 0) throw new Error('Loan amount must be greater than zero.');

    // 1. Auto-generate Loan Number (LN-XXXX)
    const counter = await Counter.findOneAndUpdate(
      { name: 'loanNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );
    const loanNumber = `LN-${counter.seq}`;

    // 2. Create Loan Record
    const createdLoan = await EmployeeLoan.create([{
      loanNumber,
      employee: employeeId,
      amount: loanAmount,
      date: date || new Date(),
      notes
    }], { session });

    // 3. Update Employee Ledger 
    await EmployeeAccount.create([{
      employee: employeeId,
      invoiceNumber: loanNumber,
      transactionType: 'Loan', // 💡 YAHAN 'Payment' KI JAGAH 'Loan' KAR DIYA HAI
      debit: 0,
      credit: loanAmount,
      date: date || new Date(),
      notes: notes || 'Loan Issued'
    }], { session });

    // 4. Update Cash Register
    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.purchaseAmount = (activeRegister.purchaseAmount || 0) + loanAmount;
      await activeRegister.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json({ success: true, message: 'Loan issued successfully', data: createdLoan[0] });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error issuing loan:', error); 
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// DELETE: Soft delete / Cancel Loan
app.delete('/api/employee-loans/:id', authorize('employee_account_add'), async (req, res) => {
  try {
    const loan = await EmployeeLoan.findByIdAndUpdate(
      req.params.id, 
      { status: 'Inactive' }, 
      { returnDocument: 'after' }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    
    // Reverse from ledger
    await EmployeeAccount.findOneAndDelete({ referenceId: loan._id, transactionType: 'Loan / Advance' });

    res.json({ success: true, message: 'Loan cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// ==================== SALARY CONFIGURATION ====================

app.get('/api/salary-config', authorize('employee_account_view'), async (req, res) => {
  try {
    const configs = await SalaryConfig.find()
      .populate('employee', 'name designation department')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST / PUT: Create or Update Salary Configuration
app.post('/api/salary-config', authorize('employee_account_add'), async (req, res) => {
  const { employeeId, employeeType, monthlySalary, allowanceAmount, salaryWithAttendance, wefDate, notes } = req.body;

  try {
    if (!employeeId) throw new Error('Employee name is required.');
    
    const monthly = Number(monthlySalary) || 0;
    const allowance = Number(allowanceAmount) || 0;
    
    if (monthly <= 0) throw new Error('Monthly salary must be greater than zero.');

    const totalAmount = monthly + allowance;

    const config = await SalaryConfig.findOneAndUpdate(
      { employee: employeeId },
      { 
        employeeType: employeeType || 'Staff',
        monthlySalary: monthly, 
        allowanceAmount: allowance, 
        totalAmount, 
        salaryWithAttendance: salaryWithAttendance || 'Yes',
        wefDate: wefDate || new Date(),
        notes
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    ).populate('employee', 'name designation');

    res.status(200).json({ success: true, message: 'Salary Configuration saved successfully', data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE: Remove Salary Configuration
app.delete('/api/salary-config/:id', authorize('employee_account_add'), async (req, res) => {
  try {
    const deleted = await SalaryConfig.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Configuration not found.' });
    res.json({ success: true, message: 'Salary configuration deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PAYROLL / GENERATE SALARY ====================

app.get('/api/payroll/preview', authorize('employee_account_view'), async (req, res) => {
  try {
    const { month, year } = req.query;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = monthNames.indexOf(month);
    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    
    const monthString = String(monthIndex + 1).padStart(2, '0');
    const yearMonthPrefix = `${year}-${monthString}`;

    const configs = await SalaryConfig.find().populate('employee');
    const previewData = [];

    for (const config of configs) {
      if (!config.employee || config.employee.status === 'inactive') continue;
      const emp = config.employee;
      const empId = emp._id;
      
      let baseSalary = config.totalAmount || config.netSalary || (config.monthlySalary + (config.allowanceAmount || 0));

      // Mid-month joining proration check
      let effectiveStart = monthStart;
      if (emp.joiningDate) {
        const joinD = new Date(emp.joiningDate);
        if (joinD > monthStart && joinD <= monthEnd) {
          effectiveStart = joinD;
        } else if (joinD > monthEnd) {
          continue;
        }
      }

      const activeDaysCount = Math.round((monthEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
      let prorationMultiplier = activeDaysCount / totalDaysInMonth;
      if (prorationMultiplier > 1) prorationMultiplier = 1;

      let proratedBase = baseSalary * prorationMultiplier;

      // Attendance check
      const attendances = await Attendance.find({
        employeeId: empId,
        date: { $regex: `^${yearMonthPrefix}` } 
      });

      let absentCount = 0;
      let halfDayCount = 0;

      attendances.forEach(att => {
         if (att.status === 'Absent') absentCount++;
         if (att.status === 'Half-day') halfDayCount++;
      });

      const totalAbsentPenaltyDays = absentCount + (halfDayCount * 0.5);
      const perDaySalary = baseSalary / totalDaysInMonth;
      const absentDeduction = totalAbsentPenaltyDays * perDaySalary;
      
      const finalCalculatedSalary = Math.max(0, Math.round(proratedBase - absentDeduction));

      const salaryNotes = `Salary for ${month} ${year}`;
      const existingEntry = await EmployeeAccount.findOne({
        employee: empId,
        transactionType: 'Salary',
        notes: new RegExp(`Salary for ${month} ${year}`, 'i')
      });

      const ledgerEntries = await EmployeeAccount.find({ employee: empId });
      const currentBalance = ledgerEntries.reduce((sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0), 0);

      previewData.push({
        employeeId: empId,
        employeeName: emp.name,
        netFixedSalary: baseSalary,
        activeDaysCount,
        totalDaysInMonth,
        presentCount: totalDaysInMonth - absentCount,
        absentCount,
        halfDayCount,
        absentDeduction: Math.round(absentDeduction),
        finalCalculatedSalary,
        currentBalance, 
        projectedBalance: currentBalance + finalCalculatedSalary,
        status: existingEntry ? 'Generated' : 'Pending',
        notes: salaryNotes
      });
    }

    res.json({ success: true, data: previewData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/payroll/process', authorize('employee_account_add'), async (req, res) => {
  const { employeesToProcess } = req.body;
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    const counter = await Counter.findOneAndUpdate(
      { name: 'salaryNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );
    const batchNumber = `SAL-B${counter.seq}`;

    const ledgerEntries = [];
    
    for (const emp of employeesToProcess) {
      ledgerEntries.push({
        employee: emp.employeeId,
        invoiceNumber: batchNumber,
        transactionType: 'Salary',
        debit: emp.finalCalculatedSalary,
        credit: 0,
        date: new Date(),
        notes: emp.notes
      });
    }

    if (ledgerEntries.length > 0) {
      await EmployeeAccount.insertMany(ledgerEntries, { session });
    }

    await session.commitTransaction();
    res.status(200).json({ success: true, message: `Salary generated successfully for ${ledgerEntries.length} employees.` });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});
// ==========================================
// POST: Save Loan Recovery
// ==========================================

app.get('/api/employee-loan-recoveries', authorize('settings_view'), async (req, res) => {
  try {
    const recoveries = await EmployeeAccount.find({ transactionType: 'Loan Recovery' })
      .populate('employee', 'name designation')
      .sort({ date: 1 });  

    res.status(200).json({ 
      success: true, 
      data: recoveries 
    });
  } catch (error) {
    console.error('Error fetching loan recoveries:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching data.' });
  }
});
app.post('/api/employee-loan-recoveries', authorize('employee_account'), async (req, res) => {
  const { employeeId, amount, recoveryDate, notes } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!employeeId || !amount || !recoveryDate) {
      throw new Error('Employee, Amount, aur Date dena zaroori hai.');
    }

    const recDate = new Date(recoveryDate);

    const empLedger = await EmployeeAccount.find({ employee: employeeId }).session(session);
    const currentBalance = empLedger.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);

    if (currentBalance >= 0) {
      throw new Error('Is employee par koi Loan / Advance nahi hai.');
    }

    const totalLoanOwed = Math.abs(currentBalance);
    if (Number(amount) > totalLoanOwed) {
      throw new Error(`Aap sirf PKR ${totalLoanOwed} tak hi recover kar sakte hain.`);
    }

const lastLoanEntry = await EmployeeAccount.findOne({
  employee: employeeId,
  transactionType: { $regex: /loan|advance/i }
}).sort({ date: -1 }).session(session);

if (lastLoanEntry && lastLoanEntry.date) {
  const loanDate = new Date(lastLoanEntry.date);
  if (!isNaN(loanDate.getTime()) && recDate < loanDate) {
    throw new Error('Illogical Date! Recovery cannot take place before loan date .');
  }
}

  const counter = await Counter.findOneAndUpdate(
      { name: 'loanRecoveryNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );
    const invoiceNumber = `LN-REC-${counter.seq}`;

    const recoveryEntry = new EmployeeAccount({
      employee: employeeId,
      invoiceNumber: invoiceNumber,
      transactionType: 'Loan Recovery',
      debit: Number(amount),
      credit: 0,
      date: recDate,
      notes: notes || 'Loan Recovery'
    });

    await recoveryEntry.save({ session });

    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.cashInHand = (activeRegister.cashInHand || 0) + Number(amount);
      await activeRegister.save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({ 
      success: true, 
      message: 'Loan Recovery successfully saved!', 
      data: recoveryEntry 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error saving loan recovery:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

app.get('/api/reports/product-suppliers-matrix', authorize('products_view'), async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .populate('categoryId', 'name')
      .populate('uomId', 'name abbreviation')
      .populate('approvedSuppliers.supplier', 'companyName name contactPerson phone')
      .sort({ name: 1 });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error generating product-suppliers matrix report:', error);
    res.status(500).json({ success: false, message: 'Server error generating report.' });
  }
});

app.get('/api/salary-calendar', authorize('dashboard_view'), async (req, res) => {
  try {
    const calendars = await SalaryCalendar.find().sort({ year: -1, monthIndex: 1 });
    res.json({ success: true, data: calendars });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/salary-calendar', authorize('settings_edit'), async (req, res) => {
  const { year } = req.body;
  try {
    if (!year || isNaN(year)) {
      return res.status(400).json({ success: false, message: 'Valid Year is required.' });
    }

    const yearNum = Number(year);
        try {
      await SalaryCalendar.collection.dropIndexes();
    } catch (e) {
    }

    const existingRecords = await SalaryCalendar.find({ year: yearNum });
    const existingMonthNames = existingRecords.map(record => record.month);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const monthsToAdd = monthNames.filter(m => !existingMonthNames.includes(m));

    if (monthsToAdd.length === 0) {
      return res.status(400).json({ success: false, message: `Calendar for the year ${yearNum} is already fully generated!` });
    }

    const calendarEntries = monthsToAdd.map(month => ({
      year: yearNum,
      month: month,
      monthIndex: monthNames.indexOf(month) + 1,
      status: 'In Active'
    }));

    await SalaryCalendar.insertMany(calendarEntries);

    res.status(201).json({ success: true, message: `Remaining months for ${yearNum} generated successfully!` });
  } catch (error) {
    console.error('Error generating calendar:', error);
    res.status(500).json({ success: false, message: 'Server error while generating calendar.' });
  }
});
app.put('/api/salary-calendar/process', authorize('settings_edit'), async (req, res) => {
  const { year, month } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!year || !month) throw new Error('Year and Month are required');

    const existingCycle = await SalaryCalendar.findOne({ year: Number(year), month: month }).session(session);
    if (existingCycle && existingCycle.status === 'Processed') {
      throw new Error(`Salary for ${month} ${year} is already processed!`);
    }

    const updatedCycle = await SalaryCalendar.findOneAndUpdate(
      { year: Number(year), month: month },
      { status: 'Processed' },
      { new: true, upsert: true, session }
    );

    const configs = await SalaryConfig.find().populate('employee').session(session);

    const counter = await Counter.findOneAndUpdate(
      { name: 'salaryNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );
    const batchNumber = `SAL-${month.substring(0,3).toUpperCase()}-${year}-${counter.seq}`;
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = monthNames.indexOf(month);
    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    const yearMonthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    const ledgerEntries = [];

    for (const config of configs) {
      if (!config.employee || config.employee.status === 'inactive') continue;

      const emp = config.employee;
      let baseSalary = config.totalAmount || config.netSalary || (config.monthlySalary + (config.allowanceAmount || 0));
      
      // 💡 PRORATION 1: MID-MONTH JOINING CHECK
      let effectiveStart = monthStart;
      if (emp.joiningDate) {
        const joinD = new Date(emp.joiningDate);
        if (joinD > monthStart && joinD <= monthEnd) {
          effectiveStart = joinD;
        } else if (joinD > monthEnd) {
          continue;
        }
      }
      let effectiveSalary = baseSalary;
      if (config.wefDate) {
        const wefD = new Date(config.wefDate);
        if (wefD > monthStart && wefD <= monthEnd) {
           const daysBeforeWef = Math.max(0, (wefD - effectiveStart) / (1000 * 60 * 60 * 24));
          const daysAfterWef = Math.max(0, (monthEnd - wefD) / (1000 * 60 * 60 * 24) + 1);
          }
      }

      // Total active days in this month for this employee
      const activeDaysCount = Math.round((monthEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
      let prorationMultiplier = activeDaysCount / totalDaysInMonth;
      if (prorationMultiplier > 1) prorationMultiplier = 1;

      let finalSalary = baseSalary * prorationMultiplier;
      let notes = `Salary for ${month} ${year}`;
      if (prorationMultiplier < 1) {
        notes += ` (Prorated for ${activeDaysCount} active days)`;
      }

      // 💡 ATTENDANCE BASED DEDUCTION CHECK
      if (config.salaryWithAttendance === 'Yes') {
        const attendances = await mongoose.model('Attendance').find({
          employeeId: emp._id,
          date: { $regex: `^${yearMonthPrefix}` }
        }).session(session);

        let absentCount = 0;
        let halfDayCount = 0;

        attendances.forEach(att => {
           if (att.status === 'Absent') absentCount++;
           if (att.status === 'Half-day') halfDayCount++;
        });

        const totalAbsentPenaltyDays = absentCount + (halfDayCount * 0.5);

        if (totalAbsentPenaltyDays > 0) {
          const perDaySalary = baseSalary / totalDaysInMonth;
          const deductionAmount = perDaySalary * totalAbsentPenaltyDays;
          
          finalSalary = Math.max(0, finalSalary - deductionAmount);
          notes += ` [Deducted Rs. ${Math.round(deductionAmount)} for absents]`;
        }
      }

      ledgerEntries.push({
        employee: emp._id,
        invoiceNumber: batchNumber,
        transactionType: 'Salary',
        debit: Math.round(finalSalary), 
        credit: 0,
        date: new Date(),
        notes: notes
      });
    }

    if (ledgerEntries.length > 0) {
      await EmployeeAccount.insertMany(ledgerEntries, { session });
    }

    await session.commitTransaction();

    res.json({ 
      success: true, 
      message: `Cycle processed successfully with Mid-Month Joining & Proration logic!`, 
      data: updatedCycle 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error processing cycle:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

app.put('/api/salary-calendar/pay-all', authorize('settings_edit'), async (req, res) => {
  const { year, month } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const cycle = await SalaryCalendar.findOne({ year: Number(year), month: month }).session(session);
    if (!cycle) throw new Error('Salary cycle not found.');
    if (cycle.status === 'Paid') throw new Error(`Salaries for ${month} ${year} are already fully paid!`);
    if (cycle.status !== 'Processed') throw new Error(`Please run the cycle for ${month} ${year} first.`);

    const salaryEntries = await EmployeeAccount.find({
      transactionType: 'Salary',
      notes: `Salary for ${month} ${year}`
    }).session(session);

    const ledgerEntries = [];
    let totalPaid = 0;

    for (const entry of salaryEntries) {
      const empLedger = await EmployeeAccount.find({ employee: entry.employee }).session(session);
      const currentBalance = empLedger.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);

      if (currentBalance > 0) {
        const amountToPay = Math.min(entry.debit, currentBalance);
        
        ledgerEntries.push({
          employee: entry.employee,
          invoiceNumber: `BPAY-${entry.invoiceNumber}`, 
          transactionType: 'Payment',
          debit: 0,
          credit: amountToPay,
          date: new Date(),
          notes: `Bulk Salary Payment for ${month} ${year}`
        });

        totalPaid += amountToPay;
      }
    }

    if (ledgerEntries.length > 0) {
      await EmployeeAccount.insertMany(ledgerEntries, { session });
    }

    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.purchaseAmount = (activeRegister.purchaseAmount || 0) + totalPaid;
      await activeRegister.save({ session });
    }

    cycle.status = 'Paid';
    await cycle.save({ session });

    await session.commitTransaction();

    res.json({ 
      success: true, 
      message: `Salaries for ${month} ${year} paid successfully! (Total Paid: PKR ${totalPaid})`,
      data: cycle 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error paying cycle:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});


app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }); 
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    if (user.resetAttempts >= 3) {
      return res.status(429).json({ 
        success: false, 
        message: 'Maximum limit reached. You cannot request more than 3 links. Please contact Admin.' 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60000; 
    user.resetAttempts += 1;
    
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    console.log(`[Attempt ${user.resetAttempts}/3] Password Reset Link: `, resetUrl);

    const mailOptions = {
      from: `"Stockify ERP" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request - Stockify',
      html: `
        <h3>Password Reset Request</h3>
        <p>You requested to reset your password. You have <strong>${3 - user.resetAttempts} attempt(s) remaining</strong>.</p>
        <p>Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="padding: 10px 15px; background: #10b981; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p style="color: red; font-weight: bold; margin-top: 15px;">⚠️ WARNING: This link will expire in exactly 1 minute!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: `Reset link sent! (${3 - user.resetAttempts} attempts left)` });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error, email could not be sent.' });
  }
});


app.post('/api/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'This link is invalid or has EXPIRED (1 minute limit).' });
    }

    user.password = password;
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetAttempts = 0; 
    
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});
// ==================== SALARY & LOAN REPORT ====================
app.get('/api/reports/salary', authorize('employee_account_view'), async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM format
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required (YYYY-MM).' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[monthNum - 1];

    const cycle = await SalaryCalendar.findOne({ year, month: monthName });
    const cycleStatus = cycle ? cycle.status : 'Pending';

    const configs = await SalaryConfig.find().populate({
      path: 'employee',
      populate: { path: 'designation' }
    });

    const salaryEntries = await EmployeeAccount.find({
      transactionType: 'Salary',
      notes: new RegExp(`Salary for ${monthName} ${year}`, 'i')
    });

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    const yearMonthPrefix = `${year}-${String(monthNum).padStart(2, '0')}`;

    const allLedgerEntries = await EmployeeAccount.find().sort({ date: -1 });

    const reportData = [];

    for (const config of configs) {
      if (!config.employee || config.employee.status === 'inactive') continue;
      
      const empId = config.employee._id.toString();

      const basicSalary = config.monthlySalary || 0;
      const allowances = config.allowanceAmount || 0;
      const totalGrossEarnings = basicSalary + allowances;

      let absentCount = 0;
      let leaveCount = 0;
      let halfDayCount = 0;
      let attendanceDeduction = 0;

      if (config.salaryWithAttendance === 'Yes') {
        const attendances = await mongoose.model('Attendance').find({
          employeeId: config.employee._id,
          date: { $regex: `^${yearMonthPrefix}` }
        });

        attendances.forEach(att => {
          if (att.status === 'Absent') absentCount++;
          else if (att.status === 'Leave') leaveCount++;
          else if (att.status === 'Half-day') halfDayCount++;
        });

        const totalPenDays = absentCount + (halfDayCount * 0.5); 
        if (totalPenDays > 0) {
          const totalDaysInMonth = new Date(year, monthNum, 0).getDate();
          const perDaySalary = totalGrossEarnings / totalDaysInMonth;
          attendanceDeduction = Math.round(perDaySalary * totalPenDays);
        }
      }

      const empLedger = allLedgerEntries.filter(e => e.employee.toString() === empId);
      
      let outstanding = 0;
      let totalLoanTakenThisMonth = 0;
      let totalLoanReturnedThisMonth = 0;
      const loanHistory = [];

      empLedger.forEach(e => {
        const entryDate = new Date(e.date);
        const isThisMonth = entryDate >= startDate && entryDate <= endDate;

        if (e.transactionType === 'Loan' || e.transactionType === 'Advance') {
          outstanding += (e.credit || 0); 
          if (isThisMonth) {
            totalLoanTakenThisMonth += (e.credit || 0);
          }
          loanHistory.push({
            date: entryDate.toISOString().split('T')[0],
            type: 'Taken',
            amount: e.credit || 0,
            note: e.notes || 'Loan Issued'
          });
        } else if (e.transactionType === 'Loan Recovery') {
          outstanding -= (e.debit || 0); 
          if (isThisMonth) {
            totalLoanReturnedThisMonth += (e.debit || 0);
          }
          loanHistory.push({
            date: entryDate.toISOString().split('T')[0],
            type: 'Returned',
            amount: e.debit || 0,
            note: e.notes || 'Loan Recovery'
          });
        }
      });

      const totalLoanOutstanding = outstanding > 0 ? outstanding : 0;
      
      const earnedAfterAbsences = Math.max(0, totalGrossEarnings - attendanceDeduction);
      let loanDeduction = totalLoanOutstanding;
      if (loanDeduction > earnedAfterAbsences) loanDeduction = earnedAfterAbsences;

      const netPayable = Math.max(0, totalGrossEarnings - attendanceDeduction - loanDeduction);

      // 💡 THE FIX: Real-time Live Balance from Ledger
      const currentBalance = empLedger.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);

      const salEntry = salaryEntries.find(e => e.employee.toString() === empId);
      let status = 'Pending';
      
      // Dynamic Smart Status Logic
      if (cycleStatus === 'Paid') {
        status = 'Paid';
      } else if (cycleStatus === 'Processed' || salEntry) {
        if (netPayable === 0) {
          status = 'Settled';
        } else if (currentBalance <= 0) {
          status = 'Paid';
        } else if (currentBalance > 0 && currentBalance < netPayable) {
          status = 'Partial';
        } else {
          status = 'Generated';
        }
      }

      reportData.push({
        _id: config._id,
        employee: {
          _id: config.employee._id,
          name: config.employee.name,
          designation: config.employee.designation?.designation || 'Staff'
        },
        basicSalary,
        allowances,
        grossSalary: totalGrossEarnings,
        attendanceStats: {
          absent: absentCount,
          leave: leaveCount,
          halfDay: halfDayCount
        },
        attendanceDeduction, 
        totalLoanTakenThisMonth,
        totalLoanReturnedThisMonth,
        loanDeduction,
        netPayable,
        currentBalance, // Added Live Ledger Balance
        status,
        loanHistory,
        totalLoanOutstanding
      });
    }

    res.json({ success: true, data: reportData });
  } catch (error) {
    console.error('Error fetching salary report:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching salary report.' });
  }
});

// ==================== EMPLOYEE SELF-SERVICE ====================

// 1. My Ledger (Perfectly synced with main ledger logic)
app.get('/api/my-ledger', authorize(), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    
    if (!employeeId) {
      return res.json({ success: false, notLinked: true, message: 'You are not linked to any employee profile.' });
    }

    const allEntries = await EmployeeAccount.find({ employee: employeeId }).sort({ date: 1, createdAt: 1 });
    let runningBal = 0;

    const rows = allEntries.map((row, index) => {
      const rowDebit = Number(row.debit) || 0;
      const rowCredit = Number(row.credit) || 0;
      const prevBal = runningBal;
      
      runningBal = runningBal + rowDebit - rowCredit;

      let desc = row.transactionType || 'Transaction';
      const rawNotes = (row.notes || '').toLowerCase();
      
      let loanTaken = 0;
      let loanReturned = 0;

      if (rawNotes.includes('loan recovery') || rawNotes.includes('return')) {
        desc = 'Loan Return';
        loanReturned = rowDebit;
      } else if (rawNotes.includes('loan') || rawNotes.includes('ln-')) {
        desc = 'Loan Issued';
        loanTaken = rowCredit;
      } else if (rawNotes.includes('advance')) {
        desc = 'Advance Given';
        loanTaken = rowCredit;
      } else if (row.transactionType === 'Salary') {
        desc = 'Salary Generated';
      } else if (row.transactionType === 'Payment') {
        desc = 'Salary Paid';
      }

      let penalty = 0;
      let attStats = row.attendanceStats || { absent: 0, leave: 0, halfDay: 0 }; 

      if (row.transactionType === 'Salary' && row.notes) {
        const match = row.notes.match(/Deducted Rs\.\s*(\d+)/i);
        if (match) penalty = Number(match[1]);
      }

      const remainingLoan = runningBal < 0 ? Math.abs(runningBal) : 0;
      
      // Document object spread safely
      const rowData = row.toObject ? row.toObject() : row;

      return {
        ...rowData,
        srNo: index + 1,
        cleanDescription: desc,
        attendanceStats: attStats,
        absencePenalty: penalty,
        loanTaken: loanTaken,
        loanReturned: loanReturned,
        remainingLoan: remainingLoan,
        previousBalance: prevBal,
        net: runningBal,
        balance: runningBal
      };
    });

    res.json({ success: true, rows, closingBalance: runningBal });
  } catch (error) {
    console.error('Error fetching own ledger:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



// 3. My Loan Status
app.get('/api/my-loan-status', authorize(), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.json({ success: false, notLinked: true, message: 'No employee record linked.' });

    const empLedger = await EmployeeAccount.find({ employee: employeeId });
    const currentBalance = empLedger.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);

    res.json({ success: true, outstandingLoan: currentBalance < 0 ? Math.abs(currentBalance) : 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== EMPLOYEE SELF-SERVICE: MY SALARY SLIPS ====================
app.get('/api/my-salary-slips', authorize(), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      return res.json({ success: false, notLinked: true, message: 'No employee record linked.' });
    }

    // Fetch ONLY this employee's salary entries
    const salaries = await EmployeeAccount.find({
      employee: employeeId,
      transactionType: 'Salary'
    }).sort({ date: -1 });

    res.json({ success: true, data: salaries });
  } catch (error) {
    console.error('Error fetching my salaries:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== EMPLOYEE SELF-SERVICE: CLOCK IN / OUT ====================

app.get('/api/my-attendance/today', authorize(), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.json({ success: false });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const record = await mongoose.model('Attendance').findOne({ 
      employeeId, 
      date: { $regex: `^${todayStr}` } 
    });
    
    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});
// ==================== GET MY ATTENDANCE (Safe Fallback Logic) ====================
app.get('/api/my-attendance', authorize(), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.json({ success: false, notLinked: true });

    const { month, year } = req.query;
    let records = [];

    if (month && year) {
        const yearMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
        records = await mongoose.model('Attendance').find({
          employeeId: employeeId,
          date: { $regex: `^${yearMonthPrefix}` }
        }).sort({ date: 1 });
    }

    const employee = await mongoose.model('Employee').findById(employeeId);
const joiningDate = employee?.joiningDate || employee?.createdAt || new Date();
    res.json({ success: true, records, joiningDate });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== 2. EMPLOYEE CLOCK IN / OUT (Foolproof Auto-Status) ====================
app.post('/api/my-attendance/clock', authorize(), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.status(400).json({ success: false, message: 'No employee record linked.' });

    const { action, time } = req.body; 
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let record = await mongoose.model('Attendance').findOne({ 
      employeeId, 
      date: { $regex: `^${todayStr}` } 
    });

    const rule = await mongoose.model('AttendanceRule').findOne() || {};
    const shiftStartTime = rule.shiftStartTime || '09:00'; 
    const graceMins = rule.gracePeriodMinutes != null ? rule.gracePeriodMinutes : 15;    
    const halfDayMinHours = rule.halfDayMinHours || 4; 
    const latePenaltyEnabled = rule.latePenaltyEnabled !== false;

    // Strict Time Converter
    const toMinutes = (tStr) => {
        if(!tStr || tStr === '--:--') return 0;
        const cleanStr = tStr.replace(/[\u202F\u00A0]/g, ' ').toLowerCase(); 
        let isPM = cleanStr.includes('pm');
        let isAM = cleanStr.includes('am');
        let [hours, minutes] = cleanStr.replace(/[a-z\s]/g, '').split(':').map(Number);
        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        return (hours * 60) + (minutes || 0);
    };

    const requiredMins = toMinutes(shiftStartTime) + graceMins;

    if (action === 'in') {
      if (record && record.clockIn) return res.status(400).json({ success: false, message: 'Already clocked in today.' });
      
      const clockInMins = toMinutes(time);
      let calculatedStatus = 'Present';
      
      if (latePenaltyEnabled && clockInMins > requiredMins) {
          calculatedStatus = 'Late';
      }

      if (!record) {
        record = await mongoose.model('Attendance').create({ 
          employeeId, date: todayStr, clockIn: time, status: calculatedStatus 
        });
      } else {
        record.clockIn = time;
        if (record.status !== 'Leave' && record.status !== 'Absent') {
           record.status = calculatedStatus;
        }
        await record.save();
      }

    } else if (action === 'out') {
      if (!record || !record.clockIn) return res.status(400).json({ success: false, message: 'You must clock in first.' });
      record.clockOut = time;
      const inMins = toMinutes(record.clockIn);
      const outMins = toMinutes(time);
      const workedHours = (outMins - inMins) / 60; 

      let finalStatus = 'Present';
      if (latePenaltyEnabled && inMins > requiredMins) finalStatus = 'Late';
      if (workedHours < halfDayMinHours) finalStatus = 'Half-day';

      if (record.status !== 'Leave' && record.status !== 'Absent') {
          record.status = finalStatus;
      }
      await record.save();
    }
    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.send('Backend is running and connected to DB!');
});

// ==================== START SERVER ====================
app.listen(5000, () => console.log('Server running on port 5000'));