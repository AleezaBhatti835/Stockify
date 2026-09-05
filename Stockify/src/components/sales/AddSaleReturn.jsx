import React, { useState, useEffect, useRef } from 'react';

const InlineMessage = ({ message, type }) => {
  if (!message) return null;
  
  const colors = {
    success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
    error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' }
  };

  const style = colors[type] || colors.error;

  return (
    <div style={{
      padding: '12px 16px',
      marginBottom: '20px',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: style.bg,
      color: style.text,
      border: `1px solid ${style.border}`,
      fontSize: '14px',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span>{style.icon}</span>
      <div>
        <strong>{type === 'error' ? 'Error: ' : 'Success: '}</strong>
        {message}
      </div>
    </div>
  );
};

const SalesReturnByInvoice = () => {
  const [returnMode, setReturnMode] = useState('with');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [completing, setCompleting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const firstQtyInputRef = useRef(null);
  const withInvSearchRef = useRef(null);

  const [woCustomerId, setWoCustomerId] = useState('');
  const [woDate, setWoDate] = useState(new Date().toISOString().split('T')[0]);
  const [woProductSearch, setWoProductSearch] = useState('');
  const [woFilteredProducts, setWoFilteredProducts] = useState([]);
  const [woShowSuggestions, setWoShowSuggestions] = useState(false);
  const [woHighlightedIndex, setWoHighlightedIndex] = useState(-1);
  const [woSelectedProduct, setWoSelectedProduct] = useState(null);
  const [woQuantity, setWoQuantity] = useState(1);
  const [woLineItems, setWoLineItems] = useState([]);
  
  const woQtyInputRef = useRef(null);
  const woSearchRef = useRef(null);

  // CORE ARCHITECTURE: Asynchronous initialization loading available sales invoices, customer directories, and product catalogs on mount.
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [invRes, custRes, prodRes] = await Promise.all([
          fetch('http://localhost:5000/api/sales', { cache: 'no-store', headers }),
          fetch('http://localhost:5000/api/customers', { cache: 'no-store', headers }),
          fetch('http://localhost:5000/api/products', { cache: 'no-store', headers })
        ]);

        const invData = await invRes.json();
        const custData = await custRes.json();
        const prodData = await prodRes.json();

        const numbers = Array.isArray(invData)
          ? invData
            .filter(s => s.saleNumber && s.saleNumber.startsWith('SL-') && s.status !== 'Hold' && s.status !== 'Cancelled')
            .map(s => s.saleNumber)
            .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
          : [];
        setAvailableInvoiceNumbers(numbers);

        if (Array.isArray(custData)) setCustomers(custData);
        if (Array.isArray(prodData)) setProducts(prodData);

      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (withInvSearchRef.current && !withInvSearchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
      if (woSearchRef.current && !woSearchRef.current.contains(event.target)) {
        setWoShowSuggestions(false);
        setWoHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const openConfirmDialog = (msg, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      message: msg,
      onConfirm: onConfirm,
      onCancel: () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null, onCancel: null });
  };

  useEffect(() => {
    const handleDialogKey = (e) => {
      if (confirmDialog.isOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeConfirmDialog();
        }
      }
    };

    if (confirmDialog.isOpen) {
      document.addEventListener('keydown', handleDialogKey);
    }
    return () => document.removeEventListener('keydown', handleDialogKey);
  }, [confirmDialog]);

  const handleWithInvoiceSearchChange = (e) => {
    const val = e.target.value.toUpperCase();
    setSearchInvoiceNumber(val);
    setHighlightedIndex(-1);

    if (val.trim() !== '') {
      const filtered = availableInvoiceNumbers.filter(num =>
        num.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleWithInvoiceKeyDown = (e) => {
    if (confirmDialog.isOpen) return;

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
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
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

  const handleSearch = async (overrideNumber = null) => {
    const queryNumber = typeof overrideNumber === 'string' ? overrideNumber : searchInvoiceNumber;
    if (!queryNumber || !queryNumber.trim()) return showMessage('Enter an invoice number.', 'error');

    setSearching(true);
    setSale(null);
    setLineItems([]);
    setLastResult(null);
    setShowSuggestions(false);
    setHighlightedIndex(-1);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/sales/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage(data.message || `No sale found for invoice "${queryNumber.trim()}".`, 'error');
        return;
      }

      if (!data.items || data.items.length === 0) {
        showMessage(`Invoice "${queryNumber.trim()}" has no items to return.`, 'error');
        return;
      }

      const origTotalQty = data.items.reduce((sum, item) => sum + (item.saleQty || item.quantity || 0), 0);
      const origTotalAmount = data.items.reduce((sum, item) => sum + ((item.saleQty || item.quantity || 0) * (item.unitPrice || 0)), 0);

      setSale({ ...data.sale, origTotalQty, origTotalAmount });
      setLineItems(
        data.items.map(item => ({
          productId: item.product._id,
          productName: item.product.name,
          saleQty: item.saleQty,
          returnQty: item.returnQty || 0,
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

    } catch (error) {
      showMessage('Failed to search invoice.', 'error');
    } finally {
      setSearching(false);
    }
  };

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
      const res = await fetch('http://localhost:5000/api/sale-returns/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          saleId: sale._id,
          customerId: sale.customer?._id,
          invoiceNumber: sale.invoiceNumber || sale.saleNumber,
          items: itemsToReturn
        })
      });
      const result = await res.json();
      if (result.success) {
        showMessage('Sales return successful.', 'success');
        setLastResult({
          previousBalance: result.previousBalance,
          returnAmount: result.returnAmount,
          newBalance: result.newBalance
        });
        setSale(null);
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

  const handleWoProductKeyDown = (e) => {
    if (confirmDialog.isOpen) return;

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
        setWoHighlightedIndex(prev =>
          prev < woFilteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setWoHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : woFilteredProducts.length - 1
        );
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
    setWoProductSearch(prod.name);
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

  // DATA INTEGRITY: Validates historical customer purchasing records before admitting return processing without an original invoice reference.
  const handleWoAddToCart = async () => {
    if (!woSelectedProduct) return showMessage('Please select a valid product.', 'error');
    const qty = Number(woQuantity);
    if (!qty || qty <= 0) return showMessage('Quantity must be greater than 0.', 'error');

    if (woCustomerId) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/sales/check-customer-purchase?customerId=${woCustomerId}&productId=${woSelectedProduct._id}`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data && data.success && !data.hasPurchased) {
          return showMessage(`This customer has never purchased "${woSelectedProduct.name}". Return not allowed.`, 'error');
        }
      } catch (error) {
        console.error('Error verifying customer purchase:', error);
      }
    }

    setWoLineItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === woSelectedProduct._id);
      const priceToUse = woSelectedProduct.salePrice || woSelectedProduct.price || woSelectedProduct.retailPrice || 0;

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

    if (!woCustomerId) {
      showMessage('Please select a customer before confirming the return.', 'error');
      return;
    }

    setCompleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/sale-returns/blind-return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: woCustomerId,
          returnDate: woDate,
          items: itemsToReturn
        })
      });
      const result = await res.json();
      if (result.success) {
        showMessage('Return completed successfully.', 'success');
        setWoLineItems([]);
        setWoCustomerId('');
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

  const withTotalAmount = lineItems.reduce((sum, row) => sum + ((row.transactionQty || 0) * row.unitPrice), 0);
  const woTotalAmount = woLineItems.reduce((sum, row) => sum + row.totalPrice, 0);

  const selectedCustomerObj = customers.find(c => c._id === woCustomerId) || {};

  return (
    <div className="dashboard-wrapper">
      
      <InlineMessage message={message.text} type={message.type} />

      <div className="card" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          className={`btn ${returnMode === 'with' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setReturnMode('with'); setMessage({text:'', type:''}); }}
        >
          Return with Invoice
        </button>
        <button
          className={`btn ${returnMode === 'without' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setReturnMode('without'); setMessage({text:'', type:''}); }}
        >
          Return without Invoice
        </button>
      </div>

      {returnMode === 'with' && (
        <>
          <div className="card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }} ref={withInvSearchRef}>
                <label className="form-label required">Search Invoice Number </label>
                <input
                  type="text"
                  className="form-input"
                  autoComplete="off"
                  placeholder="Search Invoice Number... (e.g. SL-1)"
                  value={searchInvoiceNumber}
                  onChange={handleWithInvoiceSearchChange}
                  onFocus={() => {
                    if (searchInvoiceNumber.trim()) setShowSuggestions(true);
                  }}
                  onKeyDown={handleWithInvoiceKeyDown}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, textAlign: 'left', fontSize: '13px', right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: 'var(--shadow-md)' }}>
                    {filteredSuggestions.map((num, index) => (
                      <div
                        key={index}
                        onClick={() => { setSearchInvoiceNumber(num); setShowSuggestions(false); handleSearch(num); }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          backgroundColor: index === highlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                          color: index === highlightedIndex ? 'var(--primary)' : 'var(--text-main)',
                          borderBottom: '1px solid var(--border-color)'
                        }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {sale && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '30px', fontSize: '13px', color: 'var(--text-main)', backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <span><strong>Invoice #:</strong> {sale.saleNumber || sale.invoiceNumber}</span>
                <span><strong>Date:</strong> {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                <span><strong>Customer:</strong> {sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</span>
                <span><strong>Orig. Qty:</strong> {sale.origTotalQty}</span>
                <span><strong>Orig. Amount:</strong> Rs. {(sale.origTotalAmount || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--header)' }}>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Item Name</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Invoice #</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Sale Qty</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Previous Return</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Return Qty</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Price</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Refund</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No invoice items.</td></tr>
                  ) : (
                    lineItems.map((row, index) => (
                      <tr key={row.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{row.productName}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>{sale?.saleNumber || sale?.invoiceNumber || '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.saleQty}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.returnQty}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <input
                            ref={index === 0 ? firstQtyInputRef : null}
                            type="number"
                            min="0"
                            max={row.maxReturnable}
                            className="form-input"
                            style={{ padding: '6px 10px', width: '100px' }}
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
                                  openConfirmDialog(
                                    `Process sales return for Rs ${withTotalAmount.toFixed(2)}?`,
                                    handleCompleteWithInvoice
                                  );
                                }
                              }
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>{((row.transactionQty || 0) * row.unitPrice).toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, transactionQty: 0 } : r))}
                            disabled={row.transactionQty === 0}
                            style={{ padding: '4px 8px', opacity: row.transactionQty === 0 ? 0.3 : 1 }}
                            title="Revert"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REFUND AMOUNT</label>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{withTotalAmount.toFixed(2)}</div>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '14px 32px', fontSize: '15px' }}
              disabled={completing || !sale || withTotalAmount === 0}
              onClick={() => {
                if (withTotalAmount > 0) {
                  openConfirmDialog(
                    `Process sales return for Rs ${withTotalAmount.toFixed(2)}?`,
                    handleCompleteWithInvoice
                  );
                }
              }}
            >
              {completing ? 'Processing...' : 'Complete Return'}
            </button>
          </div>
        </>
      )}

      {returnMode === 'without' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            
            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="card-title">Add Products</h3>
              
              <div className="form-group" style={{ position: 'relative', marginBottom: '16px' }} ref={woSearchRef}>
                <label className="form-label required">Search Product </label>
                <input
                  type="text"
                  className="form-input"
                  autoComplete="off"
                  placeholder="Type to search..."
                  value={woProductSearch}
                  onChange={handleWoProductSearchChange}
                  onFocus={() => { if (woProductSearch.trim()) setWoShowSuggestions(true); }}
                  onKeyDown={handleWoProductKeyDown}
                />
                {woShowSuggestions && (
                  <div style={{ position: 'absolute', top: '100%', textAlign: 'left', fontSize: '13px', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow-md)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                    {woFilteredProducts.length > 0 ? (
                      woFilteredProducts.map((p, i) => (
                        <div
                          key={p._id || i}
                          onClick={() => selectWoProduct(p)}
                          onMouseEnter={() => setWoHighlightedIndex(i)}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: i === woHighlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                            color: i === woHighlightedIndex ? 'var(--primary)' : 'var(--text-main)'
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Stock: {p.quantity || 0} {p.barcode ? `| Barcode: ${p.barcode}` : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>No products found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label required">Quantity </label>
                <input
                  className="form-input"
                  ref={woQtyInputRef}
                  type="number"
                  min="1"
                  value={woQuantity || ''}
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, ''); 
                    setWoQuantity(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleWoAddToCart();
                    }
                  }}
                />
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleWoAddToCart}
                  style={{ width: '100%' }}
                >
                  + Add to Cart
                </button>
              </div>
            </div>

            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="card-title">Customer Details</h3>

              <div className="form-group">
                <label className="form-label required">Select Customer </label>
                <select
                  className="form-input"
                  value={woCustomerId}
                  onChange={e => setWoCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label required">Phone</label>
                  <input 
                    type="text" 
                    className="form-input"
                    readOnly 
                    disabled 
                    placeholder="Auto-fills on select" 
                    value={selectedCustomerObj.phone || ''} 
                    style={{ backgroundColor: 'var(--bg-app)' }} 
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-input"
                    readOnly 
                    disabled 
                    placeholder="Auto-fills on select" 
                    value={selectedCustomerObj.address || ''} 
                    style={{ backgroundColor: 'var(--bg-app)' }} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required">Return Date </label>
                <input 
                  type="date" 
                  className="form-input"
                  value={woDate} 
                  onChange={e => setWoDate(e.target.value)} 
                />
              </div>
            </div>

          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--header)' }}>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Product Name</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>In Stock</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Return Qty</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>Price</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>Total Price</th>
                    <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {woLineItems.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Cart is empty.</td></tr>
                  ) : (
                    woLineItems.map((row, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '500' }}>{row.productName}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'center' }}>{row.inStock}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={row.transactionQty || ''}
                            onChange={(e) => {
                              let val = e.target.value.replace(/^0+/, ''); 
                              const qty = Math.max(1, Number(val));
                              setWoLineItems(prev => prev.map((r, i) => i === index ? { ...r, transactionQty: qty, totalPrice: qty * r.unitPrice } : r));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && woTotalAmount > 0 && woCustomerId) {
                                e.preventDefault();
                                openConfirmDialog(
                                  `Process blind return for ${selectedCustomerObj.name || 'customer'} for Rs ${woTotalAmount.toFixed(2)}?`,
                                  handleCompleteWithoutInvoice
                                );
                              }
                            }}
                            style={{ width: '80px', padding: '6px', textAlign: 'center', margin: '0 auto' }}
                          />
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'right' }}>{row.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--success)', fontWeight: '600', textAlign: 'right' }}>{row.totalPrice.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button className="btn btn-secondary" onClick={() => setWoLineItems(prev => prev.filter((_, i) => i !== index))} style={{ padding: '4px 8px' }}>✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REFUND AMOUNT</label>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{woTotalAmount.toFixed(2)}</div>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '14px 32px', fontSize: '15px' }}
              disabled={completing || woLineItems.length === 0}
              onClick={() => {
                if (!woCustomerId) {
                  showMessage('Please select a customer before confirming the return.', 'error');
                  return;
                }
                if (woTotalAmount > 0 && woCustomerId) {
                  openConfirmDialog(
                    `Process blind return for ${selectedCustomerObj.name || 'customer'} for Rs ${woTotalAmount.toFixed(2)}?`,
                    handleCompleteWithoutInvoice
                  );
                }
              }}
            >
              {completing ? 'Processing...' : '↩ Return'}
            </button>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={closeConfirmDialog}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderTop: '6px solid var(--primary)' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '20px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Sales Return
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                {confirmDialog.message}
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', backgroundColor: 'transparent' }}>
              <button className="btn btn-secondary" onClick={closeConfirmDialog}>Cancel (Esc)</button>
              <button className="btn btn-primary" onClick={() => { if (confirmDialog.onConfirm) confirmDialog.onConfirm(); }}>Yes, Complete (Enter)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReturnByInvoice;