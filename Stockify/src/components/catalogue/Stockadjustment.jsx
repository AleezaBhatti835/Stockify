import React, { useState, useEffect, useRef } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

const REASONS = ['Damaged', 'Lost / Stolen', 'Expired', 'Found / Recount', 'Correction', 'Other'];

const getPaperConfig = (paperSize) => {
  switch (paperSize) {
    case 'Thermal58':
      return {
        maxWidth: '360px',
        bodyPadding: '18px',
        fontSize: '14px',
        mono: true,
        narrow: true,
        printCss: `@page { size: 58mm auto; margin: 4mm; }`
      };
    case 'A5':
      return {
        maxWidth: '540px',
        bodyPadding: '24px',
        fontSize: '15px',
        mono: false,
        narrow: false,
        printCss: `@page { size: A5; margin: 12mm; }`
      };
    case 'A4':
    default:
      return {
        maxWidth: '760px',
        bodyPadding: '30px',
        fontSize: '15px',
        mono: false,
        narrow: false,
        printCss: `@page { size: A4; margin: 20mm; }`
      };
  }
};

const StockAdjustment = () => {
  const [showFormView, setShowFormView] = useState(false);
  const [products, setProducts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewModalData, setViewModalData] = useState(null);

  const [viewMode, setViewMode] = useState('summary'); 

  const [activeTab, setActiveTab] = useState('Increase');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [pendingItems, setPendingItems] = useState([]);
  const [currentBatchInvoice, setCurrentBatchInvoice] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { settings: printSettings } = usePrintSettings();

  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const quantityRef = useRef(null);

  const todayDateStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchProducts();
    fetchAdjustments();

    setFilterStartDate(todayDateStr);
    setFilterEndDate(todayDateStr);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (showFormView && adjustments.length >= 0) {
      setCurrentBatchInvoice(`ADJ-${adjustments.length + 1}`);
    }
  }, [showFormView, adjustments]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const activeItem = listRef.current.children[highlightedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveTab('Increase');
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTab('Decrease');
      }

      if (e.key === 'Escape') {
        if (viewModalData) {
          e.preventDefault();
          setViewModalData(null);
        } else if (isDropdownOpen) {
          e.preventDefault();
          setIsDropdownOpen(false);
        } else if (showFormView) {
          e.preventDefault();
          setShowFormView(false);
        }
      }

      if (e.key === 'Enter' && e.ctrlKey && showFormView && pendingItems.length > 0) {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    // eslint-disable-next-line
  }, [viewModalData, isDropdownOpen, showFormView, pendingItems]);

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
  }, [filterStartDate, filterEndDate, adjustments, viewMode]);

  // CORE ARCHITECTURE: Centralized data retrieval for stock adjustment dependencies.
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/stock-adjustment', {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt); // Sorted newest first
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
    if (!isDropdownOpen) {
      if (e.key === 'Enter' && selectedProduct) {
        e.preventDefault();
        if (quantityRef.current) quantityRef.current.focus();
      }
      return;
    }

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

    setTimeout(() => {
      if (quantityRef.current) {
        quantityRef.current.focus();
      }
    }, 100);
  };

  const handleAddToList = (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!selectedProduct) return setErrorMsg('Please select a product first.');
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) return setErrorMsg('Please enter a valid quantity.');

    const alreadyPendingForProduct = pendingItems
      .filter(i => i.productId === selectedProduct._id)
      .reduce((sum, i) => sum + (i.adjustmentType === 'Increase' ? i.quantity : -i.quantity), 0);

    const projectedStock = selectedProduct.quantity + alreadyPendingForProduct;

    if (activeTab === 'Decrease' && Number(quantity) > projectedStock) {
      return setErrorMsg(`Cannot decrease by ${quantity} — only ${projectedStock} units would be available.`);
    }

    const newItem = {
      tempId: `${Date.now()}-${Math.random()}`,
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      adjustmentType: activeTab,
      invoiceNumber: currentBatchInvoice,
      quantity: Number(quantity),
      reason: reason || 'Other',
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
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/stock-adjustment/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  // UI ENGINE: Advanced printing mechanism isolating receipt contents in a specialized iframe to prevent CSS bleeding.
  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('receipt-content');
    if (!contentEl || !viewModalData) return;

    let pageSizeCss;
    if (paperConfig.mono) {
      const heightMm = 100;
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
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; padding: 8px; border-bottom: 2px solid #000; font-size: 13px; text-transform: uppercase; }
                    td { padding: 8px; border-bottom: 1px solid #ccc; font-size: 14px; }
                    .text-success { color: #10b981; font-weight: bold; }
                    .text-danger { color: #ef4444; font-weight: bold; }
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

  const renderReceipt = () => {
    if (!viewModalData) return null;
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const invoiceItems = viewModalData.items;

    return (
      <div className="modal-overlay" onClick={() => setViewModalData(null)}>
        <div className="modal-container" style={{ width:'900px', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
          
          <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>CAPOBIZ</h3>
            <button className="modal-close" onClick={() => setViewModalData(null)}>×</button>
          </div>

          <div className="modal-body" style={{ padding: paperConfig.bodyPadding, overflowY: 'auto' }} id="receipt-content">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', textDecoration: 'underline' }}>STOCK ADJUSTMENT</h4>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>Invoice #: <strong>{viewModalData.invoiceNumber || 'N/A'}</strong></p>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>Date: <strong>{formatDate(viewModalData.createdAt)}</strong></p>
            </div>
            
            <div style={{ borderTop: '2px dashed var(--border-color)', margin: '16px 0' }}></div>

            {paperConfig.mono ? (
              <div>
                {invoiceItems.map((item, idx) => (
                  <div key={idx} style={styles.thermalItemRow}>
                    <div style={styles.thermalItemLine1}>
                      <span>{item.product?.name || item.productName || 'Unknown Product'}</span>
                      <span style={{ color: item.adjustmentType === 'Increase' ? 'var(--success)' : 'var(--danger)' }}>
                        {item.adjustmentType === 'Increase' ? '+' : '-'}{item.quantity}
                      </span>
                    </div>
                    <div style={styles.thermalItemLine2}>
                      <span>Reason: {item.reason}</span>
                      <span style={{ fontWeight: 700 }}>Stock: {item.previousQuantity} → {item.newQuantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left',color:'#fff', padding: '10px', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Product Name</th>
                    <th style={{ textAlign: 'left',color:'#fff', padding: '10px', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Reason</th>
                    <th style={{ textAlign: 'left',color:'#fff', padding: '10px', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Qty</th>
                    <th style={{ textAlign: 'center',color:'#fff', padding: '10px', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Stock Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>{item.product?.name || item.productName || 'Unknown Product'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>{item.reason}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 'bold', color: item.adjustmentType === 'Increase' ? 'var(--success)' : 'var(--danger)' }}>
                        {item.adjustmentType === 'Increase' ? '+' : '-'}{item.quantity}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center',borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                        {item.previousQuantity} → {item.newQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            <div style={{ borderTop: '2px dashed var(--border-color)', margin: '30px 0 16px 0' }}></div>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <p>System Generated Receipt</p>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
            <button className="btn btn-secondary" onClick={() => setViewModalData(null)}>Close</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
          </div>
        </div>
      </div>
    );
  };

  const groupedHistory = React.useMemo(() => {
    const map = {};
    filteredHistory.forEach(adj => {
      const inv = adj.invoiceNumber || 'N/A';
      if (!map[inv]) {
        map[inv] = {
          invoiceNumber: inv,
          createdAt: adj.createdAt,
          items: [],
          itemCount: 0,
          increaseTotal: 0,
          decreaseTotal: 0,
          productNames: []
        };
      }
      map[inv].items.push(adj);
      map[inv].itemCount += 1;
      
      if (adj.adjustmentType === 'Increase') {
        map[inv].increaseTotal += adj.quantity;
      } else {
        map[inv].decreaseTotal += adj.quantity;
      }

      const pName = adj.product?.name || adj.productName || 'Unknown';
      if (!map[inv].productNames.includes(pName)) {
        map[inv].productNames.push(pName);
      }
    });
    return Object.values(map).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filteredHistory]);

  const listToPaginate = viewMode === 'summary' ? groupedHistory : filteredHistory;
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = listToPaginate.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(listToPaginate.length / itemsPerPage);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="dashboard-wrapper">

      {showSuccessPopup && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--success)', margin: '0 0 var(--space-md) 0' }}>✓ Success!</h2>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '16px' }}>Stock adjustments saved successfully.</p>
          </div>
        </div>
      )}

      {viewModalData && renderReceipt()}

      {!showFormView ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          {/* Filters Bar */}
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
              
              <div className="form-group" style={{ marginBottom: 0,width:'24%' }}>
                <label className="form-label">View Mode</label>
                <div style={{ 
                  display: 'flex', gap: 'var(--space-md)', alignItems: 'center', 
                  padding: '7px 12px', border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', 
                  height: '38px', boxSizing: 'border-box' 
                }}>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 500 }}>
                    <input type="radio" name="viewMode" value="summary" checked={viewMode === 'summary'} onChange={(e) => setViewMode(e.target.value)} />
                    Abstract
                  </label>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 500 }}>
                    <input type="radio" name="viewMode" value="detailed" checked={viewMode === 'detailed'} onChange={(e) => setViewMode(e.target.value)} />
                    Product
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                <label className="form-label">Start Date</label>
                <input
                  type="date" className="form-input"
                  value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
                  max={filterEndDate || todayDateStr}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                <label className="form-label">End Date</label>
                <input
                  type="date" className="form-input"
                  value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
                  min={filterStartDate}
                  max={todayDateStr}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)'}}>
                <button className="btn btn-secondary" onClick={handleClearFilter}>
                  Reset to Today
                </button>
                <button className="btn btn-primary" onClick={() => setShowFormView(!showFormView)}>
                  {showFormView ? '← Back to List' : '+ Add Adjustment'}
                </button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableStyles.th}>Sr#</th>
                    <th style={tableStyles.th}>Date</th>
                    <th style={tableStyles.th}>Invoice#</th>
                    {viewMode === 'summary' ? (
                      <th style={{ ...tableStyles.th, textAlign: 'center' }}>Summary</th>
                    ) : (
                      <>
                        <th style={tableStyles.th}>Product</th>
                        <th style={tableStyles.th}>Type</th>
                        <th style={tableStyles.th}>Qty</th>
                      </>
                    )}
                    <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={viewMode === 'summary' ? 5 : 7} style={tableStyles.emptyCell}>Loading...</td></tr>
                  ) : listToPaginate.length === 0 ? (
                    <tr><td colSpan={viewMode === 'summary' ? 5 : 7} style={tableStyles.emptyCell}>No records found for the selected date range.</td></tr>
                  ) : currentItems.map((item, index) => {
                    const srNum = indexOfFirstItem + index + 1;
                    
                    if (viewMode === 'summary') {
                      const group = item;
                      return (
                        <tr key={group.invoiceNumber} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={tableStyles.td}>{srNum}</td>
                          <td style={{ ...tableStyles.td, color: 'var(--text-muted)' }}>{formatDate(group.createdAt)}</td>
                          <td style={{ ...tableStyles.td, fontWeight: 700 }}>{group.invoiceNumber}</td>
                          <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>
                                  {group.itemCount} Item{group.itemCount !== 1 ? 's' : ''}
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {group.increaseTotal > 0 && (
                                    <span style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', marginRight: '3px' }}>↑</span> {group.increaseTotal}
                                    </span>
                                  )}
                                  {group.decreaseTotal > 0 && (
                                    <span style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', marginRight: '3px' }}>↓</span> {group.decreaseTotal}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button onClick={() => setViewModalData(group)} style={styles.iconBtnView} title="View Details">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      const adj = item;
                      const isIncrease = adj.adjustmentType === 'Increase';
                      return (
                        <tr key={adj._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={tableStyles.td}>{srNum}</td>
                          <td style={{ ...tableStyles.td, color: 'var(--text-muted)' }}>{formatDate(adj.createdAt)}</td>
                          <td style={{ ...tableStyles.td, fontWeight: 700 }}>{adj.invoiceNumber || 'N/A'}</td>
                          <td style={{ ...tableStyles.td, fontWeight: 500 }}>
                            {adj.product?.name || adj.productName || 'Unknown'}
                          </td>
                          <td style={tableStyles.td}>
                            <span style={{ 
                              backgroundColor: isIncrease ? 'var(--success-bg)' : 'var(--danger-bg)', 
                              color: isIncrease ? 'var(--success)' : 'var(--danger)', 
                              border: `1px solid ${isIncrease ? 'var(--success)' : 'var(--danger)'}`, 
                              padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' 
                            }}>
                              {adj.adjustmentType}
                            </span>
                          </td>
                          <td style={{ ...tableStyles.td, fontWeight: 700, color: isIncrease ? 'var(--success)' : 'var(--danger)' }}>
                            {isIncrease ? '+' : '-'}{adj.quantity}
                          </td>
                          <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button 
                                onClick={() => {
                                  const group = groupedHistory.find(g => g.invoiceNumber === adj.invoiceNumber);
                                  setViewModalData({
                                    invoiceNumber: adj.invoiceNumber,
                                    createdAt: adj.createdAt,
                                    isSingleItemView: true, 
                                    items: [adj]
                                  });
                                }} 
                                style={styles.iconBtnView} title="View Invoice"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {listToPaginate.length > itemsPerPage && (
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
                <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                  ←
                </button>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
                <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Form View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="card" style={{ margin: '0 auto', width: '100%', position: 'relative' }}>
            
            <button
              onClick={() => setShowFormView(false)}
              style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Close (Esc)"
            >
              ✕
            </button>

            <div style={{ display: 'flex', gap: 'var(--space-md)', width: '30%', margin: '0 auto var(--space-lg) auto' }}>
              <button
                onClick={() => switchTab('Increase')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '30px', cursor: 'pointer', fontWeight: 600, transition: '0.2s',
                  border: activeTab === 'Increase' ? 'none' : `1px solid var(--btn-border)`, 
                  backgroundColor: activeTab === 'Increase' ? 'var(--primary)' : 'var(--bg-surface)', 
                  color: activeTab === 'Increase' ? '#fff' : 'var(--text-main)' 
                }}
                title="Shortcut: Alt + Up Arrow"
              >
                ▲ Increase
              </button>
              <button
                onClick={() => switchTab('Decrease')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '30px', cursor: 'pointer', fontWeight: 600, transition: '0.2s',
                  border: activeTab === 'Decrease' ? 'none' : `1px solid var(--btn-border)`, 
                  backgroundColor: activeTab === 'Decrease' ? 'var(--primary)' : 'var(--bg-surface)', 
                  color: activeTab === 'Decrease' ? '#fff' : 'var(--text-main)' 
                }}
                title="Shortcut: Alt + Down Arrow"
              >
                ▼ Decrease
              </button>
            </div>

            {errorMsg && (
              <div style={{ marginBottom: 'var(--space-md)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--danger)', backgroundColor: 'var(--danger-bg)', border: `1px solid var(--danger)`, fontSize: '13px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddToList}>
              <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                <label className="form-label">Product *</label>
                <input
                  className="form-input"
                  type="text" value={searchTerm} onChange={handleSearchChange}
                  onFocus={() => { setFilteredProducts(products); setIsDropdownOpen(true); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search product ..."
                />
                
                {isDropdownOpen && (
                  <ul ref={listRef} style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', 
                    maxHeight: '200px', overflowY: 'auto', zIndex: 1000, margin: 'var(--space-xs) 0 0 0', padding: 0, 
                    listStyle: 'none', boxShadow: 'var(--shadow-md)'
                  }}>
                    {filteredProducts.map((product, index) => (
                      <li
                        key={product._id}
                        onClick={() => selectProduct(product)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        style={{ 
                          padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', 
                          backgroundColor: index === highlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                          borderLeft: index === highlightedIndex ? '3px solid var(--primary)' : '3px solid transparent',
                          color: 'var(--text-main)'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: index === highlightedIndex ? 600 : 400 }}>{product.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: {product.quantity || 0}</div>
                      </li>
                    ))}
                    {filteredProducts.length === 0 && (
                      <li style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>No products found</li>
                    )}
                  </ul>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Quantity *</label>
                  <input
                    className="form-input"
                    ref={quantityRef}
                    type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddToList(e);
                      }
                    }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Reason</label>
                  <select className="form-input" value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="">Select reason (optional)...</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '13%',marginLeft:'43%' }}>
                Add to Cart
              </button>
            </form>
          </div>

          {pendingItems.length > 0 && (
            <div className="card" style={{ margin: '0 auto', width: '100%', padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', fontWeight: '600' }}>Cart Items</h3>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Invoice: {currentBatchInvoice}</span>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableStyles.th}>Product</th>
                      <th style={tableStyles.th}>Type</th>
                      <th style={tableStyles.th}>Qty</th>
                      <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems.map(item => (
                      <tr key={item.tempId} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={tableStyles.td}>{item.productName}</td>
                        <td style={tableStyles.td}>
                          <span style={{ color: item.adjustmentType === 'Increase' ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                            {item.adjustmentType}
                          </span>
                        </td>
                        <td style={{ ...tableStyles.td, fontWeight: 'bold' }}>{item.quantity}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                          <button onClick={() => removePendingItem(item.tempId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }} title="Remove">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <button className="btn btn-primary" onClick={handleConfirm} disabled={confirming}>
                  {confirming ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const tableStyles = {
  th: {
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '13px',
    textAlign: 'left',
    padding: '12px 16px',
    textTransform: 'uppercase'
  },
  td: {
    padding: '8px 16px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    fontSize: '13px'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  }
};

const styles = {
  iconBtnView: {
    backgroundColor: 'var(--view)',
    color: 'var(--success)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
  thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
  thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }
};

export default StockAdjustment;