import { jest } from '@jest/globals';
import 'dotenv/config'; 
import request from 'supertest';
import app from './server.js'; 
import mongoose from 'mongoose';
import { setupTestAuth } from './testHelper.js'; 

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await new Promise(resolve => mongoose.connection.once('open', resolve));
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

// ================= 1. CITY MODULE TESTS =================
describe('City API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all cities', async () => {
    const res = await request(app)
      .get('/api/cities')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200); 
    expect(res.body.success).toBe(true); 
  });

  it('should create a new city', async () => {
    const uniqueCityName = `Test City ${Date.now()}`;
    const res = await request(app)
      .post('/api/cities')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId)
      .send({ name: uniqueCityName });

    expect(res.statusCode).toBe(201); 
    expect(res.body.success).toBe(true); 
  });
});


// ================= 2. CUSTOMER MODULE TESTS =================
describe('Customer API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all customers', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200); 
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create a new customer', async () => {
    const newCustomer = { 
        name: 'Test Customer', 
        email: `test-${Date.now()}@example.com`,
        contact: '03001234567',
        status: 'Active'
    }; 

    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId)
      .send(newCustomer);

    expect(res.statusCode).toBe(201); 
    expect(res.body.name).toBe('Test Customer'); 
  });
});


// ================= 3. PRODUCT MODULE TESTS =================
describe('Product API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200); 
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 4. SUPPLIER MODULE TESTS =================
describe('Supplier API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all suppliers', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200); 
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 5. PURCHASES MODULE TESTS =================
describe('Purchases API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all purchases', async () => {
    const res = await request(app)
      .get('/api/purchases')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200); 
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 6. SALES / POS MODULE TESTS =================
describe('Sales API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all sales', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200); 
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 7. EXPENSES MODULE TESTS =================
describe('Expense API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all expenses', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200); 
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 8. CASH REGISTER MODULE TESTS =================
describe('Cash Register API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should check cash register status', async () => {
    const res = await request(app)
      .get('/api/cash-register/status')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('isOpen');
  });
});


// ================= 9. STOCK ADJUSTMENT TESTS =================
describe('Stock Adjustment API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch stock adjustment history', async () => {
    const res = await request(app)
      .get('/api/stock-adjustment')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 10. SECURITY & VALIDATION TESTS =================
describe('Security & Validation Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should return 401 if no authorization token is provided', async () => {
    const res = await request(app)
      .get('/api/cities');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should fail when creating a city with a duplicate name', async () => {
    const cityName = `Duplicate City ${Date.now()}`;

    await request(app)
      .post('/api/cities')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId)
      .send({ name: cityName });

    const res = await request(app)
      .post('/api/cities')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId)
      .send({ name: cityName });

    expect(res.statusCode).toBe(400); 
  });
});

