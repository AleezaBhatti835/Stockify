export const ALL_PERMISSIONS = [
  // Customers
  'customers_view', 'customers_add', 'customers_edit', 'customers_delete',
  // Suppliers
  'suppliers_view', 'suppliers_add', 'suppliers_edit', 'suppliers_delete',
  // Employees
  'employees_view', 'employees_add', 'employees_edit', 'employees_delete',
  // Products
  'products_view', 'products_add', 'products_edit', 'products_delete',
  // Categories
  'categories_view', 'categories_add', 'categories_edit', 'categories_delete',
  // UOM
  'uom_view', 'uom_add', 'uom_edit', 'uom_delete',
  // Stock Adjustment
  'stock_adjustment_view', 'stock_adjustment_add',
  // Stock Breakage
  'stock_breakage_view', 'stock_breakage_add',
  // Purchases
  'purchases_view', 'purchases_add', 'purchases_edit', 'purchases_delete',
  // Purchase Returns
  'purchase_returns_view', 'purchase_returns_add',
  // Purchase Rebates
  'purchase_rebates_view', 'purchase_rebates_add',
  // Purchase Rate Difference
  'purchase_rate_difference_view', 'purchase_rate_difference_add',
  // POS / Sales
  'pos_view', 'pos_add',
  // Sale Returns
  'sale_returns_view', 'sale_returns_add',
  // Sales Rebates
  'sales_rebates_view', 'sales_rebates_add',
  // Sale Rate Difference
  'sale_rate_difference_view', 'sale_rate_difference_add',
  // Cash Register
  'cash_register_view', 'cash_register_manage',
  // Expenses (separate from Expense Category)
  'expenses_view', 'expenses_add', 'expenses_edit', 'expenses_delete',
  // Expense Category (separate from Expenses)
  'expense_category_view', 'expense_category_add', 'expense_category_edit', 'expense_category_delete',
  // Customer Account (Ledger)
  'customer_account_view', 'customer_account_add',
  // Supplier Account (Ledger)
  'supplier_account_view', 'supplier_account_add',
  // Employee Account (Ledger)
  'employee_account_view', 'employee_account_add',
  // Granular Reports
  'report_people_view', 
  'report_catalogue_view', 
  'report_stock_view', 
  'report_purchase_view', 
  'report_sales_view', 
  'report_register_view', 
  'report_stock_movement_view', 
  'report_accounts_view', 
  'report_payable_receivable_view', 
  'report_profit_loss_view', 
  'report_business_capital_view',
  // Users
  'users_view', 'users_add', 'users_edit', 'users_delete',
  // Roles
  'roles_view', 'roles_add', 'roles_edit', 'roles_delete',
  // Settings
  'settings_view', 'settings_edit',
];

export const MODULES = [
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'employees', label: 'Employees' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'uom', label: 'UOM' },
  { key: 'stock_adjustment', label: 'Stock Adjustment' },
  { key: 'stock_breakage', label: 'Stock Breakage' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'purchase_returns', label: 'Purchase Returns' },
  { key: 'purchase_rebates', label: 'Purchase Rebates' },
  { key: 'purchase_rate_difference', label: 'Purchase Rate Difference' },
  { key: 'pos', label: 'POS / Sales' },
  { key: 'sale_returns', label: 'Sale Returns' },
  { key: 'sales_rebates', label: 'Sales Rebates' },
  { key: 'sale_rate_difference', label: 'Sale Rate Difference' },
  { key: 'cash_register', label: 'Cash Register' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'expense_category', label: 'Expense Category' },
  { key: 'customer_account', label: 'Customer Account' },
  { key: 'supplier_account', label: 'Supplier Account' },
  { key: 'employee_account', label: 'Employee Account' },
  { key: 'report_people', label: 'People Report' },
  { key: 'report_catalogue', label: 'Catalogue Report' },
  { key: 'report_stock', label: 'Stock Report' },
  { key: 'report_purchase', label: 'Purchase Report' },
  { key: 'report_sales', label: 'Sales Report' },
  { key: 'report_register', label: 'Register Report' },
  { key: 'report_stock_movement', label: 'Stock Movement Report' },
  { key: 'report_accounts', label: 'Accounts Report' },
  { key: 'report_payable_receivable', label: 'Payable/Receivable Report' },
  { key: 'report_profit_loss', label: 'Profit & Loss Report' },
  { key: 'report_business_capital', label: 'Business Capital Report' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'settings', label: 'Settings' },
];