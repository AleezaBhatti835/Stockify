import 'dotenv/config';
import express, { json } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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
import SaleReturn from './models/SaleReturn.js';
import EmployeeAccount from './models/EmployeeAccount.js';
import ExpenseCategory from './models/ExpenseCategory.js';
import Expense from './models/Expense.js';
import StockBreakage from './models/StockBreakage.js';
import PurchaseRebate from './models/PurchaseRebate.js';
import PurchaseRebateDetail from './models/PurchaseRebateDetail.js';

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


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('role');

    if (user && user.password === password) {

      const { password: _pw, ...userData } = user.toObject();
      return res.json({ success: true, user: userData });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ==================== GET LAST INVOICE NUMBER ====================
app.get('/api/purchases/last-invoice', async (req, res) => {
  try {
    // Find the last purchase and sort by createdAt descending
    const lastPurchase = await Purchase.findOne()
      .sort({ createdAt: -1 })
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
app.post('/api/roles', async (req, res) => {
  try {
    console.log("Saving to DB:", req.body);
    const newRole = await Role.create(req.body);
    await newRole.save();
    return res.status(201).json(newRole);
  } catch (error) {
    console.error("CRASHED HERE:", error);
    return res.status(400).json({ message: 'Save failed', error });
  }
});

app.get('/api/roles', async (req, res) => {
  try {
    const roles = await Role.find({ status: { $ne: 'Inactive' } });
    return res.json({ success: true, roles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/roles/:id', async (req, res) => {
  if (!req.params.id || req.params.id === 'null') {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  try {
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    return res.json(updatedRole);
  } catch (error) {
    console.error("Backend PUT Error:", error);
    return res.status(500).json({ message: 'Error updating role', error });
  }
});

app.delete('/api/roles/:id', async (req, res) => {
  const { id } = req.params;
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
      { new: true }
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
app.post('/api/users', async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    return res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(400).json({ message: 'Error creating user', error });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ status: { $ne: 'Inactive' } }).populate('role');
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
});

app.put('/api/users/:id', async (req, res) => {
  if (!req.params.id || req.params.id === 'null') {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json(updatedUser);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating user', error });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { new: true });
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error deleting user', error });
  }
});

// ==================== RESET PASSWORD ====================
app.put('/api/users/:id/reset-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

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

    // Same plain-text comparison style used in /api/login
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
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find({ status: { $ne: 'Inactive' } });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const newCustomer = await Customer.create(req.body);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating customer', error });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer', error });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { new: true });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting customer', error });
  }
});

// ==================== SUPPLIERS ====================
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ status: { $ne: 'Inactive' } });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const newSupplier = await Supplier.create(req.body);
    res.status(201).json(newSupplier);
  } catch (error) {
    console.error("MONGOOSE ERROR:", error.message, error);
    res.status(400).json({ message: 'Error creating supplier', error });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const updatedSupplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedSupplier);
  } catch (error) {
    res.status(400).json({ message: 'Error updating supplier', error });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    await Supplier.findByIdAndUpdate(req.params.id, { status: 'inactive' }, { new: true });
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting supplier', error });
  }
});

// ==================== DESIGNATIONS ====================
app.post('/api/designations', async (req, res) => {
  try {
    const newDesignation = await Designation.create(req.body);
    return res.status(201).json(newDesignation);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating designation', error });
  }
});

