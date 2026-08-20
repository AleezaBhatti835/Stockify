import React, { useState, useEffect, useRef } from 'react';

const AddSalesRebate = () => {
  const [message, setMessage] = useState({ text: '', type: '' });
  const [completing, setCompleting] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const firstQtyInputRef = useRef(null);
  const messageRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const searchWrapperRef = useRef(null);

  // Keyboard shortcut for confirmation modal
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

  // Auto-focus on confirm button
  useEffect(() => {
    if (confirmDialog.isOpen) {
      setTimeout(() => {
        if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    }
  }, [confirmDialog.isOpen]);

  // Scroll to message when it appears
  useEffect(() => {
    if (message.text && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [message.text]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ================= FETCH INVOICES (WITH TOKEN) =================
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/sales', {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.sales || []);
        const numbers = list
          .map(s => s.saleNumber)
          .filter(num => num && num.startsWith('SL-'))
          .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]));
        setAvailableInvoiceNumbers(numbers);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      }
    };
    fetchInvoices();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const openConfirmDialog = (message, onConfirm) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };
  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
  };

  // Scroll active item into view
  useEffect(() => {
    if (showSuggestions && highlightedIndex >= 0) {
      const el = document.getElementById(`invoice-item-${highlightedIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedIndex, showSuggestions]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        handleSearch();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          const selected = filteredSuggestions[highlightedIndex];
          setSearchInvoiceNumber(selected);
          setShowSuggestions(false);
          setFilteredSuggestions([]);
          setHighlightedIndex(-1);
          handleSearch(selected);
        } else {
          setShowSuggestions(false);
          setFilteredSuggestions([]);
          handleSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  // ================= HANDLE SEARCH (WITH TOKEN) =================
  const handleSearch = async (overrideNumber = null) => {
    const queryNumber = typeof overrideNumber === 'string' ? overrideNumber : searchInvoiceNumber;
    
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    setHighlightedIndex(-1);

    if (!queryNumber || !queryNumber.trim()) return showMessage('Enter an invoice number.', 'error');

    setSearching(true);
    setSale(null);
    setLineItems([]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/sales/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        const rebRes = await fetch(`http://localhost:5000/api/sales/${data.sale._id}/rebatable-items`, {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const rebData = await rebRes.json();

        if (!rebData.success || !rebData.items || rebData.items.length === 0) {
          showMessage(`Invoice "${queryNumber.trim()}" has no items to rebate.`, 'error');
          setSearching(false);
          return;
        }

        setSale(rebData.sale);
        setLineItems(
          rebData.items.map(item => ({
            productId: item.product._id,
            productName: item.product.name,
            saleQty: item.saleQty,
            alreadyRebated: item.alreadyRebated,
            maxRebatable: item.maxRebatable,
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

  // ================= HANDLE COMPLETE REBATE (WITH TOKEN) =================
  const handleCompleteRebate = async () => {
    closeConfirmDialog();

    const itemsToRebate = lineItems.filter(row => row.transactionQty > 0).map(row => ({
      product: row.productId,
      quantity: row.transactionQty,
      unitPrice: row.unitPrice
    }));

    if (itemsToRebate.length === 0) {
      showMessage('No items to rebate.', 'error');
      return;
    }

    setCompleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/sales-rebates/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          saleId: sale._id,
          customerId: sale.customer?._id,
          invoiceNumber: sale.saleNumber,
          items: itemsToRebate
        })
      });
      const result = await res.json();
      if (result.success) {
        showMessage(`Rebate recorded successfully (${result.salesRebate?.rebateNumber || ''}).`, 'success');
        setSale(null);
        setLineItems([]);
        setSearchInvoiceNumber('');
        setShowSuggestions(false);
        setFilteredSuggestions([]);
      } else {
        showMessage(result.message || 'Failed to record rebate.', 'error');
      }
    } catch (error) {
      showMessage('Network error.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const totalAmount = lineItems.reduce((sum, row) => sum + ((row.transactionQty || 0) * row.unitPrice), 0);

  // Inline Message Component
  const InlineMessage = ({ message, type }) => {
    if (!message) return null;
    const isError = type === 'error';
    const isSuccess = type === 'success';

    const bg = isError ? 'var(--danger-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)';
    const text = isError ? 'var(--danger)' : isSuccess ? 'var(--success)' : 'var(--info)';
    const icon = isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️';

    return (
      <div ref={messageRef} style={{
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
        <span>{icon} {message}</span>
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
    <div className="dashboard-wrapper" ref={messageRef}>
      
      {/* HEADER */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '22px', fontWeight: 600 }}>Sales Rebate Management</h4>
      </div>

      {/* Inline Message */}
      {message.text && <InlineMessage message={message.text} type={message.type} />}

      {/* Search Section */}
      <div className="card" style={{ position: 'relative', zIndex: 100 }}>
        <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={searchWrapperRef}>
          <label className="form-label">Search Invoice Number *</label>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <input
              type="text"
              className="form-input"
              autoComplete="off"
              placeholder="e.g. SL-1"
              value={searchInvoiceNumber}
              onChange={(e) => { 
                const val = e.target.value.toUpperCase();
                setSearchInvoiceNumber(val); 
                if (val.trim() !== '') {
                  const filtered = availableInvoiceNumbers.filter(num =>
                    num.toLowerCase().includes(val.toLowerCase())
                  );
                  setFilteredSuggestions(filtered);
                  setShowSuggestions(filtered.length > 0);
                } else {
                  setShowSuggestions(false);
                  setFilteredSuggestions([]);
                  setHighlightedIndex(-1);
                }
              }}
              onFocus={() => { 
                if (searchInvoiceNumber.trim() && filteredSuggestions.length > 0) {
                  setShowSuggestions(true);
                } 
              }}
              onKeyDown={handleKeyDown}
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
                  id={`invoice-item-${index}`}
                  onClick={() => { 
                    setSearchInvoiceNumber(num); 
                    setShowSuggestions(false); 
                    setFilteredSuggestions([]);
                    setHighlightedIndex(-1);
                    handleSearch(num); 
                  }}
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

        {sale && (
          <div className="card" style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-md)', backgroundColor: 'var(--primary-light)', border: '1px dashed var(--btn-border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Invoice #:</strong> {sale.saleNumber}</span>
            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}><strong>Customer:</strong> {sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</span>
          </div>
        )}
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Product Name</th>
                <th style={tableStyles.th}>Sold Qty</th>
                <th style={tableStyles.th}>Already Rebated</th>
                <th style={tableStyles.th}>Rebate Qty</th>
                <th style={tableStyles.th}>Price</th>
                <th style={tableStyles.th}>Rebate Amt</th>
                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>No invoice items.</td></tr>
              ) : (
                lineItems.map((row, index) => (
                  <tr key={row.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tableStyles.td}>{row.productName}</td>
                    <td style={tableStyles.td}>{row.saleQty}</td>
                    <td style={tableStyles.td}>{row.alreadyRebated}</td>
                    <td style={tableStyles.td}>
                      <input
                        ref={index === 0 ? firstQtyInputRef : null}
                        type="number" min="0" max={row.maxRebatable}
                        className="form-input"
                        style={{ padding: '6px', maxWidth: '100px' }}
                        value={row.transactionQty || ''}
                        disabled={row.maxRebatable === 0}
                        onChange={(e) => {
                          let val = e.target.value.replace(/^0+/, '');
                          const qty = Math.min(Math.max(0, Number(val)), row.maxRebatable);
                          setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, transactionQty: qty } : r));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && totalAmount > 0) {
                            e.preventDefault();
                            openConfirmDialog(`Record rebate of Rs ${totalAmount.toFixed(2)}?`, handleCompleteRebate);
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

      {/* BOTTOM ACTION SECTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ padding: 'var(--space-sm) var(--space-md)', borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px' }}>TOTAL REBATE AMOUNT</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)' }}>{totalAmount.toFixed(2)}</div>
        </div>
        <button
          className="btn btn-primary"
          style={{ padding: '14px 28px', fontSize: '15px' }}
          disabled={completing || !sale || totalAmount === 0}
          onClick={() => {
            if (totalAmount > 0) {
              openConfirmDialog(`Record rebate of Rs ${totalAmount.toFixed(2)}?`, handleCompleteRebate);
            }
          }}
        >
          {completing ? 'Processing...' : 'Complete Rebate'}
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeConfirmDialog(); }}>
          <div className="modal-container" style={{ borderTop: '6px solid var(--primary)', padding: 'var(--space-xl)', maxWidth: '450px' }}>
            <h3 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--text-main)', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Rebate
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5', margin: '0 0 var(--space-lg) 0' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
              <button className="btn btn-secondary" onClick={closeConfirmDialog}>Cancel (Esc)</button>
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

export default AddSalesRebate;