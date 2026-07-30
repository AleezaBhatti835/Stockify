import { useState, useEffect, useRef } from 'react';
import '../purchase/purchase.css'; // reuse same base styling as purchase screens

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

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/sales', { cache: 'no-store' });
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
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
  };

  const openConfirmDialog = (message, onConfirm) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };
  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
  };

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

  const handleKeyDown = (e) => {
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
        setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const selected = filteredSuggestions[highlightedIndex];
          setSearchInvoiceNumber(selected);
          setShowSuggestions(false);
          handleSearch(selected);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
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
    setShowSuggestions(false);

    try {
      const res = await fetch(`http://localhost:5000/api/sales/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        // data.sale._id is the sale id — fetch rebatable items
        const rebRes = await fetch(`http://localhost:5000/api/sales/${data.sale._id}/rebatable-items`, { cache: 'no-store' });
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
      const res = await fetch('http://localhost:5000/api/sales-rebates/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: sale._id,
          customerId: sale.customer?._id,
          invoiceNumber: sale.saleNumber,
          items: itemsToRebate
        })
      });
      const result = await res.json();
      if (result.success) {
        showMessage(`Rebate recorded successfully (${result.salesRebate.rebateNumber}).`, 'success');
        setSale(null);
        setLineItems([]);
        setSearchInvoiceNumber('');
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

  return (
    <div style={{width:"95%",marginBottom:'50px'}} className="add-purchase-wrapper">
      <MessagePopup message={message.text} type={message.type} onClose={() => setMessage({ text: '', type: '' })} />

      <div style={{ textAlign: 'center' }} className="po-header">
        <h2>Sales Rebate Management</h2>
      </div>

      <div className="card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              autoComplete="off"
              placeholder="Search Invoice Number... (e.g. SL-1)"
              value={searchInvoiceNumber}
              onChange={(e) => { setSearchInvoiceNumber(e.target.value.toUpperCase()); setShowSuggestions(e.target.value.trim() !== ''); }}
              onFocus={() => { if (searchInvoiceNumber.trim()) setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, textAlign: 'left', fontSize: '12px', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 4px 4px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                {filteredSuggestions.map((num, index) => (
                  <div
                    key={index}
                    onClick={() => { setSearchInvoiceNumber(num); setShowSuggestions(false); handleSearch(num); }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{ padding: '10px 14px', cursor: 'pointer', backgroundColor: index === highlightedIndex ? '#e8f4fd' : 'white', color: index === highlightedIndex ? '#007bff' : '#333', borderBottom: '1px solid #f0f0f0' }}
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
            <span><strong>Invoice #:</strong> {sale.saleNumber}</span>
            <span><strong>Customer:</strong> {sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</span>
          </div>
        )}
      </div>

      <div className="card table-section" style={{ marginTop: '20px' }}>
        <table className="po-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Product Name</th>
              <th style={{ width: '16%' }}>Sold Qty</th>
              <th style={{ width: '18%' }}>Already Rebated</th>
              <th style={{ width: '16%' }}>Rebate Qty</th>
              <th style={{ width: '12%' }}>Price</th>
              <th style={{ width: '12%' }}>Rebate Amt</th>
              <th style={{ width: '8%' }} className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No invoice items.</td></tr>
            ) : (
              lineItems.map((row, index) => (
                <tr key={row.productId}>
                  <td>{row.productName}</td>
                  <td>{row.saleQty}</td>
                  <td>{row.alreadyRebated}</td>
                  <td>
                    <input
                      ref={index === 0 ? firstQtyInputRef : null}
                      type="number"
                      min="0"
                      max={row.maxRebatable}
                      value={row.transactionQty || ''}
                      disabled={row.maxRebatable === 0}
                      onChange={(e) => {
                        let val = e.target.value.replace(/^0+/, '');
                        const qty = Math.min(Math.max(0, Number(val)), row.maxRebatable);
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

      <div style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ border: '1px solid #1f6b3a', width: '30%', borderRadius: '8px', padding: '14px 24px', backgroundColor: '#f8f9fa' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#1f6b3a', display: 'block' }}>TOTAL REBATE AMOUNT</label>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{totalAmount.toFixed(2)}</div>
        </div>
        <button
          className="btn-submit-order"
          style={{ backgroundColor: '#4d9b6b', width: '18%', padding: '15px 1px', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
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

      {confirmDialog.isOpen && (
        <div
          className="modal-force-top"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(51, 69, 86, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeConfirmDialog(); }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderTop: '6px solid #1f6b3a' }}>
            <h3 style={{ marginTop: 0, color: '#1f6b3a', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Rebate
            </h3>
            <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', margin: '16px 0 24px 0' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={closeConfirmDialog} style={{ padding: '10px 24px', backgroundColor: '#f1f1f1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#333' }}>Cancel</button>
              <button onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()} style={{ padding: '10px 24px', backgroundColor: '#1f6b3a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Yes, Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSalesRebate;