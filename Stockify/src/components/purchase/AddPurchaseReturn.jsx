import React, { useState, useEffect, useRef } from 'react';

const PurchaseReturnByInvoice = () => {
  const [returnMode, setReturnMode] = useState('with');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [completing, setCompleting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  
  // --- CUSTOM CONFIRMATION MODAL STATE ---
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    message: '', 
    onConfirm: null,
    onCancel: null
  });

  // ==========================================
  // SHARED DATA STATES
  // ==========================================
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const messageTimerRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // ==========================================
  // WITH INVOICE STATES
  // ==========================================
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // References
  const firstQtyInputRef = useRef(null);
  const withInvoiceWrapperRef = useRef(null);

  // ==========================================
  // WITHOUT INVOICE STATES
  // ==========================================
  const [woSupplierId, setWoSupplierId] = useState('');
  const [woDate, setWoDate] = useState(new Date().toISOString().split('T')[0]);
  const [woProductSearch, setWoProductSearch] = useState('');
  const [woFilteredProducts, setWoFilteredProducts] = useState([]);
  const [woShowSuggestions, setWoShowSuggestions] = useState(false);
  const [woHighlightedIndex, setWoHighlightedIndex] = useState(-1);
  const [woSelectedProduct, setWoSelectedProduct] = useState(null);
  const [woQuantity, setWoQuantity] = useState(1);
  const [woLineItems, setWoLineItems] = useState([]);

  // References
  const woQtyInputRef = useRef(null);
  const woProductWrapperRef = useRef(null);

  // ================= LOAD INITIAL DATA (WITH TOKEN) =================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const [invRes, supRes, prodRes] = await Promise.all([
          fetch('http://localhost:5000/api/purchases', { 
            cache: 'no-store',
            headers 
          }),
          fetch('http://localhost:5000/api/suppliers', { 
            cache: 'no-store',
            headers 
          }),
          fetch('http://localhost:5000/api/products', { 
            cache: 'no-store',
            headers 
          })
        ]);
        
        const invData = await invRes.json();
        const supData = await supRes.json();
        const prodData = await prodRes.json();

        const numbers = Array.isArray(invData)
          ? invData
              .map(p => p.invoiceNumber)
              .filter(num => num && num.startsWith('PU-'))
              .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
          : [];
        setAvailableInvoiceNumbers(numbers);

        if (Array.isArray(supData)) setSuppliers(supData);
        if (Array.isArray(prodData)) setProducts(prodData);

      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Global Keyboard Shortcuts for Confirmation Modal
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter' && confirmDialog.isOpen) {
        e.preventDefault();
        if (confirmDialog.onConfirm) {
          confirmDialog.onConfirm();
        }
      }
      
      if (e.key === 'Escape' && confirmDialog.isOpen) {
        e.preventDefault();
        closeConfirmDialog();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [confirmDialog.isOpen, confirmDialog.onConfirm]);

  // Click Outside Listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (withInvoiceWrapperRef.current && !withInvoiceWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (woProductWrapperRef.current && !woProductWrapperRef.current.contains(event.target)) {
        setWoShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  // Auto-focus on confirm button when modal opens
  useEffect(() => {
    if (confirmDialog.isOpen) {
      setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    }
  }, [confirmDialog.isOpen]);

  const showMessage = (text, type) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage({ text, type });
    messageTimerRef.current = setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  // ==========================================
  // CONFIRM DIALOG HELPERS
  // ==========================================
  const openConfirmDialog = (message, onConfirm) => {
    setConfirmDialog({ 
      isOpen: true, 
      message, 
      onConfirm: onConfirm,
      onCancel: () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null, onCancel: null });
  };

  // ==========================================
  // WITH INVOICE LOGIC
  // ==========================================
  useEffect(() => {
    if (searchInvoiceNumber.trim() === '') {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }
    const filtered = availableInvoiceNumbers.filter(num =>
      num.toLowerCase().includes(searchInvoiceNumber.toLowerCase())
    );
    setFilteredSuggestions(filtered);
    
    if (filtered.length === 1 && filtered[0].toUpperCase() === searchInvoiceNumber.trim().toUpperCase()) {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(filtered.length > 0);
    }
    setHighlightedIndex(-1);
  }, [searchInvoiceNumber, availableInvoiceNumbers]);

  // Scroll active item into view (With Invoice)
  useEffect(() => {
    if (showSuggestions && highlightedIndex >= 0) {
      const el = document.getElementById(`with-invoice-item-${highlightedIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedIndex, showSuggestions]);

  const handleWithInvoiceKeyDown = (e) => {
    if (!showSuggestions && filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredSuggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          const selected = filteredSuggestions[highlightedIndex];
          setSearchInvoiceNumber(selected);
          setShowSuggestions(false);
          handleSearch(selected);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // ================= HANDLE SEARCH (WITH TOKEN) =================
  const handleSearch = async (overrideNumber = null) => {
    const queryNumber = typeof overrideNumber === 'string' ? overrideNumber : searchInvoiceNumber;
    if (!queryNumber || !queryNumber.trim()) return showMessage('Enter an invoice number.', 'error');

    setSearching(true);
    setPurchase(null);
    setLineItems([]);
    setLastResult(null);
    setShowSuggestions(false);
    setHighlightedIndex(-1);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/purchases/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        if (!data.items || data.items.length === 0) {
          showMessage(`Invoice "${queryNumber.trim()}" has no items to return.`, 'error');
          return;
        }

        const origTotalQty = data.items.reduce((sum, item) => sum + (item.purchaseQty || item.quantity || 0), 0);
        const origTotalAmount = data.items.reduce((sum, item) => sum + ((item.purchaseQty || item.quantity || 0) * (item.unitPrice || 0)), 0);

        setPurchase({ ...data.purchase, origTotalQty, origTotalAmount });
        setLineItems(
          data.items.map(item => ({
            productId: item.product._id,
            productName: item.product.name,
            purchaseQty: item.purchaseQty,
            returnQty: item.returnQty,
            maxReturnable: item.maxReturnable,
            unitPrice: item.unitPrice,
            transactionQty: 0
          }))
        );

        setTimeout(() => {
          if (firstQtyInputRef.current) {
            firstQtyInputRef.current.focus();
            firstQtyInputRef.current.select();
          }
        }, 100);

      } else {
        showMessage(data.message || 'No invoice found.', 'error');
      }
    } catch (error) {
      showMessage('Failed to search invoice.', 'error');
    } finally {
      setSearching(false);
    }
  };

  // ================= HANDLE COMPLETE WITH INVOICE =================
  const handleCompleteWithInvoice = async () => {
    closeConfirmDialog();
    
    const itemsToReturn = lineItems.filter(row => row.transactionQty > 0).map(row => ({
        product: row.productId, 
        quantity: row.transactionQty, 
        unitPrice: row.unitPrice
    }));

    if (itemsToReturn.length === 0) {
      showMessage('No items to return.', 'error');
      return;
    }

    setCompleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/purchase-returns/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          purchaseId: purchase._id,
          supplierId: purchase.supplier?._id,
          invoiceNumber: purchase.invoiceNumber,
          items: itemsToReturn
        })
      });
      const result = await res.json();
      if (result.success) {
        showMessage('Return successful.', 'success');
        setLastResult({ 
          previousBalance: result.previousBalance, 
          returnAmount: result.returnAmount, 
          newBalance: result.newBalance 
        });
        setPurchase(null); 
        setLineItems([]); 
        setSearchInvoiceNumber('');
      } else {
        showMessage(result.message || 'Failed to return.', 'error');
      }
    } catch (error) {
      console.error('Error completing return:', error);
      showMessage('Network error.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  // ==========================================
  // WITHOUT INVOICE LOGIC
  // ==========================================
  const handleWoProductSearchChange = (e) => {
    const val = e.target.value;
    setWoProductSearch(val);
    setWoSelectedProduct(null);
    setWoHighlightedIndex(-1);

    if (val.trim() !== '') {
      const filtered = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(val.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(val.toLowerCase()))
      );
      setWoFilteredProducts(filtered);
      setWoShowSuggestions(true);
    } else {
      setWoShowSuggestions(false);
    }
  };

  // Scroll active item into view (Without Invoice)
  useEffect(() => {
    if (woShowSuggestions && woHighlightedIndex >= 0) {
      const el = document.getElementById(`wo-prod-item-${woHighlightedIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [woHighlightedIndex, woShowSuggestions]);

  const handleWoProductKeyDown = (e) => {
    if (!woShowSuggestions && woFilteredProducts.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleWoAddToCart();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setWoHighlightedIndex(prev => prev < woFilteredProducts.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setWoHighlightedIndex(prev => prev > 0 ? prev - 1 : woFilteredProducts.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (woHighlightedIndex >= 0 && woHighlightedIndex < woFilteredProducts.length) {
          selectWoProduct(woFilteredProducts[woHighlightedIndex]);
        } else {
          handleWoAddToCart();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setWoShowSuggestions(false);
        setWoHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const selectWoProduct = (prod) => {
    setWoSelectedProduct(prod);
    setWoProductSearch(`${prod.name} ${prod.barcode ? `(${prod.barcode})` : ''}`);
    setWoShowSuggestions(false);
    setWoHighlightedIndex(-1);
    setWoQuantity(1);

    setTimeout(() => {
      if (woQtyInputRef.current) {
        woQtyInputRef.current.focus();
        woQtyInputRef.current.select();
      }
    }, 10);
  };

  const handleWoAddToCart = () => {
    if (!woSelectedProduct) return showMessage('Please select a valid product.', 'error');
    const qty = Number(woQuantity);
    if (!qty || qty <= 0) return showMessage('Quantity must be greater than 0.', 'error');

    setWoLineItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === woSelectedProduct._id);
      const priceToUse = woSelectedProduct.purchasePrice || woSelectedProduct.costPrice || 0;

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].transactionQty += qty;
        updated[existingIndex].totalPrice = updated[existingIndex].transactionQty * updated[existingIndex].unitPrice;
        return updated;
      }
      return [...prev, {
        productId: woSelectedProduct._id,
        productName: woSelectedProduct.name,
        inStock: woSelectedProduct.quantity || 0,
        transactionQty: qty,
        unitPrice: priceToUse,
        totalPrice: qty * priceToUse
      }];
    });

    setWoProductSearch('');
    setWoSelectedProduct(null);
    setWoQuantity(1);
    setWoShowSuggestions(false);
    setWoHighlightedIndex(-1);
  };

  // ================= HANDLE COMPLETE WITHOUT INVOICE =================
  const handleCompleteWithoutInvoice = async () => {
    closeConfirmDialog();
    
    const itemsToReturn = woLineItems.map(row => ({
      product: row.productId, 
      quantity: row.transactionQty, 
      unitPrice: row.unitPrice
    }));

    if (itemsToReturn.length === 0) {
      showMessage('No items to return.', 'error');
      return;
    }

    if (!woSupplierId) {
      showMessage('Please select a supplier before confirming the return.', 'error');
      return;
    }

    setCompleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/purchase-returns/blind-return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          supplierId: woSupplierId,
          returnDate: woDate,
          items: itemsToReturn
        })
      });
      const result = await res.json();
      if (result.success) {
        showMessage('Return completed successfully.', 'success');
        setWoLineItems([]);
        setWoSupplierId('');
        setWoDate(new Date().toISOString().split('T')[0]);
      } else {
        showMessage(result.message || 'Failed to complete blind return.', 'error');
      }
    } catch (error) {
      console.error('Error completing blind return:', error);
      showMessage('Network error. Please ensure the blind return endpoint exists.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  // Calculations
  const withTotalAmount = lineItems.reduce((sum, row) => sum + ((row.transactionQty || 0) * row.unitPrice), 0);
  const woTotalAmount = woLineItems.reduce((sum, row) => sum + row.totalPrice, 0);
  const selectedSupplierObj = suppliers.find(s => s._id === woSupplierId) || {};

  // Global Keydown for Ctrl + Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (returnMode === 'with' && purchase && withTotalAmount > 0 && !confirmDialog.isOpen) {
          openConfirmDialog(`Process return for Rs ${withTotalAmount.toFixed(2)}?`, handleCompleteWithInvoice);
        } else if (returnMode === 'without' && woLineItems.length > 0 && woSupplierId && !confirmDialog.isOpen) {
          openConfirmDialog(`Process blind return to ${selectedSupplierObj.companyName || selectedSupplierObj.contactPerson || 'supplier'} for Rs ${woTotalAmount.toFixed(2)}?`, handleCompleteWithoutInvoice);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [returnMode, purchase, withTotalAmount, woLineItems.length, woSupplierId, woTotalAmount, selectedSupplierObj, confirmDialog.isOpen, lineItems, woLineItems]);

  // Inline Message Component
  const InlineMessage = ({ msg }) => {
    if (!msg.text) return null;
    const isError = msg.type === 'error';
    const isSuccess = msg.type === 'success';

    const bg = isError ? 'var(--danger-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)';
    const text = isError ? 'var(--danger)' : isSuccess ? 'var(--success)' : 'var(--info)';
    const icon = isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️';

    return (
      <div style={{
        padding: '12px 16px',
        marginBottom: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${text}`,
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{icon} {msg.text}</span>
        <button
          onClick={() => setMessage({ text: '', type: '' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'inherit', lineHeight: '1' }}
        >
          &times;
        </button>
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper"> 


      <InlineMessage msg={message} />

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setReturnMode('with'); setMessage({ text: '', type: '' }); }}
          style={{ 
            padding: '10px 24px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            border: returnMode === 'with' ? 'none' : '1px solid var(--border-color)', 
            backgroundColor: returnMode === 'with' ? 'var(--primary-other)' : 'var(--bg-surface)', 
            color: returnMode === 'with' ? '#fff' : 'var(--text-main)'
          }}
        >
          Return with Invoice
        </button>
        <button 
          onClick={() => { setReturnMode('without'); setMessage({ text: '', type: '' }); }}
          style={{ 
            padding: '10px 24px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            border: returnMode === 'without' ? 'none' : '1px solid var(--border-color)', 
            backgroundColor: returnMode === 'without' ? 'var(--primary-other)' : 'var(--bg-surface)', 
            color: returnMode === 'without' ? '#fff' : 'var(--text-main)'
          }}
        >
          Return without Invoice
        </button>
      </div>
      {returnMode === 'with' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="card" style={{ position: 'relative', zIndex: 100 }}>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={withInvoiceWrapperRef}>
              <label className="form-label required">Search Invoice Number </label>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <input 
                  type="text" 
                  className="form-input"
                  autoComplete="off"
                  placeholder="e.g. PU-1" 
                  value={searchInvoiceNumber} 
                  onChange={(e) => setSearchInvoiceNumber(e.target.value.toUpperCase())} 
                  onFocus={() => { if (searchInvoiceNumber.trim()) setShowSuggestions(true); }} 
                  onKeyDown={handleWithInvoiceKeyDown}
                />
                <button className="btn btn-primary" onClick={() => handleSearch()} disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, 
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', 
                  borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', 
                  maxHeight: '200px', overflowY: 'auto', padding: 0, margin: 'var(--space-xs) 0 0 0',
                  zIndex: 9999, boxShadow: 'var(--shadow-md)', listStyle: 'none'
                }}>
                  {filteredSuggestions.map((num, index) => (
                    <li 
                      key={index} 
                      id={`with-invoice-item-${index}`}
                      onClick={() => { setSearchInvoiceNumber(num); setShowSuggestions(false); handleSearch(num); }} 
                      onMouseEnter={() => setHighlightedIndex(index)} 
                      style={{ 
                        padding: '10px 14px', cursor: 'pointer', 
                        backgroundColor: index === highlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)', 
                        color: 'var(--text-main)', 
                        borderBottom: index < filteredSuggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                        fontWeight: index === highlightedIndex ? '600' : '400',
                        borderLeft: index === highlightedIndex ? '3px solid var(--primary)' : '3px solid transparent'
                      }}
                    >
                      {num}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {purchase && (
            <div className="card" style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap', backgroundColor: 'var(--primary-light)', border: '1px dashed var(--btn-border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Invoice #:</strong> {purchase.invoiceNumber}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Date:</strong> {new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString()}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Supplier:</strong> {purchase.supplier?.contactPerson || purchase.supplier?.name || 'Unknown'}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Orig. Qty:</strong> {purchase.origTotalQty}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Orig. Amount:</strong> Rs. {(purchase.origTotalAmount || 0).toFixed(2)}</span>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableStyles.th}>Name</th>
                    <th style={tableStyles.th}>Invoice #</th>
                    <th style={tableStyles.th}>Purchase Qty</th>
                    <th style={tableStyles.th}>Previous Return</th>
                    <th style={tableStyles.th}>Return Qty</th>
                    <th style={tableStyles.th}>Price</th>
                    <th style={tableStyles.th}>Refund</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr><td colSpan="8" style={tableStyles.emptyCell}>No invoice items.</td></tr>
                  ) : (
                    lineItems.map((row, index) => (
                      <tr key={row.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={tableStyles.td}>{row.productName}</td>
                        <td style={{ ...tableStyles.td, fontWeight: 600 }}>{purchase?.invoiceNumber || '—'}</td>
                        <td style={tableStyles.td}>{row.purchaseQty}</td>
                        <td style={tableStyles.td}>{row.returnQty}</td>
                        <td style={tableStyles.td}>
                          <input 
                            ref={index === 0 ? firstQtyInputRef : null}
                            type="number" min="0" max={row.maxReturnable} 
                            className="form-input"
                            style={{ padding: '6px', maxWidth: '100px' }}
                            value={row.transactionQty || ''} 
                            disabled={row.maxReturnable === 0} 
                            onChange={(e) => {
                              let val = e.target.value.replace(/^0+/, '');
                              const qty = Math.min(Math.max(0, Number(val)), row.maxReturnable);
                              setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, transactionQty: qty } : r));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (withTotalAmount > 0) {
                                  openConfirmDialog(`Process return for Rs ${withTotalAmount.toFixed(2)}?`, handleCompleteWithInvoice);
                                }
                              }
                            }}
                          />
                        </td>
                        <td style={tableStyles.td}>{row.unitPrice}</td>
                        <td style={{ ...tableStyles.td, fontWeight: 600 }}>{((row.transactionQty || 0) * row.unitPrice).toFixed(2)}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button 
                              style={{ 
                                ...actionStyles.iconBtnDelete, 
                                opacity: row.transactionQty === 0 ? 0.4 : 1, 
                                cursor: row.transactionQty === 0 ? 'not-allowed' : 'pointer' 
                              }}
                              onClick={() => setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, transactionQty: 0 } : r))}
                              disabled={row.transactionQty === 0}
                              title="Clear Qty"
                            >
                              ✕
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

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div style={{ padding: 'var(--space-sm) var(--space-md)', borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px' }}>TOTAL REFUND AMOUNT</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>{withTotalAmount.toFixed(2)}</div>
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ padding: '14px 28px', fontSize: '15px' }} 
              disabled={completing || !purchase || withTotalAmount === 0} 
              onClick={() => {
                if (withTotalAmount > 0) {
                  openConfirmDialog(`Process return for Rs ${withTotalAmount.toFixed(2)}?`, handleCompleteWithInvoice);
                }
              }}
              title="Shortcut: Ctrl + Enter"
            >
              {completing ? 'Processing...' : 'Complete Return'}
            </button>
          </div>
        </div>
      )}

      {returnMode === 'without' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'stretch' }}>
            
            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>Add Products</h4>
              
              <div className="form-group" style={{ position: 'relative' }} ref={woProductWrapperRef}>
                <label className="form-label required">Search Product </label>
                <input 
                  type="text" 
                  className="form-input"
                  autoComplete="off"
                  placeholder="Type to search..." 
                  value={woProductSearch} 
                  onChange={handleWoProductSearchChange} 
                  onKeyDown={handleWoProductKeyDown}
                  onFocus={() => { if (woProductSearch.trim()) setWoShowSuggestions(true); }}
                />
                {woShowSuggestions && woFilteredProducts.length > 0 && (
                  <ul style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', 
                    borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', 
                    maxHeight: '200px', overflowY: 'auto', padding: 0, margin: 'var(--space-xs) 0 0 0',
                    zIndex: 1000, boxShadow: 'var(--shadow-md)', listStyle: 'none'
                  }}>
                    {woFilteredProducts.map((p, i) => (
                      <li 
                        key={p._id} 
                        id={`wo-prod-item-${i}`}
                        onClick={() => selectWoProduct(p)} 
                        onMouseEnter={() => setWoHighlightedIndex(i)}
                        style={{ 
                          padding: '10px 14px', cursor: 'pointer', 
                          backgroundColor: i === woHighlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)', 
                          color: 'var(--text-main)', 
                          borderBottom: i < woFilteredProducts.length - 1 ? '1px solid var(--border-color)' : 'none',
                          fontWeight: i === woHighlightedIndex ? '600' : '400',
                          borderLeft: i === woHighlightedIndex ? '3px solid var(--primary)' : '3px solid transparent'
                        }}
                      >
                        <div style={{ fontSize: '14px' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Stock: {p.quantity || 0} {p.barcode ? `| Barcode: ${p.barcode}` : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label required">Quantity </label>
                <input 
                  ref={woQtyInputRef}
                  type="number" 
                  className="form-input"
                  min="1" 
                  value={woQuantity || ''} 
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, '');
                    setWoQuantity(val);
                  }} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleWoAddToCart();
                  }}
                />
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button className="btn btn-primary" style={{ width: '30%',marginLeft:'36%' }} onClick={handleWoAddToCart}>
                  + Add to Cart
                </button>
              </div>
            </div>

            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--primary)', fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>Supplier Details</h4>

              <div className="form-group">
                <label className="form-label required">Select Supplier </label>
                <select className="form-input" value={woSupplierId} onChange={e => setWoSupplierId(e.target.value)}>
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s._id} value={s._id}>{s.contactPerson} {s.companyName ? `(${s.companyName})` : ''}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" readOnly disabled placeholder="Auto-fills" value={selectedSupplierObj.phone || ''} style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" readOnly disabled placeholder="Auto-fills" value={selectedSupplierObj.address || ''} style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required">Return Date </label>
                <input type="date" className="form-input" value={woDate} onChange={e => setWoDate(e.target.value)} />
              </div>
            </div>

          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableStyles.th}>Product Name</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center' }}>In Stock</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center' }}>Return Qty</th>
                    <th style={tableStyles.th}>Price</th>
                    <th style={tableStyles.th}>Total Price</th>
                    <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {woLineItems.length === 0 ? (
                    <tr><td colSpan="6" style={tableStyles.emptyCell}>Cart is empty.</td></tr>
                  ) : (
                    woLineItems.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={tableStyles.td}>{row.productName}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>{row.inStock}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <input 
                            type="number" min="1" 
                            className="form-input"
                            style={{ padding: '6px', maxWidth: '100px', textAlign: 'center', margin: '0 auto' }}
                            value={row.transactionQty || ''} 
                            onChange={(e) => {
                              let val = e.target.value.replace(/^0+/, '');
                              const qty = Math.max(1, Number(val));
                              setWoLineItems(prev => prev.map((r, i) => i === index ? { ...r, transactionQty: qty, totalPrice: qty * r.unitPrice } : r));
                            }} 
                          />
                        </td>
                        <td style={tableStyles.td}>{row.unitPrice.toFixed(2)}</td>
                        <td style={{ ...tableStyles.td, fontWeight: 600 }}>{row.totalPrice.toFixed(2)}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button style={actionStyles.iconBtnDelete} onClick={() => setWoLineItems(prev => prev.filter((_, i) => i !== index))} title="Remove">
                              ✕
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

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div style={{ padding: 'var(--space-sm) var(--space-md)', borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px' }}>TOTAL REFUND AMOUNT</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>{woTotalAmount.toFixed(2)}</div>
            </div>
            
            <button 
              className="btn btn-primary" 
              style={{ padding: '14px 28px', fontSize: '15px' }} 
              disabled={completing || woLineItems.length === 0 || !woSupplierId} 
              onClick={() => {
                if (!woSupplierId) {
                  showMessage('Please select a supplier before confirming the return.', 'error');
                  return;
                }
                if (woTotalAmount > 0 && woSupplierId) {
                  openConfirmDialog(`Process blind return to ${selectedSupplierObj.companyName || selectedSupplierObj.contactPerson || 'supplier'} for Rs ${woTotalAmount.toFixed(2)}?`, handleCompleteWithoutInvoice);
                }
              }}
              title="Shortcut: Ctrl + Enter"
            >
              {completing ? 'Processing...' : 'Complete Return'}
            </button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeConfirmDialog(); }}>
          <div className="modal-container" style={{ borderTop: '6px solid var(--primary)', padding: 'var(--space-xl)', maxWidth: '450px' }}>
            
            <h3 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--text-main)', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Return
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5', margin: '0 0 var(--space-lg) 0' }}>
              {confirmDialog.message}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
              <button className="btn btn-secondary" onClick={closeConfirmDialog}>
                Cancel (Esc)
              </button>
              <button className="btn btn-primary" ref={confirmButtonRef} onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}>
                Yes, Complete (Enter)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

// Strict Table Styles Enforced
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
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  }
};

// Strict Actions Styles Enforced
const actionStyles = {
  iconBtnDelete: {
    backgroundColor: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};

export default PurchaseReturnByInvoice;