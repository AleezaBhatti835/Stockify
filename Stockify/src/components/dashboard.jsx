import { useState, useEffect, useRef } from 'react';
import './dashboard.css';
import Roles from './roles.jsx';
import Users from './user.jsx';
import Customers from './Customers.jsx';
import Suppliers from './Suppliers.jsx';
import Designations from './Designation.jsx';
import Employees from './Employee.jsx';
import UOM from './catalogue/UOM.jsx';
import Category from './catalogue/Category.jsx';
import Product from './catalogue/Product.jsx';
import Stock from './catalogue/Stock.jsx';
import AddPurchase from './purchase/AddPurchase.jsx';
import PurchasedList from './purchase/PurchasedList.jsx';
import AddPurchaseReturn from './purchase/AddPurchaseReturn.jsx';
import PurchaseReturnList from './purchase/Purchasereturnlist.jsx';
import OpeningStock from './catalogue/OpeningStock.jsx';
import StockAdjustment from './catalogue/Stockadjustment.jsx';
import POS from './sales/POS.jsx';
import InvoiceList from './sales/InvoiceList.jsx';
import Settings from './Settings.jsx';
import PrintSettingsPage from './Printsettingspage';
import ClientDetails from './ClientDetails.jsx';
import PeopleReport from './reports/PeopleReports.jsx';
import StockReport from './reports/StockReport.jsx';
import PurchaseReport from './reports/PurchaseReport.jsx';
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
import StockBreakage from './catalogue/StockBreakage.jsx';
import AddPurchaseRebate from './purchase/AddPurchaseRebate.jsx';
import PurchaseRebateList from './purchase/PurchaseRebateList.jsx';
import PurchaseRateDifference from './purchase/PurchaseRateDifference.jsx';
import PurchaseRateDifferenceList from './purchase/PurchaseRateDifferenceList.jsx';
import AddSalesRebate from './sales/AddSalesRebate.jsx';
import SalesRebateList from './sales/SalesRebateList.jsx';
import SaleRateDifference from './sales/SaleRateDifference.jsx';
import SaleRateDifferenceList from './sales/SaleRateDifferenceList.jsx';

