import React, { useState, useEffect, useRef } from 'react';

function MessagePopup({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className="message-popup-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className={`message-popup ${type}`} onClick={(e) => e.stopPropagation()}>
        <button className="message-popup-close" onClick={onClose}>×</button>
        <div className="message-popup-content">
          <span className="message-popup-icon">{type === 'error' ? '⚠️' : '✅'}</span>
          <div className="message-popup-text">
            <strong>{type === 'error' ? 'Error: ' : 'Success: '}</strong>
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}

const SalesReturnByInvoice = () => {
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
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // ==========================================
  // WITH INVOICE STATES
  // ==========================================
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // Reference for Auto-focusing Quantity Input (With Invoice)
  const firstQtyInputRef = useRef(null);

  // ==========================================
  // WITHOUT INVOICE STATES
  // ==========================================
  const [woCustomerId, setWoCustomerId] = useState('');
  const [woDate, setWoDate] = useState(new Date().toISOString().split('T')[0]);
  const [woProductSearch, setWoProductSearch] = useState('');
  const [woFilteredProducts, setWoFilteredProducts] = useState([]);
  const [woShowSuggestions, setWoShowSuggestions] = useState(false);
  const [woHighlightedIndex, setWoHighlightedIndex] = useState(-1);
  const [woSelectedProduct, setWoSelectedProduct] = useState(null);
  const [woQuantity, setWoQuantity] = useState(1);
  const [woLineItems, setWoLineItems] = useState([]);
  
  // Reference for Auto-focusing Quantity Input (Without Invoice)
  const woQtyInputRef = useRef(null);

  // Load Initial Data on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [invRes, custRes, prodRes] = await Promise.all([
          fetch('http://localhost:5000/api/sales', { cache: 'no-store' }),
          fetch('http://localhost:5000/api/customers', { cache: 'no-store' }),
          fetch('http://localhost:5000/api/products', { cache: 'no-store' })
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

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
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
    setShowSuggestions(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [searchInvoiceNumber, availableInvoiceNumbers]);

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
      const res = await fetch(`http://localhost:5000/api/sales/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage(data.message || `No sale found for invoice "${queryNumber.trim()}".`, 'error');
        return;
      }

      if (!data.items || data.items.length === 0) {
        showMessage(`Invoice "${queryNumber.trim()}" has no items to return.`, 'error');
        return;
      }

      // Calculate Total Original Quantity & Amount manually 
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

      // Auto focus on the first quantity input inside the table
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
      const res = await fetch('http://localhost:5000/api/sale-returns/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    setWoQuantity(1); // Reset qty to 1 when new product selected
    
    // Auto focus quantity input immediately after selection
    setTimeout(() => {
      if (woQtyInputRef.current) {
        woQtyInputRef.current.focus();
        woQtyInputRef.current.select();
      }
    }, 10);
  };

  const handleWoAddToCart = async () => {
    if (!woSelectedProduct) return showMessage('Please select a valid product.', 'error');
    const qty = Number(woQuantity);
    if (!qty || qty <= 0) return showMessage('Quantity must be greater than 0.', 'error');

    // Proceed to add to cart without blocking if Customer is missing
    if (woCustomerId) {
      try {
        const res = await fetch(`http://localhost:5000/api/sales/check-customer-purchase?customerId=${woCustomerId}&productId=${woSelectedProduct._id}`, { cache: 'no-store' });
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
      const res = await fetch('http://localhost:5000/api/sale-returns/blind-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Calculations
  const withTotalAmount = lineItems.reduce((sum, row) => sum + ((row.transactionQty || 0) * row.unitPrice), 0);
  const woTotalAmount = woLineItems.reduce((sum, row) => sum + row.totalPrice, 0);

  const selectedCustomerObj = customers.find(c => c._id === woCustomerId) || {};

  return (
    <div className="add-purchase-wrapper">
      <MessagePopup message={message.text} type={message.type} onClose={() => setMessage({ text: '', type: '' })} />
 <div style={{ textAlign: 'center', alignItems: 'center',marginTop:'20px' }} className="po-header">
        <h2>Sales Return Management</h2>
      </div>
      {/* Mode Toggle Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setReturnMode('with')}
          style={{
            padding: '10px 24px',
            borderRadius: '25px',
            border: '1px solid #ccc',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: returnMode === 'with' ? '#24385b' : '#f8f9fa',
            color: returnMode === 'with' ? '#fff' : '#333',
            transition: 'all 0.2s'
          }}
        >
          Return with Invoice
        </button>
        <button
          onClick={() => setReturnMode('without')}
          style={{
            padding: '10px 24px',
            borderRadius: '25px',
            border: '1px solid #ccc',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: returnMode === 'without' ? '#24385b' : '#f8f9fa',
            color: returnMode === 'without' ? '#fff' : '#333',
            transition: 'all 0.2s'
          }}
        >
          Return without Invoice
        </button>
      </div>

      {/* ========================================== */}
      {/* RENDER: WITH INVOICE */}
      {/* ========================================== */}
      {returnMode === 'with' && (
        <>
          <div className="card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Search Invoice Number... (e.g. SL-1)"
                  value={searchInvoiceNumber}
                  onChange={(e) => {
                    setSearchInvoiceNumber(e.target.value.toUpperCase());
                    setShowSuggestions(e.target.value.trim() !== '');
                  }}
                  onFocus={() => {
                    if (searchInvoiceNumber.trim()) setShowSuggestions(true);
                  }}
                  onKeyDown={handleWithInvoiceKeyDown}
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, textAlign: 'left', fontSize: '12px', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 4px 4px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    {filteredSuggestions.map((num, index) => (
                      <div
                        key={index}
                        onClick={() => { setSearchInvoiceNumber(num); setShowSuggestions(false); handleSearch(num); }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          backgroundColor: index === highlightedIndex ? '#e8f4fd' : 'white',
                          color: index === highlightedIndex ? '#007bff' : '#333',
                          borderBottom: '1px solid #f0f0f0'
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
              <div style={{ marginTop: '15px', display: 'flex', gap: '30px', fontSize: '13px', color: '#444', flexWrap: 'wrap', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span><strong>Invoice #:</strong> {sale.saleNumber || sale.invoiceNumber}</span>
                <span><strong>Date:</strong> {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                <span><strong>Customer:</strong> {sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</span>
                <span><strong>Orig. Qty:</strong> {sale.origTotalQty}</span>
                <span><strong>Orig. Amount:</strong> Rs. {(sale.origTotalAmount || 0).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="card table-section" style={{ marginTop: '20px' }}>
            <table className="po-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Item Name</th>
                  <th style={{ width: '12%' }}>Invoice #</th>
                  <th style={{ width: '14%' }}>Sale Qty</th>
                  <th style={{ width: '18%' }}>Previous Return</th>
                  <th style={{ width: '14%' }}>Return Qty</th>
                  <th style={{ width: '10%' }}>Price</th>
                  <th style={{ width: '12%' }}>Refund</th>
                  <th style={{ width: '10%' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr><td colSpan="8" className="empty-state">No invoice items.</td></tr>
                ) : (
                  lineItems.map((row, index) => (
                    <tr key={row.productId}>
                      <td>{row.productName}</td>
                      <td style={{ fontWeight: 600 }}>{sale?.saleNumber || sale?.invoiceNumber || '—'}</td>
                      <td>{row.saleQty}</td>
                      <td>{row.returnQty}</td>
                      <td>
                        <input
                          ref={index === 0 ? firstQtyInputRef : null}
                          type="number"
                          min="0"
                          max={row.maxReturnable}
                          value={row.transactionQty || ''}
                          disabled={row.maxReturnable === 0}
                          onChange={(e) => {
                            let val = e.target.value.replace(/^0+/, ''); // Remove leading zero
                            const qty = Math.min(Math.max(0, Number(val)), row.maxReturnable);
                            setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, transactionQty: qty } : r));
                          }}
                          style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                      </td>
                      <td>{row.unitPrice}</td>
                      <td>{((row.transactionQty || 0) * row.unitPrice).toFixed(2)}</td>
                      <td className="text-center">
                        <button
                          className="btn-remove"
                          onClick={() => setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, transactionQty: 0 } : r))}
                          disabled={row.transactionQty === 0}
                          style={{ opacity: row.transactionQty === 0 ? 0.3 : 1 }}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ border: '1px solid #1f6b3a', width: '30%', borderRadius: '8px', padding: '14px 24px', backgroundColor: '#f8f9fa' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#1f6b3a', display: 'block' }}>REFUND AMOUNT</label>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{withTotalAmount.toFixed(2)}</div>
            </div>
            <button
              className="btn-submit-order"
              style={{ backgroundColor: '#4d9b6b',width:'18%', padding: '15px 1px', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer'}}
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

      {/* ========================================== */}
      {/* RENDER: WITHOUT INVOICE */}
      {/* ========================================== */}
      {returnMode === 'without' && (
        <>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            
            {/* LEFT CARD: ADD PRODUCTS */}
            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ textAlign: 'center', color: '#4a5568', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Add Products</h4>
              
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Search Product *</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Type to search..."
                  value={woProductSearch}
                  onChange={handleWoProductSearchChange}
                  onKeyDown={handleWoProductKeyDown}
                  style={{ backgroundColor: '#fff', width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
                {woShowSuggestions && (
                  <div style={{ position: 'absolute', top: '100%', textAlign: 'left', fontSize: '13px', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderRadius: '0 0 4px 4px' }}>
                    {woFilteredProducts.length > 0 ? (
                      woFilteredProducts.map((p, i) => (
                        <div
                          key={p._id || i}
                          onClick={() => selectWoProduct(p)}
                          onMouseEnter={() => setWoHighlightedIndex(i)}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: i === woHighlightedIndex ? '#e8f4fd' : '#fff',
                            color: i === woHighlightedIndex ? '#007bff' : '#333'
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            Stock: {p.quantity || 0} {p.barcode ? `| Barcode: ${p.barcode}` : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '10px 14px', color: '#999' }}>No products found</div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Quantity *</label>
                <input
                  ref={woQtyInputRef}
                  type="number"
                  min="1"
                  value={woQuantity || ''}
                  onChange={e => {
                    let val = e.target.value.replace(/^0+/, ''); // Remove leading zero
                    setWoQuantity(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleWoAddToCart();
                  }}
                  style={{ backgroundColor: '#fff', width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                <button
                  onClick={handleWoAddToCart}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  + Add to Cart
                </button>
              </div>
            </div>

            {/* RIGHT CARD: CUSTOMER DETAILS */}
            <div className="card" style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ textAlign: 'center', color: '#4a5568', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Customer Details</h4>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Customer *</label>
                <select
                  value={woCustomerId}
                  onChange={e => setWoCustomerId(e.target.value)}
                  style={{ backgroundColor: '#fff', width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => <option key={c._id} value={c._id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Phone</label>
                  <input 
                    type="text" 
                    readOnly 
                    disabled 
                    placeholder="Auto-fills on select" 
                    value={selectedCustomerObj.phone || ''} 
                    style={{ width: '100%', padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Address</label>
                  <input 
                    type="text" 
                    readOnly 
                    disabled 
                    placeholder="Auto-fills on select" 
                    value={selectedCustomerObj.address || ''} 
                    style={{ width: '100%', padding: '10px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Return Date *</label>
                <input 
                  type="date" 
                  value={woDate} 
                  onChange={e => setWoDate(e.target.value)} 
                  style={{ backgroundColor: '#fff', width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>
            </div>

          </div>

          {/* TABLE SECTION */}
          <div className="card table-section" style={{ marginTop: '20px' }}>
            <table className="po-table">
              <thead style={{ backgroundColor: '#1f6b3a', color: 'white' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>PRODUCT NAME</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>IN STOCK</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>RETURN QTY</th>
                  <th style={{ textAlign: 'right', padding: '12px' }}>PRICE</th>
                  <th style={{ textAlign: 'right', padding: '12px' }}>TOTAL PRICE</th>
                  <th className="text-center" style={{ padding: '12px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {woLineItems.length === 0 ? (
                  <tr><td colSpan="6" className="empty-state">Cart is empty.</td></tr>
                ) : (
                  woLineItems.map((row, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'left', padding: '12px' }}>{row.productName}</td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>{row.inStock}</td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <input
                          type="number"
                          min="1"
                          value={row.transactionQty || ''}
                          onChange={(e) => {
                            let val = e.target.value.replace(/^0+/, ''); // Remove leading zero
                            const qty = Math.max(1, Number(val));
                            setWoLineItems(prev => prev.map((r, i) => i === index ? { ...r, transactionQty: qty, totalPrice: qty * r.unitPrice } : r));
                          }}
                          style={{ width: '80px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>{row.unitPrice.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>{row.totalPrice.toFixed(2)}</td>
                      <td className="text-center" style={{ padding: '12px' }}>
                        <button className="btn-remove" onClick={() => setWoLineItems(prev => prev.filter((_, i) => i !== index))}>✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ border: '1px solid #1f6b3a', width: '25%', borderRadius: '8px', padding: '14px 24px', backgroundColor: '#f8f9fa' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#1f6b3a', display: 'block' }}>REFUND AMOUNT</label>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>{woTotalAmount.toFixed(2)}</div>
            </div>
            <button
              className="btn-submit-order"
              style={{ backgroundColor: '#223747', width: '18%', padding: '14px 40px', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
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
        </>
      )}

      {/* ========================================== */}
      {/* CUSTOM CONFIRMATION MODAL */}
      {/* ========================================== */}
      {confirmDialog.isOpen && (
        <div
          className="modal-force-top"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(51, 69, 86, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeConfirmDialog();
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              borderTop: '6px solid #1f6b3a',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <h3 style={{
              marginTop: 0,
              color: '#1f6b3a',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Sales Return
            </h3>
            <p style={{
              color: '#555',
              fontSize: '15px',
              lineHeight: '1.6',
              margin: '16px 0 24px 0'
            }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={closeConfirmDialog}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#f1f1f1',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#333',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f1f1'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) {
                    confirmDialog.onConfirm();
                  }
                }}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#1f6b3a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#155d2e'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#1f6b3a'}
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animation for modal */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default SalesReturnByInvoice;