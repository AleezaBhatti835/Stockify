import { useState, useEffect, useRef } from 'react';
import { hasPermission } from '../utils/permissions';
import Roles from './roles.jsx';
import Users from './user.jsx';
import Customers from './Customers.jsx';
import Suppliers from './Suppliers.jsx';
import Designations from './Designation.jsx';
import Employees from './Employee.jsx';
import UOM from './catalogue/UOM.jsx';
import Category from './catalogue/Category.jsx';
import SalaryCycle from './payroll/SalaryCycle.jsx';
import YearlyCalendar from './payroll/YearlyCalendar.jsx';
import Product from './catalogue/Product.jsx';
import SalaryPayments from './payroll/SalaryPayments.jsx';
import Stock from './catalogue/Stock.jsx';
import AddPurchase from './purchase/AddPurchase.jsx';
import PurchasedList from './purchase/PurchasedList.jsx';
import AddPurchaseReturn from './purchase/AddPurchaseReturn.jsx';
import PurchaseReturnList from './purchase/Purchasereturnlist.jsx';
import OpeningStock from './catalogue/OpeningStock.jsx';
import StockAdjustment from './catalogue/Stockadjustment.jsx';
import AccessControl from './AccessControl';
import POS from './sales/POS.jsx';
import ConfigureSalary from './payroll/ConfigureSalary.jsx';
import EmployeeLoanRecovery from './payroll/EmployeeLoanRecovery.jsx';
import InvoiceList from './sales/InvoiceList.jsx';
import SalaryReport from './reports/SalaryReport.jsx';
import PrintSettingsPage from './Printsettingspage';
import ClientDetails from './ClientDetails.jsx';
import PeopleReport from './reports/PeopleReports.jsx';
import AttendanceRules from './AttendanceRules.jsx';
import EmployeeAttendance from './EmployeeAttendance.jsx'
import StockReport from './reports/StockReport.jsx';
import PurchaseReport from './reports/PurchaseReport.jsx';
import ExpiryReport from './reports/ExpiryReport.jsx';
import SalesReport from './reports/SalesReport.jsx';
import RegisterReport from './reports/RegisterReport.jsx';
import CatalogueReport from './reports/CatalogueReport.jsx';
import AccountsReport from './reports/AccountsReport.jsx';
import ProfitLossReport from './reports/ProfitLossReport.jsx';
import StockMovementReport from './reports/StockMovementReport.jsx';
import BusinessCapitalReport from './reports/BusinessCapitalReport.jsx';
import PayableReceivable from './reports/PayableReceivable.jsx';
import CustomerType from './CustomerType.jsx';
import SaleReturn from './sales/AddSaleReturn.jsx';
import SalesReturnList from './sales/SalesReturnList.jsx';
import CustomerAccount from './accounts/CustomerAccount.jsx';
import SupplierAccount from './accounts/SupplierAccount.jsx';
import EmployeeAccount from './accounts/EmployeeAccount.jsx';
import ExpenseCategory from './expenses/ExpenseCategory.jsx';
import Expense from './expenses/Expense.jsx';
import EmployeeDashboard from './employee-based/EmployeeDashboard.jsx';
import MyLedger from './employee-based/MyLedger.jsx';
import MyAttendance from './employee-based/MyAttendance.jsx';
import MySalary from './employee-based/MySalary.jsx';
import StockBreakage from './catalogue/StockBreakage.jsx';
import AddPurchaseRebate from './purchase/AddPurchaseRebate.jsx';
import PurchaseRebateList from './purchase/PurchaseRebateList.jsx';
import PurchaseRateDifference from './purchase/PurchaseRateDifference.jsx';
import PurchaseRateDifferenceList from './purchase/PurchaseRateDifferenceList.jsx';
import AddSalesRebate from './sales/AddSalesRebate.jsx';
import SalesRebateList from './sales/SalesRebateList.jsx';
import SaleRateDifference from './sales/SaleRateDifference.jsx';
import SaleRateDifferenceList from './sales/SaleRateDifferenceList.jsx';
import EmployeeLoan from './payroll/EmployeeLoan.jsx';
import BatchManagement from './BatchManagement.jsx';
import { PrintSettingsProvider } from '../context/PrintSettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBank, faBoxOpen, faCartPlus, faChartBar, faCirclePause, faCoins, faCubes,
  faDashboard, faGear, faHandHoldingDollar, faMoneyCheckDollar, faReceipt,
  faScrewdriver, faUser, faUserGroup, faUsers, faTruckMoving, faUserTie, faBoxesStacked, faCashRegister, faMoneyBillWave
,faWallet, faCalendarCheck, faFileInvoiceDollar
} from '@fortawesome/free-solid-svg-icons';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import AttendanceSummaryReport from './reports/AttendanceReport.jsx';
import ProductSupplierReport from './reports/ProductSupplierReport.jsx';

const API_BASE_URL = 'http://localhost:5000';

const getImageUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
};

const getRoleLabel = (role) => {
  if (!role) return 'User';
  if (typeof role === 'string') return role;
  return role.roleName || role.name || role.title || 'User';
};

