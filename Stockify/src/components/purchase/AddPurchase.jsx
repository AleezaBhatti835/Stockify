import React, { useState, useEffect, useRef } from 'react';

function AddPurchase() {
  // --- Data States ---
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');

  // --- Form States ---
  const [purchaseInfo, setPurchaseInfo] = useState({
    supplierId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierPhone: '',
    supplierCity: ''
  });

  const [items, setItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);

  // --- Draft Item State ---
  const [draftItem, setDraftItem] = useState({
    product: '', productName: '', quantity: 1, unitPrice: 0, expiryDate: ''
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

        const [supplierRes, productRes, purchaseRes] = await Promise.all([
          fetch('http://localhost:5000/api/suppliers', { headers }),
          fetch('http://localhost:5000/api/products', { headers }),
          fetch('http://localhost:5000/api/purchases/last-invoice', { headers })
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

        setSuppliers(Array.isArray(supplierData) ? supplierData : (supplierData.data || []));
        setProducts(Array.isArray(productData) ? productData : (productData.data || []));
        
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

    // Agar draft mein koi product pehle se selected tha, toh check karein ke kya wo naye supplier se linked hai?
    if (draftItem.product) {
      const currentProd = products.find(p => p._id === draftItem.product);
      if (currentProd && selectedId) {
        const link = currentProd.approvedSuppliers?.find(s => (s.supplier?._id || s.supplier) === selectedId);
        if (link) {
          // Rate update kar dein agar supplier ka makhsoos rate mojood hai
          setDraftItem(prev => ({ ...prev, unitPrice: link.purchasePrice }));
        }
      }
    }
  };

  // --- Two-Way Logic: Available Products Filtering based on Supplier ---
  const availableProducts = products.filter(p => {
    // Agar supplier select hai, toh sirf wahi products dikhayein jo is supplier se linked hain
    if (purchaseInfo.supplierId) {
      return p.approvedSuppliers?.some(s => (s.supplier?._id || s.supplier) === purchaseInfo.supplierId);
    }
    return true; // Agar supplier select nahi hai toh sare products show honge
  });

  // --- Main Form Search Logic ---
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
    let price = product.costPrice || product.retailPrice || 0;
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

    // 💡 FIX: Suppliers ki list ko filter kar dete hain taake sirf approved suppliers hi dropdown mein dikhein
    if (approvedSupplierIds.length > 0 && !purchaseInfo.supplierId) {
    }

    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  // --- Modal Form Search Logic ---
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
    let price = product.costPrice || product.retailPrice || 0;
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

  // Close dropdowns on outside click
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
    if (!draftItem.product) return showMessage('Please select a valid product.', 'error');
    if (!purchaseInfo.supplierId) return showMessage('Please select a supplier first.', 'error');
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

    setDraftItem({ product: '', productName: '', quantity: 1, unitPrice: 0, expiryDate: '' });
    setSearchTerm('');
    if(message.type === 'error') setMessage({ text: '', type: '' });
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- Edit Modal Logic ---
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
  const netPayable = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
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
      invoiceNumber: invoiceNumber,
      purchaseDate: purchaseInfo.purchaseDate,
      totalAmount: netPayable,
      paidAmount: Number(paidAmount),
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
      const response = await fetch('http://localhost:5000/api/purchases', {
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
          supplierPhone: '', 
          supplierCity: '',
          purchaseDate: new Date().toISOString().split('T')[0]
        }));
        setItems([]); 
        setPaidAmount(0);
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

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Line Item</h3>
              <button className="modal-close" onClick={closeEditModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group" style={{ position: 'relative' }} ref={modalSearchRef}>
                <label className="form-label">Search Product *</label>
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
                  <label className="form-label">Unit Price *</label>
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
                  <label className="form-label">Quantity *</label>
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
        
        {/* --- TOP SPLIT: ADD PRODUCTS & SUPPLIER --- */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          
          {/* Add Products Section */}
          <div className="card" style={{ flex: 1, minWidth: '320px' }}>
            <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: '15px' }}>Add Products</h4>
            
            <div className="form-group" style={{ position: 'relative' }} ref={searchRef}>
              <label className="form-label">Search Product *</label>
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
                <label className="form-label">Unit Price *</label>
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
                <label className="form-label">Quantity *</label>
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

            <button type="button" className="btn btn-primary" style={{ width: '30%'}} onClick={handleAddDraftToTable}>
              + Add to Cart
            </button>
          </div>

          {/* Supplier Section */}
          <div className="card" style={{ flex: 1, minWidth: '320px' }}>
            <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: '15px' }}>Supplier Details</h4>
            
            <div className="form-group">
              <label className="form-label">Select Supplier *</label>
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Purchase Date *</label>
              <input type="date" className="form-input" name="purchaseDate" value={purchaseInfo.purchaseDate} onChange={handleInfoChange} required />
            </div>
          </div>
        </div>

        {/* --- MIDDLE: DATA TABLE --- */}
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
                      <td style={{ ...tableStyles.td, fontWeight: 500, color: 'var(--primary)' }}>{item.supplierName}</td> {/* 💡 SUPPLIER NAME */}
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

      {/* --- BOTTOM: BILLING --- */}
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', alignItems: 'flex-end', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Net Payable</label>
              <input type="text" className="form-input" style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: 'var(--bg-surface)' }} value={netPayable.toFixed(2)} readOnly disabled />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ textAlign: 'center' }}>Paid Amount</label>
              <input
                type="number" step="10" className="form-input" style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid var(--primary)' }}
                value={paidAmount === 0 || paidAmount === '' ? '' : paidAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, '');
                  setPaidAmount(val === '' ? 0 : Number(val));
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

// Strict Actions Rule Enforced
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