import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruckMoving } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function AddPurchase() {
  // --- Data States ---
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [transporters, setTransporters] = useState([]); // 💡 Transporter State
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');

  // --- Form States ---
  const [purchaseInfo, setPurchaseInfo] = useState({
    supplierId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierPhone: '',
    supplierCity: '',
    transporterId: '', // 💡 Transporter ID
    freightAmount: ''  // 💡 Default '' instead of 0
  });

  const [items, setItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(''); // 💡 Default '' instead of 0

  // --- Draft Item State ---
  const [draftItem, setDraftItem] = useState({
    product: '', productName: '', quantity: 1, unitPrice: '', expiryDate: ''
  });

  // --- Edit Modal States ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({ product: '', productName: '', quantity: '', unitPrice: '', expiryDate: '' });

  // Modal specific search states
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isModalSearchOpen, setIsModalSearchOpen] = useState(false);
  const [modalHighlightedIndex, setModalHighlightedIndex] = useState(-1);
  const modalSearchRef = useRef(null);

  // --- Main Form Search States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef(null);
  
  // --- Quantity Input Focus Ref ---
  const qtyInputRef = useRef(null);

  // --- Inline Message State & Top Scroll Ref ---
  const [message, setMessage] = useState({ text: '', type: '' });
  const topRef = useRef(null); 

  // --- Initialization ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [supplierRes, productRes, purchaseRes, transporterRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/suppliers`, { headers }),
          fetch(`${API_BASE_URL}/api/products`, { headers }),
          fetch(`${API_BASE_URL}/api/purchases/last-invoice`, { headers }),
          fetch(`${API_BASE_URL}/api/transporters`, { headers }) 
        ]);
        
        if (!supplierRes.ok || !productRes.ok) {
          showMessage('Unauthorized or session expired. Please relogin.', 'error');
          setSuppliers([]);
          setProducts([]);
          return;
        }

        const supplierData = await supplierRes.json();
        const productData = await productRes.json();
        const purchaseData = await purchaseRes.json();
        const transporterData = await transporterRes.json();

        setSuppliers(Array.isArray(supplierData) ? supplierData : (supplierData.data || []));
        setProducts(Array.isArray(productData) ? productData : (productData.data || []));
        setTransporters(Array.isArray(transporterData) ? transporterData : (transporterData.data || []));
        
        generateNextInvoiceNumber(purchaseData.lastInvoiceNumber);
      } catch (error) {
        showMessage('Failed to load database records. Please refresh.', 'error');
        setSuppliers([]);
        setProducts([]);
      }
    };
    fetchData();
  }, []);

  // Keyboard shortcut handler for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isEditModalOpen) {
          e.preventDefault();
          closeEditModal();
        }
      }
      if (e.key === 'Enter' && isEditModalOpen) {
        e.preventDefault();
        saveEditedItem();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, editFormData]);

  // Guaranteed Scroll to Top whenever a message appears
  useEffect(() => {
    if (message.text && topRef.current) {
      setTimeout(() => {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [message]);

  const generateNextInvoiceNumber = (lastInvoiceNumber) => {
    if (!lastInvoiceNumber) {
      const newNumber = 'PU-1';
      setNextInvoiceNumber(newNumber);
      setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newNumber }));
      return;
    }

    const match = lastInvoiceNumber.match(/PU-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      const newInvoiceNumber = `PU-${nextNumber}`;
      setNextInvoiceNumber(newInvoiceNumber);
      setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newInvoiceNumber }));
    } else {
      const newNumber = 'PU-1';
      setNextInvoiceNumber(newNumber);
      setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newNumber }));
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000); 
  };

  const handleInfoChange = (e) => {
    setPurchaseInfo({ ...purchaseInfo, [e.target.name]: e.target.value });
  };

  // --- Two-Way Logic: Supplier Selection ---
  const handleSupplierChange = (e) => {
    const selectedId = e.target.value;
    const selectedSupplier = suppliers.find(s => s._id === selectedId);

    setPurchaseInfo({
      ...purchaseInfo,
      supplierId: selectedId,
      supplierPhone: selectedSupplier?.phone || '',
      supplierCity: selectedSupplier?.city || ''
    });

    if (draftItem.product) {
      const currentProd = products.find(p => p._id === draftItem.product);
      if (currentProd && selectedId) {
        const link = currentProd.approvedSuppliers?.find(s => (s.supplier?._id || s.supplier) === selectedId);
        if (link) {
          setDraftItem(prev => ({ ...prev, unitPrice: link.purchasePrice }));
        }
      }
    }
  };

  const availableProducts = products.filter(p => {
    if (purchaseInfo.supplierId) {
      return p.approvedSuppliers?.some(s => (s.supplier?._id || s.supplier) === purchaseInfo.supplierId);
    }
    return true; 
  });

  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchKeyDown = (e) => {
    if (!isSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const newIndex = prev < filteredProducts.length - 1 ? prev + 1 : prev;
        setTimeout(() => {
          const element = document.querySelector(`[data-main-index="${newIndex}"]`);
          if (element) element.scrollIntoView({ block: 'nearest' });
        }, 50);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const newIndex = prev > 0 ? prev - 1 : 0;
        setTimeout(() => {
          const element = document.querySelector(`[data-main-index="${newIndex}"]`);
          if (element) element.scrollIntoView({ block: 'nearest' });
        }, 50);
        return newIndex;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        selectProduct(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const selectProduct = (product) => {
    let price = product.costPrice || product.retailPrice || '';
    const approvedSupplierIds = product.approvedSuppliers?.map(s => s.supplier?._id || s.supplier) || [];

    if (purchaseInfo.supplierId) {
      const link = product.approvedSuppliers?.find(s => (s.supplier?._id || s.supplier) === purchaseInfo.supplierId);
      if (link) {
        price = link.purchasePrice;
      }
    } else if (product.approvedSuppliers && product.approvedSuppliers.length === 1) {
      const singleLink = product.approvedSuppliers[0];
      const supId = singleLink.supplier?._id || singleLink.supplier;
      const matchedSup = suppliers.find(s => s._id === supId);
      
      if (matchedSup) {
        setPurchaseInfo(prev => ({
          ...prev,
          supplierId: supId,
          supplierPhone: matchedSup.phone || '',
          supplierCity: matchedSup.city || ''
        }));
      }
      price = singleLink.purchasePrice;
    }

    setDraftItem({
      ...draftItem,
      product: product._id,
      productName: product.name,
      unitPrice: price,
      quantity: 1
    });
    setSearchTerm(product.name);
    setIsSearchOpen(false);
    setHighlightedIndex(-1);

    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  const filteredModalProducts = products.filter(p =>
    p.name.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );

  const handleModalSearchKeyDown = (e) => {
    if (!isModalSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setModalHighlightedIndex(prev => {
        const newIndex = prev < filteredModalProducts.length - 1 ? prev + 1 : prev;
        setTimeout(() => {
          const element = document.querySelector(`[data-modal-index="${newIndex}"]`);
          if (element) element.scrollIntoView({ block: 'nearest' });
        }, 50);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setModalHighlightedIndex(prev => {
        const newIndex = prev > 0 ? prev - 1 : 0;
        setTimeout(() => {
          const element = document.querySelector(`[data-modal-index="${newIndex}"]`);
          if (element) element.scrollIntoView({ block: 'nearest' });
        }, 50);
        return newIndex;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (modalHighlightedIndex >= 0 && filteredModalProducts[modalHighlightedIndex]) {
        selectModalProduct(filteredModalProducts[modalHighlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsModalSearchOpen(false);
      setModalHighlightedIndex(-1);
    }
  };

  const selectModalProduct = (product) => {
    let price = product.costPrice || product.retailPrice || '';
    if (purchaseInfo.supplierId) {
      const link = product.approvedSuppliers?.find(s => (s.supplier?._id || s.supplier) === purchaseInfo.supplierId);
      if (link) price = link.purchasePrice;
    }

    setEditFormData({
      ...editFormData,
      product: product._id,
      productName: product.name,
      unitPrice: price,
    });
    setModalSearchTerm(product.name);
    setIsModalSearchOpen(false);
    setModalHighlightedIndex(-1);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
        setHighlightedIndex(-1);
      }
      if (modalSearchRef.current && !modalSearchRef.current.contains(event.target)) {
        setIsModalSearchOpen(false);
        setModalHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddDraftToTable = (e) => {
    if (e) e.preventDefault();
    if (!purchaseInfo.supplierId) return showMessage('Please select a supplier first.', 'error');
    if (!draftItem.product) return showMessage('Please select a valid product.', 'error');
    if (draftItem.quantity <= 0) return showMessage('Quantity must be greater than 0.', 'error');
    if (draftItem.unitPrice < 0) return showMessage('Unit price cannot be negative.', 'error');

    const currentSupplier = suppliers.find(s => s._id === purchaseInfo.supplierId);
    const supplierDisplayName = currentSupplier ? (currentSupplier.companyName || currentSupplier.contactPerson) : 'N/A';

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.product === draftItem.product);

      if (existingIndex !== -1) {
        const updated = [...prevItems];
        const existing = updated[existingIndex];
        const newQuantity = existing.quantity + draftItem.quantity;

        updated[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          unitPrice: draftItem.unitPrice,
          expiryDate: draftItem.expiryDate || existing.expiryDate,
          totalPrice: newQuantity * draftItem.unitPrice
        };
        return updated;
      }

      return [...prevItems, { 
        ...draftItem, 
        supplierId: purchaseInfo.supplierId,
        supplierName: supplierDisplayName,
        totalPrice: draftItem.quantity * draftItem.unitPrice 
      }];
    });

    setDraftItem({ product: '', productName: '', quantity: 1, unitPrice: '', expiryDate: '' });
    setSearchTerm('');
    if(message.type === 'error') setMessage({ text: '', type: '' });
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const openEditModal = (index) => {
    const item = items[index];
    setEditingIndex(index);
    setEditFormData({
      product: item.product,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      expiryDate: item.expiryDate || ''
    });
    setModalSearchTerm(item.productName);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingIndex(null);
    setModalSearchTerm('');
  };

  const saveEditedItem = () => {
    if (!editFormData.product) return showMessage('Please select a valid product.', 'error');
    if (editFormData.quantity <= 0) return showMessage('Quantity must be greater than 0.', 'error');
    if (editFormData.unitPrice < 0) return showMessage('Unit price cannot be negative.', 'error');

    const updatedItems = [...items];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      product: editFormData.product,
      productName: editFormData.productName,
      quantity: editFormData.quantity,
      unitPrice: editFormData.unitPrice,
      expiryDate: editFormData.expiryDate,
      totalPrice: editFormData.quantity * editFormData.unitPrice
    };

    setItems(updatedItems);
    showMessage('Item updated successfully!', 'success');
    setTimeout(() => closeEditModal(), 300);
  };

  // --- Calculations ---
  const itemsTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const freight = Number(purchaseInfo.freightAmount) || 0;
  const netPayable = itemsTotal + freight; 
  const balance = netPayable - (Number(paidAmount) || 0);

  // --- Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseInfo.supplierId) return showMessage('Supplier details are required.', 'error');
    if (items.length === 0) return showMessage('Please add at least one item.', 'error');

    const invoiceNumber = purchaseInfo.invoiceNumber || nextInvoiceNumber;

    if (!invoiceNumber.match(/^PU-\d+$/)) {
      showMessage('Invoice number must be in format PU-1, PU-2, etc.', 'error');
      return;
    }

    const payload = {
      supplierId: purchaseInfo.supplierId,
      transporterId: purchaseInfo.transporterId || null, 
      freightAmount: freight,                            
      invoiceNumber: invoiceNumber,
      purchaseDate: purchaseInfo.purchaseDate,
      totalAmount: netPayable,
      paidAmount: Number(paidAmount) || 0,
      balanceAmount: balance,
      items: items.map(item => ({
        product: item.product, 
        quantity: item.quantity, 
        unitPrice: item.unitPrice, 
        totalPrice: item.totalPrice, 
        expiryDate: item.expiryDate || null
      }))
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/purchases`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }, 
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        showMessage(`Purchase order ${invoiceNumber} created successfully!`, 'success');
        
        const match = invoiceNumber.match(/PU-(\d+)/);
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          const newInvoiceNumber = `PU-${nextNumber}`;
          setNextInvoiceNumber(newInvoiceNumber);
          setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newInvoiceNumber }));
        }
        
        setPurchaseInfo(prev => ({ 
          ...prev,
          supplierId: '', 
          transporterId: '', 
          freightAmount: '', 
          supplierPhone: '', 
          supplierCity: '',
          purchaseDate: new Date().toISOString().split('T')[0]
        }));
        setItems([]); 
        setPaidAmount('');
      } else {
        showMessage(result.message || 'Failed to process purchase order.', 'error');
      }
    } catch (error) {
      showMessage('Network error occurred while saving the order.', 'error');
    }
  };

  const InlineMessage = ({ message, type }) => {
    if (!message) return null;
    const isError = type === 'error';
    const isSuccess = type === 'success';

    const bg = isError ? 'var(--danger-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)';
    const text = isError ? 'var(--danger)' : isSuccess ? 'var(--success)' : 'var(--info)';
    const icon = isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️';

    return (
      <div style={{
        padding: '10px 14px',
        marginBottom: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${text}`,
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>{icon}</span> {message}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper" ref={topRef}>
      
      {message.text && <InlineMessage message={message.text} type={message.type} />}

      {isEditModalOpen && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Line Item</h3>
              <button className="modal-close" onClick={closeEditModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group" style={{ position: 'relative' }} ref={modalSearchRef}>
                <label className="form-label required">Search Product </label>
                <input
                  type="text" className="form-input" placeholder="Search product..."
                  value={modalSearchTerm}
                  onChange={(e) => { setModalSearchTerm(e.target.value); setIsModalSearchOpen(true); setModalHighlightedIndex(-1); }}
                  onKeyDown={handleModalSearchKeyDown}
                  onClick={() => setIsModalSearchOpen(true)}
                  autoFocus
                />
                {isModalSearchOpen && filteredModalProducts.length > 0 && (
                  <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', 
                    maxHeight: '200px', overflowY: 'auto', zIndex: 1000, margin: 'var(--space-xs) 0 0 0', padding: 0, 
                    listStyle: 'none', boxShadow: 'var(--shadow-md)'
                  }}>
                    {filteredModalProducts.map((product, index) => (
                      <li
                        key={product._id}
                        data-modal-index={index}
                        onClick={() => selectModalProduct(product)}
                        onMouseEnter={() => setModalHighlightedIndex(index)}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          backgroundColor: index === modalHighlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                          borderLeft: index === modalHighlightedIndex ? '3px solid var(--primary)' : '3px solid transparent',
                          color: 'var(--text-main)'
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: index === modalHighlightedIndex ? 600 : 400 }}>{product.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Stock: {product.quantity || 0} | Price: {product.retailPrice || 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Unit Price </label>
                  <input
                    type="number" step="10" className="form-input"
                    value={editFormData.unitPrice === 0 || editFormData.unitPrice === '' ? '' : editFormData.unitPrice}
                    onChange={e => {
                      const val = e.target.value.replace(/^0+/, '');
                      setEditFormData({ ...editFormData, unitPrice: val === '' ? 0 : Number(val) });
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditedItem(); }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Quantity </label>
                  <input
                    type="number" min="1" className="form-input"
                    value={editFormData.quantity === 0 || editFormData.quantity === '' ? '' : editFormData.quantity}
                    onChange={e => {
                      const val = e.target.value.replace(/^0+/, '');
                      setEditFormData({ ...editFormData, quantity: val === '' ? 0 : Number(val) });
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEditedItem(); }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Expiry Date</label>
                  <input type="date" className="form-input" value={editFormData.expiryDate} onChange={e => setEditFormData({ ...editFormData, expiryDate: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveEditedItem}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          
          <div className="card" style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: '15px' }}>Add Products</h4>
            
            <div className="form-group" style={{ position: 'relative' }} ref={searchRef}>
              <label className="form-label required">Search Product </label>
              <input
                type="text" className="form-input" placeholder={purchaseInfo.supplierId ? "Type to search approved products..." : "Type to search all products..."}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); setHighlightedIndex(-1); }}
                onKeyDown={handleSearchKeyDown}
                onClick={() => setIsSearchOpen(true)}
              />
              {isSearchOpen && filteredProducts.length > 0 && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', 
                  maxHeight: '200px', overflowY: 'auto', zIndex: 1000, margin: 'var(--space-xs) 0 0 0', padding: 0, 
                  listStyle: 'none', boxShadow: 'var(--shadow-md)'
                }}>
                  {filteredProducts.map((product, index) => (
                    <li
                      key={product._id}
                      data-main-index={index}
                      onClick={() => selectProduct(product)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      style={{
                        padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: index === highlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                        borderLeft: index === highlightedIndex ? '3px solid var(--primary)' : '3px solid transparent',
                        color: 'var(--text-main)'
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: index === highlightedIndex ? 600 : 400 }}>{product.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Stock: {product.quantity || 0}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required">Unit Price </label>
                <input
                  type="number" step="10" className="form-input" placeholder="Enter price"
                  value={draftItem.unitPrice === 0 || draftItem.unitPrice === '' ? '' : draftItem.unitPrice}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, '');
                    setDraftItem({ ...draftItem, unitPrice: val === '' ? 0 : Number(val) });
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required">Quantity </label>
                <input
                  ref={qtyInputRef} type="number" min="1" className="form-input"
                  value={draftItem.quantity === 0 || draftItem.quantity === '' ? '' : draftItem.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, '');
                    setDraftItem({ ...draftItem, quantity: val === '' ? 0 : Number(val) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDraftToTable(e);
                    }
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={draftItem.expiryDate} onChange={(e) => setDraftItem({ ...draftItem, expiryDate: e.target.value })} />
            </div>

          </div>

          <div className="card" style={{ flex: 1, minWidth: '320px' }}>
            <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: '15px' }}>Supplier Details</h4>
            
            <div className="form-group">
              <label className="form-label required">Select Supplier </label>
              <select className="form-input" name="supplierId" value={purchaseInfo.supplierId} onChange={handleSupplierChange} required>
                <option value="">-- Choose Supplier --</option>
                {suppliers
                  .filter(s => {
                    if (draftItem.product) {
                      const selectedProd = products.find(p => p._id === draftItem.product);
                      if (selectedProd && selectedProd.approvedSuppliers && selectedProd.approvedSuppliers.length > 0) {
                        return selectedProd.approvedSuppliers.some(link => (link.supplier?._id || link.supplier) === s._id);
                      }
                    }
                    return true; 
                  })
                  .map(s => (
                    <option key={s._id} value={s._id}>
                      {s.contactPerson} {s.companyName ? `(${s.companyName})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone</label>
                <input type="text" className="form-input" value={purchaseInfo.supplierPhone} readOnly disabled style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed' }} placeholder="Auto-fills" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">City</label>
                <input type="text" className="form-input" value={purchaseInfo.supplierCity} readOnly disabled style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed' }} placeholder="Auto-fills" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Transporter (Optional)
                </label>
                <select 
                  className="form-input" 
                  name="transporterId" 
                  value={purchaseInfo.transporterId} 
                  onChange={handleInfoChange}
                >
                  <option value="">-- None --</option>
                  {transporters.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} {t.companyName ? `(${t.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Freight Amount</label>
                <input 
                  type="number" 
                  min="0" 
                  className="form-input" 
                  name="freightAmount" 
                  placeholder="0" 
                  value={purchaseInfo.freightAmount === 0 || purchaseInfo.freightAmount === '' ? '' : purchaseInfo.freightAmount} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, '');
                    setPurchaseInfo({ ...purchaseInfo, freightAmount: val === '' ? '' : Number(val) });
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Purchase Date </label>
              <input type="date" className="form-input" name="purchaseDate" value={purchaseInfo.purchaseDate} onChange={handleInfoChange} required />
            </div>
          </div>
        </div>

        <div style={{marginTop: '8px', marginBottom: 'var(--space-md)' }}>
           <button
             type="button"
             className="btn btn-primary"
             style={{ padding: '14px 24px', fontSize: '15px', fontWeight: 'bold', width: '15%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
             onClick={handleAddDraftToTable}
           >
             Add to Cart {(!purchaseInfo.supplierId || !draftItem.product) }
           </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
             <thead>
                <tr>
                  <th style={tableStyles.th}>Sr#</th>
                  <th style={tableStyles.th}>Product Name</th>
                  <th style={tableStyles.th}>Supplier</th>
                  <th style={tableStyles.th}>Qty</th>
                  <th style={tableStyles.th}>Cost</th>
                  <th style={tableStyles.th}>Subtotal</th>
                  <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                      No products added yet. Use the form above to add items.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={tableStyles.td}>{index + 1}</td>
                      <td style={tableStyles.td}>{item.productName}</td>
                      <td style={{ ...tableStyles.td, fontWeight: 500, color: 'var(--primary)' }}>{item.supplierName}</td>
                      <td style={tableStyles.td}>{item.quantity}</td>
                      <td style={tableStyles.td}>{item.unitPrice.toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, fontWeight: 'bold' }}>{item.totalPrice.toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button type="button" style={actionStyles.iconBtnEdit} onClick={() => openEditModal(index)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button type="button" style={actionStyles.iconBtnDelete} onClick={() => removeItemRow(index)} title="Remove">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '15px' }}>Billing Summary</h4>
            
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px', height: '32px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--primary)' }}
              onClick={() => setPaidAmount(netPayable)}
            >
             Pay All (Full Payment)
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)', alignItems: 'flex-end', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Items Total</label>
              <input type="text" className="form-input" style={{ textAlign: 'center', backgroundColor: 'var(--bg-surface)' }} value={itemsTotal.toFixed(2)} readOnly disabled />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Freight (+)</label>
              <input type="text" className="form-input" style={{ textAlign: 'center', backgroundColor: 'var(--bg-surface)' }} value={freight.toFixed(2)} readOnly disabled />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Net Payable</label>
              <input type="text" className="form-input" style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: 'var(--bg-surface)' }} value={netPayable.toFixed(2)} readOnly disabled />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Paid Amount</label>
              <input
                type="number" step="10" className="form-input" style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid var(--primary)' }}
                value={paidAmount === 0 || paidAmount === '' ? '' : paidAmount}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, '');
                  setPaidAmount(val === '' ? '' : Number(val));
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Balance</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ 
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  color: balance > 0 ? 'var(--danger)' : 'var(--success)',
                  backgroundColor: 'var(--bg-surface)' 
                }} 
                value={balance.toFixed(2)} readOnly disabled 
              />
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: 'var(--space-lg)' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
              Save Purchase Order
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Strict Table Styles Rule Enforced
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

const actionStyles = {
  iconBtnEdit: {
    background: 'var(--edit)',
    color: 'var(--primary)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnDelete: {
    backgroundColor: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
};

export default AddPurchase;