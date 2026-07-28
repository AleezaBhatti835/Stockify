import { useState, useEffect, useRef } from 'react';
import './dashboard.css';
import Roles from './roles';
import Users from './user';
import Customers from './customers';
import Suppliers from './Suppliers';
import Designations from './Designation';
import Employees from './Employee';
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
import PrintSettingsPage from './PrintSettingsPage';
import ClientDetails from './ClientDetails.jsx';
import DeletedProducts from './catalogue/DeletedProducts.jsx';
import CustomerReport from './reports/Customerreport.jsx';
import SupplierReport from './reports/Supplierreport.jsx';
import ProductReport from './reports/Productreport.jsx';
import EmployeeReport from './reports/Employeereport.jsx';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBank, faBoxOpen, faCartPlus, faChartBar, faCirclePause, faCoins, faCubes, faDashboard, faGear, faHandHoldingDollar, faMoneyCheckDollar, faReceipt, faScrewdriver, faUser, faUserGroup } from '@fortawesome/free-solid-svg-icons';

// Base URL for API and Images
const API_BASE_URL = 'http://localhost:5000';

const getImageUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
};

// Role can arrive populated (an object) or as a raw id string — handle both
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const fileInputRef = useRef(null);

  // Time State for Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Profile Modals State
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // User Info State — initialized straight from the logged-in user (App.jsx passes this down)
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

  // Edit Form State
  const [editForm, setEditForm] = useState({ ...userInfo });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem('activeTab', tabName);
  };

  const handleLogout = () => {
    localStorage.removeItem('activeTab');
    onLogout();
  };

  useEffect(() => {
    // Window Resize Handler
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Clock Interval
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Close profile dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(timer);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDropdown = (dropdownName) => {
    if (openDropdown === dropdownName) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(dropdownName);
    }
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // ==================== SAVE PROFILE TO DATABASE ====================
  const handleSaveProfile = async () => {
    if (!userInfo._id) {
      alert('Cannot update profile: user id missing.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          contact: editForm.contact,
          cnic: editForm.cnic,
          address: editForm.address,
          pic: editForm.pic
        })
      });

      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();

      setUserInfo(prev => ({
        ...prev,
        name: updated.name,
        contact: updated.contact,
        cnic: updated.cnic,
        address: updated.address,
        pic: updated.pic
      }));
      setIsEditProfileOpen(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger hidden file input
  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ==================== UPLOAD PROFILE IMAGE (and persist immediately) ====================
  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setIsUploading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
      const raw = await res.text();
      if (!res.ok) {
        alert('Image upload failed.');
        return;
      }
      const data = JSON.parse(raw);
      if (data.imageUrl) {
        setUserInfo(prev => ({ ...prev, pic: data.imageUrl }));
        setEditForm(prev => ({ ...prev, pic: data.imageUrl }));

        if (userInfo._id) {
          const updateRes = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pic: data.imageUrl })
          });
          if (!updateRes.ok) {
            alert('Image uploaded, but failed to save to your profile. Try again.');
          }
        }
      }
    } catch (error) {
      alert('Upload failed: could not reach the server.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      alert("All fields are required!");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      alert("New passwords do not match!");
      return;
    }
    if (passwordForm.new.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }
    if (!userInfo._id) {
      alert("Cannot reset password: user id missing.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userInfo._id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to reset password.');
        return;
      }

      alert("Password reset successfully!");
      setIsResetPasswordOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Server error while resetting password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getPageTitle = () => {
    const titles = {
      'overview': 'Dashboard',
      'customers': 'Customers',
      'suppliers': 'Suppliers',
      'employees': 'Employees',
      'uom': 'Units of Measure',
      'category': 'Categories',
      'product': 'Products',
      'deleted-products': 'Deleted Products',
      'current-stock': 'Current Stock',
      'expiry-products': 'Expiry Products',
      'reorder-levels': 'Reorder Levels',
      'add-purchase': 'Add Purchase',
      'purchased-list': 'Purchased List',
      'purchase-return': 'Purchase Return',
      'return-list': 'Return List',
      'users': 'Manage Users',
      'roles': 'Manage Roles',
      'designations': 'Designations',
      'opening-stocks': 'Opening Stocks',
      'stock-adjustment': 'Stock Adjustment',
      'invoice-list': 'Invoice List',
      'settings': 'Settings',
      'print-settings': 'Print Settings',
      'client-details': 'Client Details',
      'customer-report': 'Customer Report',
      'supplier-report': 'Supplier Report',
      'product-report': 'Product Report',
      'employee-report': 'Employee Report',
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
      'rate-difference': 'Rate Difference',
      'rate-difference-list':'Rate Difference List'
    };
    return titles[activeTab] || 'Dashboard';
  };

  const getPageIcon = () => {
    const icons = {

    };
    return icons[activeTab] || '';
  };


  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });

  return (
    <div className="dashboard-container">
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header" >
          {/* Use img tag to display the logo inside the sidebar */}
          <img src="/logo.png" alt="Stockify Logo" style={{ width: '210px', height: '65px', marginLeft: '10px' ,marginTop:'15px'}} />

          {isMobile && (
            <button className="close-sidebar-btn" onClick={toggleSidebar}>×</button>
          )}
        </div>

        <div className="sidebar-nav-wrapper">
          <ul className="sidebar-nav" style={{ padding: 0, margin: 0 }}>
            <li
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => { handleTabChange('overview'); if (isMobile) setIsSidebarOpen(false); }}
              style={{ cursor: 'pointer', textAlign: 'left', padding: '15px 20px' }}
            >
              <span className="nav-icon"><FontAwesomeIcon icon={faChartBar} /></span> Dashboard
            </li>

            {/* PARENT MODULE: People */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('people')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'people' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faUserGroup} /></span> People</span>
              <span className='drop'>{openDropdown === 'people' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'people' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'customers' ? 'active' : ''} onClick={() => { handleTabChange('customers'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Customers</li>
                <li className={activeTab === 'suppliers' ? 'active' : ''} onClick={() => { handleTabChange('suppliers'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Suppliers</li>
                <li className={activeTab === 'employees' ? 'active' : ''} onClick={() => { handleTabChange('employees'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Employees</li>
              </ul>
            )}

            {/* PARENT MODULE: Products */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('products')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'products' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faBoxOpen} /></span> Products</span>
              <span className='drop'>{openDropdown === 'products' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'products' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'uom' ? 'active' : ''} onClick={() => { handleTabChange('uom'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Units of Measure</li>
                <li className={activeTab === 'category' ? 'active' : ''} onClick={() => { handleTabChange('category'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Categories</li>
                <li className={activeTab === 'product' ? 'active' : ''} onClick={() => { handleTabChange('product'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Products</li>
                <li className={activeTab === 'deleted-products' ? 'active' : ''} onClick={() => { handleTabChange('deleted-products'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Deleted Products</li>
                <li className={activeTab === 'product-report' ? 'active' : ''} onClick={() => { handleTabChange('product-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Products List</li>
              </ul>
            )}

            {/* PARENT MODULE: Stock */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('stock')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'stock' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faCubes} /></span> Stock</span>
              <span className='drop'>{openDropdown === 'stock' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'stock' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'current-stock' ? 'active' : ''} onClick={() => { handleTabChange('current-stock'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Current Stock</li>
                <li className={activeTab === 'expiry-products' ? 'active' : ''} onClick={() => { handleTabChange('expiry-products'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Expiry Products</li>
                <li className={activeTab === 'reorder-levels' ? 'active' : ''} onClick={() => { handleTabChange('reorder-levels'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Reorder Levels</li>
                <li className={activeTab === 'opening-stocks' ? 'active' : ''} onClick={() => { handleTabChange('opening-stocks'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Opening Stock</li>
                <li className={activeTab === 'stock-adjustment' ? 'active' : ''} onClick={() => { handleTabChange('stock-adjustment'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Stock Adjustment</li>
                <li className={activeTab === 'stock-breakage' ? 'active' : ''} onClick={() => { handleTabChange('stock-breakage'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Stock Breakage</li>
              </ul>
            )}

            {/* PARENT MODULE: Purchase */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('purchase')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'purchase' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faCartPlus} /></span> Purchase</span>
              <span className='drop'>{openDropdown === 'purchase' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'purchase' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'add-purchase' ? 'active' : ''} onClick={() => { handleTabChange('add-purchase'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Purchase Invoice</li>
                <li className={activeTab === 'purchased-list' ? 'active' : ''} onClick={() => { handleTabChange('purchased-list'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Purchase Invoice List</li>
                <li className={activeTab === 'purchase-return' ? 'active' : ''} onClick={() => { handleTabChange('purchase-return'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Purchase Return</li>
                <li className={activeTab === 'return-list' ? 'active' : ''} onClick={() => { handleTabChange('return-list'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Purchase Return List</li>
                <li className={activeTab === 'add-purchase-rebate' ? 'active' : ''} onClick={() => { handleTabChange('add-purchase-rebate'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Purchase Rebate</li>
                <li className={activeTab === 'purchase-rebate-list' ? 'active' : ''} onClick={() => { handleTabChange('purchase-rebate-list'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Purchase Rebate List</li>
                <li className={activeTab === 'rate-difference' ? 'active' : ''} onClick={() => { handleTabChange('rate-difference'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Rate Difference</li>
                <li className={activeTab === 'rate-difference-list' ? 'active' : ''} onClick={() => { handleTabChange('rate-difference-list'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Rate Difference List</li>

              </ul>
            )}

            {/* PARENT MODULE: Sales */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('sales')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'sales' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faCoins} /></span> Sales</span>
              <span className='drop'>{openDropdown === 'sales' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'sales' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li onClick={() => { handleTabChange('pos'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>POS</li>
                <li className={activeTab === 'invoice-list' ? 'active' : ''} onClick={() => { handleTabChange('invoice-list'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Invoice List</li>
                <li className={activeTab === 'sales-return' ? 'active' : ''} onClick={() => { handleTabChange('sales-return'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Sales Return</li>
                <li className={activeTab === 'sale-return-list' ? 'active' : ''} onClick={() => { handleTabChange('sale-return-list'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Sale Return List</li>

                <li
                  className={activeTab === 'cash-register' ? 'active' : ''}
                  onClick={() => { handleTabChange('cash-register'); if (isMobile) setIsSidebarOpen(false); }}
                  style={{ cursor: 'pointer', textAlign: 'left', padding: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  Cash Register
                </li>
              </ul>
            )}

            {/* PARENT MODULE: Accounts */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('accounts')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'accounts' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faMoneyCheckDollar} /></span> Accounts</span>
              <span className='drop'>{openDropdown === 'accounts' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'accounts' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'customer-account' ? 'active' : ''} onClick={() => { handleTabChange('customer-account'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Customer Account</li>
                <li className={activeTab === 'supplier-account' ? 'active' : ''} onClick={() => { handleTabChange('supplier-account'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Supplier Account</li>
                <li className={activeTab === 'employee-account' ? 'active' : ''} onClick={() => { handleTabChange('employee-account'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Employee Account</li>
              </ul>
            )}
            {/* PARENT MODULE: Expenses */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('expenses')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'expenses' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faHandHoldingDollar} /></span> Expense Management</span>
              <span className='drop'>{openDropdown === 'expenses' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'expenses' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'expense-category' ? 'active' : ''} onClick={() => { handleTabChange('expense-category'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Expense Category</li>
                <li className={activeTab === 'expense' ? 'active' : ''} onClick={() => { handleTabChange('expense'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Expense</li>
              </ul>
            )}
            {/* PARENT MODULE: Reports */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('reports')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'reports' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faReceipt} /></span> Reports</span>
              <span className='drop'>{openDropdown === 'reports' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'reports' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'customer-report' ? 'active' : ''} onClick={() => { handleTabChange('customer-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Customer Report</li>
                <li className={activeTab === 'supplier-report' ? 'active' : ''} onClick={() => { handleTabChange('supplier-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Supplier Report</li>
                <li className={activeTab === 'employee-report' ? 'active' : ''} onClick={() => { handleTabChange('employee-report'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Employee Report</li>
              </ul>
            )}

            {/* PARENT MODULE: System Users */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('systemUsers')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'systemUsers' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faUser} /></span> System Users</span>
              <span className='drop'>{openDropdown === 'systemUsers' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'systemUsers' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'users' ? 'active' : ''} onClick={() => { handleTabChange('users'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Manage Users</li>
                <li className={activeTab === 'roles' ? 'active' : ''} onClick={() => { handleTabChange('roles'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Manage Roles</li>
              </ul>
            )}

            {/* PARENT MODULE: Settings */}
            <li
              className="parent-menu-item"
              onClick={() => toggleDropdown('settings')}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '15px 20px', backgroundColor: openDropdown === 'settings' ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <span><span className="nav-icon"><FontAwesomeIcon icon={faGear} /></span> Settings</span>
              <span className='drop'>{openDropdown === 'settings' ? '<' : '>'}</span>
            </li>
            {openDropdown === 'settings' && (
              <ul className="submenu" style={{ paddingLeft: '40px', listStyleType: 'none', margin: 0 }}>
                <li className={activeTab === 'designations' ? 'active' : ''} onClick={() => { handleTabChange('designations'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Designations</li>
                <li className={activeTab === 'print-settings' ? 'active' : ''} onClick={() => { handleTabChange('print-settings'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Sale Invoice</li>
                <li className={activeTab === 'client-details' ? 'active' : ''} onClick={() => { handleTabChange('client-details'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Client Details</li>
                <li className={activeTab === 'customer-types' ? 'active' : ''} onClick={() => { handleTabChange('customer-types'); if (isMobile) setIsSidebarOpen(false); }} style={{ cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>Customer Types</li>
              </ul>
            )}
          </ul>
        </div>
      </aside>

      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

        {/* Sticky Top Header */}
        <header className="top-header sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger-btn" onClick={toggleSidebar}>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <span className="page-icon">{getPageIcon()}</span>
            <h1 style={{ fontFamily: 'ui-rounded', letterSpacing: '0%' }}>{getPageTitle()}</h1>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }} ref={profileRef}>

            {/* Live Date & Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '500', color: '#475569' }}>
              <span>{formattedDate}</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span>{formattedTime}</span>
            </div>

            {/* Non-clickable Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginRight: '10px' }}>
              {/* Notification Bell Icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#1b2f4a" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#94a3b8" />
                </svg>
              </div>
            </div>

            {/* Profile Dropdown */}
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
          {activeTab === 'overview' && (
            <>
              <div className="cards-grid">
                <div className="stat-card">
                  <h3>Total Users</h3>
                  <p>1</p>
                </div>
                <div className="stat-card">
                  <h3>Status</h3>
                  <p> Online</p>
                </div>
                <div className="stat-card">
                  <h3>New Messages</h3>
                  <p>0</p>
                </div>
              </div>
              <div className="panel">
                <h2>Recent Activity</h2>
                <p>No recent activity to display.</p>
              </div>
              <div className="panel">
                <h2>Quick Actions</h2>
                <p>Manage your system from here.</p>
              </div>
            </>
          )}

          {/* Render Modules */}
          {activeTab === 'uom' && <UOM />}
          {activeTab === 'category' && <Category />}
          {activeTab === 'product' && <Product />}
          {activeTab === 'deleted-products' && <DeletedProducts />}
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
          {activeTab === 'customer-report' && <CustomerReport />}
          {activeTab === 'supplier-report' && <SupplierReport />}
          {activeTab === 'product-report' && <ProductReport />}
          {activeTab === 'employee-report' && <EmployeeReport />}
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
        </div>{activeTab === 'add-purchase-rebate' && <AddPurchaseRebate />}
        {activeTab === 'purchase-rebate-list' && <PurchaseRebateList />}
        {activeTab === 'rate-difference' && <PurchaseRateDifference />}
        {activeTab === 'rate-difference-list' && <PurchaseRateDifferenceList />}

      </main>

      {/* Hidden File Input For Direct Uploading */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleProfileImageUpload}
        style={{ display: 'none' }}
      />

      {/* ===================== VIEW PROFILE MODAL ===================== */}
      {isViewProfileOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsViewProfileOpen(false)}>
          <div style={{ ...styles.modalContentWide, display: 'flex', gap: '20px', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }} onClick={(e) => e.stopPropagation()}>

            {/* Left Card: Background, Avatar & Info */}
            <div style={{ flex: '0 0 320px', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              {/* Dark Blue Header */}
              <div style={{ height: '140px', backgroundColor: '#1b2f4a' }}></div>

              {/* Avatar Container */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: '-70px' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', backgroundColor: '#fff', border: '5px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#1b2f4a', fontWeight: 'bold' }}>
                  {userInfo.pic ? (
                    <img src={getImageUrl(userInfo.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userInfo.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Camera Icon to change picture directly */}
                <button onClick={triggerFileInput} title="Change Profile Picture" disabled={isUploading} style={{ position: 'absolute', bottom: '5px', right: '95px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1b2f4a', color: '#fff', border: '3px solid #fff', cursor: isUploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
              </div>

              {/* Name & Role */}
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <h2 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '24px' }}>{userInfo.name}</h2>
                <span style={{ backgroundColor: '#f1f5f9', color: '#1b2f4a', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
                  <span style={{ color: '#10b981', marginRight: '6px' }}>●</span>
                  {userInfo.role.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Right Card: Details */}
            <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '12px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>

              <div style={{ backgroundColor: '#1b2f4a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Your Profile
                </h2>
                <button onClick={() => setIsViewProfileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              {/* Grid Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px' }}>

                {/* Item 1: Name */}
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div>
                    <div style={styles.detailTitle}>NAME</div>
                    <div style={styles.detailValueBold}>{userInfo.name}</div>
                  </div>
                </div>

                {/* Item 2: Email */}
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <div>
                    <div style={styles.detailTitle}>EMAIL</div>
                    <div style={styles.detailValueBold}>{userInfo.email}</div>
                  </div>
                </div>

                {/* Item 3: Contact Number */}
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  <div>
                    <div style={styles.detailTitle}>CONTACT NUMBER</div>
                    <div style={styles.detailValueBold}>{userInfo.contact}</div>
                  </div>
                </div>

                {/* Item 4: CNIC */}
                <div style={styles.detailGridItem}>
                  <div style={styles.detailIconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <div style={styles.detailTitle}>CNIC</div>
                    <div style={styles.detailValueBold}>{userInfo.cnic}</div>
                  </div>
                </div>

                {/* Item 5: Area */}
                <div style={{ ...styles.detailGridItem, borderBottom: 'none' }}>
                  <div style={styles.detailIconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div>
                    <div style={styles.detailTitle}>AREA</div>
                    <div style={styles.detailValueBold}>{userInfo.address}</div>
                  </div>
                </div>

                {/* Item 6: Role */}
                <div style={{ ...styles.detailGridItem, borderBottom: 'none' }}>
                  <div style={styles.detailIconWrapper}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  </div>
                  <div>
                    <div style={styles.detailTitle}>ROLE</div>
                    <div style={styles.detailValueBold}>{userInfo.role}</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== EDIT PROFILE MODAL ===================== */}
      {isEditProfileOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsEditProfileOpen(false)}>
          <div style={{ ...styles.modalContentWide, padding: 0 }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ backgroundColor: '#1b2f4a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Edit Profile
              </h2>
              <button onClick={() => setIsEditProfileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Form Body */}
            <div style={{ padding: '30px' }}>

              {/* ===== Profile Picture ===== */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '110px', height: '110px', borderRadius: '50%',
                    backgroundColor: '#f1f5f9', border: '3px solid #e2e8f0',
                    overflow: 'hidden', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '38px', color: '#1b2f4a', fontWeight: 'bold'
                  }}>
                    {editForm.pic ? (
                      <img src={getImageUrl(editForm.pic)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (editForm.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>

                  <button
                    onClick={triggerFileInput}
                    title="Change Profile Picture"
                    disabled={isUploading}
                    style={{
                      position: 'absolute', bottom: '0', right: '0',
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: '#1b2f4a', color: '#fff', border: '3px solid #fff',
                      cursor: isUploading ? 'wait' : 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 0
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                </div>
              </div>
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: '10px', marginBottom: '24px', minHeight: '16px' }}>
                {isUploading ? 'Uploading...' : ' '}
              </p>
              {/* ===== End Profile Picture ===== */}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Full Name */}
                <div>
                  <label style={styles.inputLabelWide}>Full Name</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={styles.inputFieldWide}
                    />
                  </div>
                </div>

                {/* Contact Number */}
                <div>
                  <label style={styles.inputLabelWide}>Contact Number</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </span>
                    <input
                      type="text"
                      value={editForm.contact}
                      onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                      style={styles.inputFieldWide}
                    />
                  </div>
                </div>

                {/* CNIC — read-only, per your existing convention */}
                <div>
                  <label style={styles.inputLabelWide}>CNIC</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </span>
                    <input
                      type="text"
                      value={editForm.cnic}
                      onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                      style={styles.inputFieldWide}
                    />
                  </div>
                </div>

                {/* Area */}
                <div>
                  <label style={styles.inputLabelWide}>Area</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIconPrefix}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </span>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Enter your area"
                      style={styles.inputFieldWide}
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button style={{ padding: '12px 24px', backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }} onClick={() => setIsEditProfileOpen(false)}>Cancel</button>
                <button
                  style={{ padding: '12px 24px', backgroundColor: '#1b2f4a', border: 'none', color: '#fff', borderRadius: '8px', cursor: isSaving ? 'wait' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1 }}
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  {isSaving ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Reset Password</h2>
              <button style={styles.closeBtn} onClick={() => setIsResetPasswordOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <div>
                <label style={styles.inputLabel}>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  style={styles.inputField}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label style={styles.inputLabel}>New Password</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  style={styles.inputField}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label style={styles.inputLabel}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  style={styles.inputField}
                  placeholder="Confirm new password"
                />
              </div>
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
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
  },
  modalContent: {
    backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px',
    width: '400px', maxWidth: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    animation: 'modalSlideIn 0.3s ease-out'
  },
  modalContentWide: {
    backgroundColor: '#ffffff', borderRadius: '12px',
    width: '800px', maxWidth: '95%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    animation: 'modalSlideIn 0.3s ease-out'
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #e2e8f0', paddingBottom: '16px'
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' },

  // Custom Styles for Profile Layout
  detailGridItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    borderBottom: '1px solid #f1f5f9', paddingBottom: '16px'
  },
  detailIconWrapper: {
    width: '40px', height: '40px', borderRadius: '8px',
    backgroundColor: '#f1f5f9', color: '#1b2f4a',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  detailTitle: { textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.5px', marginBottom: '4px' },
  detailValueBold: { fontSize: '15px', fontWeight: '700', color: '#0f172a' },

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