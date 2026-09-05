import { useState, useEffect, useRef } from 'react';
import AddCustomerModal from '../AddCustomerModal';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping, faCirclePause, faCreditCard, faPrint, faTrash, faClipboardList, faFileLines, faCashRegister } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const getImageUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function AvatarImage({ pic, name, size }) {
  const [failed, setFailed] = useState(false);
  const url = getImageUrl(pic);
  const showImage = url && !failed;

  if (showImage) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '2px solid var(--primary)', flexShrink: 0
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--primary-light)',
      color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.35}px`, fontWeight: 600, flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  );
}

// ============== MESSAGE POPUP COMPONENT ==============
function MessagePopup({ message, onClose }) {
  if (!message.text) return null;
  const isError = message.type === 'error';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: '320px', maxWidth: '90%', padding: 'var(--space-md)',
          borderLeft: `4px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--space-md)', boxShadow: 'var(--shadow-modal)', animation: 'popIn 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>{isError ? '⚠️' : '✅'}</span>
          <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            <strong style={{ color: isError ? 'var(--danger)' : 'var(--success)' }}>
              {isError ? 'Error! ' : 'Success! '}
            </strong>
            {message.text}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
      </div>
    </div>
  );
}

// ============== TOAST COMPONENT ==============
function ToastPopup({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: '320px', maxWidth: '90%', padding: 'var(--space-md)',
          borderLeft: `4px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--space-md)', boxShadow: 'var(--shadow-modal)', animation: 'popIn 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>{isError ? '⚠️' : '✅'}</span>
          <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            <strong style={{ color: isError ? 'var(--danger)' : 'var(--success)' }}>
              {isError ? 'Error! ' : 'Success! '}
            </strong>
            {toast.message}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
      </div>
    </div>
  );
}

const getPaperConfig = (paperSize) => {
  switch (paperSize) {
    case 'Thermal58':
      return { maxWidth: '320px', bodyPadding: '20px', fontSize: '12px', mono: true, narrow: true };
    case 'A5':
      return { maxWidth: '500px', bodyPadding: '30px', fontSize: '13px', mono: false, narrow: false };
    case 'A4':
    default:
      return { maxWidth: '800px', bodyPadding: '40px', fontSize: '14px', mono: false, narrow: false };
  }
};

function POS({ onExit, initialOpenRegister = false }) {
  const { settings: printSettings } = usePrintSettings();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [labourList, setLabourList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newcode, setNewcode] = useState('');

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [entryQty, setEntryQty] = useState(1);
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDiscount, setEntryDiscount] = useState(0);

  const [customerId, setCustomerId] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [labourId, setLabourId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');

  const [freightAmount, setFreightAmount] = useState('');
  const [freightPaidBy, setFreightPaidBy] = useState('Customer');
  const [labourCharges, setLabourCharges] = useState('');
  const [labourPaidBy, setLabourPaidBy] = useState('Customer');
  const [discountValue, setDiscountValue] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const [cart, setCart] = useState([]);

  const [discountType, setDiscountType] = useState('percent');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [showReceipt, setShowReceipt] = useState(null);
  const [showHistoryReceipt, setShowHistoryReceipt] = useState(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceSearchLoading, setInvoiceSearchLoading] = useState(false);
  const [allInvoices, setAllInvoices] = useState([]);
  const [showInvoiceSuggestions, setShowInvoiceSuggestions] = useState(false);
  const [invoiceFocusedIndex, setInvoiceFocusedIndex] = useState(-1);
  const invoiceSearchRef = useRef(null);

  const [holdList, setHoldList] = useState([]);
  const [holdListLoading, setHoldListLoading] = useState(false);
  const [isHoldListModalOpen, setIsHoldListModalOpen] = useState(false);

  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [productMessage, setProductMessage] = useState({ text: '', type: '' });
  const [uploadingProductPic, setUploadingProductPic] = useState(false);
  const productInitialState = {
    name: '', categoryId: '', uomId: '', costPrice: '', retailPrice: '',
    quantity: '', expiryDate: '', reorderQuantity: '', pic: '', status: 'active'
  };
  const [newProduct, setNewProduct] = useState(productInitialState);

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isAddUomModalOpen, setIsAddUomModalOpen] = useState(false);
  const [newname, setNewname] = useState('');

  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [customerMessage, setCustomerMessage] = useState({ text: '', type: '' });
  const [uploadingCustomerPic, setUploadingCustomerPic] = useState(false);
  const customerInitialState = { name: '', email: '', contact: '', address: '', pic: '', cnic: '', status: 'Active' };
  const [newCustomer, setNewCustomer] = useState(customerInitialState);

  const searchRef = useRef(null);
  const qtyInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const [isRegisterOpen, setIsRegisterOpen] = useState(true);
  const [registerData, setRegisterData] = useState(null);
  const [openingCash, setOpeningCash] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPage, setShowRegisterPage] = useState(initialOpenRegister);

  function showProductMessage(text, type) {
    setProductMessage({ text, type });
    setTimeout(() => setProductMessage({ text: '', type: '' }), 6000);
  }

  function clearProductMessage() {
    setProductMessage({ text: '', type: '' });
  }

  function showCustomerMessage(text, type) {
    setCustomerMessage({ text, type });
    setTimeout(() => setCustomerMessage({ text: '', type: '' }), 6000);
  }

  function clearCustomerMessage() {
    setCustomerMessage({ text: '', type: '' });
  }

  function showToast(text, type) {
    setToast({ message: text, type });
    setTimeout(() => setToast(null), 6000);
  }

  function clearToast() {
    setToast(null);
  }

  useEffect(() => {
    fetchAllData();
    checkRegisterStatus();
  }, []);

  useEffect(() => {
    if (initialOpenRegister) {
      handleShowRegisterDetails();
    }
  }, [initialOpenRegister]);

  const fetchHoldList = async () => {
    setHoldListLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales/hold`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHoldList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching hold list:', err);
    } finally {
      setHoldListLoading(false);
    }
  };

  const checkRegisterStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cash-register/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        setIsRegisterOpen(false);
        setRegisterData(null);
        setShowRegisterPage(true);
        return;
      }

      const data = await res.json();
      if (data.isOpen) {
        setIsRegisterOpen(true);
        setRegisterData(data.registerDetails);

        if (!initialOpenRegister) {
          setShowRegisterPage(false);
        }
      } else {
        setIsRegisterOpen(false);
        setRegisterData(null);
        setShowRegisterPage(true);
      }
    } catch (err) {
      console.error('Register status check failed', err);
      setIsRegisterOpen(false);
      setRegisterData(null);
      setShowRegisterPage(true);
    }
  };

  const handleShowRegisterDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cash-register/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isOpen) {
          setRegisterData(data.registerDetails);
          setIsRegisterOpen(true);
          setShowRegisterPage(true);
        } else {
          setIsRegisterOpen(false);
          setShowRegisterPage(true);
          showToast('Register is closed. Please open it first.', 'error');
        }
      } else {
        setShowRegisterPage(true);
        showToast('Could not fetch register status.', 'error');
      }
    } catch (err) {
      console.error('Error fetching register details:', err);
      setShowRegisterPage(true);
      showToast('Error connecting to server.', 'error');
    }
  };

  const handleOpenRegister = async () => {
    if (!openingCash || openingCash < 0) {
      showToast('Please enter a valid opening amount.', 'error');
      return;
    }
    setRegisterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cash-register/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ openingAmount: Number(openingCash) })
      });
      const data = await res.json();
      if (data.success) {
        setIsRegisterOpen(true);
        setRegisterData(data.registerDetails);
        setShowRegisterPage(false);
        showToast('Register opened successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to open register.', 'error');
      }
    } catch (err) {
      console.error('Error opening register:', err);
      showToast('Error opening register', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCloseRegister = async () => {
    const registerId = registerData?._id || registerData?.id;

    if (!registerId) {
      showToast('No register data found. Please refresh and try again.', 'error');
      return;
    }

    setRegisterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cash-register/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ registerId: registerId })
      });

      const data = await res.json();

      if (data.success) {
        setIsRegisterOpen(false);
        setRegisterData(null);
        setOpeningCash('');
        setShowRegisterPage(true);
        showToast('Register closed successfully!', 'success');
      } else {
        showToast(data.message || 'Failed to close register.', 'error');
      }
    } catch (err) {
      console.error('Error closing register:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    await Promise.all([
      fetchProducts(headers),
      fetchCustomers(headers),
      fetchCategories(headers),
      fetchUoms(headers),
      fetchTransporters(headers),
      fetchLabour(headers),
      fetchEmployees(headers)
    ]);
  };

  const fetchProducts = async (headers) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { headers });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : (data.data || data.products || []));
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  const fetchCustomers = async (headers) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`, { headers });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  const fetchCategories = async (headers) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, { headers });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  const fetchUoms = async (headers) => {
    try {
      let res = await fetch(`${API_BASE_URL}/api/uoms`, { headers });
      let data = [];
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/uom`, { headers });
        if (!res.ok) {
          setUoms([]);
          return;
        }
        data = await res.json();
      } else {
        data = await res.json();
      }
      setUoms(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching uoms:', err);
      setUoms([]);
    }
  };

  const fetchTransporters = async (headers) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/transporters`, { headers });
      const data = await res.json();
      setTransporters(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching transporters:', err);
      setTransporters([]);
    }
  };

  const fetchLabour = async (headers) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/labour`, { headers });
      const data = await res.json();
      setLabourList(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching labour:', err);
      setLabourList([]);
    }
  };

  const fetchEmployees = async (headers) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees`, { headers });
      const data = await res.json();
      const allEmployees = Array.isArray(data) ? data : (data.data || data.employees || []);
      setEmployees(allEmployees.filter(e => e.employeeType === 'Salesman' && e.status === 'Active'));
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) {
      showToast('The cart is empty. Please add at least one product to hold the sale.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: customerId || null,
          transporterId: transporterId || null,
          labourId: labourId || null,
          salesmanId: salesmanId || null,
          freightAmount: Number(freightAmount) || 0,
          freightPaidBy: freightPaidBy,
          labourCharges: Number(labourCharges) || 0,
          labourPaidBy: labourPaidBy,
          saleDate,
          items: cart.map(c => ({
            product: c.productId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            discount: Number(c.discount) || 0
          })),
          discount: discountAmount,
          discountType,
          discountValue: Number(discountValue) || 0,
          paidAmount: Number(paidAmount) || 0,
          notes
        })
      });
      const data = await res.json();

      if (data.success) {
        resetSale();
        fetchHoldList();
        showToast(`Sale has been held successfully (${data.sale.saleNumber})`, 'success');
      } else {
        showToast(data.message || 'Error holding the sale', 'error');
      }
    } catch (err) {
      showToast('Server error while holding the sale.', 'error');
    }
  };

  const handleResumeHold = async (holdMongoId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales/${holdMongoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!data.success) {
        showToast(data.message || 'Error resuming held sale', 'error');
        return;
      }

      const { sale, items } = data;

      setCart((items || []).map(it => ({
        productId: it.product?._id,
        name: it.product?.name,
        unitPrice: it.unitPrice,
        availableQty: it.product?.quantity ?? 0,
        quantity: it.quantity,
        discount: it.discount || 0
      })));
      setCustomerId(sale.customer?._id || sale.customer || '');
      setTransporterId(sale.transporter?._id || sale.transporter || '');
      setLabourId(sale.labour?._id || sale.labour || '');
      setSalesmanId(sale.salesman?._id || sale.salesman || '');

      setFreightAmount(sale.freightAmount || '');
      setFreightPaidBy(sale.freightPaidBy || 'Customer');
      setLabourCharges(sale.labourCharges || '');
      setLabourPaidBy(sale.labourPaidBy || 'Customer');

      setSaleDate(sale.saleDate ? new Date(sale.saleDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotes(sale.notes || '');
      setDiscountType(sale.discountType || 'percent');
      setDiscountValue(sale.discountValue || '');
      setPaidAmount(sale.paidAmount || '');

      const deleteRes = await fetch(`${API_BASE_URL}/api/sales/${holdMongoId}/hold`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await deleteRes.json();

      setHoldList(prev => prev.filter(h => h._id !== holdMongoId));
      setIsHoldListModalOpen(false);
      showToast(`Held sale (${sale.saleNumber}) has been resumed.`, 'success');
    } catch (err) {
      showToast('Server error while resuming the held sale.', 'error');
    }
  };

  const handleDeleteHold = async (holdMongoId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales/${holdMongoId}/hold`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHoldList(prev => prev.filter(h => h._id !== holdMongoId));
        showToast('Held sale deleted successfully', 'success');
      } else {
        showToast(data.message || 'Error deleting held sale', 'error');
      }
    } catch (err) {
      showToast('Server error while deleting the held sale.', 'error');
    }
  };

  const subtotal = cart.reduce((sum, c) => sum + (c.quantity * c.unitPrice - (Number(c.discount) || 0)), 0);

  const discountAmount = discountType === 'percent'
    ? (subtotal * (Number(discountValue) || 0)) / 100
    : Math.min(Number(discountValue) || 0, subtotal > 0 ? subtotal : 0);

  const freight = Number(freightAmount) || 0;
  const labour = Number(labourCharges) || 0;

  const customerFreight = freightPaidBy === 'Customer' ? freight : 0;
  const customerLabour = labourPaidBy === 'Customer' ? labour : 0;

  const totalAmount = subtotal - discountAmount + customerFreight + customerLabour;
  const balanceAmount = totalAmount - (Number(paidAmount) || 0);

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one product.', 'error');
      return;
    }
    // 💡 Must select a customer before finalizing sale
    if (!customerId) {
      showToast('Please select a Customer before completing the sale.', 'error');
      return;
    }

    const paid = Number(paidAmount) || 0;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: customerId || null,
          transporterId: transporterId || null,
          labourId: labourId || null,
          salesmanId: salesmanId || null,
          freightAmount: freight,
          freightPaidBy: freightPaidBy,
          labourCharges: labour,
          labourPaidBy: labourPaidBy,
          saleDate,
          items: cart.map(c => ({
            product: c.productId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            discount: Number(c.discount) || 0
          })),
          discount: discountAmount,
          discountType,
          discountValue: Number(discountValue) || 0,
          discountPercent: discountType === 'percent' ? Number(discountValue) || 0 : 0,
          paidAmount: paid,
          notes
        })
      });
      const data = await res.json();

      if (data.success) {
        setShowReceipt({
          ...data.sale,
          items: cart,
          customer: customers.find(c => c._id === customerId),
          transporter: transporters.find(t => t._id === transporterId),
          labour: labourList.find(l => l._id === labourId),
          salesman: employees.find(e => e._id === salesmanId),
          freightAmount: freight,
          freightPaidBy: freightPaidBy,
          labourCharges: labour,
          labourPaidBy: labourPaidBy,
          discountType,
          discountValue: Number(discountValue) || 0,
          discountAmount: discountAmount,
          subtotal: subtotal
        });

        checkRegisterStatus();
      } else {
        showToast(data.message || 'Failed to complete sale.', 'error');
      }
    } catch (err) {
      showToast('Server error while creating sale.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showProductMessage('Category name is required.', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (res.ok) {
        const savedCat = await res.json();
        setCategories([...categories, savedCat]);
        setNewProduct({ ...newProduct, categoryId: savedCat._id });
        setIsAddCategoryModalOpen(false);
        setNewCategoryName('');
        showProductMessage('Category added successfully!', 'success');
      } else {
        showProductMessage('Failed to add category.', 'error');
      }
    } catch (error) {
      showProductMessage('Server error adding category.', 'error');
    }
  };

  const handleAddUom = async () => {
    if (!newname.trim() || !newcode.trim()) {
      showProductMessage('UOM name and code are required.', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/uoms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newname.trim(),
          code: newcode.trim().toUpperCase()
        })
      });

      if (res.ok) {
        const savedUom = await res.json();
        setUoms([...uoms, savedUom]);
        setNewProduct({ ...newProduct, uomId: savedUom._id });
        setIsAddUomModalOpen(false);
        setNewname('');
        setNewcode('');
        showProductMessage('UOM added successfully!', 'success');
      } else {
        const errorData = await res.text();
        showProductMessage(`Failed to add UOM: ${errorData || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showProductMessage('Server error adding UOM.', 'error');
    }
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploadingProductPic(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const raw = await res.text();
      if (!res.ok) return showProductMessage(`Image upload failed.`, 'error');

      const data = JSON.parse(raw);
      if (data.imageUrl) {
        setNewProduct(prev => ({ ...prev, pic: data.imageUrl }));
        showProductMessage('Product image uploaded successfully!', 'success');
      }
    } catch (error) {
      showProductMessage('Upload failed: could not reach the server.', 'error');
    } finally {
      setUploadingProductPic(false);
    }
  };

  const validateProduct = (product) => {
    if (!product.name.trim()) return showProductMessage('Product name is required!', 'error');
    if (!product.categoryId) return showProductMessage('Please select a category!', 'error');
    if (!product.uomId) return showProductMessage('Please select a UOM!', 'error');
    return true;
  };

  const handleAddProduct = async () => {
    const productToSave = {
      ...newProduct,
      costPrice: parseFloat(newProduct.costPrice) || 0,
      retailPrice: parseFloat(newProduct.retailPrice) || 0,
      quantity: parseInt(newProduct.quantity) || 0,
      reorderQuantity: parseInt(newProduct.reorderQuantity) || 0,
      status: 'active'
    };

    if (!validateProduct(productToSave)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productToSave)
      });

      if (res.ok) {
        const savedProduct = await res.json();
        showProductMessage('Product added successfully!', 'success');
        setNewProduct(productInitialState);
        setIsAddProductModalOpen(false);
        await fetchProducts();
        setSelectedProductId(savedProduct._id);
        setEntryPrice(savedProduct.retailPrice || '');
        setEntryQty(1);
        setEntryDiscount(0);
        showToast(`Product "${savedProduct.name}" added and selected.`, 'success');
      } else {
        const errorData = await res.json();
        showProductMessage(errorData.message || 'Error saving product.', 'error');
      }
    } catch (error) {
      showProductMessage('Server error while saving product.', 'error');
    }
  };

  const handleOpenInvoiceSearch = async () => {
    setIsInvoiceModalOpen(true);
    setInvoiceSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAllInvoices(Array.isArray(data) ? data : (data.sales || []));
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setInvoiceSearchLoading(false);
    }
  };

  const handleSearchInvoice = async (selectedInvoice = null) => {
    if (selectedInvoice && selectedInvoice.saleNumber) {
      setInvoiceSearchLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/sales/${selectedInvoice._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const itemsWithDetails = (data.items || []).map(item => ({
            ...item,
            name: item.product?.name || item.name || 'Unknown Product',
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 0,
            discount: item.discount || 0
          }));

          setShowHistoryReceipt({
            ...data.sale,
            items: itemsWithDetails,
            customer: data.sale.customer || selectedInvoice.customer
          });
          setIsInvoiceModalOpen(false);
          setInvoiceSearchTerm('');
          setShowInvoiceSuggestions(false);
          setInvoiceFocusedIndex(-1);
        } else {
          showToast('Failed to load invoice details.', 'error');
        }
      } catch (err) {
        showToast('Server error while loading invoice.', 'error');
      } finally {
        setInvoiceSearchLoading(false);
      }
      return;
    }

    if (!invoiceSearchTerm.trim()) {
      showToast('Please enter an invoice number.', 'error');
      return;
    }

    setInvoiceSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const found = allInvoices.find(s =>
        s.saleNumber && s.saleNumber.toLowerCase() === invoiceSearchTerm.trim().toLowerCase()
      );

      if (found) {
        const res = await fetch(`${API_BASE_URL}/api/sales/${found._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          const itemsWithDetails = (data.items || []).map(item => ({
            ...item,
            name: item.product?.name || item.name || 'Unknown Product',
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 0,
            discount: item.discount || 0
          }));

          setShowHistoryReceipt({
            ...data.sale,
            items: itemsWithDetails,
            customer: data.sale.customer || found.customer
          });
          setIsInvoiceModalOpen(false);
          setInvoiceSearchTerm('');
          setShowInvoiceSuggestions(false);
          setInvoiceFocusedIndex(-1);
        } else {
          showToast('Failed to load invoice details.', 'error');
        }
      } else {
        showToast(`Invoice "${invoiceSearchTerm}" not found.`, 'error');
      }
    } catch (err) {
      showToast('Server error while searching invoice.', 'error');
    } finally {
      setInvoiceSearchLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products.find(p => p._id === selectedProductId);

  const getname = () => {
    if (!selectedProduct) return '—';
    const uomId = selectedProduct.uomId;
    if (!uomId) return '—';
    if (typeof uomId === 'object' && uomId.name) return uomId.name;
    const found = uoms.find(u => u._id === uomId || u.id === uomId);
    return found ? found.name : uomId;
  };

  const handleProductSelect = (prod) => {
    setSelectedProductId(prod._id);
    setSearchTerm('');
    setShowSuggestions(false);
    setFocusedIndex(-1);
    setEntryPrice(prod.retailPrice || '');
    setEntryQty(1);
    setEntryDiscount(0);

    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
      setTimeout(() => {
        const focusedElement = document.querySelector('.suggestion-item-focused');
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
      setTimeout(() => {
        const focusedElement = document.querySelector('.suggestion-item-focused');
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && filteredProducts[focusedIndex]) {
        handleProductSelect(filteredProducts[focusedIndex]);
      } else if (filteredProducts.length === 1) {
        handleProductSelect(filteredProducts[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const handleInvoiceKeyDown = (e) => {
    if (!showInvoiceSuggestions || filteredInvoices.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setInvoiceFocusedIndex(prev => (prev < filteredInvoices.length - 1 ? prev + 1 : prev));
      setTimeout(() => {
        const focusedElement = document.querySelector('.invoice-suggestion-focused');
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setInvoiceFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
      setTimeout(() => {
        const focusedElement = document.querySelector('.invoice-suggestion-focused');
        if (focusedElement) {
          focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (invoiceFocusedIndex >= 0 && filteredInvoices[invoiceFocusedIndex]) {
        handleSearchInvoice(filteredInvoices[invoiceFocusedIndex]);
      } else if (filteredInvoices.length === 1) {
        handleSearchInvoice(filteredInvoices[0]);
      }
    } else if (e.key === 'Escape') {
      setShowInvoiceSuggestions(false);
      setInvoiceFocusedIndex(-1);
    }
  };

  const handleAddToCart = () => {
    // 💡 REMOVED `!customerId` check so items can be added first.

    if (!selectedProductId) {
      showToast('Please select a product.', 'error');
      return;
    }
    const qty = Number(entryQty);
    const price = Number(entryPrice);
    const lineDiscount = Number(entryDiscount) || 0;

    if (!qty || qty <= 0) {
      showToast('Quantity must be greater than zero.', 'error');
      return;
    }
    if (price < 0) {
      showToast('Unit price cannot be negative.', 'error');
      return;
    }

    const existing = cart.find(c => c.productId === selectedProductId);
    const alreadyInCart = existing ? existing.quantity : 0;

    if (alreadyInCart + qty > selectedProduct.quantity) {
      showToast(
        `Only ${selectedProduct.quantity} units of "${selectedProduct.name}" available.`,
        'error'
      );
      return;
    }

    if (existing) {
      setCart(cart.map(c =>
        c.productId === selectedProductId
          ? { ...c, quantity: c.quantity + qty, unitPrice: price, discount: lineDiscount }
          : c
      ));
    } else {
      setCart([...cart, {
        productId: selectedProduct._id,
        name: selectedProduct.name,
        unitPrice: price,
        availableQty: selectedProduct.quantity,
        quantity: qty,
        discount: lineDiscount
      }]);
    }

    setSelectedProductId('');
    setEntryPrice('');
    setEntryQty(1);
    setEntryDiscount('');

    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 0);
  };

  const updateCartQty = (productId, value) => {
    setCart(cart.map(c => {
      if (c.productId !== productId) return c;
      let qty = Number(value);
      if (qty > c.availableQty) {
        showToast(`Only ${c.availableQty} units of "${c.name}" available.`, 'error');
        qty = c.availableQty;
      }
      return { ...c, quantity: qty < 1 ? 1 : qty };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(c => c.productId !== productId));
  };

  const resetSale = () => {
    setCart([]);
    setCustomerId('');
    setTransporterId('');
    setLabourId('');
    setSalesmanId('');
    setFreightAmount('');
    setFreightPaidBy('Customer');
    setLabourCharges('');
    setLabourPaidBy('Customer');
    setDiscountType('percent');
    setDiscountValue('');
    setPaidAmount('');
    setNotes('');
    setSaleDate(new Date().toISOString().slice(0, 10));
    setSelectedProductId('');
    setSearchTerm('');
    setEntryPrice('');
    setEntryQty(1);
    setEntryDiscount(0);
    fetchProducts();
  };

  const filteredInvoices = allInvoices.filter(inv =>
    inv.saleNumber && inv.saleNumber.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
  );

  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('receipt-content');
    if (!contentEl || (!showReceipt && !showHistoryReceipt)) return;

    const activeReceipt = showReceipt || showHistoryReceipt;

    let pageSizeCss;
    if (paperConfig.mono) {
      const itemCount = (activeReceipt.items || []).length;
      const THERMAL_BASE_MM = 75;
      const THERMAL_ITEM_MM = 9;
      const heightMm = THERMAL_BASE_MM + itemCount * THERMAL_ITEM_MM;
      pageSizeCss = `@page { size: 58mm ${heightMm}mm; margin: 4mm; }`;
    } else if ((printSettings?.paperSize || 'A4') === 'A5') {
      pageSizeCss = `@page { size: 148mm 210mm; margin: 12mm; }`;
    } else {
      pageSizeCss = `@page { size: 210mm 297mm; margin: 20mm; }`;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = paperConfig.mono ? '58mm' : '210mm';
    iframe.style.height = '10px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            ${pageSizeCss}
            html, body { margin: 0; padding: 0; }
            body {
              padding: ${paperConfig.bodyPadding};
              font-family: ${paperConfig.mono ? "'Courier New', monospace" : 'Arial, sans-serif'};
              font-size: ${paperConfig.fontSize};
              color: #000;
              ${paperConfig.mono ? 'width: 58mm;' : ''}
            }
          </style>
        </head>
        <body>${contentEl.innerHTML}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 300);
  };

  const handleCloseReceipt = () => {
    if (showHistoryReceipt) {
      setShowHistoryReceipt(null);
    } else {
      setShowReceipt(null);
      resetSale();
    }
  };

  // ==================== RENDERING RECEIPT MODAL (AS FUNCTION) ====================
  const renderReceipt = (sale) => {
    if (!sale) return null;
    const paperConfig = getPaperConfig(printSettings?.paperSize);

    const itemsTotal = sale.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice - (Number(item.discount) || 0)), 0);
    const fAmt = Number(sale.freightAmount) || 0;
    const lAmt = Number(sale.labourCharges) || 0;
    const dAmt = Number(sale.discountAmount || sale.discount) || 0;

    const finalTotal = Number(sale.totalAmount) || 0;
    const finalPaid = Number(sale.paidAmount) || 0;
    const balance = finalTotal - finalPaid;

    const getItemName = (item) => {
      if (item.name) return item.name;
      if (item.product?.name) return item.product.name;
      return 'Unknown Product';
    };

    const getItemQty = (item) => item.quantity || 0;
    const getUnitPrice = (item) => item.unitPrice || 0;
    const getDiscount = (item) => item.discount || 0;
    const getLineTotal = (item) => (getItemQty(item) * getUnitPrice(item)) - getDiscount(item);

    return (
      <div className="modal-overlay" onClick={handleCloseReceipt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
        <div className="card" style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: '#fff' }}>
            <h3 style={{ margin: 0, color: '#000', fontSize: '20px', fontWeight: 'bold' }}>Stockify</h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={handlePrint}
              >
                🖨️ Print
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCloseReceipt}
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: '24px' }}>
            <div id="receipt-content" style={{
              margin: '0 auto', background: '#fff', padding: paperConfig.bodyPadding,
              maxWidth: paperConfig.maxWidth, fontSize: paperConfig.fontSize,
              fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minHeight: '400px'
            }}>
              <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <h4 style={{ margin: '4px 0', textAlign: 'center', fontSize: '16px' }}>Sales Invoice</h4>

                <p style={{ margin: '4px 0', color: '#333' }}>Invoice: <strong>{sale.saleNumber}</strong></p>
                <p style={{ margin: '4px 0', color: '#333' }}>Date: <strong>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</strong></p>
                <p style={{ margin: '4px 0', color: '#333' }}>
                  Customer: <strong>{sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</strong>
                </p>

                {sale.salesman && (
                  <p style={{ margin: '4px 0', color: '#333' }}>
                    Salesman: <strong>{sale.salesman.name}</strong>
                  </p>
                )}

                {sale.transporter && (
                  <p style={{ margin: '4px 0', color: '#333' }}>
                    Transporter: <strong>{sale.transporter?.name || 'Included'}</strong>
                  </p>
                )}
                {sale.labour && (
                  <p style={{ margin: '4px 0', color: '#333' }}>
                    Labour: <strong>{sale.labour?.name || 'Included'}</strong>
                  </p>
                )}

                {sale.status === 'Cancelled' && (
                  <p style={{ margin: '4px 0', color: 'var(--danger)', fontWeight: 'bold', textAlign: 'center' }}>[ CANCELLED ]</p>
                )}
              </div>
              <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

              {paperConfig.mono ? (
                <div>
                  {(sale.items || []).map((item, idx) => {
                    const lineTotal = getLineTotal(item);
                    const itemName = getItemName(item);
                    const qty = getItemQty(item);
                    const price = getUnitPrice(item);
                    const disc = getDiscount(item);
                    return (
                      <div key={idx} style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' }}>
                          <span>{itemName}</span>
                          <span>x{qty}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }}>
                          <span>
                            @{price.toFixed(2)}
                            {disc > 0 ? ` −${disc.toFixed(2)}` : ''}
                          </span>
                          <span style={{ fontWeight: 700 }}>{lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: '#e2e8f0', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 600, color: '#000', textTransform: 'uppercase', width: '32%' }}>Product</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: '#e2e8f0', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 600, color: '#000', textTransform: 'uppercase', width: '14%' }}>Qty</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: '#e2e8f0', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 600, color: '#000', textTransform: 'uppercase', width: '18%' }}>Price</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: '#e2e8f0', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 600, color: '#000', textTransform: 'uppercase', width: '16%' }}>Disc</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: '#e2e8f0', borderBottom: '1px solid #000', fontSize: '12px', fontWeight: 600, color: '#000', textTransform: 'uppercase', width: '20%' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((item, idx) => {
                      const price = getUnitPrice(item);
                      const qty = getItemQty(item);
                      const disc = getDiscount(item);
                      const lineTotal = item.lineTotal !== undefined ? item.lineTotal : (qty * price - disc);
                      const itemName = getItemName(item);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                          <td style={{ padding: '6px 8px', textAlign: 'left', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemName}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'left', fontSize: '13px', color: '#000', textAlign: 'left' }}>{qty}</td>
                          <td style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'left', color: '#000' }}>{price.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'left', fontSize: '13px', color: '#000' }}>{disc > 0 ? disc.toFixed(2) : '0.00'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'left', fontSize: '13px', color: '#000', fontWeight: 600 }}>{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                  <span>Items Total</span>
                  <span>Rs. {itemsTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                  <span>Discount {sale.discountType === 'cash' ? '(Fixed)' : sale.discountValue ? `(${sale.discountValue}%)` : ''}</span>
                  <span>Rs. {dAmt.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                  <span>Freight Amount</span>
                  <span>Rs. {fAmt.toFixed(2)} {sale.freightPaidBy === 'Company' ? '(Company Paid)' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                  <span>Labour Charges</span>
                  <span>Rs. {lAmt.toFixed(2)} {sale.labourPaidBy === 'Company' ? '(Company Paid)' : ''}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.15em', color: '#000', fontWeight: 700, borderTop: '2px solid #000', paddingTop: '10px' }}>
                  <span>Grand Total</span>
                  <span>Rs. {finalTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                  <span>Paid</span>
                  <span>Rs. {finalPaid.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000', fontWeight: 700 }}>
                  <span>Balance Due</span>
                  <span>Rs. {balance.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ borderTop: '2px dashed #000', margin: '16px 0' }}></div>
              <div style={{ textAlign: 'center', color: '#555', fontSize: '13px' }}>
                <p>System Generated Receipt</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDERING HOLD LIST MODAL (AS FUNCTION) ====================
  const renderHoldListModal = () => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={() => setIsHoldListModalOpen(false)}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '850px', maxWidth: '95%', height: '550px', display: 'flex', flexDirection: 'column', padding: 0, margin: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Hold List</h3>
          <button onClick={() => setIsHoldListModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          {holdListLoading ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>
          ) : holdList.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-light)' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>📋</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>No held sales available.</div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-surface)' }}>
                  <tr>
                    <th style={{ ...tableStyles.th, width: '18%' }}>Hold #</th>
                    <th style={{ ...tableStyles.th, width: '25%' }}>Customer</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center', width: '12%' }}>Items</th>
                    <th style={{ ...tableStyles.th, textAlign: 'right', width: '18%' }}>Total</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center', width: '12%' }}>Status</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center', width: '15%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holdList.map(h => (
                    <tr key={h._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.saleNumber}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.customer?.name || h.customer?.customerName || 'Walk-in Customer'}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>{h.itemsCount ?? '—'}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'right', fontWeight: 600 }}>
                        Rs. {Number(h.totalAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                          borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', textTransform: 'uppercase'
                        }}>
                          Hold
                        </span>
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleResumeHold(h._id)}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            title="Resume Sale"
                          >
                            ▶
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteHold(h._id)}
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            title="Delete Held Sale"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

 // ==================== MAIN RENDER ====================
  if (showRegisterPage) {
    return (
      <div style={{
        width: '78vw', height: '87vh', background: 'var(--bg-app)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px',
        boxSizing: 'border-box'
      }}>
        <ToastPopup toast={toast} onClose={clearToast} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: 0, overflow: 'hidden' }}>

            <div style={{
              padding: '14px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: '14px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: isRegisterOpen ? 'var(--success-bg)' : 'var(--danger-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
              }}>
                {isRegisterOpen ? '✅' : '🔒'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {isRegisterOpen ? 'Register is Open' : 'Register is Closed'}
                </h3>
                
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {isRegisterOpen && registerData ? (
                <div>
                  <div style={{ margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-main)' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Opening Amount:</span> <strong>Rs. {registerData.openingAmount || 0}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sales Amount :</span> <strong style={{ color: 'var(--success)' }}>+ Rs. {registerData.salesAmount || 0}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Purchase Returns :</span> <strong style={{ color: 'var(--success)' }}>+ Rs. {registerData.purchaseReturnAmount || 0}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sales Returns :</span> <strong style={{ color: 'var(--danger)' }}>- Rs. {registerData.totalReturn || 0}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Purchases & Payments:</span> <strong style={{ color: 'var(--danger)' }}>- Rs. {registerData.purchaseAmount || 0}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Expenses Paid:</span> <strong style={{ color: 'var(--danger)' }}>- Rs. {registerData.expenseAmount || 0}</strong>
                    </div>

                    <hr style={{ borderTop: '1px dashed var(--border-color)', margin: '6px 0' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                      <span>Expected Closing Cash:</span>
                      <strong>
                        Rs. {
                          ((registerData.openingAmount || 0) + (registerData.salesAmount || 0) + (registerData.purchaseReturnAmount || 0))
                          - (registerData.totalReturn || 0)
                          - (registerData.purchaseAmount || 0)
                          - (registerData.expenseAmount || 0)
                        }
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowRegisterPage(false)}
                      style={{ flex: 1, padding: '12px' }}
                    >
                      🏪 Go to POS
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleCloseRegister}
                      disabled={registerLoading}
                      style={{ flex: 1, padding: '12px' }}
                    >
                      {registerLoading ? '⏳ Closing...' : '🔒 Close Register'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">Opening Amount</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', fontWeight: 600, color: 'var(--text-light)' }}>Rs.</span>
                      <input
                        type="number"
                        className="form-input"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value)}
                        placeholder="Enter amount"
                        style={{ paddingLeft: '44px' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleOpenRegister(); }}
                      />
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleOpenRegister}
                    disabled={registerLoading}
                    style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                  >
                    {registerLoading ? '⏳ Opening...' : '💰 Open Register'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-app)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <ToastPopup toast={toast} onClose={clearToast} />

      {(showReceipt || showHistoryReceipt) && renderReceipt(showReceipt || showHistoryReceipt)}

      {isHoldListModalOpen && renderHoldListModal()}

      {isInvoiceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📄 Search Invoice</h3>
              <button className="modal-close" onClick={() => setIsInvoiceModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-body" style={{ position: 'relative' }} ref={invoiceSearchRef}>
              <input
                className="form-input"
                placeholder="Enter Invoice # (e.g. SL-1)"
                value={invoiceSearchTerm}
                onChange={(e) => {
                  setInvoiceSearchTerm(e.target.value);
                  setShowInvoiceSuggestions(true);
                  setInvoiceFocusedIndex(-1);
                }}
                onFocus={() => setShowInvoiceSuggestions(true)}
                onKeyDown={handleInvoiceKeyDown}
              />

              {showInvoiceSuggestions && invoiceSearchTerm && (
                <ul style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 'var(--space-lg)', right: 'var(--space-lg)',
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  maxHeight: '200px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none',
                  zIndex: 1000001, boxShadow: 'var(--shadow-md)', textAlign: 'left'
                }}>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv, index) => (
                      <li
                        key={inv._id}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                          backgroundColor: index === invoiceFocusedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        className={index === invoiceFocusedIndex ? 'invoice-suggestion-focused' : ''}
                        onClick={() => handleSearchInvoice(inv)}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.saleNumber}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                          <div>{new Date(inv.saleDate || inv.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontWeight: 500 }}>Rs. {inv.totalAmount?.toFixed(2)}</div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>No invoices found</li>
                  )}
                </ul>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => handleSearchInvoice()} disabled={invoiceSearchLoading}>
                {invoiceSearchLoading ? 'Searching...' : 'Search & Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddProductModalOpen(false)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Product</h3>
              <button className="modal-close" onClick={() => setIsAddProductModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <MessagePopup message={productMessage} onClose={clearProductMessage} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Category </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-input"
                      value={newProduct.categoryId}
                      onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => setIsAddCategoryModalOpen(true)} style={{ padding: '0 12px' }}>+</button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">UOM </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-input"
                      value={newProduct.uomId}
                      onChange={(e) => setNewProduct({ ...newProduct, uomId: e.target.value })}
                    >
                      <option value="">Select UOM</option>
                      {uoms.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => setIsAddUomModalOpen(true)} style={{ padding: '0 12px' }}>+</button>
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label required">Product Name </label>
                  <input
                    className="form-input"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Cost Price</label>
                  <input
                    type="number" min="0" placeholder="0" className="form-input"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Retail Price</label>
                  <input
                    type="number" min="0" placeholder="0" className="form-input"
                    value={newProduct.retailPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Opening Stock (Qty)</label>
                  <input
                    type="number" min="0" placeholder="0" className="form-input"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reorder Quantity</label>
                  <input
                    type="number" min="0" placeholder="0" className="form-input"
                    value={newProduct.reorderQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, reorderQuantity: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date" className="form-input"
                    value={newProduct.expiryDate}
                    onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsAddProductModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddProduct}>Save Product</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD CUSTOMER MODAL ==================== */}
      {isAddCustomerModalOpen && (
        <AddCustomerModal
          existingCustomers={customers}
          onClose={() => setIsAddCustomerModalOpen(false)}
          onSuccess={(newCust) => {
            fetchCustomers();
            setCustomerId(newCust._id);
            showToast(`Customer "${newCust.name}" added successfully.`, 'success');
          }}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 28px', background: 'var(--primary-other)', color: '#fff', flexShrink: 0,
        boxShadow: 'var(--shadow-sm)', zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FontAwesomeIcon icon={faCartShopping} style={{ marginRight: '6px' }} />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'white' }}>Point of Sale</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn" style={{ background: '#9fe8ec', color: '#283357', padding: '9px 16px', fontSize: '13px', fontWeight: 600 }} onClick={handleShowRegisterDetails}>
            <FontAwesomeIcon icon={faCashRegister} style={{ marginRight: '6px' }} /> Register
          </button>
          <button className="btn" style={{ background: '#b8e0c0', color: '#283357', padding: '9px 16px', fontSize: '13px', fontWeight: 600 }} onClick={handleConfirmSale} disabled={loading}>
            <FontAwesomeIcon icon={faCreditCard} style={{ marginRight: '6px' }} /> Paid
          </button>
          <button className="btn" style={{ background: '#ebefc8', color: '#283357', padding: '9px 16px', fontSize: '13px', fontWeight: 600 }} onClick={handleOpenInvoiceSearch}>
            <FontAwesomeIcon icon={faFileLines} style={{ marginRight: '6px' }} /> Invoices
          </button>
          <button className="btn" style={{ background: '#f0e2d3', color: '#283357', padding: '9px 16px', fontSize: '13px', fontWeight: 600 }} onClick={handleHoldSale}>
            <FontAwesomeIcon icon={faCirclePause} style={{ marginRight: '6px' }} /> Hold
          </button>
          <button className="btn" style={{ background: '#f4d8f7', color: '#283357', padding: '9px 16px', fontSize: '13px', fontWeight: 600, position: 'relative' }} onClick={() => { setIsHoldListModalOpen(true); fetchHoldList(); }}>
            <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '6px' }} /> Hold List
            {holdList.length > 0 && (
              <span style={{ marginLeft: '6px', background: '#654766', color: '#fefefe', borderRadius: '999px', fontSize: '11px', fontWeight: 800, padding: '1px 7px' }}>
                {holdList.length}
              </span>
            )}
          </button>
          <button className="btn btn-danger" style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 600 }} onClick={onExit}>
            ✕ Close POS
          </button>
        </div>
      </div>

      {/* Body: Split Layout */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', padding: '16px', overflow: 'hidden', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '0 0 35%', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
                <span>📦</span> Search Product
              </span>
              <button className="btn btn-primary" onClick={() => setIsAddProductModalOpen(true)} style={{ padding: '2px 8px', fontSize: '14px' }}>+</button>
            </div>

            <div className="form-group" style={{ position: 'relative', marginBottom: selectedProductId ? '12px' : 0 }} ref={searchRef}>
              <label className="form-label">Search</label>
              <input
                ref={searchInputRef}
                type="text"
                className="form-input"
                value={searchTerm}
                placeholder="Search product..."
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  setFocusedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && searchTerm && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  maxHeight: '200px', overflowY: 'auto', margin: 'var(--space-xs) 0 0 0', padding: 0, listStyle: 'none',
                  zIndex: 20, boxShadow: 'var(--shadow-md)', textAlign: 'left'
                }}>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p, index) => (
                      <li
                        key={p._id}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '14px',
                          backgroundColor: index === focusedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                          color: p.quantity <= 0 ? 'var(--text-light)' : 'var(--text-main)'
                        }}
                        className={index === focusedIndex ? 'suggestion-item-focused' : ''}
                        onClick={() => p.quantity > 0 && handleProductSelect(p)}
                      >
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: {p.quantity} | Rs.{p.retailPrice}</div>
                      </li>
                    ))
                  ) : (
                    <li style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>No products found</li>
                  )}
                </ul>
              )}
            </div>

            {selectedProduct && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: 'var(--primary-light)', border: '1px dashed var(--btn-border)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px', marginTop: '12px'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{selectedProduct.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: selectedProduct.quantity <= 5 ? 'var(--danger)' : 'var(--success)' }}>
                    📦 Stock: {selectedProduct.quantity} {getname() !== '—' ? getname() : 'units'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '12px', width: '100%' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">QTY</label>
                    <input
                      ref={qtyInputRef}
                      type="number" min="1" max={selectedProduct ? selectedProduct.quantity : undefined}
                      value={entryQty} onChange={(e) => setEntryQty(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCart(); }}
                      className="form-input"
                      style={{ textAlign: 'center', fontWeight: 'bold' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">PRICE</label>
                    <input
                      type="number" min="0" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCart(); }}
                      className="form-input"
                      style={{ textAlign: 'center', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>
            )}

         

            <button
              className="btn btn-primary"
              style={{
                padding: '10px', alignItems: 'center', marginLeft: '35%', fontSize: '16px', fontWeight: 'bold', width: '30%',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexShrink: 0, marginTop: '16px'
              }}
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
                <span>👤</span> Customer & Delivery
              </span>
              <button className="btn btn-primary" onClick={() => setIsAddCustomerModalOpen(true)} style={{ padding: '2px 8px', fontSize: '14px' }}>+</button>
            </div>

            <div className="form-group">
              <label className="form-label">Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="form-input">
                <option value="">Select a Customer</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name || c.customerName}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Salesman (Optional)
              </label>
              <select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)} className="form-input">
                <option value="">-- None --</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Transporter (Optional)
              </label>
              <select value={transporterId} onChange={(e) => setTransporterId(e.target.value)} className="form-input">
                <option value="">-- None --</option>
                {transporters.map(t => (
                  <option key={t._id} value={t._id}>{t.name} {t.companyName ? `(${t.companyName})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Labour (Optional)
              </label>
              <select value={labourId} onChange={(e) => setLabourId(e.target.value)} className="form-input">
                <option value="">-- None --</option>
                {labourList.map(l => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="form-input" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                placeholder="Optional notes..."
              />
            </div>
          </div>

        </div>

        {/* ==================== RIGHT COLUMN (65% Width) ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1', minWidth: 0, height: '100%', overflowY: 'auto' }}>

          {/* Cart Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0, maxHeight: '250px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ ...tableStyles.th, textAlign: 'left', paddingLeft: '20px', width: '15%' }}>Item Name</th>
                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '15%' }}>QTY</th>
                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '18%' }}>Price</th>
                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '18%' }}>SubTotal</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center', width: '14%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>🛒 No items in cart!</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 16px', textAlign: 'left', paddingLeft: '20px', fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>
                          {item.name}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'left' }}>
                          <input
                            type="number" min="1" max={item.availableQty}
                            value={item.quantity} onChange={(e) => updateCartQty(item.productId, e.target.value)}
                            className="form-input"
                            style={{ width: '60px', padding: '4px 6px', textAlign: 'left', margin: '0 auto' }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}>{item.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {(item.quantity * item.unitPrice - (Number(item.discount) || 0)).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button className="btn btn-danger" onClick={() => removeFromCart(item.productId)} style={{ padding: '4px 8px', fontSize: '12px' }}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================== BILLING FORM ==================== */}
          <div className="card" style={{ padding: '18px 24px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Billing
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Order Total */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Items SubTotal</span>
                <input
                  type="text" readOnly value={`Rs. ${subtotal.toFixed(2)}`}
                  className="form-input"
                  style={{ maxWidth: '240px', width: '100%', fontWeight: 700, backgroundColor: 'var(--bg-app)', textAlign: 'right' }}
                />
              </div>

              {/* Discount Type & Value */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discount</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', maxWidth: '240px', width: '100%' }}>
                  <select
                    className="form-input"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    style={{ padding: '6px', fontSize: '12px' }}
                  >
                    <option value="percent">% Percent</option>
                    <option value="cash">Rs. Fixed</option>
                  </select>
                  <input
                    type="number" min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="form-input"
                    style={{ textAlign: 'right' }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'left', color: 'var(--text-main)', textTransform: 'uppercase' }}>Freight </span>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <label
                      style={{
                        fontSize: '11px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <input
                        type="radio"
                        checked={freightPaidBy === 'Customer'}
                        onChange={() => setFreightPaidBy('Customer')}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          margin: 0,
                          cursor: 'pointer',
                          backgroundColor: freightPaidBy === 'Customer' ? 'var(--primary)' : '#fff',
                          border: freightPaidBy === 'Customer' ? '2px solid #fff' : '1px solid #ccc',
                          boxShadow: freightPaidBy === 'Customer' ? '0 0 0 1px var(--primary)' : 'none',
                        }}
                      />
                      Bill to Customer
                    </label>
                    <label style={{ fontSize: '11px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                      <input
                        type="radio"
                        checked={freightPaidBy === 'Company'}
                        onChange={() => setFreightPaidBy('Company')}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          margin: 0,
                          cursor: 'pointer',
                          backgroundColor: freightPaidBy === 'Company' ? 'var(--primary)' : '#fff',
                          border: freightPaidBy === 'Company' ? '2px solid #fff' : '1px solid #ccc',
                          boxShadow: freightPaidBy === 'Company' ? '0 0 0 1px var(--primary)' : 'none'
                        }}
                      />
                      We Pay
                    </label>
                  </div>
                </div>
                <input
                  type="number" min="0" value={freightAmount} onChange={(e) => setFreightAmount(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '240px', width: '100%', textAlign: 'right', border: freightPaidBy === 'Company' ? '1px solid var(--danger)' : '1px solid var(--border-color)' }}
                  placeholder="0"
                />
              </div>

              {/*  Labour Settings */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-main)', textAlign: 'left', textTransform: 'uppercase' }}>Labour Charges</span>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <label style={{ fontSize: '11px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                      <input
                        type="radio"
                        checked={labourPaidBy === 'Customer'}
                        onChange={() => setLabourPaidBy('Customer')}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          margin: 0,
                          cursor: 'pointer',
                          backgroundColor: labourPaidBy === 'Customer' ? 'var(--primary)' : '#fff',
                          border: labourPaidBy === 'Customer' ? '2px solid #fff' : '1px solid #ccc',
                          boxShadow: labourPaidBy === 'Customer' ? '0 0 0 1px var(--primary)' : 'none'
                        }}
                      />
                      Bill to Customer
                    </label>
                    <label style={{ fontSize: '11px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                      <input
                        type="radio"
                        checked={labourPaidBy === 'Company'}
                        onChange={() => setLabourPaidBy('Company')}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          margin: 0,
                          cursor: 'pointer',
                          backgroundColor: labourPaidBy === 'Company' ? 'var(--primary)' : '#fff',
                          border: labourPaidBy === 'Company' ? '2px solid #fff' : '1px solid #ccc',
                          boxShadow: labourPaidBy === 'Company' ? '0 0 0 1px var(--primary)' : 'none'
                        }}
                      />
                      We Pay
                    </label>
                  </div>
                </div>
                <input
                  type="number" min="0" value={labourCharges} onChange={(e) => setLabourCharges(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '240px', width: '100%', textAlign: 'right', border: labourPaidBy === 'Company' ? '1px solid var(--danger)' : '1px solid var(--border-color)' }}
                  placeholder="0"
                />
              </div>

              {/* Net Payable */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>Net Payable (By Customer)</span>
                <input
                  type="text" readOnly value={`Rs. ${totalAmount.toFixed(2)}`}
                  className="form-input"
                  style={{ maxWidth: '240px', width: '100%', fontWeight: 700, color: 'var(--success)', backgroundColor: 'var(--bg-app)', textAlign: 'right' }}
                />
              </div>

              {/* Paid */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid</span>
                <input
                  type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '240px', width: '100%', textAlign: 'right', fontWeight: 600 }}
                  placeholder="0"
                />
              </div>

              {/* Balance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>Balance</span>
                <input
                  type="text" readOnly value={`Rs. ${balanceAmount.toFixed(2)}`}
                  className="form-input"
                  style={{
                    maxWidth: '240px', width: '100%', fontWeight: 700, backgroundColor: 'var(--bg-app)', textAlign: 'right',
                    color: balanceAmount > 0 ? 'var(--danger)' : 'var(--success)'
                  }}
                />
              </div>

            </div>
          </div>

          {/* Complete Sale Button */}
          <button className="btn btn-primary" style={{ padding: '14px', fontSize: '15px', width: '60%', margin: '0 auto', flexShrink: 0 }} onClick={handleConfirmSale} disabled={loading}>
            {loading ? '⏳ Processing...' : 'Proceed To Complete Sale →'}
          </button>

        </div>

      </div>

      {isAddCategoryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddCategoryModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Category</h3>
              <button className="modal-close" onClick={() => setIsAddCategoryModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <input
                className="form-input"
                placeholder="Enter Category Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsAddCategoryModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCategory}>Save</button>
            </div>
          </div>
        </div>
      )}

      {isAddUomModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddUomModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New UOM</h3>
              <button className="modal-close" onClick={() => setIsAddUomModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <input
                className="form-input"
                placeholder="Name (e.g., Kilograms, Pieces)"
                value={newname}
                onChange={(e) => setNewname(e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Code (e.g., KG, PCS)"
                value={newcode}
                onChange={(e) => setNewcode(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsAddUomModalOpen(false); setNewcode(''); setNewname(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddUom}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Strict Table Styles Rule
const tableStyles = {
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '13px',
    textAlign: 'left'
  },
  td: {
    padding: '8px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left'
  }
};

const styles = {
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
  receiptActions: { display: 'flex', gap: '10px' },
  printReceiptBtn: { background: '#3a485f', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
  receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px' },
  receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
  receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
  receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#1c3951', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTd: { padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
  receiptTdName: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTotals: { marginTop: '14px' },
  receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
  thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
  thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
  thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;
document.head.appendChild(styleSheet);

export default POS;