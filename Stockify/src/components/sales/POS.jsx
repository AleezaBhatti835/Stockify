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
          border: '1px solid #dee2e6', flexShrink: 0
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: '#5aa7ef',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.35}px`, fontWeight: 600, flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  );
}

// ============== MESSAGE POPUP COMPONENT ==============
function MessagePopup({ message, onClose }) {
  if (!message.text) return null;

  return (
    <div className="message-popup-overlay" onClick={onClose}>
      <div className={`message-popup ${message.type}`} onClick={(e) => e.stopPropagation()}>
        <button className="message-popup-close" onClick={onClose}>×</button>
        <div className="message-popup-content">
          <span className="message-popup-icon">
            {message.type === 'error' ? '⚠️' : '✅'}
          </span>
          <div className="message-popup-text">
            <strong>{message.type === 'error' ? 'Error!' : 'Success!'}</strong>
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== TOAST COMPONENT ==============
function ToastPopup({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="message-popup-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className={`message-popup ${toast.type}`} onClick={(e) => e.stopPropagation()}>
        <button className="message-popup-close" onClick={onClose}>×</button>
        <div className="message-popup-content">
          <span className="message-popup-icon">
            {toast.type === 'error' ? '⚠️' : '✅'}
          </span>
          <div className="message-popup-text">
            <strong>{toast.type === 'error' ? 'Error!' : 'Success!'}</strong>
            {toast.message}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== EXACT PAPER CONFIG ==============
const getPaperConfig = (paperSize) => {
  switch (paperSize) {
    case 'Thermal58':
      return {
        maxWidth: '320px',
        bodyPadding: '14px',
        fontSize: '12px',
        mono: true,
        narrow: true
      };
    case 'A5':
      return {
        maxWidth: '460px',
        bodyPadding: '20px',
        fontSize: '13px',
        mono: false,
        narrow: false
      };
    case 'A4':
    default:
      return {
        maxWidth: '800px',
        bodyPadding: '24px',
        fontSize: '14px',
        mono: false,
        narrow: false
      };
  }
};

function POS({ onExit, initialOpenRegister = false }) {
  const { settings: printSettings } = usePrintSettings();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [newcode, setNewcode] = useState('');

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Product entry form state
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [entryQty, setEntryQty] = useState(1);
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDiscount, setEntryDiscount] = useState(0);

  // Customer form state
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Cart
  const [cart, setCart] = useState([]);

  // Billing / Discount state (cash or percentage)
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'cash'
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Receipts Status
  const [showReceipt, setShowReceipt] = useState(null);
  const [showHistoryReceipt, setShowHistoryReceipt] = useState(null);

  // ============ INVOICES MODAL (Search History) ============
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [invoiceSearchLoading, setInvoiceSearchLoading] = useState(false);
  const [allInvoices, setAllInvoices] = useState([]);
  const [showInvoiceSuggestions, setShowInvoiceSuggestions] = useState(false);
  const [invoiceFocusedIndex, setInvoiceFocusedIndex] = useState(-1);
  const invoiceSearchRef = useRef(null);

  // ============ HOLD / HOLD LIST ============
  const [holdList, setHoldList] = useState([]);
  const [holdListLoading, setHoldListLoading] = useState(false);
  const [isHoldListModalOpen, setIsHoldListModalOpen] = useState(false);

  // ============ ADD PRODUCT MODAL ============
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [productMessage, setProductMessage] = useState({ text: '', type: '' });
  const [uploadingProductPic, setUploadingProductPic] = useState(false);
  const productInitialState = {
    name: '', categoryId: '', uomId: '', costPrice: '', retailPrice: '',
    quantity: '', expiryDate: '', reorderQuantity: '', pic: '', status: 'active'
  };
  const [newProduct, setNewProduct] = useState(productInitialState);

  // ============ INLINE ADD CATEGORY/UOM MODALS ============
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isAddUomModalOpen, setIsAddUomModalOpen] = useState(false);
  const [newname, setNewname] = useState('');

  // ============ ADD CUSTOMER MODAL ============
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [customerMessage, setCustomerMessage] = useState({ text: '', type: '' });
  const [uploadingCustomerPic, setUploadingCustomerPic] = useState(false);
  const customerInitialState = { name: '', email: '', contact: '', address: '', pic: '', cnic: '', status: 'Active' };
  const [newCustomer, setNewCustomer] = useState(customerInitialState);

  const searchRef = useRef(null);
  const qtyInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // ============== CASH REGISTER STATES ==============
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
  }, []);

  const fetchHoldList = async () => {
    setHoldListLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/sales/hold');
      const data = await res.json();
      setHoldList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching hold list:', err);
    } finally {
      setHoldListLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldList();
  }, []);

  // Update Click Outside logic
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (invoiceSearchRef.current && !invoiceSearchRef.current.contains(event.target)) {
        setShowInvoiceSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    checkRegisterStatus();
    fetchAllData();
  }, []);

  const checkRegisterStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/cash-register/status');

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
      const res = await fetch('http://localhost:5000/api/cash-register/status');
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
      const res = await fetch('http://localhost:5000/api/cash-register/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('http://localhost:5000/api/cash-register/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    await Promise.all([
      fetchProducts(),
      fetchCustomers(),
      fetchCategories(),
      fetchUoms()
    ]);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  const fetchUoms = async () => {
    try {
      let res = await fetch('http://localhost:5000/api/uoms');
      let data = [];

      if (!res.ok) {
        res = await fetch('http://localhost:5000/api/uom');
        if (!res.ok) {
          console.warn('UOM endpoints failed, using empty array');
          setUoms([]);
          return;
        }
        data = await res.json();
      } else {
        data = await res.json();
      }

      setUoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching uoms:', err);
      setUoms([]);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products.find(p => p._id === selectedProductId);

  const getCategoryName = () => {
    if (!selectedProduct) return '—';
    const catId = selectedProduct.categoryId;
    if (!catId) return '—';
    if (typeof catId === 'object' && catId.name) return catId.name;
    const found = categories.find(c => c._id === catId || c.id === catId);
    return found ? found.name : catId;
  };

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
    setEntryDiscount(0);

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

  const subtotal = cart.reduce((sum, c) => sum + (c.quantity * c.unitPrice - (Number(c.discount) || 0)), 0);

  const discountAmount = discountType === 'percent'
    ? (subtotal * (Number(discountValue) || 0)) / 100
    : Math.min(Number(discountValue) || 0, subtotal > 0 ? subtotal : 0);

  const totalAmount = subtotal - discountAmount;
  const balanceAmount = totalAmount - (Number(paidAmount) || 0);

  const resetSale = () => {
    setCart([]);
    setCustomerId('');
    setDiscountType('percent');
    setDiscountValue(0);
    setPaidAmount(0);
    setNotes('');
    setSaleDate(new Date().toISOString().slice(0, 10));
    setSelectedProductId('');
    setSearchTerm('');
    setEntryPrice('');
    setEntryQty(1);
    setEntryDiscount(0);
    fetchProducts();
  };

  // ==================== SEARCH INVOICE LOGIC ====================
  const handleOpenInvoiceSearch = async () => {
    setIsInvoiceModalOpen(true);
    setInvoiceSearchLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/sales');
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
        const res = await fetch(`http://localhost:5000/api/sales/${selectedInvoice._id}`);
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
      const found = allInvoices.find(s =>
        s.saleNumber && s.saleNumber.toLowerCase() === invoiceSearchTerm.trim().toLowerCase()
      );

      if (found) {
        const res = await fetch(`http://localhost:5000/api/sales/${found._id}`);
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

  const filteredInvoices = allInvoices.filter(inv =>
    inv.saleNumber && inv.saleNumber.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
  );

  // ==================== HOLD SALE ====================
  const handleHoldSale = async () => {
    if (cart.length === 0) {
      showToast('The cart is empty. Please add at least one product to hold the sale.', 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/sales/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || null,
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
        setCart([]);
        setCustomerId('');
        setDiscountType('percent');
        setDiscountValue(0);
        setPaidAmount(0);
        setNotes('');
        setSaleDate(new Date().toISOString().slice(0, 10));
        setSelectedProductId('');
        setSearchTerm('');
        setEntryPrice('');
        setEntryQty(1);
        setEntryDiscount(0);

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
      const res = await fetch(`http://localhost:5000/api/sales/${holdMongoId}`);
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
      setSaleDate(sale.saleDate ? new Date(sale.saleDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotes(sale.notes || '');
      setDiscountType(sale.discountType || 'percent');
      setDiscountValue(sale.discountValue || 0);
      setPaidAmount(sale.paidAmount || 0);

      await fetch(`http://localhost:5000/api/sales/${holdMongoId}/hold`, { method: 'DELETE' });
      setHoldList(prev => prev.filter(h => h._id !== holdMongoId));
      setIsHoldListModalOpen(false);
      showToast(`Held sale (${sale.saleNumber}) has been resumed.`, 'success');
    } catch (err) {
      showToast('Server error while resuming the held sale.', 'error');
    }
  };

  const handleDeleteHold = async (holdMongoId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/sales/${holdMongoId}/hold`, { method: 'DELETE' });
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

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one product.', 'error');
      return;
    }
    const paid = Number(paidAmount) || 0;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || null,
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showProductMessage('Category name is required.', 'error');
      return;
    }
    try {
      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('http://localhost:5000/api/uoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
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

    const costPrice = parseFloat(product.costPrice) || 0;
    const retailPrice = parseFloat(product.retailPrice) || 0;

    if (costPrice < 0) return showProductMessage('Cost price cannot be negative!', 'error');
    if (retailPrice < 0) return showProductMessage('Retail price cannot be negative!', 'error');

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
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleCustomerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploadingCustomerPic(true);

    try {
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
      const raw = await res.text();
      if (!res.ok) return showCustomerMessage(`Image upload failed.`, 'error');

      const data = JSON.parse(raw);
      if (data.imageUrl) {
        setNewCustomer(prev => ({ ...prev, pic: data.imageUrl }));
        showCustomerMessage('Customer image uploaded successfully!', 'success');
      }
    } catch (error) {
      showCustomerMessage('Upload failed: could not reach the server.', 'error');
    } finally {
      setUploadingCustomerPic(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.contact || !newCustomer.email) {
      showCustomerMessage('Name, Email, and Contact are required!', 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      if (res.ok) {
        const savedCustomer = await res.json();
        showCustomerMessage('Customer added successfully!', 'success');
        setNewCustomer(customerInitialState);
        setIsAddCustomerModalOpen(false);
        await fetchCustomers();
        setCustomerId(savedCustomer._id);
        showToast(`Customer "${savedCustomer.name}" added and selected.`, 'success');
      } else {
        showCustomerMessage('Error saving customer.', 'error');
      }
    } catch (error) {
      showCustomerMessage('Server error.', 'error');
    }
  };

  const ReceiptModal = ({ sale }) => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);

    const finalTotal = sale.totalAmount ?? totalAmount;
    const finalPaid = sale.paidAmount ?? (Number(paidAmount) || 0);
    const balance = finalTotal - finalPaid;

    const getItemName = (item) => {
      if (item.name) return item.name;
      if (item.product?.name) return item.product.name;
      return 'Unknown Product';
    };

    const getItemQty = (item) => {
      return item.quantity || 0;
    };

    const getUnitPrice = (item) => {
      return item.unitPrice || 0;
    };

    const getDiscount = (item) => {
      return item.discount || 0;
    };

    const getLineTotal = (item) => {
      const qty = getItemQty(item);
      const price = getUnitPrice(item);
      const disc = getDiscount(item);
      return (qty * price) - disc;
    };

    return (
      <div style={styles.receiptOverlay}>
        <div style={{ ...styles.receiptContainer, maxWidth: paperConfig.maxWidth }}>
          <div style={{ ...styles.receiptHeader, flexDirection: paperConfig.narrow ? 'column' : 'row', gap: paperConfig.narrow ? '10px' : '0' }}>
            <h3 style={{ margin: 0, color: '#000' }}>CAPOBIZ</h3>

            <div style={{ ...styles.receiptActions, width: paperConfig.narrow ? '100%' : 'auto' }}>
              <button
                className="receipt-print-btn"
                style={{ ...styles.printReceiptBtn, ...(paperConfig.narrow ? { flex: 1 } : {}) }}
                onClick={handlePrint}
              >
                🖨️ Print
              </button>
              <button
                className="receipt-close-btn"
                style={{ ...styles.closeReceiptBtn, ...(paperConfig.narrow ? { flex: 1 } : {}) }}
                onClick={handleCloseReceipt}
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div
            style={{
              ...styles.receiptBody,
              padding: paperConfig.bodyPadding,
              fontSize: paperConfig.fontSize,
              fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit'
            }}
            id="receipt-content"
          >
            <div style={styles.receiptHeaderInfo}>
              <p style={{ margin: '4px 0', color: '#333' }}>Invoice: {sale.saleNumber}</p>
              <p style={{ margin: '4px 0', color: '#333' }}>Date: {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</p>
              <p style={{ margin: '4px 0', color: '#333' }}>
                Customer: {sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}
              </p>
            </div>
            <div style={styles.receiptDivider}></div>

            {paperConfig.mono ? (
              <div>
                {(sale.items || []).map((item, idx) => {
                  const lineTotal = getLineTotal(item);
                  const itemName = getItemName(item);
                  const qty = getItemQty(item);
                  const price = getUnitPrice(item);
                  const disc = getDiscount(item);
                  return (
                    <div key={idx} style={styles.thermalItemRow}>
                      <div style={styles.thermalItemLine1}>
                        <span>{itemName}</span>
                        <span>x{qty}</span>
                      </div>
                      <div style={styles.thermalItemLine2}>
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
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.receiptTh, width: '32%' }}>Product</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '14%' }}>Qty</th>
                    <th style={{ ...styles.receiptTh, width: '18%' }}>Price</th>
                    <th style={{ ...styles.receiptTh, width: '16%' }}>Disc</th>
                    <th style={{ ...styles.receiptTh, width: '20%' }}>SubTotal </th>
                  </tr>
                </thead>
                <tbody>
                  {(sale.items || []).map((item, idx) => {
                    const price = getUnitPrice(item);
                    const qty = getItemQty(item);
                    const disc = getDiscount(item);
                    const lineTotal = getLineTotal(item);
                    const itemName = getItemName(item);
                    return (
                      <tr key={idx}>
                        <td style={styles.receiptTdName}>{itemName}</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{qty}</td>
                        <td style={styles.receiptTd}>{price.toFixed(2)}</td>
                        <td style={styles.receiptTd}>{disc > 0 ? disc.toFixed(2) : '0.00'}</td>
                        <td style={{ ...styles.receiptTd, fontWeight: 600 }}>
                          {lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div style={styles.receiptDivider}></div>
            <div style={styles.receiptTotals}>
              <div style={styles.receiptTotalRow}>
                <span>Order total</span>
                <span>Rs. {sale.subtotal?.toFixed(2) || (sale.totalAmount + (sale.discountAmount || 0)).toFixed(2)}</span>
              </div>
              <div style={styles.receiptTotalRow}>
                <span>Discount {sale.discountType === 'cash' ? '(Fixed)' : `(${sale.discountValue || 0}%)`}</span>
                <span>Rs. {sale.discountAmount?.toFixed(2) || discountAmount.toFixed(2)}</span>
              </div>
              <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid #000', paddingTop: '10px' }}>
                <span>Grand Total</span>
                <span>Rs. {finalTotal.toFixed(2)}</span>
              </div>
              <div style={styles.receiptTotalRow}>
                <span>Paid</span>
                <span>Rs. {finalPaid.toFixed(2)}</span>
              </div>
              <div style={{ ...styles.receiptTotalRow, fontWeight: 700 }}>
                <span>Balance</span>
                <span>Rs. {balance.toFixed(2)} {balance > 0 ? '(Due)' : '(Paid)'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HoldListModal = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, color: '#0f172a' }}>Hold List</h3>
          <button
            onClick={() => setIsHoldListModalOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {holdListLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '14px' }}>Loading...</div>
        ) : holdList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>No held sales available.</div>
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, textAlign: 'left' }}>Hold #</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>Customer</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Items</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdList.map(h => (
                  <tr key={h._id}>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{h.saleNumber}</td>
                    <td style={styles.td}>{h.customer?.name || h.customer?.customerName || 'Walk-in Customer'}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{h.itemsCount ?? '—'}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                      Rs. {Number(h.totalAmount || 0).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={styles.holdStatusBadge}>Hold</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleResumeHold(h._id)}
                          style={{ background: '#3c4e6b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}
                        >
                          ▶
                        </button>
                        <button
                          onClick={() => handleDeleteHold(h._id)}
                          style={{ background: '#ab3838', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 800, fontSize: '14px', whiteSpace: 'nowrap' }}
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
  );

  // ==================== MAIN RENDER ====================
  // If register page should be shown, render it instead of POS
  if (showRegisterPage) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowY: 'auto',
        padding: '20px'
      }}>
        <ToastPopup toast={toast} onClose={clearToast} />

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Card Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: isRegisterOpen ? '#ecfdf5' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {isRegisterOpen ? '✅' : '🔒'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {isRegisterOpen ? 'Register is Open' : 'Register is Closed'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  {isRegisterOpen ? 'Ready for transactions' : 'Open the register to start using POS'}
                </p>
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: '24px' }}>
              {isRegisterOpen && registerData ? (
                <div>
                  <div style={{ margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#555' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Opening Amount:</span> <strong>Rs. {registerData.openingAmount || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sales Amount:</span> <strong style={{ color: '#10b981' }}>+ Rs. {registerData.salesAmount || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Returns:</span> <strong style={{ color: '#ef4444' }}>- Rs. {registerData.totalReturn || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Purchases (Cash Paid):</span> <strong style={{ color: '#ef4444' }}>- Rs. {registerData.purchaseAmount || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Purchase Returns:</span> <strong style={{ color: '#10b981' }}>+ Rs. {registerData.purchaseReturnAmount || 0}</strong>
                    </div>
                    <hr style={{ borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                      <span>Closing Amount:</span>
                      <strong>
                        Rs. {
                          ((registerData.openingAmount || 0) + (registerData.salesAmount || 0) + (registerData.purchaseReturnAmount || 0))
                          - (registerData.totalReturn || 0)
                          - (registerData.purchaseAmount || 0)
                        }
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setShowRegisterPage(false)}
                      style={{
                        flex: 1,
                        background: '#3c4e6b',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      🏪 Go to POS
                    </button>
                    <button
                      onClick={handleCloseRegister}
                      disabled={registerLoading}
                      style={{
                        flex: 1,
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                        opacity: registerLoading ? 0.6 : 1
                      }}
                    >
                      {registerLoading ? '⏳ Closing...' : '🔒 Close Register'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px', textAlign: 'left' }}>
                      Opening Amount
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', fontWeight: 600, color: '#94a3b8' }}>Rs.</span>
                      <input
                        type="number"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value)}
                        placeholder="Enter amount"
                        style={{
                          width: '100%',
                          padding: '12px 12px 12px 44px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          fontWeight: 600,
                          outline: 'none',
                          backgroundColor: '#f8fafc',
                          color: '#0f172a',
                          boxSizing: 'border-box'
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleOpenRegister(); }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleOpenRegister}
                    disabled={registerLoading}
                    style={{
                      width: '100%',
                      background: '#3c4e6b',
                      color: '#fff',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '15px',
                      opacity: registerLoading ? 0.6 : 1
                    }}
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
    <div style={styles.fullScreen}>
      <ToastPopup toast={toast} onClose={clearToast} />

      {(showReceipt || showHistoryReceipt) && <ReceiptModal sale={showReceipt || showHistoryReceipt} />}

      {isHoldListModalOpen && <HoldListModal />}

      {/* ==================== SEARCH INVOICES MODAL ==================== */}
      {isInvoiceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 1000000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>📄 Search Invoice</h3>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <div style={{ position: 'relative' }} ref={invoiceSearchRef}>
              <input
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
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
                <ul style={{ ...styles.suggestionsList, top: 'calc(100% + 4px)', zIndex: 1000001, border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv, index) => (
                      <li
                        key={inv._id}
                        style={{
                          ...styles.suggestionItem,
                          ...(index === invoiceFocusedIndex ? styles.suggestionItemFocused : {}),
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        className={index === invoiceFocusedIndex ? 'invoice-suggestion-focused' : ''}
                        onClick={() => handleSearchInvoice(inv)}
                      >
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.saleNumber}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                          <div>{new Date(inv.saleDate || inv.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontWeight: 500 }}>Rs. {inv.totalAmount?.toFixed(2)}</div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li style={{ ...styles.suggestionItem, color: '#94a3b8' }}>No invoices found</li>
                  )}
                </ul>
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.proceedBtn, margin: 0, width: 'auto', padding: '10px 16px', fontSize: '14px' }}
                onClick={() => handleSearchInvoice()}
                disabled={invoiceSearchLoading}
              >
                {invoiceSearchLoading ? 'Searching...' : 'Search & Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD PRODUCT MODAL ==================== */}
      {isAddProductModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ minWidth: '60%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Add New Product</h3>
            <MessagePopup message={productMessage} onClose={clearProductMessage} />
            <div className="user-form" style={{ color: '#242a33', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Category *</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select
                    style={{ flex: 1, fontSize: '0.85rem', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setIsAddCategoryModalOpen(true)} style={styles.inlineAddBtn}>+</button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>UOM *</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select
                    style={{ flex: 1, fontSize: '0.85rem', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                    value={newProduct.uomId}
                    onChange={(e) => setNewProduct({ ...newProduct, uomId: e.target.value })}
                  >
                    <option value="">Select UOM</option>
                    {uoms.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setIsAddUomModalOpen(true)} style={styles.inlineAddBtn}>+</button>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Product Name *</label>
                <input
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Cost Price</label>
                <input
                  type="number" min="0" placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newProduct.costPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Retail Price</label>
                <input
                  type="number" min="0" placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newProduct.retailPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Opening Stock (Qty)</label>
                <input
                  type="number" min="0" placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Reorder Quantity</label>
                <input
                  type="number" min="0" placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newProduct.reorderQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, reorderQuantity: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Expiry Date</label>
                <input
                  type="date"
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.8rem' }}>Product Image</label>
                <input style={{ fontSize: '0.85rem' }} type="file" accept="image/*" onChange={handleProductImageUpload} disabled={uploadingProductPic} />
                {uploadingProductPic && <span style={{ fontSize: '0.75rem', color: '#1b2f41' }}>Uploading...</span>}
                {!uploadingProductPic && newProduct.pic && (
                  <div style={{ marginTop: '8px' }}>
                    <AvatarImage pic={newProduct.pic} name={newProduct.name || 'Product'} size={40} />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddProduct}>Save Product</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddProductModalOpen(false); setNewProduct(productInitialState); clearProductMessage(); }}>Cancel</button>
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

            if (typeof setCustomerId === 'function') {
              setCustomerId(newCust._id);
              showToast(`Customer "${newCust.name}" added successfully.`, 'success');
            } else {
              showMessage('Customer added successfully!', 'success');
            }
          }}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🛒</span>
          <h2 style={styles.headerTitle}>Point of Sale</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={styles.regHeaderBtn} onClick={handleShowRegisterDetails}>
            <span style={{ marginRight: '6px' }}><FontAwesomeIcon icon={faCashRegister} /></span> Register
          </button>

          <button style={styles.paidHeaderBtn} onClick={handleConfirmSale} disabled={loading}>
            <span style={{ marginRight: '6px' }}><FontAwesomeIcon icon={faCreditCard} /></span> Paid
          </button>

          <button style={styles.invoicesHeaderBtn} onClick={handleOpenInvoiceSearch}>
            <span style={{ marginRight: '6px' }}><FontAwesomeIcon icon={faFileLines} /></span> Invoices
          </button>

          <button style={styles.holdBtn} onClick={handleHoldSale}>
            <span style={{ marginRight: '6px' }}><FontAwesomeIcon icon={faCirclePause} /> </span> Hold
          </button>

          <button style={styles.holdListBtn} onClick={() => { setIsHoldListModalOpen(true); fetchHoldList(); }}>
            <span style={{ marginRight: '6px' }}><FontAwesomeIcon icon={faClipboardList} /> </span> Hold List
            {holdList.length > 0 && <span style={styles.holdBadge}>{holdList.length}</span>}
          </button>

          <button style={styles.exitBtn} onClick={onExit}>
            <span style={{ marginRight: '6px' }}>✕</span> Close POS
          </button>
        </div>
      </div>

      {/* Body: Split Layout */}
      <div style={{ ...styles.bodyLayout, flexDirection: 'row', alignItems: 'stretch' }}>

        {/* ==================== LEFT COLUMN (35% Width): Product & Customer Forms ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '0 0 35%', height: '100%', overflowY: 'auto', paddingRight: '10px' }}>

          {/* Product Section */}
          <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardHeaderLeft}>
                <span style={styles.cardIcon}>📦</span>
                <span style={styles.cardTitle}>Search / Add Product</span>
              </span>
              <button style={styles.addNewBtn} onClick={() => setIsAddProductModalOpen(true)}>+</button>
            </div>

            {/* Search Field */}
            <div style={styles.horizontalField} ref={searchRef}>
              <label style={styles.leftLabel}>SEARCH</label>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  placeholder="Search product..."
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setFocusedIndex(-1); // Keyboard navigation fix
                  }}
                  onKeyDown={handleKeyDown} // Keyboard navigation event
                  onFocus={() => setShowSuggestions(true)}
                  style={styles.input}
                />
                {showSuggestions && searchTerm && (
                  <ul style={styles.suggestionsList}>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, index) => (
                        <li
                          key={p._id}
                          style={{
                            ...styles.suggestionItem,
                            ...(index === focusedIndex ? styles.suggestionItemFocused : {}),
                            color: p.quantity <= 0 ? '#94a3b8' : '#0f172a'
                          }}
                          className={index === focusedIndex ? 'suggestion-item-focused' : ''}
                          onClick={() => p.quantity > 0 && handleProductSelect(p)}
                        >
                          <div>{p.name}</div>
                          <div style={{ fontSize: '11px' }}>Stock: {p.quantity} | Rs.{p.retailPrice}</div>
                        </li>
                      ))
                    ) : (
                      <li style={styles.suggestionItem}>No products found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Selected Product Details */}
            {selectedProduct && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...styles.stockPricePopup, flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'left', justifyContent: 'left', gap: '50px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#122a42' }}>{selectedProduct.name}</span>
                    <div style={{ border: '1px solid #c1d4e6', borderRadius: '30px', gap: '10px', width: '190px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', marginRight: '20px' }}>📦 Stock</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: selectedProduct.quantity <= 5 ? '#44a2ef' : '#0f766e' }}>
                        {selectedProduct.quantity} {getname() !== '—' ? getname() : 'units'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ===================== UPDATED QTY & PRICE ROW ===================== */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.5px' }}>QTY</label>
                    <input
                      ref={qtyInputRef}
                      type="number" min="1" max={selectedProduct ? selectedProduct.quantity : undefined}
                      value={entryQty} onChange={(e) => setEntryQty(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCart(); }}
                      style={{ ...styles.input, height: '35px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.5px' }}>PRICE</label>
                    <input
                      type="number" min="0" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddToCart(); }}
                      style={{ ...styles.input, height: '35px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  style={{ ...styles.addBtn, marginTop: '24px', width: '100%', maxWidth: '200px', marginInline: 'auto' }}
                  onClick={handleAddToCart}
                >
                  🛒 Add to Cart
                </button>
              </div>
            )}

            {!selectedProduct && (
              <div style={styles.noProductSelected}>
                <span style={styles.noProductIcon}>🔍</span>
                <span style={styles.noProductText}>Search and select a product to add</span>
              </div>
            )}
          </div>

          {/* Customer Section */}
          <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardHeaderLeft}>
                <span style={styles.cardIcon}>👤</span>
                <span style={styles.cardTitle}>Customer</span>
              </span>
              <button style={styles.addNewBtn} onClick={() => setIsAddCustomerModalOpen(true)}>+</button>
            </div>

            <div style={styles.horizontalField}>
              <label style={styles.leftLabel}>SELECT</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={styles.input}>
                <option value="">Select a Customer</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name || c.customerName}</option>
                ))}
              </select>
            </div>

            <div style={styles.horizontalField}>
              <label style={styles.leftLabel}>DATE</label>
              <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} style={styles.input} />
            </div>

            <div style={{ ...styles.horizontalField, flex: 1, alignItems: 'flex-start' }}>
              <label style={styles.leftLabel}>NOTES</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ ...styles.input, height: '100%', minHeight: '38px' }}
                placeholder="Optional notes..."
              />
            </div>
          </div>

        </div>

        {/* ==================== RIGHT COLUMN (65% Width): Table, Billing Form & Complete Button ==================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1', minWidth: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>

          {/* Cart Table */}
          <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', flexShrink: 0, minHeight: '220px', maxHeight: '340px' }}>
            <div style={{ ...styles.tableWrapper }}>
              <table style={styles.table}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ ...styles.th, textAlign: 'left', paddingLeft: '24px', width: '100px' }}>Item Name</th>
                    <th style={{ ...styles.th, textAlign: 'center', width: '90px' }}>QTY</th>
                    <th style={{ ...styles.th, textAlign: 'right', width: '90px' }}>Price</th>
                    <th style={{ ...styles.th, textAlign: 'right', width: '90px' }}>SubTotal</th>
                    <th style={{ ...styles.th, textAlign: 'center', width: '100px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan="5">
                        <div style={{ ...styles.emptyCart, padding: '40px 0' }}>
                          <div style={styles.emptyCartTitle}>🛒 No items in cart!</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.productId}>
                        <td style={{ ...styles.td, textAlign: 'left', paddingLeft: '24px', fontWeight: 600, color: '#1e293b' }}>
                          {item.name}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <input
                            type="number" min="1" max={item.availableQty}
                            value={item.quantity} onChange={(e) => updateCartQty(item.productId, e.target.value)}
                            style={styles.qtyInput}
                          />
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                          {(item.quantity * item.unitPrice - (Number(item.discount) || 0)).toFixed(2)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button style={styles.removeBtn} onClick={() => removeFromCart(item.productId)}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ==================== BILLING FORM ==================== */}
          <div style={{ ...styles.card, flexShrink: 0, padding: '18px 24px' }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardHeaderLeft}>
                <span style={styles.cardIcon}>🧮</span>
                <span style={styles.cardTitle}>Billing</span>
              </span>
            </div>

            <div style={styles.billingGrid}>

              <div style={styles.horizontalField}>
                <label style={styles.leftLabel}>Order Total</label>
                <input
                  type="text" readOnly value={`Rs. ${subtotal.toFixed(2)}`}
                  style={{ ...styles.input, ...styles.readOnlyInput }}
                />
              </div>

              <div style={styles.horizontalField}>
                <label style={styles.leftLabel}>DISCOUNT</label>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flex: 1 }}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio" name="discountType" checked={discountType === 'percent'}
                      onChange={() => setDiscountType('percent')}
                      style={styles.radioInput}
                    />
                    Percentage (%)
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio" name="discountType" checked={discountType === 'cash'}
                      onChange={() => setDiscountType('cash')}
                      style={styles.radioInput}
                    />
                    Cash (Rs.)
                  </label>
                </div>
              </div>

              <div style={styles.horizontalField}>
                <label style={styles.leftLabel}>{discountType === 'percent' ? 'DISC %' : 'DISC RS.'}</label>
                <input
                  type="number" min="0" max={discountType === 'percent' ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  style={styles.input}
                  placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                />
                <span style={styles.inlineHint}>− Rs. {discountAmount.toFixed(2)}</span>
              </div>

              <div style={styles.horizontalField}>
                <label style={styles.leftLabel}>NET PAYABLE</label>
                <input
                  type="text" readOnly value={`Rs. ${totalAmount.toFixed(2)}`}
                  style={{ ...styles.input, ...styles.readOnlyInput, color: '#10b981', fontWeight: 700 }}
                />
              </div>

              <div style={styles.horizontalField}>
                <label style={styles.leftLabel}>PAID </label>
                <input
                  type="number" min="0" value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ ...styles.horizontalField, marginBottom: 0 }}>
                <label style={styles.leftLabel}>BALANCE</label>
                <input
                  type="text" readOnly value={`Rs. ${balanceAmount.toFixed(2)}`}
                  style={{
                    ...styles.input, ...styles.readOnlyInput, fontWeight: 700,
                    color: balanceAmount > 0 ? '#ef4444' : '#10b981'
                  }}
                />
              </div>

            </div>
          </div>

          {/* Complete Sale Button */}
          <button style={{ ...styles.proceedBtn, width: '60%', margin: '0 auto', padding: '12px', fontSize: '15px', flexShrink: 0 }} onClick={handleConfirmSale} disabled={loading}>
            {loading ? '⏳ Processing...' : 'Proceed To Complete Sale →'}
          </button>

        </div>

      </div>

      {/* ==================== INLINE CATEGORY MODAL ==================== */}
      {isAddCategoryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 1000000 }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Add New Category</h3>
            <input
              style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              placeholder="Enter Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.proceedBtn, margin: 0, width: 'auto', padding: '10px 16px', fontSize: '14px' }} onClick={handleAddCategory}>Save</button>
              <button style={{ ...styles.exitBtn, padding: '10px 16px', fontSize: '14px', background: '#f1f5f9', color: '#475569' }} onClick={() => setIsAddCategoryModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== INLINE UOM MODAL ==================== */}
      {isAddUomModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 1000000 }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Add New UOM</h3>
            <input
              style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              placeholder="Name (e.g., Kilograms, Pieces)"
              value={newname}
              onChange={(e) => setNewname(e.target.value)}
            />
            <input
              style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              placeholder="Code (e.g., KG, PCS)"
              value={newcode}
              onChange={(e) => setNewcode(e.target.value)}
            />
            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.proceedBtn, margin: 0, width: 'auto', padding: '10px 16px', fontSize: '14px' }} onClick={handleAddUom}>Save</button>
              <button style={{ ...styles.exitBtn, padding: '10px 16px', fontSize: '14px', background: '#f1f5f9', color: '#475569' }} onClick={() => { setIsAddUomModalOpen(false); setNewcode(''); setNewname(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  fullScreen: { position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: '#2f3a54', color: '#fff', flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerIcon: { fontSize: '24px' },
  headerTitle: { margin: 0, fontSize: '22px', fontWeight: 700, color: 'white' },
  regHeaderBtn: { background: '#9fe8ec', color: '#283357', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' },
  paidHeaderBtn: { background: '#b8e0c0', color: '#283357', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' },
  invoicesHeaderBtn: { background: '#ebefc8', color: '#283357', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' },

  exitBtn: { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' },
  holdBtn: { background: '#f0e2d3', color: '#283357', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center' },
  holdListBtn: { background: '#f4d8f7', color: '#283357', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', position: 'relative' },
  holdBadge: { border: '1px #fffefe', marginLeft: '8px', background: '#654766', color: '#fefefe', borderRadius: '999px', fontSize: '11px', fontWeight: 800, padding: '1px 7px', lineHeight: '16px' },
  holdStatusBadge: { display: 'inline-block', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '999px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  bodyLayout: { display: 'flex', flexDirection: 'column', flex: 1, gap: '20px', padding: '24px', overflow: 'hidden' },
  formsRow: { display: 'flex', gap: '60px', flexWrap: 'wrap' },
  card: { background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  cardHeaderLeft: { display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', color: '#3c4e6b', fontWeight: 800, fontSize: '14px' },
  cardIcon: { fontSize: '18px' },
  cardTitle: {},
  addNewBtn: { background: '#41526f', color: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, whiteSpace: 'nowrap' },
  inlineAddBtn: { background: '#3c4e6b', color: '#fff', border: 'none', padding: '0 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  horizontalField: { display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '16px' },
  fieldRowInline: { display: 'flex', gap: '16px', marginBottom: '4px' },
  horizontalFieldInline: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  leftLabel: { width: '90px', fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'left', letterSpacing: '0.5px', flexShrink: 0 },
  input: { flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', outline: 'none', transition: 'all 0.2s' },
  readOnlyInput: { backgroundColor: '#f1f5f9', cursor: 'default', fontWeight: 600, color: '#0f172a' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' },
  radioInput: { width: '16px', height: '16px', accentColor: '#3c4e6b', cursor: 'pointer' },
  inlineHint: { fontSize: '12px', color: '#64748b', minWidth: '110px', textAlign: 'right', flexShrink: 0 },
  billingGrid: { display: 'flex', flexDirection: 'column' },

  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #cbd5e1',
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    maxHeight: '200px',
    overflowY: 'auto',
    margin: 0,
    padding: 0,
    listStyle: 'none',
    zIndex: 20,
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
    textAlign: 'left'
  },
  suggestionItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '14px',
    textAlign: 'left'
  },
  suggestionItemFocused: {
    backgroundColor: '#e2e8f0'
  },

  productInfoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px', color: '#181616' },
  productInfoItem: { display: 'flex', flexDirection: 'column', gap: '2px', color: '#181616' },
  productInfoLabel: { fontSize: '10px', fontWeight: 600, color: '#27282b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  productInfoValue: { fontSize: '14px', color: '#475569', padding: '4px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '32px', display: 'flex', alignItems: 'center' },
  stockPricePopup: { display: 'flex', alignItems: 'center', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', gap: '16px', textAlign: 'center' },
  stockPriceItem: { display: 'flex', alignItems: 'center', gap: '2px', flex: 1, textAlign: 'center' },
  stockPriceLabel: { fontSize: '12px', fontWeight: 500, color: '#64748b', textAlign: 'center', margin: '0 20%' },
  stockPriceValue: { fontSize: '14px', fontWeight: 600, color: '#0f172a', textAlign: 'center' },
  stockPriceDivider: { width: '1px', height: '24px', backgroundColor: '#bbf7d0' },
  noProductSelected: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#94a3b8', flex: 1 },
  noProductIcon: { fontSize: '48px', marginBottom: '12px' },
  noProductText: { fontSize: '14px', fontWeight: 500 },
  addBtn: { width: '30%', margin: '4% 34%', background: '#3c4e6b', color: '#fff', border: 'none', padding: '12px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', borderRadius: '8px', marginTop: 'auto', transition: 'all 0.2s' },
  tableWrapper: { overflowY: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: '#3c4e6b', fontSize: '12px', color: '#ffffff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', position: 'sticky', top: 0 },
  td: { padding: '10px 16px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  qtyInput: { width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px', backgroundColor: '#f8fafc' },
  removeBtn: { background: '#fef2f2', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 },
  emptyCart: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#94a3b8' },
  emptyCartTitle: { fontSize: '18px', fontWeight: 600, color: '#64748b' },
  proceedBtn: { background: '#3c4e6b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
  receiptActions: { display: 'flex', gap: '10px', marginLeft: '67%' },
  printReceiptBtn: { background: '#3a485f', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
  receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px' },
  receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
  receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
  receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#1c3951', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTd: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
  receiptTdName: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTotals: { marginTop: '14px' },
  receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
  thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
  thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
  thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes popIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
  @keyframes shakeIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  
  /* REMOVE NUMBER INPUT ARROWS (SPINNERS) */
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