function Dashboard({ user, onLogout }) {
  // 💡 Prop na ho toh localStorage se direct uthayein
  const currentUser = user || (() => {
    try {
      const local = localStorage.getItem('user');
      return local ? JSON.parse(local) : {};
    } catch (e) {
      return {};
    }
  })();

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'overview');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openNestedDropdown, setOpenNestedDropdown] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const fileInputRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [userInfo, setUserInfo] = useState({
    _id: currentUser?._id || currentUser?.id || '',
    name: currentUser?.name || 'User',
    email: currentUser?.email || '',
    contact: currentUser?.contact || 'Not provided',
    cnic: currentUser?.cnic || 'Not provided',
    address: currentUser?.address || 'Not provided',
    role: getRoleLabel(currentUser?.role),
    pic: currentUser?.pic || '',
    employeeId: currentUser?.employeeId || null
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    const email = String(currentUser?.email || '').trim().toLowerCase();
    const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
    const roleName = String(currentUser?.role?.role || currentUser?.role || '').trim().toLowerCase();
    return email === 'admin@gmail.com' || email === adminEmail || roleName === 'admin';
  });

  const [userPermissions, setUserPermissions] = useState(() => 
    currentUser?.role?.permissions || currentUser?.permissions || []
  );

  const [editForm, setEditForm] = useState({ ...userInfo });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const [isDashLoading, setIsDashLoading] = useState(true);
  const [dashStats, setDashStats] = useState({
    customers: 0, suppliers: 0, employees: 0, products: 0,
    sales: 0, purchases: 0, expenses: 0, profit: 0, lowStock: 0
  });
  const [chartData, setChartData] = useState([]);

  const checkAccess = (permissionKeys) => {
    const userEmail = String(userInfo?.email || '').trim().toLowerCase();
    const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
    
    if (isAdmin || userEmail === adminEmail || userEmail === 'admin@gmail.com') {
      return true;
    }

    if (!permissionKeys) return true;

    const keysArray = Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys];
    if (keysArray.length === 0) return true;

    return keysArray.some(key => userPermissions.includes(key));
  };
  useEffect(() => {
    if (userInfo._id && !isDashLoading) {
      if (!checkAccess(['dashboard_view']) && activeTab === 'overview') {
        handleTabChange('my-ledger');
      }
    }
  }, [userInfo._id, userPermissions, isAdmin, activeTab, isDashLoading]);
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setIsDashLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const computedProfit = (data.stats?.sales || 0) - (data.stats?.purchases || 0) - (data.stats?.expenses || 0);

            setDashStats({
              customers: data.stats?.customers || 0,
              suppliers: data.stats?.suppliers || 0,
              employees: data.stats?.employees || 0,
              products: data.stats?.products || 0,
              sales: data.stats?.sales || 0,
              purchases: data.stats?.purchases || 0,
              expenses: data.stats?.expenses || 0,
              profit: data.stats?.profit || computedProfit,
              lowStock: data.stats?.lowStock || 12
            });

            const processedCharts = (data.chartData || []).map(item => ({
              ...item,
              expenses: item.expenses || Math.max(0, Math.floor((item.sales || 0) * 0.15)),
              profit: item.profit || ((item.sales || 0) - (item.purchases || 0) - (item.expenses || 0))
            }));
            setChartData(processedCharts);
          }
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setIsDashLoading(false);
      }
    };
    if (activeTab === 'overview' && checkAccess(['dashboard_view'])) {
      fetchDashboardSummary();
    }
  }, [activeTab]);

  useEffect(() => {
    const initialTab = localStorage.getItem('activeTab') || 'overview';
    window.history.replaceState({ tab: initialTab }, '', `?module=${initialTab}`);

    const handlePopState = (event) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
        localStorage.setItem('activeTab', event.state.tab);
      } else {
        setActiveTab('overview');
        localStorage.setItem('activeTab', 'overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

const fetchFreshProfile = async () => {
      if (!user?._id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/users/${user._id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const freshUser = data.user || data;
          if (freshUser) {
            const updatedInfo = {
              name: freshUser.name || userInfo.name, contact: freshUser.contact || userInfo.contact,
              cnic: freshUser.cnic || userInfo.cnic, address: freshUser.address || userInfo.address,
              pic: freshUser.pic || userInfo.pic, role: getRoleLabel(freshUser.role || userInfo.role),
              employeeId: freshUser.employeeId || userInfo.employeeId
            };
            setUserInfo(prev => ({ ...prev, ...updatedInfo }));
            setEditForm(prev => ({ ...prev, ...updatedInfo }));

            const fetchedEmail = String(freshUser.email || '').trim().toLowerCase();
            const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();

            setIsAdmin(fetchedEmail === adminEmail);
            
            // 💡 YAHAN PERMISSIONS UPDATE HONA LAZMI HAI:
            const newPerms = freshUser.role?.permissions || freshUser.permissions || [];
            setUserPermissions(newPerms);
          }
        }
      } catch (err) { }
    };
    fetchFreshProfile();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(timer);
    };
  }, [user?._id]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem('activeTab', tabName);
    window.history.pushState({ tab: tabName }, '', `?module=${tabName}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('activeTab');
    onLogout();
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleDropdown = (name) => { setOpenDropdown(openDropdown === name ? null : name); setOpenNestedDropdown(null); };
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);
  const triggerFileInput = () => fileInputRef.current?.click();

  const updateLocalUserStorage = (updatedFields) => {
    [localStorage, sessionStorage].forEach(storage => {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          const storedStr = storage.getItem(key);
          if (!storedStr || !storedStr.includes(userInfo._id)) continue;
          let storedObj = JSON.parse(storedStr);
          let updated = false;

          if (storedObj && (storedObj._id === userInfo._id || storedObj.id === userInfo._id)) {
            storedObj = { ...storedObj, ...updatedFields }; updated = true;
          } else if (storedObj?.user && (storedObj.user._id === userInfo._id || storedObj.user.id === userInfo._id)) {
            storedObj.user = { ...storedObj.user, ...updatedFields }; updated = true;
          }
          if (updated) storage.setItem(key, JSON.stringify(storedObj));
        }
      } catch (e) { }
    });
  };

  const handleSaveProfile = async () => {
    if (!userInfo._id) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setUserInfo(prev => ({ ...prev, ...updated }));
      updateLocalUserStorage(updated);
      setIsEditProfileOpen(false);
    } catch (error) {
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const data = JSON.parse(await res.text());
      if (res.ok && data.imageUrl) {
        setUserInfo(prev => ({ ...prev, pic: data.imageUrl }));
        setEditForm(prev => ({ ...prev, pic: data.imageUrl }));
        if (userInfo._id) {
          const updateRes = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ pic: data.imageUrl })
          });
          if (updateRes.ok) updateLocalUserStorage({ pic: data.imageUrl });
        }
      }
    } catch (error) {
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) return alert("All fields required!");
    if (passwordForm.new !== passwordForm.confirm) return alert("Passwords do not match!");
    if (passwordForm.new.length < 6) return alert("Password must be at least 6 characters.");
    setIsResettingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new })
      });
      const data = await res.json();
      if (!res.ok || !data.success) return alert(data.message || 'Failed to reset password.');
      setIsResetPasswordOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      alert('Server error.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getPageTitle = () => {
    const titles = {
      'overview': 'Dashboard Analytics', 'customers': 'Customers', 'suppliers': 'Suppliers', 'employees': 'Employees',
      'uom': 'Units of Measure', 'category': 'Categories', 'product': 'Products', 'current-stock': 'Current Stock',
      'expiry-products': 'Expiry Products', 'salary-cycle': 'Salary Cycle', 'reorder-levels': 'Reorder Levels', 'add-purchase': 'Add Purchase',
      'purchased-list': 'Purchased List', 'purchase-return': 'Purchase Return', 'return-list': 'Purchase Return List',
      'users': 'Manage Users', 'roles': 'Manage Roles', 'designations': 'Designations', 'opening-stocks': 'Opening Stocks',
      'stock-adjustment': 'Stock Adjustment', 'invoice-list': 'Sales Invoice List', 'settings': 'Settings',
      'print-settings': 'Print Settings', 'client-details': 'Client Details', 'accountsreport': 'Accounts Report',
      'catalogue-report': 'Catalogue Report', 'stock-report': 'Stock Report', 'attendance-report': 'Attendance Report', 'customer-types': 'Customer Types',
      'sales-return': 'Sales Return', 'expiry-product': 'Expiry Product', 'cash-register': 'Cash Register', 'sale-return-list': 'Sales Return List',
      'customer-account': 'Customer Account', 'supplier-account': 'Supplier Account', 'employee-account': 'Employee Account',
      'expense-category': 'Expense Category', 'expense': 'Expense', 'stock-breakage': 'Stock Breakage',
      'add-purchase-rebate': 'Add Purchase Rebate', 'purchase-rebate-list': 'Purchase Rebate List',
      'rate-difference': 'Purchase Rate Difference', 'rate-difference-list': 'Purchase Rate Difference List',
      'add-sales-rebate': 'Add Sales Rebate', 'sales-rebate-list': 'Sales Rebate List', 'Sales-Rate-Difference': 'Sales Rate Difference',
      'Sales-Rate-Difference-List': 'Sales Rate Difference List', 'purchase-report': 'Purchase Report', 'sales-report': 'SalesReport',
      'register-report': 'Register Report', 'salary-config': 'Salary Configuration', 'loan-recovery': 'Loan Recovery', 'people-report': 'People Report', 'ProfitLossReport': 'Profit & Loss Report',
      'StockMovementReport': 'Stock Movement Report', 'salary-payment': 'Salary Payment', 'payablereceivable': 'Payable & Receivable Report',
      'BusinessCapitalReport': 'Business Capital Report', 'batch-manage': 'Batch Management', 'access-control': 'Access Control',
      'employee-attendance': 'Employee Attendance', 'salary-report': 'Salary Report', 'product-supp': 'Product-Supplier Report', 'calendar': 'Calendar', 'employee-loan': 'Employee Loan',
      'my-ledger': 'My Dashboard'
    };
    return titles[activeTab] || 'Dashboard';
  };

  const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const pieData = [
    { name: 'Sales', value: dashStats.sales || 0 },
    { name: 'Purchases', value: dashStats.purchases || 0 },
    { name: 'Expenses', value: dashStats.expenses || 0 }
  ];
  const PIE_COLORS = ['#0d9488', '#14b8a6', '#f43f5e'];

  return (
    <div className="dashboard-container">
      {isMobile && isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="hamburger-btn" onClick={toggleSidebar} style={{ color: 'white' }}>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          <img src="/logo.png" alt="Stockify Logo" style={{ width: '140px', marginRight: '30px', marginTop: '4px' }} />
        </div>

        <div className="sidebar-nav-wrapper">
          <ul className="sidebar-nav" style={{ margin: 0, padding: '10px 10px' }}>

            {/* 💡 --- PERSONAL WORKSPACE SECTION --- 💡 */}
            {userInfo.employeeId && (
              <>

                <li className={activeTab === 'employee-dashboard' ? 'active' : ''} onClick={() => { handleTabChange('employee-dashboard'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 10px', borderRadius: '6px', marginBottom: '4px' }}>
                  <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span> Dashboard
                </li>
                <li className={activeTab === 'my-attendance' ? 'active' : ''} onClick={() => { handleTabChange('my-attendance'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 10px', borderRadius: '6px', marginBottom: '4px' }}>
                  <span className="nav-icon"><FontAwesomeIcon icon={faCalendarCheck} /></span> Attendance
                </li>
                <li className={activeTab === 'my-salary' ? 'active' : ''} onClick={() => { handleTabChange('my-salary'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 10px', borderRadius: '6px', marginBottom: '4px' }}>
                  <span className="nav-icon"><FontAwesomeIcon icon={faFileInvoiceDollar} /></span> Salary Slips
                </li>
                <li className={activeTab === 'my-ledger' ? 'active' : ''} onClick={() => { handleTabChange('my-ledger'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                  <span className="nav-icon"><FontAwesomeIcon icon={faWallet} /></span> My Account
                </li>
              </>
            )}

            {/* 💡 --- COMPANY PORTAL SECTION --- 💡 */}
            {(isAdmin || userPermissions.length > 0) && (
              <>
                {checkAccess(['dashboard_view']) && (
                  <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => { handleTabChange('overview'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 10px' }}>
                    <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span> Dashboard
                  </li>
                )}

                {checkAccess(['customers_view', 'suppliers_view', 'employees_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('people')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'people' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faUserGroup} /></span> People</span>
                      <span className='drop'>{openDropdown === 'people' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'people' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['customers_view']) && <li className={activeTab === 'customers' ? 'active' : ''} onClick={() => { handleTabChange('customers'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Customers</li>}
                        {checkAccess(['suppliers_view']) && <li className={activeTab === 'suppliers' ? 'active' : ''} onClick={() => { handleTabChange('suppliers'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Suppliers</li>}
                        {checkAccess(['employees_view']) && <li className={activeTab === 'employees' ? 'active' : ''} onClick={() => { handleTabChange('employees'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Employees</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['employees_view']) && (
                  <>
                    <li
                      className="parent-menu-item"
                      onClick={() => toggleDropdown('attendance')}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'attendance' ? 'rgba(255,255,255,0.15)' : 'transparent' }}
                    >
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faUserTie} /></span> Attendance</span>
                      <span className='drop'>{openDropdown === 'attendance' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'attendance' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['employees_view']) && (
                          <li className={activeTab === 'employee-attendance' ? 'active' : ''} onClick={() => { handleTabChange('employee-attendance'); if (isMobile) setIsSidebarOpen(false); }}>
                            <div style={{ marginRight: '10px' }}>⋄</div>Employee Attendance
                          </li>
                        )}
                        {checkAccess(['settings_view']) && (
                          <li className={activeTab === 'attendance-rules' ? 'active' : ''} onClick={() => { handleTabChange('attendance-rules'); if (isMobile) setIsSidebarOpen(false); }}>
                            <div style={{ marginRight: '10px' }}>⋄</div>Attendance Rules
                          </li>
                        )}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['uom_view', 'categories_view', 'products_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('products')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'products' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faBoxOpen} /></span> Products</span>
                      <span className='drop'>{openDropdown === 'products' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'products' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['uom_view']) && <li className={activeTab === 'uom' ? 'active' : ''} onClick={() => { handleTabChange('uom'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Units of Measure</li>}
                        {checkAccess(['categories_view']) && <li className={activeTab === 'category' ? 'active' : ''} onClick={() => { handleTabChange('category'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Categories</li>}
                        {checkAccess(['products_view']) && <li className={activeTab === 'product' ? 'active' : ''} onClick={() => { handleTabChange('product'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Products</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['current_stock_view', 'expiry_products_view', 'reorder_levels_view', 'opening_stocks_view', 'stock_adjustment_view', 'stock_breakage_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('stock')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'stock' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faCubes} /></span> Stock</span>
                      <span className='drop'>{openDropdown === 'stock' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'stock' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['current_stock_view']) && <li className={activeTab === 'current-stock' ? 'active' : ''} onClick={() => { handleTabChange('current-stock'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Current Stock</li>}
                        {checkAccess(['expiry_products_view']) && <li className={activeTab === 'expiry-products' ? 'active' : ''} onClick={() => { handleTabChange('expiry-products'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Expiry Products</li>}
                        {checkAccess(['reorder_levels_view']) && <li className={activeTab === 'reorder-levels' ? 'active' : ''} onClick={() => { handleTabChange('reorder-levels'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Reorder Levels</li>}
                        {checkAccess(['opening_stocks_view']) && <li className={activeTab === 'opening-stocks' ? 'active' : ''} onClick={() => { handleTabChange('opening-stocks'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Opening Stock</li>}
                        {checkAccess(['stock_adjustment_view']) && <li className={activeTab === 'stock-adjustment' ? 'active' : ''} onClick={() => { handleTabChange('stock-adjustment'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Stock Adjustment</li>}
                        {checkAccess(['stock_breakage_view']) && <li className={activeTab === 'stock-breakage' ? 'active' : ''} onClick={() => { handleTabChange('stock-breakage'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Stock Breakage</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['add_purchase_view', 'purchase_list_view', 'add_purchase_return_view', 'purchase_return_list_view', 'add_purchase_rebate_view', 'purchase_rebate_list_view', 'add_purchase_rate_diff_view', 'purchase_rate_diff_list_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('purchase')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'purchase' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faCartPlus} /></span> Purchase</span>
                      <span className='drop'>{openDropdown === 'purchase' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'purchase' && (
                      <ul className="submenu" style={{ paddingLeft: '10px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['add_purchase_view']) && <li className={activeTab === 'add-purchase' ? 'active' : ''} onClick={() => { handleTabChange('add-purchase'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Invoice</li>}
                        {checkAccess(['purchase_list_view']) && <li className={activeTab === 'purchased-list' ? 'active' : ''} onClick={() => { handleTabChange('purchased-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Invoice List</li>}
                        {checkAccess(['add_purchase_return_view']) && <li className={activeTab === 'purchase-return' ? 'active' : ''} onClick={() => { handleTabChange('purchase-return'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Return</li>}
                        {checkAccess(['purchase_return_list_view']) && <li className={activeTab === 'return-list' ? 'active' : ''} onClick={() => { handleTabChange('return-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Return List</li>}
                        {checkAccess(['add_purchase_rebate_view']) && <li className={activeTab === 'add-purchase-rebate' ? 'active' : ''} onClick={() => { handleTabChange('add-purchase-rebate'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Rebate</li>}
                        {checkAccess(['purchase_rebate_list_view']) && <li className={activeTab === 'purchase-rebate-list' ? 'active' : ''} onClick={() => { handleTabChange('purchase-rebate-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Rebate List</li>}
                        {checkAccess(['add_purchase_rate_diff_view']) && <li className={activeTab === 'rate-difference' ? 'active' : ''} onClick={() => { handleTabChange('rate-difference'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Rate Difference</li>}
                        {checkAccess(['purchase_rate_diff_list_view']) && <li className={activeTab === 'rate-difference-list' ? 'active' : ''} onClick={() => { handleTabChange('rate-difference-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Rate Difference List</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['pos_access_view', 'invoice_list_view', 'cash_register_view', 'add_sales_return_view', 'sales_return_list_view', 'add_sales_rebate_view', 'sales_rebate_list_view', 'add_sales_rate_diff_view', 'sales_rate_diff_list_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('sales')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'sales' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faCoins} /></span> Sales</span>
                      <span className='drop'>{openDropdown === 'sales' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'sales' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['pos_access_view']) && <li onClick={() => { handleTabChange('pos'); if (isMobile) setIsSidebarOpen(false); }} > <div style={{ marginRight: '10px' }}>⋄</div>POS</li>}
                        {checkAccess(['invoice_list_view']) && <li className={activeTab === 'invoice-list' ? 'active' : ''} onClick={() => { handleTabChange('invoice-list'); if (isMobile) setIsSidebarOpen(false); }} > <div style={{ marginRight: '10px' }}>⋄</div>Invoice List</li>}
                        {checkAccess(['cash_register_view']) && <li className={activeTab === 'cash-register' ? 'active' : ''} onClick={() => { handleTabChange('cash-register'); if (isMobile) setIsSidebarOpen(false); }}><div style={{ marginRight: '10px' }}>⋄</div>Cash Register</li>}
                        {checkAccess(['add_sales_return_view']) && <li className={activeTab === 'sales-return' ? 'active' : ''} onClick={() => { handleTabChange('sales-return'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Return</li>}
                        {checkAccess(['sales_return_list_view']) && <li className={activeTab === 'sale-return-list' ? 'active' : ''} onClick={() => { handleTabChange('sale-return-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sale Return List</li>}
                        {checkAccess(['add_sales_rebate_view']) && <li className={activeTab === 'add-sales-rebate' ? 'active' : ''} onClick={() => { handleTabChange('add-sales-rebate'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rebate</li>}
                        {checkAccess(['sales_rebate_list_view']) && <li className={activeTab === 'sales-rebate-list' ? 'active' : ''} onClick={() => { handleTabChange('sales-rebate-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rebate List</li>}
                        {checkAccess(['add_sales_rate_diff_view']) && <li className={activeTab === 'Sales-Rate-Difference' ? 'active' : ''} onClick={() => { handleTabChange('Sales-Rate-Difference'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rate Difference</li>}
                        {checkAccess(['sales_rate_diff_list_view']) && <li className={activeTab === 'Sales-Rate-Difference-List' ? 'active' : ''} onClick={() => { handleTabChange('Sales-Rate-Difference-List'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rate Difference List</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['employee-loan', 'salary-config', 'calendar', 'salary-cycle', 'salary-payment', 'loan-recovery']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('payroll')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'accounts' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faMoneyCheckDollar} /></span> PayRoll</span>
                      <span className='drop'>{openDropdown === 'payroll' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'payroll' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['salary-config']) && <li className={activeTab === 'salary-config' ? 'active' : ''} onClick={() => { handleTabChange('salary-config'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Salary Configuration</li>}
                        {checkAccess(['calendar']) && <li className={activeTab === 'calendar' ? 'active' : ''} onClick={() => { handleTabChange('calendar'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Yearly Calendar</li>}
                        {checkAccess(['salary-cycle']) && <li className={activeTab === 'salary-cycle' ? 'active' : ''} onClick={() => { handleTabChange('salary-cycle'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Salary Cycle</li>}
                        {checkAccess(['salary-payment']) && <li className={activeTab === 'salary-payment' ? 'active' : ''} onClick={() => { handleTabChange('salary-payment'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Salary Payment</li>}
                        {checkAccess(['employee-loan']) && <li className={activeTab === 'employee-loan' ? 'active' : ''} onClick={() => { handleTabChange('employee-loan'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Employee Loan</li>}
                        {checkAccess(['loan-recovery']) && <li className={activeTab === 'loan-recovery' ? 'active' : ''} onClick={() => { handleTabChange('loan-recovery'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Loan Recovery</li>}

                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['customer_account_view', 'supplier_account_view', 'employee_account_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('accounts')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'accounts' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faMoneyCheckDollar} /></span> Accounts</span>
                      <span className='drop'>{openDropdown === 'accounts' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'accounts' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['customer_account_view']) && <li className={activeTab === 'customer-account' ? 'active' : ''} onClick={() => { handleTabChange('customer-account'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Customer Account</li>}
                        {checkAccess(['supplier_account_view']) && <li className={activeTab === 'supplier-account' ? 'active' : ''} onClick={() => { handleTabChange('supplier-account'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Supplier Account</li>}
                        {checkAccess(['employee_account_view']) && <li className={activeTab === 'employee-account' ? 'active' : ''} onClick={() => { handleTabChange('employee-account'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Employee Account</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['expenses_view', 'expense_category_view', 'expense_manage_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('expenses')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'expenses' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faHandHoldingDollar} /></span> Expenses</span>
                      <span className='drop'>{openDropdown === 'expenses' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'expenses' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['expense_category_view']) && <li className={activeTab === 'expense-category' ? 'active' : ''} onClick={() => { handleTabChange('expense-category'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Expense Category</li>}
                        {checkAccess(['expenses_view', 'expense_manage_view']) && <li className={activeTab === 'expense' ? 'active' : ''} onClick={() => { handleTabChange('expense'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Expense</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['report_people_view', 'report_catalogue_view', 'report_stock_view', 'report_purchase_view', 'report_sales_view', 'report_register_view', 'report_stock_movement_view', 'report_accounts_view', 'report_payable_receivable_view', 'report_profit_loss_view', 'report_business_capital_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('reports')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'reports' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faReceipt} /></span> Reports</span>
                      <span className='drop'>{openDropdown === 'reports' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'reports' && (
                      <ul className="submenu">
                        {checkAccess(['report_people_view']) && <li className={activeTab === 'people-report' ? 'active' : ''} onClick={() => { handleTabChange('people-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>People Report</li>}
                        {checkAccess(['report_catalogue_view']) && <li className={activeTab === 'catalogue-report' ? 'active' : ''} onClick={() => { handleTabChange('catalogue-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Catalogue Report</li>}
                        {checkAccess(['report_stock_view']) && <li className={activeTab === 'stock-report' ? 'active' : ''} onClick={() => { handleTabChange('stock-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Stock Report</li>}
                        {checkAccess(['report_purchase_view']) && <li className={activeTab === 'purchase-report' ? 'active' : ''} onClick={() => { handleTabChange('purchase-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Purchase Report</li>}
                        {checkAccess(['report_sales_view']) && <li className={activeTab === 'sales-report' ? 'active' : ''} onClick={() => { handleTabChange('sales-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Sales Report</li>}
                        {checkAccess(['report_register_view']) && <li className={activeTab === 'register-report' ? 'active' : ''} onClick={() => { handleTabChange('register-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Register Report</li>}
                        {checkAccess(['report_stock_movement_view']) && <li className={activeTab === 'StockMovementReport' ? 'active' : ''} onClick={() => { handleTabChange('StockMovementReport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Stock Movement Report</li>}
                        {checkAccess(['report_accounts_view']) && <li className={activeTab === 'accountsreport' ? 'active' : ''} onClick={() => { handleTabChange('accountsreport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Accounts Report</li>}
                        {checkAccess(['report_payable_receivable_view']) && <li className={activeTab === 'payablereceivable' ? 'active' : ''} onClick={() => { handleTabChange('payablereceivable'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Payable and Receivable </li>}
                        {checkAccess(['report_profit_loss_view']) && <li className={activeTab === 'ProfitLossReport' ? 'active' : ''} onClick={() => { handleTabChange('ProfitLossReport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Profit & Loss Report</li>}
                        {checkAccess(['report_business_capital_view']) && <li className={activeTab === 'BusinessCapitalReport' ? 'active' : ''} onClick={() => { handleTabChange('BusinessCapitalReport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Business Capital Report</li>}
                        {checkAccess(['attendance-report']) && <li className={activeTab === 'attendance-report' ? 'active' : ''} onClick={() => { handleTabChange('attendance-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Attendance Report</li>}
                        {checkAccess(['expiry-product']) && <li className={activeTab === 'expiry-product' ? 'active' : ''} onClick={() => { handleTabChange('expiry-product'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Expiry Products Report</li>}
                        {checkAccess(['product-supp']) && <li className={activeTab === 'product-supp' ? 'active' : ''} onClick={() => { handleTabChange('product-supp'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Product Supplier Report</li>}
                        {checkAccess(['salary-report']) && <li className={activeTab === 'salary-report' ? 'active' : ''} onClick={() => { handleTabChange('salary-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Salary Report</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['users_view', 'roles_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('systemUsers')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'systemUsers' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span> System Users</span>
                      <span className='drop'>{openDropdown === 'systemUsers' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'systemUsers' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['users_view']) && <li className={activeTab === 'users' ? 'active' : ''} onClick={() => { handleTabChange('users'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Manage Users</li>}
                        {checkAccess(['roles_view']) && <li className={activeTab === 'roles' ? 'active' : ''} onClick={() => { handleTabChange('roles'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Manage Roles</li>}
                      </ul>
                    )}
                  </>
                )}

                {checkAccess(['designations_view', 'print_settings_view', 'client_details_view', 'customer_types_view', 'access_control_view']) && (
                  <>
                    <li className="parent-menu-item" onClick={() => toggleDropdown('settings')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'settings' ? 'rgba(255,255,255,0.15)' : 'transparent' }}>
                      <span><span className="nav-icon"><FontAwesomeIcon icon={faGear} /></span> Settings</span>
                      <span className='drop'>{openDropdown === 'settings' ? '<' : '>'}</span>
                    </li>
                    {openDropdown === 'settings' && (
                      <ul className="submenu" style={{ paddingLeft: '20px', listStyleType: 'none', margin: 0 }}>
                        {checkAccess(['designations_view']) && <li className={activeTab === 'designations' ? 'active' : ''} onClick={() => { handleTabChange('designations'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Designations</li>}
                        {checkAccess(['print_settings_view']) && <li className={activeTab === 'print-settings' ? 'active' : ''} onClick={() => { handleTabChange('print-settings'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Print Settings</li>}
                        {checkAccess(['client_details_view']) && <li className={activeTab === 'client-details' ? 'active' : ''} onClick={() => { handleTabChange('client-details'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Client Details</li>}
                        {checkAccess(['customer_types_view']) && <li className={activeTab === 'customer-types' ? 'active' : ''} onClick={() => { handleTabChange('customer-types'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Customer Types</li>}
                        {checkAccess(['access_control_view']) && <li className={activeTab === 'access-control' ? 'active' : ''} onClick={() => { handleTabChange('access-control'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Access Control</li>}
                        {checkAccess(['batch-manage']) && <li className={activeTab === 'batch-manage' ? 'active' : ''} onClick={() => { handleTabChange('batch-manage'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Batch Management</li>}

                      </ul>
                    )}
                  </>
                )}
              </>
            )}
          </ul>
        </div>
      </aside>

      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="top-header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isSidebarOpen && (
              <button className="hamburger-btn" onClick={toggleSidebar} style={{ color: 'var(--text-main)' }}>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            )}

            <span style={{ color: 'var(--primary)', fontSize: '20px', display: 'flex' }}>
              {activeTab === 'overview' ? <FontAwesomeIcon icon={faChartBar} /> : null}
            </span>
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="header-date-time" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>
              <span>{formattedDate}</span>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <span>{formattedTime}</span>
            </div>

            <div className="profile-trigger" onClick={toggleProfile}>
              <div className="profile-avatar">
                {userInfo.pic ? (
                  <img src={getImageUrl(userInfo.pic)} alt="Profile" />
                ) : (
                  <span className="avatar-text">{userInfo.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            {isProfileOpen && (
              <div className="profile-dropdown" style={{ position: 'absolute', top: '70px', right: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '10px', width: '200px', zIndex: 100, border: '1px solid var(--border-color)' }}>
                <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{userInfo.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{userInfo.email}</div>
                </div>
                <button onClick={() => { setIsProfileOpen(false); setIsViewProfileOpen(true); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px' }}>👤 View Profile</button>
                <button onClick={() => { setIsProfileOpen(false); setEditForm({ ...userInfo }); setIsEditProfileOpen(true); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px' }}>✏️ Edit Profile</button>
                <button onClick={() => { setIsProfileOpen(false); setIsResetPasswordOpen(true); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px' }}>🔒 Reset Password</button>
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }}></div>
                <button onClick={() => { setIsProfileOpen(false); onLogout(); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px', fontWeight: '600' }}>🚪 Logout</button>
              </div>
            )}
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'overview' && (
            <div className="dashboard-wrapper">

              {/* TOP STATS WIDGETS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {checkAccess(['invoice_list_view', 'report_sales_view', 'pos_access_view']) && (
                  <div className="card stat-widget" onClick={() => handleTabChange('sales-report')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}><FontAwesomeIcon icon={faCoins} /></div>
                    <div><p className="stat-title">Total Sales</p><h3 className="stat-value">{isDashLoading ? '...' : `Rs ${dashStats.sales.toLocaleString()}`}</h3></div>
                  </div>
                )}

                {checkAccess(['purchase_list_view', 'report_purchase_view']) && (
                  <div className="card stat-widget" onClick={() => handleTabChange('purchase-report')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}><FontAwesomeIcon icon={faCartPlus} /></div>
                    <div><p className="stat-title">Purchases</p><h3 className="stat-value">{isDashLoading ? '...' : `Rs ${dashStats.purchases.toLocaleString()}`}</h3></div>
                  </div>
                )}

                {checkAccess(['expenses_view', 'report_profit_loss_view']) && (
                  <div className="card stat-widget" onClick={() => handleTabChange('expense')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}><FontAwesomeIcon icon={faMoneyBillWave} /></div>
                    <div><p className="stat-title">Expenses</p><h3 className="stat-value">{isDashLoading ? '...' : `Rs ${dashStats.expenses.toLocaleString()}`}</h3></div>
                  </div>
                )}

                {checkAccess(['report_profit_loss_view']) && (
                  <div className="card stat-widget" onClick={() => handleTabChange('ProfitLossReport')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}><FontAwesomeIcon icon={faHandHoldingDollar} /></div>
                    <div><p className="stat-title">Net Profit</p><h3 className="stat-value">{isDashLoading ? '...' : `Rs ${dashStats.profit.toLocaleString()}`}</h3></div>
                  </div>
                )}

                {checkAccess(['customers_view', 'report_people_view']) && (
                  <div className="card stat-widget" onClick={() => handleTabChange('people-report')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}><FontAwesomeIcon icon={faUsers} /></div>
                    <div><p className="stat-title">Customers</p><h3 className="stat-value">{isDashLoading ? '...' : dashStats.customers}</h3></div>
                  </div>
                )}

                {checkAccess(['pos_access_view']) && (
                  <div
                    className="card stat-widget"
                    onClick={() => handleTabChange('pos')}
                    style={{
                      backgroundColor: 'var(--primary-light)',
                      color: '#3a5b4f',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      border: '1px solid #91b9b0',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(36, 110, 100, 0.88)', color: '#fdffff' }}>
                      <FontAwesomeIcon icon={faCashRegister} />
                    </div>
                    <div>
                      <p className="stat-title" style={{ color: 'rgba(54, 90, 84, 0.8)' }}>Quick Access</p>
                      <h3 className="stat-value" style={{ color: '#2d4f48' }}>Open POS</h3>
                    </div>
                  </div>
                )}
              </div>

              {/* OVERVIEW & INVENTORY HEALTH SECTION */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>

                {/* Current Month Overview Card */}
                {checkAccess(['invoice_list_view', 'report_sales_view', 'customers_view', 'suppliers_view']) && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="card-title">Current Month Overview</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'space-around' }}>
                      {checkAccess(['invoice_list_view', 'report_sales_view']) && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Sales Achievement</span><span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '700' }}>85%</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Products Sold</span><span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>{isDashLoading ? '...' : Math.floor(dashStats.sales / 1500) || 120} units</span></div>
                        </>
                      )}
                      {checkAccess(['customers_view']) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>New Customers</span><span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>+ {isDashLoading ? '...' : dashStats.customers}</span></div>
                      )}
                      {checkAccess(['suppliers_view']) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Active Suppliers</span><span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>{isDashLoading ? '...' : dashStats.suppliers}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inventory Health Card */}
                {checkAccess(['products_view', 'current_stock_view', 'report_stock_view', 'suppliers_view', 'employees_view']) && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="card-title">Inventory Health</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'space-around' }}>
                      {checkAccess(['products_view']) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Total Products</span><span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '700' }}>{isDashLoading ? '...' : dashStats.products}</span></div>
                      )}
                      {checkAccess(['current_stock_view', 'report_stock_view']) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Low Stock Alerts</span><span style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: '600' }}>{isDashLoading ? '...' : dashStats.lowStock}</span></div>
                      )}
                      {checkAccess(['suppliers_view']) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Active Suppliers</span><span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>{isDashLoading ? '...' : dashStats.suppliers}</span></div>
                      )}
                      {checkAccess(['employees_view']) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Active Employees</span><span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>{isDashLoading ? '...' : dashStats.employees}</span></div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* QUICK ACTIONS */}
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 className="card-title" style={{ border: 'none', marginBottom: '16px' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {checkAccess(['pos_access_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('pos')}>
                      <FontAwesomeIcon icon={faCashRegister} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>POS</span>
                    </div>
                  )}
                  {checkAccess(['invoice_list_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('invoice-list')}>
                      <FontAwesomeIcon icon={faReceipt} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>Invoices</span>
                    </div>
                  )}
                  {checkAccess(['add_purchase_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('add-purchase')}>
                      <FontAwesomeIcon icon={faCartPlus} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>Purchase</span>
                    </div>
                  )}
                  {checkAccess(['products_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('product')}>
                      <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>Products</span>
                    </div>
                  )}
                  {checkAccess(['customers_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('customers')}>
                      <FontAwesomeIcon icon={faUserGroup} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>Customers</span>
                    </div>
                  )}
                  {checkAccess(['expenses_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('expense')}>
                      <FontAwesomeIcon icon={faHandHoldingDollar} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>Expenses</span>
                    </div>
                  )}
                  {checkAccess(['report_sales_view', 'report_purchase_view', 'report_stock_view', 'report_people_view']) && (
                    <div className="card stat-widget" style={{ flex: '1 1 110px', flexDirection: 'column', padding: '12px', justifyContent: 'center', margin: 0, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }} onClick={() => handleTabChange('sales-report')}>
                      <FontAwesomeIcon icon={faChartBar} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>Reports</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CHARTS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>

                {/* 1. Sales Trend (Area Chart) */}
                {checkAccess(['invoice_list_view', 'report_sales_view']) && (
                  <div className="card">
                    <h3 className="card-title">Sales Trend</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dx={-10} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }} />
                          <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (<div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>{isDashLoading ? 'Loading...' : 'No data'}</div>)}
                  </div>
                )}

                {/* 2. Income vs Expenses (Line Chart) */}
                {checkAccess(['report_profit_loss_view']) && (
                  <div className="card">
                    <h3 className="card-title">Income vs Expenses</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dx={-10} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }} formatter={(value) => `Rs ${value.toLocaleString()}`} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Line type="monotone" dataKey="sales" name="Income" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--danger)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (<div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>{isDashLoading ? 'Loading...' : 'No data'}</div>)}
                  </div>
                )}

                {/* 3. Purchases Overview (Bar Chart) */}
                {checkAccess(['purchase_list_view', 'report_purchase_view']) && (
                  <div className="card">
                    <h3 className="card-title">Purchases Overview</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dx={-10} />
                          <Tooltip cursor={{ fill: 'var(--bg-app)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }} formatter={(value) => `Rs ${value.toLocaleString()}`} />
                          <Bar dataKey="purchases" name="Purchases" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>{isDashLoading ? 'Loading...' : 'No data'}</div>)}
                  </div>
                )}

                {/* 4. Net Profit Trend (Bar Chart) */}
                {checkAccess(['report_profit_loss_view']) && (
                  <div className="card">
                    <h3 className="card-title">Net Profit Trend</h3>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dx={-10} />
                          <Tooltip cursor={{ fill: 'var(--bg-app)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }} formatter={(value) => `Rs ${value.toLocaleString()}`} />
                          <Bar dataKey="profit" name="Net Profit" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>{isDashLoading ? 'Loading...' : 'No data'}</div>)}
                  </div>
                )}

                {/* 5. Financial Distribution (Pie Chart) */}
                {checkAccess(['report_profit_loss_view', 'report_business_capital_view']) && (
                  <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 className="card-title">Financial Distribution</h3>
                    {(dashStats.sales > 0 || dashStats.purchases > 0 || dashStats.expenses > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }} formatter={(value) => `Rs ${value.toLocaleString()}`} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (<div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>{isDashLoading ? 'Loading...' : 'No data'}</div>)}
                  </div>
                )}

              </div>
            </div>
          )}

          <PrintSettingsProvider>
            {activeTab === 'uom' && <UOM />}
            {activeTab === 'category' && <Category />}
            {activeTab === 'product' && <Product />}
            {activeTab === 'current-stock' && <Stock view="current" />}
            {activeTab === 'expiry-products' && <Stock view="expiry" />}
            {activeTab === 'reorder-levels' && <Stock view="reorder" />}
            {activeTab === 'opening-stocks' && <OpeningStock />}
            {activeTab === 'stock-adjustment' && <StockAdjustment />}
            {activeTab === 'add-purchase' && <AddPurchase />}
            {activeTab === 'purchased-list' && <PurchasedList />}
            {activeTab === 'purchase-return' && <AddPurchaseReturn />}
            {activeTab === 'return-list' && <PurchaseReturnList />}
            {activeTab === 'invoice-list' && <InvoiceList />}
            {activeTab === 'users' && <Users />}
            {activeTab === 'roles' && <Roles />}
            {activeTab === 'customers' && <Customers />}
            {activeTab === 'suppliers' && <Suppliers />}
            {activeTab === 'employees' && <Employees />}
            {activeTab === 'designations' && <Designations />}
            {activeTab === 'print-settings' && <PrintSettingsPage />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'client-details' && <ClientDetails />}
            {activeTab === 'catalogue-report' && <CatalogueReport />}
            {activeTab === 'accountsreport' && <AccountsReport />}
            {activeTab === 'stock-report' && <StockReport />}
            {activeTab === 'ProfitLossReport' && <ProfitLossReport />}
            {activeTab === 'customer-types' && <CustomerType />}
            {activeTab === 'sales-return' && <SaleReturn />}
            {activeTab === 'sale-return-list' && <SalesReturnList />}
            {activeTab === 'pos' && <POS onExit={() => handleTabChange('invoice-list')} />}
            {activeTab === 'cash-register' && <POS initialOpenRegister={true} onExit={() => handleTabChange('overview')} />}
            {activeTab === 'customer-account' && <CustomerAccount />}
            {activeTab === 'supplier-account' && <SupplierAccount />}
            {activeTab === 'employee-account' && <EmployeeAccount />}
            {activeTab === 'expense-category' && <ExpenseCategory />}
            {activeTab === 'expense' && <Expense />}
            {activeTab === 'stock-breakage' && <StockBreakage />}
            {activeTab === 'add-purchase-rebate' && <AddPurchaseRebate />}
            {activeTab === 'purchase-rebate-list' && <PurchaseRebateList />}
            {activeTab === 'rate-difference' && <PurchaseRateDifference />}
            {activeTab === 'rate-difference-list' && <PurchaseRateDifferenceList />}
            {activeTab === 'add-sales-rebate' && <AddSalesRebate />}
            {activeTab === 'sales-rebate-list' && <SalesRebateList />}
            {activeTab === 'Sales-Rate-Difference' && <SaleRateDifference />}
            {activeTab === 'Sales-Rate-Difference-List' && <SaleRateDifferenceList />}
            {activeTab === 'purchase-report' && <PurchaseReport />}
            {activeTab === 'sales-report' && <SalesReport />}
            {activeTab === 'register-report' && <RegisterReport />}
            {activeTab === 'people-report' && <PeopleReport />}
            {activeTab === 'StockMovementReport' && <StockMovementReport />}
            {activeTab === 'payablereceivable' && <PayableReceivable />}
            {activeTab === 'BusinessCapitalReport' && <BusinessCapitalReport />}
            {activeTab === 'access-control' && <AccessControl />}
            {activeTab === 'employee-attendance' && <EmployeeAttendance />}
            {activeTab === 'attendance-rules' && <AttendanceRules />}
            {activeTab === 'product-supp' && <ProductSupplierReport />}
            {activeTab === 'attendance-report' && <AttendanceSummaryReport />}
            {activeTab === 'expiry-product' && <ExpiryReport />}
            {activeTab === 'batch-manage' && <BatchManagement />}
            {activeTab === 'employee-loan' && <EmployeeLoan />}
            {activeTab === 'loan-recovery' && <EmployeeLoanRecovery />}
            {activeTab === 'salary-config' && <ConfigureSalary />}
            {activeTab === 'calendar' && <YearlyCalendar />}
            {activeTab === 'salary-cycle' && <SalaryCycle />}
            {activeTab === 'salary-payment' && <SalaryPayments />}
            {activeTab === 'salary-report' && <SalaryReport />}
            {activeTab === 'employee-dashboard' && <EmployeeDashboard />}
            {activeTab === 'my-ledger' && <MyLedger />}
            {activeTab === 'my-attendance' && <MyAttendance />}
            {activeTab === 'my-salary' && <MySalary />}
          </PrintSettingsProvider>
        </div>
      </main>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleProfileImageUpload} style={{ display: 'none' }} />

      {isViewProfileOpen && (
        <div className="modal-overlay" onClick={() => setIsViewProfileOpen(false)}>
          <div className="modal-container modal-container-wide" style={{ display: 'flex', gap: '16px', backgroundColor: 'transparent', boxShadow: 'none' }} onClick={(e) => e.stopPropagation()}>
            <div className="card" style={{ flex: '0 0 320px', padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '120px', backgroundColor: 'var(--primary)' }}></div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '-70px' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#fff', border: '5px solid #fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: 'var(--primary)' }}>
                  {userInfo.pic ? <img src={getImageUrl(userInfo.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userInfo.name.charAt(0).toUpperCase()}
                </div>
                <button onClick={triggerFileInput} disabled={isUploading} style={{ position: 'absolute', bottom: '5px', right: '95px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', border: '3px solid #fff', cursor: isUploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
              </div>
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <h2 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '24px' }}>{userInfo.name}</h2>
                <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                  <span style={{ color: 'var(--success)', marginRight: '6px' }}>●</span>{userInfo.role.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <div className="modal-header">
                <h2 className="modal-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Your Profile</h2>
                <button className="modal-close" onClick={() => setIsViewProfileOpen(false)}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                  <div><div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>NAME</div><div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{userInfo.name}</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></div>
                  <div><div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>EMAIL</div><div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{userInfo.email}</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>
                  <div><div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>CONTACT</div><div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{userInfo.contact}</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                  <div><div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>CNIC</div><div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{userInfo.cnic}</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--border-color)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                  <div><div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>AREA</div><div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{userInfo.address}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditProfileOpen && (
        <div className="modal-overlay" onClick={() => setIsEditProfileOpen(false)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Edit Profile</h2>
              <button className="modal-close" onClick={() => setIsEditProfileOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', border: '3px solid var(--primary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', color: 'var(--primary)' }}>
                    {editForm.pic ? <img src={getImageUrl(editForm.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (editForm.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <button onClick={triggerFileInput} disabled={isUploading} style={{ position: 'absolute', bottom: '0', right: '0', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', border: '3px solid #fff', cursor: isUploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="form-input has-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                    <input type="text" value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} className="form-input has-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">CNIC</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
                    <input type="text" value={editForm.cnic} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} className="form-input has-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Area</label>
                  <div className="form-input-wrapper">
                    <span className="form-input-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
                    <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="form-input has-icon" />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsEditProfileOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isResetPasswordOpen && (
        <div className="modal-overlay" onClick={() => setIsResetPasswordOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reset Password</h2>
              <button className="modal-close" onClick={() => setIsResetPasswordOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="form-input" placeholder="Enter current password" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} className="form-input" placeholder="Enter new password" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="form-input" placeholder="Confirm new password" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsResetPasswordOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPassword}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;