app.get('/api/designations', async (req, res) => {
  try {
    const designations = await Designation.find({ status: { $ne: 'inactive' } });
    return res.json(designations);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/designations/:id', async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }

  try {
    const updatedDesignation = await Designation.findByIdAndUpdate(
      req.params.id,
      { designation: req.body.designation },
      { new: true }
    );
    return res.json(updatedDesignation);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating designation', error });
  }
});

app.delete('/api/designations/:id', async (req, res) => {
  const { id } = req.params;
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
      { new: true }
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
app.post('/api/employees', async (req, res) => {
  try {
    const newEmployee = await Employee.create(req.body);
    const populatedEmployee = await Employee.findById(newEmployee._id).populate('designation');
    return res.status(201).json(populatedEmployee);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating employee', error });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find({ status: { $ne: 'inactive' } }).populate('designation');
    return res.json(employees);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('designation');
    return res.json(updatedEmployee);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating employee', error });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
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
app.post('/api/employee-payments', async (req, res) => {
  const { employeeId, amount, type, transactionType, date, notes } = req.body;

  try {
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee is required.' });
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }
    if (!['Debit', 'Credit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be Debit or Credit.' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const counter = await Counter.findOneAndUpdate(
      { name: 'employeeEntryNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, returnDocument: 'after' }
    );
    const invoiceNumber = `EMP-${counter.seq}`;

    const entry = await EmployeeAccount.create({
      employee: employeeId,
      invoiceNumber,
      transactionType: transactionType || (type === 'Debit' ? 'Salary' : 'Payment'),
      debit: type === 'Debit' ? amt : 0,
      credit: type === 'Credit' ? amt : 0,
      date: date || new Date(),
      notes
    });

    return res.status(201).json({ success: true, message: 'Entry recorded successfully', entry });
  } catch (error) {
    console.error('Error recording employee entry:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== EMPLOYEE LEDGER (Full ledger with filters) ====================
app.get('/api/employee-ledger', async (req, res) => {
  try {
    const { employeeId, fromDate, toDate } = req.query;

    const filter = {};
    if (employeeId) filter.employee = employeeId;

    const allEntries = await EmployeeAccount.find(filter)
      .populate('employee', 'name')
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
          employee: entry.employee,
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
    console.error('Error fetching employee ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==================== UOM (Unit of Measure) ====================
app.get('/api/uoms', async (req, res) => {
  try {
    const uoms = await UOM.find({ status: 'active' }).sort({ name: 1 });
    res.json(uoms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/uoms', async (req, res) => {
  try {
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

app.put('/api/uoms/:id', async (req, res) => {
  try {
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
      { new: true }
    );

    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }

    res.json(uom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/uoms/:id', async (req, res) => {
  try {
    const uom = await UOM.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
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
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
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

app.put('/api/categories/:id', async (req, res) => {
  try {
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
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
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
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .populate('categoryId', 'name')
      .populate('uomId', 'name abbreviation')
      .sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);

    // If quantity is provided at creation, opening stock is locked
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

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
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

app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
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

// 1. Get all inactive (deleted) products
app.get('/api/products/deleted', async (req, res) => {
  try {
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
app.put('/api/products/:id/activate', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
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
app.post('/api/products/:id/opening-stocks', async (req, res) => {
  const { quantity } = req.body;

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
    product.openingStockLocked = true; // Lock for future

    await product.save();

    res.json({ success: true, message: 'Opening stock added successfully.', product });
  } catch (error) {
    console.error('Error adding opening stock:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADD PURCHASE (POST) ====================
app.post('/api/purchases', async (req, res) => {
  const { supplierId, invoiceNumber, purchaseDate, items, totalAmount, paidAmount } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Generate a sequence for the internal purchaseNumber
    const counter = await Counter.findOneAndUpdate(
      { name: 'purchaseNumber' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true, session }
    );

    // Format the internal purchase number to PO- (Purchase Order) instead of PU-
    const autoPurchaseNumber = `PO-${counter.seq}`;
    // Save the purchase
    const newPurchase = new Purchase({

      purchaseNumber: autoPurchaseNumber,
      invoiceNumber: invoiceNumber, // This strictly uses the PU- format from frontend
      supplier: supplierId,
      purchaseDate,
      totalAmount,
      paidAmount: Number(paidAmount) || 0,
      items
    });
    const savedPurchase = await newPurchase.save({ session });

    // Update product stock
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      product.quantity += item.quantity;
      product.costPrice = item.unitPrice;
      product.openingStockLocked = true;

      if (item.expiryDate && (!product.expiryDate || new Date(item.expiryDate) < new Date(product.expiryDate))) {
        product.expiryDate = item.expiryDate;
      }

      await product.save({ session });

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

    // Update the ledger entry
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
app.get('/api/purchases', async (req, res) => {
  try {
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
app.get('/api/purchases/search', async (req, res) => {
  // Now extracting invoiceNumber from the query parameters
  const { invoiceNumber } = req.query;

  if (!invoiceNumber || !invoiceNumber.trim()) {
    return res.status(400).json({ success: false, message: 'Invoice number is required.' });
  }

  try {
    // Search the database using the invoiceNumber instead of purchaseNumber
    const purchase = await Purchase.findOne({
      invoiceNumber: { $regex: new RegExp(`^${invoiceNumber.trim()}$`, 'i') }
    })
      .populate('items.product')
      .populate('supplier');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'No purchase found with that invoice number.' });
    }

    // Calculate already returned quantities
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

// Get a purchase's items with remaining returnable quantity
app.get('/api/purchases/:id/returnable-items', async (req, res) => {
  try {
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
app.post('/api/purchase-returns', async (req, res) => {
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
      { new: true, upsert: true, returnDocument: 'after' }
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
app.get('/api/purchase-returns', async (req, res) => {
  try {
    const returns = await PurchaseReturn.find()
      .populate('supplier')
      .populate('purchase', 'purchaseNumber invoiceNumber')
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a single purchase return
app.get('/api/purchase-returns/:id', async (req, res) => {
  try {
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
app.put('/api/purchase-returns/:id/status', async (req, res) => {
  const { status: newStatus } = req.body;
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

    // Side effect: once completed, record the credit/refund
    if (newStatus === 'Completed') {
      await SupplierAccount.create([{
        supplier: purchaseReturn.supplier,
        transactionType: 'Purchase Return',
        amount: -purchaseReturn.totalAmount,
        referenceId: purchaseReturn._id
      }], { session });
    }
    const activeRegister = await CashRegister.findOne({ closingDate: null }).session(session);
    if (activeRegister) {
      activeRegister.purchaseReturnAmount = (activeRegister.purchaseReturnAmount || 0) + totalAmount;
      await activeRegister.save({ session });
    }

    if (newStatus === 'Approved') {
      purchaseReturn.approvedAt = new Date();
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
app.post('/api/purchase-returns/complete', async (req, res) => {
  const { purchaseId, supplierId, invoiceNumber, items } = req.body;
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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
app.post('/api/purchase-returns/blind-return', async (req, res) => {
  const { supplierId, returnDate, items } = req.body;
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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
      isBlindReturn: true // You may want to add this field to your schema
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
app.post('/api/supplier-payments', async (req, res) => {
  const { supplierId, amount, type, invoiceNumber, date, notes } = req.body;

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
        { new: true, upsert: true, returnDocument: 'after' }
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

// Get a supplier's full ledger
app.get('/api/suppliers/:id/ledger', async (req, res) => {
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

// ==================== SUPPLIER LEDGER (Full ledger with filters) ====================
app.get('/api/supplier-ledger', async (req, res) => {
  try {
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

// ==================== CUSTOMER PAYMENTS (Add Payment) ====================
app.post('/api/customer-payments', async (req, res) => {
  const { customerId, amount, type, date, notes } = req.body;

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
      { new: true, upsert: true, returnDocument: 'after' }
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
app.get('/api/customer-ledger', async (req, res) => {
  try {
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

// Create a stock adjustment (increase or decrease)
app.post('/api/stock-adjustment', async (req, res) => {
  const { productId, adjustmentType, quantity, reason, notes, invoiceNumber } = req.body;
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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

// All-or-nothing — if any item fails, nothing is saved.
// Create MULTIPLE stock adjustments at once (batch/confirm flow)
app.post('/api/stock-adjustment/batch', async (req, res) => {
  const { adjustments } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      throw new Error('At least one adjustment is required.');
    }

    const savedAdjustments = [];

    for (const item of adjustments) {
      const { productId, adjustmentType, quantity, reason, notes, invoiceNumber } = item;

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

      const counter = await Counter.findOneAndUpdate(
        { name: 'adjustmentNumber' },
        { $inc: { seq: 1 } },
        { upsert: true, session, returnDocument: 'after' }
      );
      const adjustmentNumber = `ADJ-${counter.seq.toString()}`;

      const created = await StockAdjustment.create([{
        adjustmentNumber,
        invoiceNumber, // Used it here so it saves to the database
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
app.get('/api/stock-adjustment', async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single product's adjustment history (optional, useful for a product detail view)
app.get('/api/products/:id/stock-adjustment', async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find({ product: req.params.id })
      .populate('product', 'name')
      .sort({ createdAt: -1 });
    res.json(adjustments);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== SALES (POS) ====================

// Create a sale — one-shot, instant stock deduction (POS style, no draft workflow)
app.post('/api/sales', async (req, res) => {
  const { customerId, items, discount, paidAmount, notes, saleDate } = req.body;
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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
      prepared.product.quantity -= prepared.qty;
      await prepared.product.save({ session });

      await SaleDetail.create([{
        sale: savedSale._id,
        product: prepared.product._id,
        quantity: prepared.qty,
        unitPrice: prepared.unitPrice,
        discount: prepared.lineDiscount,
        lineTotal: prepared.lineTotal
      }], { session });

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

// List all sales — for Invoice List (Sr#, Date, Invoice, Customer, Total, Action)
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('customer')
      .sort({ saleDate: -1, createdAt: -1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/sales/search', async (req, res) => {
  const { invoiceNumber } = req.query; // this is actually the saleNumber, e.g. "SL-12"

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

app.post('/api/sales/hold', async (req, res) => {
  const { customerId, items, discount, discountType, discountValue, paidAmount, notes, saleDate } = req.body;

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
      { new: true, upsert: true, returnDocument: 'after' }
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
app.get('/api/sales/hold', async (req, res) => {
  try {
    const holds = await Sale.find({ status: 'Hold' })
      .populate('customer')
      .sort({ createdAt: -1 })
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


app.delete('/api/sales/:id/hold', async (req, res) => {
  try {
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
app.get('/api/sales/:id', async (req, res) => {
  try {
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
app.put('/api/sales/:id/cancel', async (req, res) => {
  const session = await mongoose.startSession();

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

// Get a customer's full ledger (mirrors supplier ledger)
app.get('/api/customers/:id/ledger', async (req, res) => {
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

app.get('/api/print-settings', async (req, res) => {
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

// PUT /api/print-settings
// Body can include any subset of the form fields — only what's sent gets updated.
app.put('/api/print-settings', async (req, res) => {
  try {
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
app.get('/api/client', async (req, res) => {
  try {
    const clients = await Client.find();

    res.status(200).json(clients);
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ success: false, message: 'Server error while fetching client details.' });
  }
});

// 2. POST Client (Add New - Restricted to 1)
app.post('/api/client', async (req, res) => {
  try {
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
app.put('/api/client/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { businessName, contact, address, logo } = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { businessName, contact, address, logo },
      { new: true, runValidators: true }
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
app.delete('/api/client/:id', async (req, res) => {
  try {
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
app.get('/api/cash-register/status', async (req, res) => {
  try {
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
app.post('/api/cash-register/open', async (req, res) => {
  try {
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
app.post('/api/cash-register/close', async (req, res) => {
  try {
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

app.post('/api/customer-types', async (req, res) => {
  try {
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

app.get('/api/customer-types', async (req, res) => {
  try {
    const types = await CustomerType.find().sort({ createdAt: -1 });
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/customer-types/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const updatedType = await CustomerType.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updatedType) return res.status(404).json({ success: false, message: 'Customer Type not found' });
    res.status(200).json(updatedType);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/customer-types/:id', async (req, res) => {
  try {
    const deletedType = await CustomerType.findByIdAndDelete(req.params.id);
    if (!deletedType) return res.status(404).json({ success: false, message: 'Customer Type not found' });

    res.status(200).json({ success: true, message: 'Customer Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== SALE RETURNS ====================


// 1. Return WITH Invoice
app.post('/api/sale-returns/complete', async (req, res) => {
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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
      invoiceNumber: returnNumber,
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
app.post('/api/sale-returns/blind-return', async (req, res) => {
  const { customerId, returnDate, items } = req.body;
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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

app.get('/api/sales/check-customer-purchase', async (req, res) => {
  try {
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

app.get('/api/sale-returns', async (req, res) => {
  try {
    const saleReturns = await SaleReturn.find()
      .populate('customer', 'name customerName phone address')
      .populate('sale', 'saleNumber invoiceNumber')
      .populate('items.product', 'name barcode')
      .sort({ createdAt: -1 });

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

// ==================== EXPENSE CATEGORIES ====================
app.get('/api/expense-categories', async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({ status: { $ne: 'inactive' } }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/expense-categories', async (req, res) => {
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

app.put('/api/expense-categories/:id', async (req, res) => {
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
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/expense-categories/:id', async (req, res) => {
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
      { new: true }
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
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find({ status: { $ne: 'inactive' } })
      .populate('category', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
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

app.put('/api/expenses/:id', async (req, res) => {
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
      { new: true }
    ).populate('category', 'name');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
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

// ==================== STOCK BREAKAGE ====================

// List all breakage records (main table)
app.get('/api/stock-breakage', async (req, res) => {
  try {
    const records = await StockBreakage.find()
      .populate('product', 'name categoryId uomId') // Make sure to populate product
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add multiple broken products at once — ONE breakageNumber for the whole batch
app.post('/api/stock-breakage/batch', async (req, res) => {
  const { items, notes } = req.body;
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

// Get a purchase's items with remaining rebatable quantity (mirrors returnable-items)
app.get('/api/purchases/:id/rebatable-items', async (req, res) => {
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
app.post('/api/purchase-rebates/complete', async (req, res) => {
  const { purchaseId, supplierId, invoiceNumber, items } = req.body;
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
      { new: true, upsert: true, session, returnDocument: 'after' }
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
      invoiceNumber,
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

// List all purchase rebates (main table)
app.get('/api/purchase-rebates', async (req, res) => {
  try {
    const rebates = await PurchaseRebate.find()
      .populate('supplier')
      .populate('purchase', 'purchaseNumber invoiceNumber')
      .sort({ createdAt: -1 });
    res.json(rebates);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get a single rebate with its line items (for the View modal)
app.get('/api/purchase-rebates/:id', async (req, res) => {
  try {
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

// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.send('Backend is running and connected to DB!');
});

// ==================== START SERVER ====================
app.listen(5000, () => console.log('Server running on port 5000'));