// Icons & Charts
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBank, faBoxOpen, faCartPlus, faChartBar, faCirclePause, faCoins, faCubes,
  faDashboard, faGear, faHandHoldingDollar, faMoneyCheckDollar, faReceipt,
  faScrewdriver, faUser, faUserGroup, faUsers, faTruckMoving, faUserTie, faBoxesStacked, faCashRegister, faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

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
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab ? savedTab : 'overview';
  });

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

  const [userInfo, setUserInfo] = useState({
    _id: user?._id || '',
    name: user?.name || 'User',
    email: user?.email || '',
    contact: user?.contact || 'Not provided',
    cnic: user?.cnic || 'Not provided',
    address: user?.address || 'Not provided',
    role: getRoleLabel(user?.role),
    pic: user?.pic || ''
  });

  const [editForm, setEditForm] = useState({ ...userInfo });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  // ==================== DASHBOARD ANALYTICS STATE (Actual Backend Data) ====================
  const [isDashLoading, setIsDashLoading] = useState(true);
  const [dashStats, setDashStats] = useState({
    customers: 0, suppliers: 0, employees: 0, products: 0,
    sales: 0, purchases: 0, expenses: 0
  });
  const [chartData, setChartData] = useState([]);

  // Fetch Actual Summary Data from Database
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setIsDashLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setDashStats({
              customers: data.stats?.customers || 0,
              suppliers: data.stats?.suppliers || 0,
              employees: data.stats?.employees || 0,
              products: data.stats?.products || 0,
              sales: data.stats?.sales || 0,
              purchases: data.stats?.purchases || 0,
              expenses: data.stats?.expenses || 0,
            });
            setChartData(data.chartData || []);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard summary from backend:", err);
      } finally {
        setIsDashLoading(false);
      }
    };
    if (activeTab === 'overview') fetchDashboardSummary();
  }, [activeTab]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem('activeTab', tabName);
    window.history.pushState({ tab: tabName }, '', `?module=${tabName}`);
  };
  const handleLogout = () => {
    localStorage.removeItem('activeTab');
    onLogout();
  };
  // ==================== BROWSER BACK BUTTON SUPPORT ====================
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

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const fetchFreshProfile = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${user._id}`);
        if (res.ok) {
          const data = await res.json();
          const freshUser = data.user || data;
          if (freshUser) {
            setUserInfo(prev => ({
              ...prev,
              name: freshUser.name || prev.name,
              contact: freshUser.contact || prev.contact,
              cnic: freshUser.cnic || prev.cnic,
              address: freshUser.address || prev.address,
              pic: freshUser.pic || prev.pic,
              role: getRoleLabel(freshUser.role || prev.role)
            }));
            setEditForm(prev => ({
              ...prev,
              name: freshUser.name || prev.name,
              contact: freshUser.contact || prev.contact,
              cnic: freshUser.cnic || prev.cnic,
              address: freshUser.address || prev.address,
              pic: freshUser.pic || prev.pic,
            }));
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

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
    setOpenNestedDropdown(null);
  };

  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  const updateLocalUserStorage = (updatedFields) => {
    const storages = [localStorage, sessionStorage];
    storages.forEach(storage => {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          const storedStr = storage.getItem(key);
          if (!storedStr || !storedStr.includes(userInfo._id)) continue;
          let storedObj = JSON.parse(storedStr);
          let updated = false;

          if (storedObj && (storedObj._id === userInfo._id || storedObj.id === userInfo._id)) {
            storedObj = { ...storedObj, ...updatedFields };
            updated = true;
          } else if (storedObj && storedObj.user && (storedObj.user._id === userInfo._id || storedObj.user.id === userInfo._id)) {
            storedObj.user = { ...storedObj.user, ...updatedFields };
            updated = true;
          }

          if (updated) storage.setItem(key, JSON.stringify(storedObj));
        }
      } catch (e) { }
    });
  };

  const handleSaveProfile = async () => {
    if (!userInfo._id) return alert('Cannot update profile: user id missing.');
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();

      setUserInfo(prev => ({ ...prev, ...updated }));
      updateLocalUserStorage(updated);
      setIsEditProfileOpen(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setIsUploading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      const data = JSON.parse(await res.text());
      if (res.ok && data.imageUrl) {
        setUserInfo(prev => ({ ...prev, pic: data.imageUrl }));
        setEditForm(prev => ({ ...prev, pic: data.imageUrl }));

        if (userInfo._id) {
          const updateRes = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new })
      });
      const data = await res.json();
      if (!res.ok || !data.success) return alert(data.message || 'Failed to reset password.');

      alert("Password reset successfully!");
      setIsResetPasswordOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      alert('Server error while resetting password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getPageTitle = () => {
    const titles = {
      'overview': 'Dashboard Analytics',
      'customers': 'Customers',
      'suppliers': 'Suppliers',
      'employees': 'Employees',
      'uom': 'Units of Measure',
      'category': 'Categories',
      'product': 'Products',
      'current-stock': 'Current Stock',
      'expiry-products': 'Expiry Products',
      'reorder-levels': 'Reorder Levels',
      'add-purchase': 'Add Purchase',
      'purchased-list': 'Purchased List',
      'purchase-return': 'Purchase Return',
      'return-list': 'Purchase Return List',
      'users': 'Manage Users',
      'roles': 'Manage Roles',
      'designations': 'Designations',
      'opening-stocks': 'Opening Stocks',
      'stock-adjustment': 'Stock Adjustment',
      'invoice-list': 'Sales Invoice List',
      'settings': 'Settings',
      'print-settings': 'Print Settings',
      'client-details': 'Client Details',
      'accountsreport': 'Accounts Report',
      'catalogue-report': 'Catalogue Report',
      'stock-report': 'Stock Report',
      'customer-types': 'Customer Types',
      'sales-return': 'Sales Return',
      'cash-register': 'Cash Register',
      'sale-return-list': 'Sales Return List',
      'customer-account': 'Customer Account',
      'supplier-account': 'Supplier Account',
      'employee-account': 'Employee Account',
      'expense-category': 'Expense Category',
      'expense': 'Expense',
      'stock-breakage': 'Stock Breakage',
      'add-purchase-rebate': 'Add Purchase Rebate',
      'purchase-rebate-list': 'Purchase Rebate List',
      'rate-difference': 'Purchase Rate Difference',
      'rate-difference-list': 'Purchase Rate Difference List',
      'add-sales-rebate': 'Add Sales Rebate',
      'sales-rebate-list': 'Sales Rebate List',
      'Sales-Rate-Difference': 'Sales Rate Difference',
      'Sales-Rate-Difference-List': 'Sales Rate Difference List',
      'purchase-report': 'Purchase Report',
      'sales-report': 'Sales Report',
      'register-report': 'Register Report',
      'people-report': 'People Report',
      'ProfitLossReport': 'Profit & Loss Report',
      'StockMovementReport': 'Stock Movement Report',
      'payablereceivable': 'Payable & Receivable Report',
      'BusinessCapitalReport': 'Business Capital Report'
    };
    return titles[activeTab] || 'Dashboard';
  };

  const getPageIcon = () => {
    return activeTab === 'overview' ? <FontAwesomeIcon icon={faChartBar} /> : '';
  };

  const formattedDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="dashboard-container">
      {isMobile && isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header" >
          <img src="/logo.png" alt="Stockify Logo" style={{ width: '210px', height: '65px', marginLeft: '10px', marginTop: '15px' }} />
          {isMobile && <button className="close-sidebar-btn" onClick={toggleSidebar}>×</button>}
        </div>

        <div className="sidebar-nav-wrapper">
          <ul className="sidebar-nav" style={{ margin: 0, padding: '10px 10px' }}>
            <li
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => { handleTabChange('overview'); if (isMobile) setIsSidebarOpen(false); }}
              style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 10px' }}
            >
              <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span> Dashboard
            </li>

            {/* PARENT MODULE: People */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('people')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'people' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faUserGroup} /></span> People</span>
              <span className='drop'>{openDropdown === 'people' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'people' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'customers' ? 'active' : ''} onClick={() => { handleTabChange('customers'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Customers</li>
                <li className={activeTab === 'suppliers' ? 'active' : ''} onClick={() => { handleTabChange('suppliers'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Suppliers</li>
                <li className={activeTab === 'employees' ? 'active' : ''} onClick={() => { handleTabChange('employees'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Employees</li>
              </ul>
            )}

            {/* PARENT MODULE: Products */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('products')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'products' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faBoxOpen} /></span> Products</span>
              <span className='drop'>{openDropdown === 'products' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'products' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'uom' ? 'active' : ''} onClick={() => { handleTabChange('uom'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Units of Measure</li>
                <li className={activeTab === 'category' ? 'active' : ''} onClick={() => { handleTabChange('category'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Categories</li>
                <li className={activeTab === 'product' ? 'active' : ''} onClick={() => { handleTabChange('product'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Products</li>
              </ul>
            )}

            {/* PARENT MODULE: Stock */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('stock')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'stock' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faCubes} /></span> Stock</span>
              <span className='drop'>{openDropdown === 'stock' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'stock' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'current-stock' ? 'active' : ''} onClick={() => { handleTabChange('current-stock'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Current Stock</li>
                <li className={activeTab === 'expiry-products' ? 'active' : ''} onClick={() => { handleTabChange('expiry-products'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Expiry Products</li>
                <li className={activeTab === 'reorder-levels' ? 'active' : ''} onClick={() => { handleTabChange('reorder-levels'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Reorder Levels</li>
                <li className={activeTab === 'opening-stocks' ? 'active' : ''} onClick={() => { handleTabChange('opening-stocks'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Opening Stock</li>
                <li className={activeTab === 'stock-adjustment' ? 'active' : ''} onClick={() => { handleTabChange('stock-adjustment'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Stock Adjustment</li>
                <li className={activeTab === 'stock-breakage' ? 'active' : ''} onClick={() => { handleTabChange('stock-breakage'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Stock Breakage</li>
              </ul>
            )}

            {/* PARENT MODULE: Purchase */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('purchase')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'purchase' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faCartPlus} /></span> Purchase</span>
              <span className='drop'>{openDropdown === 'purchase' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'purchase' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'add-purchase' ? 'active' : ''} onClick={() => { handleTabChange('add-purchase'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Invoice</li>
                <li className={activeTab === 'purchased-list' ? 'active' : ''} onClick={() => { handleTabChange('purchased-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Invoice List</li>
                <li className={activeTab === 'purchase-return' ? 'active' : ''} onClick={() => { handleTabChange('purchase-return'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Return</li>
                <li className={activeTab === 'return-list' ? 'active' : ''} onClick={() => { handleTabChange('return-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Return List</li>
                <li className={activeTab === 'add-purchase-rebate' ? 'active' : ''} onClick={() => { handleTabChange('add-purchase-rebate'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Rebate</li>
                <li className={activeTab === 'purchase-rebate-list' ? 'active' : ''} onClick={() => { handleTabChange('purchase-rebate-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Purchase Rebate List</li>
                <li className={activeTab === 'rate-difference' ? 'active' : ''} onClick={() => { handleTabChange('rate-difference'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Rate Difference</li>
                <li className={activeTab === 'rate-difference-list' ? 'active' : ''} onClick={() => { handleTabChange('rate-difference-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Rate Difference List</li>
              </ul>
            )}

            {/* PARENT MODULE: Sales */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('sales')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'sales' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faCoins} /></span> Sales</span>
              <span className='drop'>{openDropdown === 'sales' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'sales' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li onClick={() => { handleTabChange('pos'); if (isMobile) setIsSidebarOpen(false); }} > <div style={{ marginRight: '10px' }}>⋄</div>POS</li>
                <li className={activeTab === 'invoice-list' ? 'active' : ''} onClick={() => { handleTabChange('invoice-list'); if (isMobile) setIsSidebarOpen(false); }} > <div style={{ marginRight: '10px' }}>⋄</div>Invoice List</li>
                <li className={activeTab === 'sales-return' ? 'active' : ''} onClick={() => { handleTabChange('sales-return'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Return</li>
                <li className={activeTab === 'sale-return-list' ? 'active' : ''} onClick={() => { handleTabChange('sale-return-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sale Return List</li>
                <li className={activeTab === 'cash-register' ? 'active' : ''} onClick={() => { handleTabChange('cash-register'); if (isMobile) setIsSidebarOpen(false); }}><div style={{ marginRight: '10px' }}>⋄</div>Cash Register</li>
                <li className={activeTab === 'add-sales-rebate' ? 'active' : ''} onClick={() => { handleTabChange('add-sales-rebate'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rebate</li>
                <li className={activeTab === 'sales-rebate-list' ? 'active' : ''} onClick={() => { handleTabChange('sales-rebate-list'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rebate List</li>
                <li className={activeTab === 'Sales-Rate-Difference' ? 'active' : ''} onClick={() => { handleTabChange('Sales-Rate-Difference'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rate Difference</li>
                <li className={activeTab === 'Sales-Rate-Difference-List' ? 'active' : ''} onClick={() => { handleTabChange('Sales-Rate-Difference-List'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sales Rate Difference List</li>
              </ul>
            )}

            {/* PARENT MODULE: Accounts */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('accounts')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'accounts' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faMoneyCheckDollar} /></span> Accounts</span>
              <span className='drop'>{openDropdown === 'accounts' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'accounts' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'customer-account' ? 'active' : ''} onClick={() => { handleTabChange('customer-account'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Customer Account</li>
                <li className={activeTab === 'supplier-account' ? 'active' : ''} onClick={() => { handleTabChange('supplier-account'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Supplier Account</li>
                <li className={activeTab === 'employee-account' ? 'active' : ''} onClick={() => { handleTabChange('employee-account'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Employee Account</li>
              </ul>
            )}

            {/* PARENT MODULE: Expenses */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('expenses')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'expenses' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faHandHoldingDollar} /></span> Expense Management</span>
              <span className='drop'>{openDropdown === 'expenses' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'expenses' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'expense-category' ? 'active' : ''} onClick={() => { handleTabChange('expense-category'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Expense Category</li>
                <li className={activeTab === 'expense' ? 'active' : ''} onClick={() => { handleTabChange('expense'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Expense</li>
              </ul>
            )}

            {/* PARENT MODULE: Reports */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('reports')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'reports' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faReceipt} /></span> Reports</span>
              <span className='drop'>{openDropdown === 'reports' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'reports' && (
              <ul className="submenu" style={{ marginLeft: '30px' }}>
                <li className={activeTab === 'people-report' ? 'active' : ''} onClick={() => { handleTabChange('people-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>People Report</li>
                <li className={activeTab === 'catalogue-report' ? 'active' : ''} onClick={() => { handleTabChange('catalogue-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Catalogue Report</li>
                <li className={activeTab === 'stock-report' ? 'active' : ''} onClick={() => { handleTabChange('stock-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Stock Report</li>
                <li className={activeTab === 'purchase-report' ? 'active' : ''} onClick={() => { handleTabChange('purchase-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Purchase Report</li>
                <li className={activeTab === 'sales-report' ? 'active' : ''} onClick={() => { handleTabChange('sales-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Sales Report</li>
                <li className={activeTab === 'register-report' ? 'active' : ''} onClick={() => { handleTabChange('register-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Register Report</li>
                <li className={activeTab === 'StockMovementReport' ? 'active' : ''} onClick={() => { handleTabChange('StockMovementReport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Stock Movement Report</li>
                <li className={activeTab === 'accountsreport' ? 'active' : ''} onClick={() => { handleTabChange('accountsreport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Accounts Report</li>
                <li className={activeTab === 'payablereceivable' ? 'active' : ''} onClick={() => { handleTabChange('payablereceivable'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Payable and Receivable </li>
                <li className={activeTab === 'ProfitLossReport' ? 'active' : ''} onClick={() => { handleTabChange('ProfitLossReport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Profit & Loss Report</li>
                <li className={activeTab === 'BusinessCapitalReport' ? 'active' : ''} onClick={() => { handleTabChange('BusinessCapitalReport'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}><div style={{ marginRight: '10px', marginLeft: '10px' }}>⋄</div>Business Capital Report</li>
              </ul>
            )}

            {/* PARENT MODULE: System Users */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('systemUsers')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'systemUsers' ? 'rgba(24, 33, 48, 0.83)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span> System Users</span>
              <span className='drop'>{openDropdown === 'systemUsers' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'systemUsers' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'users' ? 'active' : ''} onClick={() => { handleTabChange('users'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Manage Users</li>
                <li className={activeTab === 'roles' ? 'active' : ''} onClick={() => { handleTabChange('roles'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Manage Roles</li>
              </ul>
            )}

            {/* PARENT MODULE: Settings */}
            <li className="parent-menu-item" onClick={() => toggleDropdown('settings')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '10px 10px', backgroundColor: openDropdown === 'settings' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
              <span><span className="nav-icon"><FontAwesomeIcon icon={faGear} /></span> Settings</span>
              <span className='drop'>{openDropdown === 'settings' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'settings' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'designations' ? 'active' : ''} onClick={() => { handleTabChange('designations'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Designations</li>
                <li className={activeTab === 'print-settings' ? 'active' : ''} onClick={() => { handleTabChange('print-settings'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Sale Invoice</li>
                <li className={activeTab === 'client-details' ? 'active' : ''} onClick={() => { handleTabChange('client-details'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Client Details</li>
                <li className={activeTab === 'customer-types' ? 'active' : ''} onClick={() => { handleTabChange('customer-types'); if (isMobile) setIsSidebarOpen(false); }} ><div style={{ marginRight: '10px' }}>⋄</div>Customer Types</li>
              </ul>
            )}
          </ul>
        </div>
      </aside>

      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="top-header sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger-btn" onClick={toggleSidebar}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <span className="page-icon" style={{ marginLeft: '15px' }}>{getPageIcon()}</span>
            <h1 style={{ fontFamily: 'ui-rounded', letterSpacing: '0%', marginLeft: '10px' }}>{getPageTitle()}</h1>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }} ref={profileRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '500', color: '#475569' }}>
              <span>{formattedDate}</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span>{formattedTime}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginRight: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1b2f4a" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#94a3b8" />
                </svg>
              </div>
            </div>

            <div className="profile-trigger" onClick={toggleProfile}>
              <div className="profile-avatar" style={{ overflow: 'hidden' }}>
                {userInfo.pic ? (
                  <img src={getImageUrl(userInfo.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="avatar-text">{userInfo.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="profile-chevron">{isProfileOpen ? '' : ''}</span>
            </div>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar" style={{ overflow: 'hidden' }}>
                    {userInfo.pic ? (
                      <img src={getImageUrl(userInfo.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="avatar-text">{userInfo.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-user-name">{userInfo.name}</div>
                    <div className="dropdown-user-email">{userInfo.email}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); setIsViewProfileOpen(true); }}>
                  <span className="dropdown-icon">👤</span> View Profile
                </button>
                <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); setEditForm({ ...userInfo }); setIsEditProfileOpen(true); }}>
                  <span className="dropdown-icon">✏️</span> Edit Profile
                </button>
                <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); setIsResetPasswordOpen(true); }}>
                  <span className="dropdown-icon">🔒</span> Reset Password
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item dropdown-logout" onClick={() => { setIsProfileOpen(false); onLogout(); }}>
                  <span className="dropdown-icon">🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="content-area">

          {/* ======================================================== */}
          {/* ================= DASHBOARD ANALYTICS ==================== */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div style={styles.dashboardAnalyticsWrapper}>

              {/* TOP GRID: POS (Big) & Core Financials */}
              <div style={styles.topWidgetsGrid}>



                {/* 2. Total Sales */}
                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('sales-report')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    <FontAwesomeIcon icon={faCoins} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}>Total Sales</p>
                    <h3 style={styles.smallWidgetCount}>
                      {isDashLoading ? '...' : `Rs ${dashStats.sales.toLocaleString()}`}
                    </h3>
                  </div>
                </div>

                {/* 3. Total Purchases */}
                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('purchase-report')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
                    <FontAwesomeIcon icon={faCartPlus} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}> Purchases</p>
                    <h3 style={styles.smallWidgetCount}>
                      {isDashLoading ? '...' : `Rs ${dashStats.purchases.toLocaleString()}`}
                    </h3>
                  </div>
                </div>

                {/* 4. Total Expenses */}
                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('ProfitLossReport')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}> Expenses</p>
                    <h3 style={styles.smallWidgetCount}>
                      {isDashLoading ? '...' : `Rs ${dashStats.expenses.toLocaleString()}`}
                    </h3>
                  </div>
                </div>
                {/* 1. Point of Sale (POS) Action Card */}
                <div style={styles.posWidgetCard} onClick={() => handleTabChange('pos')}>
                  <div style={styles.posIconWrapper}>
                    <FontAwesomeIcon icon={faCashRegister} size="lg" />
                  </div>
                  <div style={styles.posTextWrapper}>
                    <h2 style={styles.posTitle}>Point of Sale (POS)</h2>
                  </div>
                </div>

              </div>

              {/* BOTTOM GRID: Counters (Smaller Cards) */}
              <div style={styles.bottomWidgetsGrid}>

                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('people-report')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}>Customers</p>
                    <h3 style={styles.smallWidgetCount}>{isDashLoading ? '...' : dashStats.customers}</h3>
                  </div>
                </div>

                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('people-report')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#fdf4ff', color: '#9333ea' }}>
                    <FontAwesomeIcon icon={faTruckMoving} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}>Suppliers</p>
                    <h3 style={styles.smallWidgetCount}>{isDashLoading ? '...' : dashStats.suppliers}</h3>
                  </div>
                </div>

                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('people-report')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#ecfdf5', color: '#10b981' }}>
                    <FontAwesomeIcon icon={faUserTie} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}>Employees</p>
                    <h3 style={styles.smallWidgetCount}>{isDashLoading ? '...' : dashStats.employees}</h3>
                  </div>
                </div>

                <div style={styles.smallWidgetCard} onClick={() => handleTabChange('catalogue-report')}>
                  <div style={{ ...styles.smallWidgetIcon, backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
                    <FontAwesomeIcon icon={faBoxesStacked} />
                  </div>
                  <div style={styles.smallWidgetText}>
                    <p style={styles.smallWidgetTitle}>Products</p>
                    <h3 style={styles.smallWidgetCount}>{isDashLoading ? '...' : dashStats.products}</h3>
                  </div>
                </div>

              </div>

              {/* Charts Area (4 Separate Charts) */}
              <div style={styles.chartsGrid}>

                {/* 1. SALES CHART (Area Chart - Blue) */}
                <div style={styles.chartContainer}>
                  <h3 style={styles.chartTitle}>Sales Trend</h3>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      {isDashLoading ? 'Loading chart...' : 'No data available yet.'}
                    </div>
                  )}
                </div>

                {/* 2. PURCHASES CHART (Bar Chart - Amber) */}
                <div style={styles.chartContainer}>
                  <h3 style={styles.chartTitle}>Purchases Overview</h3>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="purchases" name="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      {isDashLoading ? 'Loading chart...' : 'No data available yet.'}
                    </div>
                  )}
                </div>

                {/* 3. EXPENSES CHART (Line Chart - Red) */}
                <div style={styles.chartContainer}>
                  <h3 style={styles.chartTitle}>Expenses Trend</h3>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      {isDashLoading ? 'Loading chart...' : 'No data available yet.'}
                    </div>
                  )}
                </div>

                {/* 4. PROFIT & LOSS CHART (Area Chart - Custom Tooltip) */}
                <div style={styles.chartContainer}>
                  <h3 style={styles.chartTitle}>Profit & Loss Trend</h3>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />

                        {/* YAHAN CUSTOM TOOLTIP LAGAYA GAYA HAI */}
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const val = payload[0].value;
                              const isProfit = val >= 0;
                              const textColor = isProfit ? '#10b981' : '#ef4444'; // Green for profit, Red for loss
                              const title = isProfit ? 'Net Profit' : 'Net Loss';

                              return (
                                <div style={{
                                  backgroundColor: '#fff',
                                  padding: '12px 16px',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  <p style={{ margin: '0 0 6px 0', color: '#64748b', fontWeight: 'bold' }}>{label}</p>
                                  <p style={{ margin: 0, color: textColor, fontWeight: 'bold', fontSize: '15px' }}>
                                    {title} : Rs {val.toLocaleString()}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      {isDashLoading ? 'Loading chart...' : 'No data available yet.'}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Render Modules */}
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
        </div>
      </main>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleProfileImageUpload} style={{ display: 'none' }} />

      {/* VIEW PROFILE MODAL */}
      {isViewProfileOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsViewProfileOpen(false)}>
          <div style={{ ...styles.modalContentWide, display: 'flex', gap: '20px', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: '0 0 320px', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ height: '140px', backgroundColor: '#1b2f4a' }}></div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '-70px' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', backgroundColor: '#fff', border: '5px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#1b2f4a', fontWeight: 'bold' }}>
                  {userInfo.pic ? <img src={getImageUrl(userInfo.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userInfo.name.charAt(0).toUpperCase()}
                </div>
                <button onClick={triggerFileInput} disabled={isUploading} style={{ position: 'absolute', bottom: '5px', right: '95px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1b2f4a', color: '#fff', border: '3px solid #fff', cursor: isUploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
              </div>
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '24px' }}>{userInfo.name}</h2>
                <span style={{ backgroundColor: '#f1f5f9', color: '#1b2f4a', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
                  <span style={{ color: '#10b981', marginRight: '6px' }}>●</span>{userInfo.role.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ backgroundColor: '#1b2f4a', padding: '10px 30px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Your Profile
                </h2>
                <button onClick={() => setIsViewProfileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px', marginLeft: '30px' }}>
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                  <div><div style={styles.detailTitle}>NAME</div><div style={styles.detailValueBold}>{userInfo.name}</div></div>
                </div>
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></div>
                  <div><div style={styles.detailTitle}>EMAIL</div><div style={styles.detailValueBold}>{userInfo.email}</div></div>
                </div>
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>
                  <div><div style={styles.detailTitle}>CONTACT NUMBER</div><div style={styles.detailValueBold}>{userInfo.contact}</div></div>
                </div>
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                  <div><div style={styles.detailTitle}>CNIC</div><div style={styles.detailValueBold}>{userInfo.cnic}</div></div>
                </div>
                <div style={{ ...styles.detailGridItem, borderBottom: 'none' }}>
                  <div style={styles.detailIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                  <div><div style={styles.detailTitle}>AREA</div><div style={styles.detailValueBold}>{userInfo.address}</div></div>
                </div>
                <div style={{ ...styles.detailGridItem, borderBottom: 'none' }}>
                  <div style={styles.detailIconWrapper}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
                  <div><div style={styles.detailTitle}>ROLE</div><div style={styles.detailValueBold}>{userInfo.role}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditProfileOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsEditProfileOpen(false)}>
          <div style={{ ...styles.modalContentWide, padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ backgroundColor: '#1b2f4a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Edit Profile</h2>
              <button onClick={() => setIsEditProfileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '3px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', color: '#1b2f4a', fontWeight: 'bold' }}>
                    {editForm.pic ? <img src={getImageUrl(editForm.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (editForm.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <button onClick={triggerFileInput} disabled={isUploading} style={{ position: 'absolute', bottom: '0', right: '0', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#1b2f4a', color: '#fff', border: '3px solid #fff', cursor: isUploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </button>
                </div>
              </div>
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '10px', marginBottom: '24px', minHeight: '16px' }}>{isUploading ? 'Uploading...' : ' '}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={styles.inputLabelWide}>Full Name</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={styles.inputFieldWide} />
                  </div>
                </div>
                <div>
                  <label style={styles.inputLabelWide}>Contact Number</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                    <input type="text" value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} style={styles.inputFieldWide} />
                  </div>
                </div>
                <div>
                  <label style={styles.inputLabelWide}>CNIC</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
                    <input type="text" value={editForm.cnic} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} style={styles.inputFieldWide} />
                  </div>
                </div>
                <div>
                  <label style={styles.inputLabelWide}>Area</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
                    <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Enter your area" style={styles.inputFieldWide} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '12px 24px', backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }} onClick={() => setIsEditProfileOpen(false)}>Cancel</button>
                <button style={{ padding: '12px 24px', backgroundColor: '#1b2f4a', border: 'none', color: '#fff', borderRadius: '8px', cursor: isSaving ? 'wait' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1 }} onClick={handleSaveProfile} disabled={isSaving}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  {isSaving ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPasswordOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Reset Password</h2>
              <button style={styles.closeBtn} onClick={() => setIsResetPasswordOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div><label style={styles.inputLabel}>Current Password</label><input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} style={styles.inputField} placeholder="Enter current password" /></div>
              <div><label style={styles.inputLabel}>New Password</label><input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} style={styles.inputField} placeholder="Enter new password" /></div>
              <div><label style={styles.inputLabel}>Confirm New Password</label><input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} style={styles.inputField} placeholder="Confirm new password" /></div>
            </div>
            <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={styles.cancelBtn} onClick={() => setIsResetPasswordOpen(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleResetPassword}>Reset Password</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline Styles
const styles = {
  // New Dashboard Analytics Layouts
  dashboardAnalyticsWrapper: {
    padding: '24px', boxSizing: 'border-box', backgroundColor: '#f8fafc', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', gap: '24px'
  },

  // TOP GRID (POS & Financials)
  topWidgetsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px,1fr))', gap: '16px'
  },

  // POS WIDGET (Big, Standout Design)
  posWidgetCard: {
    backgroundColor: '#517096', borderRadius: '12px', padding: '10px',
    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
    gridColumn: 'span 1', // makes it span across two columns
    transition: 'transform 0.2s ease',
  },
  posIconWrapper: {
    width: '50px', height: '50px', borderRadius: '12px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216, 228, 240, 0.93)', color: '#203b57'
  },
  posTextWrapper: { display: 'flex', flexDirection: 'column' },
  posSubtitle: { margin: '0 0 4px 0', fontSize: '13px', fontWeight: '500', color: '#314468' },
  posTitle: { margin: 0, fontSize: '15px', fontWeight: '700', color: '#ffffff' },

  // BOTTOM GRID (Smaller Counters)
  bottomWidgetsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px'
  },

  // SMALL WIDGET (Reduced size for standard cards)
  smallWidgetCard: {
    backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px',
    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
    border: '1px solid #e2e8f0', transition: 'transform 0.2s ease'
  },
  smallWidgetIcon: {
    width: '42px', height: '42px', borderRadius: '10px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '18px'
  },
  smallWidgetText: { display: 'flex', flexDirection: 'column' },
  smallWidgetTitle: { margin: '0 0 4px 0', fontSize: '12px', fontWeight: '600', color: '#64748b' },
  smallWidgetCount: { margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' },

  // CHARTS
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px'
  },
  chartContainer: {
    backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0'
  },
  chartTitle: {
    margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b'
  },

  // Modals and Common Elements
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
  },
  modalContent: {
    backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px',
    width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    animation: 'modalSlideIn 0.3s ease-out'
  },
  modalContentWide: {
    backgroundColor: '#ffffff', borderRadius: '12px',
    width: '800px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    animation: 'modalSlideIn 0.3s ease-out'
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #e2e8f0', paddingBottom: '16px'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' },

  detailGridItem: {
    display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px'
  },
  detailIconWrapper: {
    width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#3a536d', color: '#fafafa',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  detailTitle: { textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#0f172a', letterSpacing: '0.5px', marginBottom: '4px' },
  detailValueBold: { fontSize: '13px', fontWeight: '400', color: '#64748b', textAlign: 'left' },

  inputLabelWide: { textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIconPrefix: { position: 'absolute', left: '14px', color: '#64748b', display: 'flex' },
  inputFieldWide: { width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', color: '#334155' },

  inputLabel: { textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
  inputField: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },

  primaryBtn: { padding: '10px 20px', backgroundColor: '#1b2f4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#1b2f4a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }
};

export default Dashboard;