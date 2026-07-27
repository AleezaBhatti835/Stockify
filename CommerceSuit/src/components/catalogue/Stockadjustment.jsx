import React, { useState, useEffect, useRef } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import '../roles.css';

const REASONS = ['Damaged', 'Lost / Stolen', 'Expired', 'Found / Recount', 'Correction', 'Other'];

// ============== EXACT PAPER CONFIG FROM POS.JS / INVOICELIST ==============
const getPaperConfig = (paperSize) => {
  switch (paperSize) {
    case 'Thermal58':
      return {
        maxWidth: '360px',
        bodyPadding: '18px',
        fontSize: '15px',          // Font size barha diya gaya hai
        mono: true,
        narrow: true,
        printCss: `@page { size: 58mm auto; margin: 4mm; }`
      };
    case 'A5':
      return {
        maxWidth: '540px',
        bodyPadding: '28px',
        fontSize: '16px',          // Font size barha diya gaya hai
        mono: false,
        narrow: false,
        printCss: `@page { size: A5; margin: 12mm; }`
      };

    case 'A4':
    default:
      return {
        maxWidth: '900px',
        bodyPadding: '36px',
        fontSize: '18px',          // Font size barha diya gaya hai
        mono: false,
        narrow: false,
        printCss: `@page { size: A4; margin: 20mm; }`
      };
  }
};