// ================= 8. EMPLOYEE MODULE TESTS =================
describe('Employee API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all employees', async () => {
    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 9. ATTENDANCE MODULE TESTS =================
describe('Attendance API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch attendance report', async () => {
    const res = await request(app)
      .get('/api/attendance/report')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 10. LEAVES MODULE TESTS =================
describe('Leaves API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch admin leaves list', async () => {
    const res = await request(app)
      .get('/api/admin/leaves')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 11. EXPENSES MODULE TESTS =================
describe('Expense API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all expenses', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 12. REPORTS MODULE TESTS =================
describe('Reports API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch profit and loss report', async () => {
    const res = await request(app)
      .get('/api/reports/profit-loss')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ================= 13. ROLES MODULE TESTS =================
describe('Roles API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all roles', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 14. UOM (UNITS) MODULE TESTS =================
describe('UOM API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all UOMs', async () => {
    const res = await request(app)
      .get('/api/uoms')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 15. CATEGORIES MODULE TESTS =================
describe('Categories API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 16. CASH REGISTER TESTS =================
describe('Cash Register API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should check cash register status', async () => {
    const res = await request(app)
      .get('/api/cash-register/status')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('isOpen');
  });
});


// ================= 17. SUPPLIER COMPANIES TESTS =================
describe('Supplier Companies API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all supplier companies', async () => {
    const res = await request(app)
      .get('/api/supplier-companies')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 18. STOCK ADJUSTMENTS TESTS =================
describe('Stock Adjustments API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all stock adjustments', async () => {
    const res = await request(app)
      .get('/api/stock-adjustment')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 19. EMPLOYEE LOANS & RECOVERIES TESTS =================
describe('Employee Loans API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all employee loans', async () => {
    const res = await request(app)
      .get('/api/employee-loans')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ================= 20. PURCHASE & SALE RETURNS TESTS =================
describe('Returns API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all purchase returns', async () => {
    const res = await request(app)
      .get('/api/purchase-returns')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch all sale returns', async () => {
    const res = await request(app)
      .get('/api/sale-returns')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 21. LEDGERS & ACCOUNTS TESTS =================
describe('Ledgers API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch supplier ledger summary', async () => {
    const res = await request(app)
      .get('/api/supplier-ledger')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch customer ledger summary', async () => {
    const res = await request(app)
      .get('/api/customer-ledger')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 22. PAYROLL & SALARY CALENDAR TESTS =================
describe('Payroll API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch salary calendar', async () => {
    const res = await request(app)
      .get('/api/salary-calendar')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch salary configs', async () => {
    const res = await request(app)
      .get('/api/salary-config')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});


// ================= 23. REBATES & RATE DIFFERENCES TESTS =================
describe('Rebates & Rate Differences API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch purchase rebates', async () => {
    const res = await request(app)
      .get('/api/purchase-rebates')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch purchase rate differences', async () => {
    const res = await request(app)
      .get('/api/purchase-rate-difference')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch sales rebates', async () => {
    const res = await request(app)
      .get('/api/sales-rebates')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ================= 24. STOCK BREAKAGE TESTS =================
describe('Stock Breakage API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch all stock breakage records', async () => {
    const res = await request(app)
      .get('/api/stock-breakage')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


// ================= 25. CLIENT / BUSINESS PROFILE TESTS =================
describe('Client Profile API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should fetch client business details', async () => {
    const res = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ================= 26. SEARCH & UTILITY ENDPOINTS TESTS =================
describe('Search & Utility API Tests', () => {
  let auth;
  beforeEach(() => { auth = setupTestAuth(); });
  afterEach(() => { auth.cleanup(); });

  it('should validate purchase search by invoice route', async () => {
    const res = await request(app)
      .get('/api/purchases/search?invoiceNumber=NONEXISTENT')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    // 404 ya 400 aana chahiye kyun ke invoice mojood nahi, lekin route hit ho gaya hai
    expect([400, 404]).toContain(res.statusCode);
  });

  it('should validate sale search by invoice route', async () => {
    const res = await request(app)
      .get('/api/sales/search?invoiceNumber=NONEXISTENT')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect([400, 404]).toContain(res.statusCode);
  });

  it('should fetch held sales list', async () => {
    const res = await request(app)
      .get('/api/sales/hold')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch dashboard summary analytics', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch print settings', async () => {
    const res = await request(app)
      .get('/api/print-settings')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
  });

  it('should fetch stock movements audit trail', async () => {
    const res = await request(app)
      .get('/api/stock-movements')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch product-suppliers matrix report', async () => {
    const res = await request(app)
      .get('/api/reports/product-suppliers-matrix')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch expiring stock report', async () => {
    const res = await request(app)
      .get('/api/reports/expiring-stock')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch active batches list', async () => {
    const res = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should fetch payables and receivables report', async () => {
    const res = await request(app)
      .get('/api/reports/balances')
      .set('Authorization', `Bearer ${auth.token}`)
      .set('x-user-id', auth.userId);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});