const StockAdjustment = () => {
  // View states
  const [showFormView, setShowFormView] = useState(false);

  // Data states
  const [products, setProducts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal State
  const [viewModalData, setViewModalData] = useState(null);

  // Form states
  const [activeTab, setActiveTab] = useState('Increase');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Staging & Feedback states
  const [pendingItems, setPendingItems] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Print Settings Context
  const { settings: printSettings } = usePrintSettings();

  // Refs for clicking outside
  const dropdownRef = useRef(null);

  // Get today's date for default filters
  const todayDateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchProducts();
    fetchAdjustments();

    // Set default date filters to today
    setFilterStartDate(todayDateStr);
    setFilterEndDate(todayDateStr);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const handleGlobalKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveTab('Increase');
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTab('Decrease');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // --- AUTO-FILTER LOGIC ---
  useEffect(() => {
    let filtered = adjustments;

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(a => new Date(a.createdAt) >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => new Date(a.createdAt) <= end);
    }

    setFilteredHistory(filtered);
    setCurrentPage(1);
  }, [filterStartDate, filterEndDate, adjustments]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchAdjustments = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch('http://localhost:5000/api/stock-adjustment', { cache: 'no-store' });
      const data = await res.json();

      // Sort data in ascending order (Oldest first, Newly added at the bottom/last)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      setAdjustments(sortedData);
    } catch (error) {
      console.error('Error fetching stock adjustments:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const resetFormFields = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity('');
    setReason('');
    setNotes('');
    setFilteredProducts(products);
    setHighlightedIndex(-1);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);
    setSelectedProduct(null);
    setHighlightedIndex(-1);

    if (value.trim() === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
      );
    }
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        selectProduct(filteredProducts[highlightedIndex]);
      }
    }
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddToList = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedProduct) return setErrorMsg('Please select a product first.');
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) return setErrorMsg('Please enter a valid quantity.');
    if (!reason) return setErrorMsg('Please select a reason.');

    const alreadyPendingForProduct = pendingItems
      .filter(i => i.productId === selectedProduct._id)
      .reduce((sum, i) => sum + (i.adjustmentType === 'Increase' ? i.quantity : -i.quantity), 0);

    const projectedStock = selectedProduct.quantity + alreadyPendingForProduct;

    if (activeTab === 'Decrease' && Number(quantity) > projectedStock) {
      return setErrorMsg(`Cannot decrease by ${quantity} — only ${projectedStock} units would be available.`);
    }

    const nextInvoiceNumber = `ADJ-${adjustments.length + pendingItems.length + 1}`;

    const newItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      adjustmentType: activeTab,
      invoiceNumber: nextInvoiceNumber,
      quantity: Number(quantity),
      reason,
      notes
    };

    setPendingItems(prev => [...prev, newItem]);
    resetFormFields();
  };

  const removePendingItem = (tempId) => {
    setPendingItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleConfirm = async () => {
    if (pendingItems.length === 0) return;
    setConfirming(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:5000/api/stock-adjustment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments: pendingItems })
      });
      const result = await res.json();

      if (result.success) {
        setPendingItems([]);
        fetchProducts();
        fetchAdjustments();
        setShowSuccessPopup(true);
        setTimeout(() => {
          setShowSuccessPopup(false);
          setShowFormView(false);
        }, 2000);
      } else {
        setErrorMsg(result.message || 'Failed to save adjustments.');
      }
    } catch (error) {
      setErrorMsg('An error occurred while saving.');
    } finally {
      setConfirming(false);
    }
  };

  const handleClearFilter = () => {
    setFilterStartDate(todayDateStr);
    setFilterEndDate(todayDateStr);
  };

  // Modern isolated iframe print matching InvoiceList / PurchasedList
  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('receipt-content');
    if (!contentEl || !viewModalData) return;

    let pageSizeCss;
    if (paperConfig.mono) {
      const heightMm = 100; // compact receipt height base
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

  // Render receipt modal matching InvoiceList structure
  const renderReceipt = () => {
    if (!viewModalData) return null;

    const paperConfig = getPaperConfig(printSettings?.paperSize);

    return (
      <div style={styles.receiptOverlay} onClick={() => setViewModalData(null)}>
        <div style={{ ...styles.receiptContainer, maxWidth: paperConfig.maxWidth }} onClick={(e) => e.stopPropagation()}>

          {/* Header Actions */}
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
                onClick={() => setViewModalData(null)}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Printable Content Area */}
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
              <h4 style={{ margin: '4px 0', color: '#333' }}>STOCK ADJUSTMENT</h4>
              <p style={{ margin: '4px 0', color: '#333' }}>Invoice #: {viewModalData.invoiceNumber || 'N/A'}</p>
              <p style={{ margin: '4px 0', color: '#333' }}>Date: {formatDate(viewModalData.createdAt)}</p>
              <p style={{ textAlign: 'center',margin: '4px 0', color: viewModalData.adjustmentType === 'Increase' ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                [ TYPE: {viewModalData.adjustmentType.toUpperCase()} ]
              </p>
            </div>
            <div style={styles.receiptDivider}></div>

            {paperConfig.mono ? (
              <div>
                <div style={styles.thermalItemRow}>
                  <div style={styles.thermalItemLine1}>
                    <span>{viewModalData.product?.name || 'Unknown Product'}</span>
                    <span>{viewModalData.adjustmentType === 'Increase' ? '+' : '-'}{viewModalData.quantity}</span>
                  </div>
                  <div style={styles.thermalItemLine2}>
                    <span>Reason: {viewModalData.reason}</span>
                    <span style={{ fontWeight: 700 }}>Stock: {viewModalData.previousQuantity} → {viewModalData.newQuantity}</span>
                  </div>
                </div>
              </div>
            ) : (
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.receiptTh, width: '25%' }}>Product Name</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '25%' }}>Reason</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '25%' }}>Qty</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '13%' }}>Stock Shift</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.receiptTdName}>{viewModalData.product?.name || 'Unknown Product'}</td>
                    <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{viewModalData.reason}</td>
                    <td style={{
                      ...styles.receiptTd,
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: viewModalData.adjustmentType === 'Increase' ? '#28a745' : '#dc3545'
                    }}>
                      {viewModalData.adjustmentType === 'Increase' ? '+' : '-'}{viewModalData.quantity}
                    </td>
                    <td style={{ ...styles.receiptTd, textAlign: 'left' }}>
                      {viewModalData.previousQuantity} → {viewModalData.newQuantity}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {viewModalData.notes && (
              <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#333' }}>
                <strong>Notes:</strong> {viewModalData.notes}
              </p>
            )}
          </div>

        </div>
      </div>
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const accentColor = activeTab === 'Increase' ? '#28a745' : '#dc3545';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>

      {/* SUCCESS POPUP OVERLAY */}
      {showSuccessPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ color: '#28a745', margin: '0 0 10px 0' }}>✓ Success!</h2>
            <p style={{ margin: 0, color: '#555', fontSize: '16px' }}>Stock adjustments saved successfully.</p>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewModalData && renderReceipt()}

    

      {!showFormView ? (
        /* ==================== LIST & FILTER VIEW ==================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' ,textAlign:'left'}}>

        

          {/* History Table Card */}
          <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {/* Filters (Date only) */}
          <div style={{ textAlign:'left',display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', backgroundColor: 'transparent' }}>
            <div style={{ width:'30%'  }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>Start Date</label>
              <input
                type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
                max={filterEndDate || todayDateStr}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <div style={{ width:'30%' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>End Date</label>
              <input
                type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
                min={filterStartDate}
                max={todayDateStr}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleClearFilter} style={{ padding: '10px 20px',fontWeight:'200px', backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cfcece', borderRadius: '4px', cursor: 'pointer' }}>
                Reset to Today
              </button>
               <button
          onClick={() => setShowFormView(!showFormView)}
          style={{
            padding: '10px 20px', backgroundColor: '#5aa7ef',
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          {showFormView ? '← Back to List' : '+ Add Adjustment'}
        </button>
            </div>
              {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'right',marginLeft:'82%' }}>
       
      </div>
          </div>
            <div style={{ overflowX: 'auto', borderRadius: '6px' }}>
              <table className="roles-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2b3a4a', color: 'white', textAlign: 'left', textTransform: 'uppercase', fontSize: '12px' }}>
                    <th style={{ padding: '15px', width: '10%' }}>Sr#</th>
                    <th style={{ padding: '15px', width: '20%' }}>Date</th>
                    <th style={{ padding: '15px', width: '20%' }}>Invoice#</th>
                    <th style={{ padding: '15px', textAlign: 'left', width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center' }}>Loading...</td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#777' }}>No records found for the selected date range.</td></tr>
                  ) : currentItems.length > 0 ? (
                    currentItems.map((adj, index) => (
                      <tr key={adj._id} style={{ borderBottom: '1px solid #eaeaea' }}>
                        <td style={{ padding: '15px' }}>{indexOfFirstItem + index + 1}</td>
                        <td style={{ padding: '15px', color: '#555' }}>{formatDate(adj.createdAt)}</td>
                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{adj.invoiceNumber || 'N/A'}</td>
                        <td style={{ padding: '15px', textAlign: 'left' }}>
                          <button
                            onClick={() => setViewModalData(adj)}
                            style={styles.iconBtnView}
                            title="View Details"
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#777' }}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredHistory.length > itemsPerPage && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage === 1 ? '#e9ecef' : '#5aa7ef',
                    color: currentPage === 1 ? '#6c757d' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ←
                </button>
                <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484'}}>Page {currentPage} of {totalPages || 1}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#5aa7ef',
                    color: currentPage >= totalPages ? '#6c757d' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==================== ADD ADJUSTMENT VIEW ==================== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff', maxWidth: '800px', margin: '0 auto', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

            {/* Increase/Decrease Buttons inside the form */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '20px' }}>
              <button
                onClick={() => switchTab('Increase')}
                style={{
                  padding: '12px', borderRadius: '30px', border: activeTab === 'Increase' ? 'none' : '1px solid #ced4da',
                  cursor: 'pointer', fontWeight: 700, backgroundColor: activeTab === 'Increase' ? '#2b3a4a' : '#fff',
                  color: activeTab === 'Increase' ? '#fff' : '#2b3a4a', transition: '0.2s'
                }}
                title="Shortcut: Alt + Up Arrow"
              >
                ▲ Increase
              </button>
              <button
                onClick={() => switchTab('Decrease')}
                style={{
                 padding: '12px', borderRadius: '30px', border: activeTab === 'Decrease' ? 'none' : '1px solid #ced4da',
                  cursor: 'pointer', fontWeight: 700, backgroundColor: activeTab === 'Decrease' ? '#2b3a4a' : '#fff',
                  color: activeTab === 'Decrease' ? '#fff' : '#2b3a4a', transition: '0.2s'
                }}
                title="Shortcut: Alt + Down Arrow"
              >
                ▼ Decrease
              </button>
               <button style={{background:'none',color:'#383636',textAlign:'end'}}
                              onClick={close}
              >
                ✕ 
              </button>
            </div>

            {errorMsg && (
              <div style={{ marginBottom: '15px', padding: '10px 15px', borderRadius: '4px', color: '#842029', backgroundColor: '#f8d7da', border: '1px solid #f5c2c7' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddToList}>

              <div style={{ display: 'flex',textAlign:'left', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1, position: 'relative' }} ref={dropdownRef}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>Product *</label>
                  <input
                    type="text" value={searchTerm} onChange={handleSearchChange}
                    onFocus={() => { setFilteredProducts(products); setIsDropdownOpen(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search product ..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  />
                  {isDropdownOpen && (
                    <ul style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 1000, margin: 0, padding: 0, textAlign: 'left',
                      listStyle: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#3d3b3b'
                    }}>
                      {filteredProducts.map((product, index) => (
                        <li
                          key={product._id}
                          onClick={() => selectProduct(product)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          style={{
                            padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                            backgroundColor: index === highlightedIndex ? '#e3f2fd' : '#fff'
                          }}
                        >
                          <div>{product.name}</div>
                          <div style={{ fontSize: '11px', color: '#201f1f' }}>Stock: {product.quantity || 0}</div>
                        </li>
                      ))}
                      {filteredProducts.length === 0 && (
                        <li style={{ padding: '10px 12px', color: '#2c2b2b' }}>No products found</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex',textAlign:'left', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>Quantity *</label>
                  <input
                    type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>Reason *</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}>
                    <option value="">Select reason...</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ textAlign:'left',display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da', resize: 'vertical', backgroundColor: 'white' }}
                />
              </div>

              <button type="submit" style={{ width: '20%', padding: '12px', backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Add to Cart
              </button>
            </form>
          </div>

          {/* Staging / Cart Table */}
          {pendingItems.length > 0 && (
            <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff', maxWidth: '800px', margin: '0 auto', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Cart Items</h3>
              <div style={{ overflowX: 'auto', border: '1px solid #eaeaea', borderRadius: '6px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2b3a4a', color: 'white', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px' }}>Invoice#</th>
                      <th style={{ padding: '12px' }}>Product</th>
                      <th style={{ padding: '12px' }}>Type</th>
                      <th style={{ padding: '12px' }}>Qty</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems.map(item => (
                      <tr key={item.tempId} style={{ borderBottom: '1px solid #eaeaea', fontSize: '13px', textAlign: 'left' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.invoiceNumber}</td>
                        <td style={{ padding: '12px', color: '#555' }}>{item.productName}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: item.adjustmentType === 'Increase' ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                            {item.adjustmentType}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.quantity}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button onClick={() => removePendingItem(item.tempId)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={handleConfirm} disabled={confirming}
                  style={{ padding: '12px 30px', backgroundColor: '#2b3a4a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
                >
                  {confirming ? 'Saving...' : 'Add Adjustment'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  iconBtnView: {
    background: '#f0fdf4',
    color: '#264b61',
    border: '1px solid #ddecf5',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    backgroundColor: '#ebf5fc'
  },
  td: {
    padding: '10px 12px',
  },

  // Receipt Modal Styles ported from InvoiceList / PurchasedList
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
  receiptActions: { margin: '0 70%', display: 'flex', gap: '10px' },
  printReceiptBtn: { background: '#2f3d52', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
  receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px',fontSize:'14px' },
  receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
  receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
  receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#2c3649', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTd: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
  receiptTdName: { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTotals: { marginTop: '14px' },
  receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
  thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
  thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
  thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }
};

export default StockAdjustment;