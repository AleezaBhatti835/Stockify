import React, { useState, useEffect, useRef } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import '../roles.css';

const REASONS = ['Damaged', 'Lost / Stolen', 'Expired', 'Found / Recount', 'Correction', 'Other'];

const getPaperConfig = (paperSize) => {
  switch (paperSize) {
    case 'Thermal58':
      return {
        maxWidth: '360px',
        bodyPadding: '18px',
        fontSize: '15px',
        mono: true,
        narrow: true,
        printCss: `@page { size: 58mm auto; margin: 4mm; }`
      };
    case 'A5':
      return {
        maxWidth: '540px',
        bodyPadding: '28px',
        fontSize: '16px',
        mono: false,
        narrow: false,
        printCss: `@page { size: A5; margin: 12mm; }`
      };

    case 'A4':
    default:
      return {
        maxWidth: '900px',
        bodyPadding: '36px',
        fontSize: '18px',
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

  // VIEW MODE STATE (Abstract vs Product)
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
    setCurrentPage(1); // Reset page when filters OR viewMode change
  }, [filterStartDate, filterEndDate, adjustments, viewMode]);

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
      <div style={styles.receiptOverlay} onClick={() => setViewModalData(null)}>
        <div style={{ ...styles.receiptContainer, maxWidth: paperConfig.maxWidth }} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.receiptHeader, flexDirection: paperConfig.narrow ? 'column' : 'row', gap: paperConfig.narrow ? '10px' : '0' }}>
            <h3 style={{ margin: 0, color: '#000' }}>CAPOBIZ</h3>
            <div style={{ ...styles.receiptActions, width: paperConfig.narrow ? '100%' : 'auto' }}>
              <button className="receipt-print-btn" style={{ ...styles.printReceiptBtn, ...(paperConfig.narrow ? { flex: 1 } : {}) }} onClick={handlePrint}>
                🖨️ Print
              </button>
              <button className="receipt-close-btn" style={{ ...styles.closeReceiptBtn, ...(paperConfig.narrow ? { flex: 1 } : {}) }} onClick={() => setViewModalData(null)}>
                ✕ Close
              </button>
            </div>
          </div>

          <div style={{ ...styles.receiptBody, padding: paperConfig.bodyPadding, fontSize: paperConfig.fontSize, fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit' }} id="receipt-content">
            <div style={styles.receiptHeaderInfo}>
              <h4 style={{ margin: '4px 0', color: '#333' }}>STOCK ADJUSTMENT</h4>
              <p style={{ margin: '4px 0', color: '#333' }}>Invoice #: {viewModalData.invoiceNumber || 'N/A'}</p>
              <p style={{ margin: '4px 0', color: '#333' }}>Date: {formatDate(viewModalData.createdAt)}</p>
            </div>
            <div style={styles.receiptDivider}></div>

            {paperConfig.mono ? (
              <div>
                {invoiceItems.map((item, idx) => (
                  <div key={idx} style={styles.thermalItemRow}>
                    <div style={styles.thermalItemLine1}>
                      <span>{item.product?.name || item.productName || 'Unknown Product'}</span>
                      <span style={{ color: item.adjustmentType === 'Increase' ? '#28a745' : '#dc3545' }}>
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
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.receiptTh, width: '30%' }}>Product Name</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '25%' }}>Reason</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '20%' }}>Qty</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '25%' }}>Stock Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.receiptTdName}>{item.product?.name || item.productName || 'Unknown Product'}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.reason}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'left', fontWeight: 'bold', color: item.adjustmentType === 'Increase' ? '#28a745' : '#dc3545' }}>
                        {item.adjustmentType === 'Increase' ? '+' : '-'}{item.quantity}
                      </td>
                      <td style={{ ...styles.receiptTd, textAlign: 'left' }}>
                        {item.previousQuantity} → {item.newQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Group raw adjustments by invoiceNumber for Abstract View
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
    return Object.values(map).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [filteredHistory]);

  const listToPaginate = viewMode === 'summary' ? groupedHistory : filteredHistory;
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = listToPaginate.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(listToPaginate.length / itemsPerPage);

  const accentColor = activeTab === 'Increase' ? '#28a745' : '#dc3545';

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>

      {showSuccessPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#28a745', margin: '0 0 10px 0' }}>✓ Success!</h2>
            <p style={{ margin: 0, color: '#555', fontSize: '16px' }}>Stock adjustments saved successfully.</p>
          </div>
        </div>
      )}

      {viewModalData && renderReceipt()}

      {!showFormView ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            
            <div style={{  textAlign: 'left', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', backgroundColor: 'transparent' }}>
              
              {/* VIEW MODE RADIO BUTTONS */}
              <div style={{ width: 'auto' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555' }}>View Mode</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '9px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#fff', boxSizing: 'border-box', height: '39px' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
                    <input 
                      type="radio" 
                      name="viewMode" 
                      value="summary" 
                      checked={viewMode === 'summary'} 
                      onChange={(e) => setViewMode(e.target.value)} 
                    />
                    Abstract
                  </label>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
                    <input 
                      type="radio" 
                      name="viewMode" 
                      value="detailed" 
                      checked={viewMode === 'detailed'} 
                      onChange={(e) => setViewMode(e.target.value)} 
                    />
                    Product
                  </label>
                </div>
              </div>

              <div style={{ width: '20%' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555' }}>Start Date</label>
                <input
                  type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
                  max={filterEndDate || todayDateStr}
                  style={{ width: '100%', padding: '10px',backgroundColor:'#ffffff', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ width: '20%' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#555' }}>End Date</label>
                <input
                  type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
                  min={filterStartDate}
                  max={todayDateStr}
                  style={{ width: '100%', padding: '10px',backgroundColor:'#ffffff', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleClearFilter} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: '1px solid #cfcece', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                  Reset to Today
                </button>
                <button
                  onClick={() => setShowFormView(!showFormView)}
                  style={{ padding: '10px 20px', backgroundColor: '#5aa7ef', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {showFormView ? '← Back to List' : '+ Add Adjustment'}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '6px', marginTop: '20px' }}>
              <table className="roles-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2b3a4a', color: 'white', textAlign: 'left', textTransform: 'uppercase', fontSize: '12px' }}>
                    <th style={{ padding: '7px', width: '7%' }}>Sr#</th>
                    <th style={{ padding: '7px', width: '15%' }}>Date</th>
                    <th style={{ padding: '7px', width: '15%' }}>Invoice#</th>
                    
                    {viewMode === 'summary' ? (
                      <th style={{ padding: '7px', width: '12%',textAlign:'center' }}>Summary</th>
                    ) : (
                      <>
                        <th style={{ padding: '7px', width: '10%' }}>Product</th>
                        <th style={{ padding: '7px', width: '20%' }}>Type</th>
                        <th style={{ padding: '7px', width: '10%' }}>Qty</th>
                      </>
                    )}
                    
                    <th style={{ padding: '15px', textAlign: 'center', width: '15%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={viewMode === 'summary' ? 5 : 7} style={{ padding: '30px', textAlign: 'center' }}>Loading...</td></tr>
                  ) : listToPaginate.length === 0 ? (
                    <tr><td colSpan={viewMode === 'summary' ? 5 : 7} style={{ padding: '40px', textAlign: 'center', color: '#777' }}>No records found for the selected date range.</td></tr>
                  ) : currentItems.map((item, index) => {
                    const srNum = indexOfFirstItem + index + 1;
                    
                    if (viewMode === 'summary') {
                      // RENDERING ABSTRACT (GROUP) ROW
                      const group = item;
                      return (
                        <tr key={group.invoiceNumber} style={{ borderBottom: '1px solid #eaeaea' }}>
                          <td style={{ padding: '7px' }}>{srNum}</td>
                          <td style={{ padding: '7px', color: '#555' }}>{formatDate(group.createdAt)}</td>
                          <td style={{ padding: '7px', fontWeight: 'bold' }}>{group.invoiceNumber}</td>
                          
                          <td style={{ padding: '7px',textAlign:'center',marginLeft:'30%' }}>
                            <div style={{ display: 'flex',textAlign:'center' , flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex',textAlign:'center' , alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: '500',textAlign:'center' , color: '#2b3a4a', fontSize: '13px' }}>
                                  {group.itemCount} Item{group.itemCount !== 1 ? 's' : ''}
                                </span>
                                <div style={{ display: 'flex', gap: '6px',textAlign:'center'  }}>
                                  {group.increaseTotal > 0 && (
                                    <span style={{ backgroundColor: '#eaf7f3',textAlign:'center' , color: '#205a4e', border: '1px solid #c8e6c9', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', marginRight: '3px' }}>↑</span> {group.increaseTotal}
                                    </span>
                                  )}
                                  {group.decreaseTotal > 0 && (
                                    <span style={{ backgroundColor: '#fff5f5',textAlign:'center' , color: '#dc3545', border: '1px solid #f5c6cb', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', marginRight: '3px' }}>↓</span> {group.decreaseTotal}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                            </div>
                          </td>

                          <td style={{ padding: '7px', textAlign: 'right' }}>
                            <button onClick={() => setViewModalData(group)} style={styles.iconBtnView} title="View Details">
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    } else {
                      // RENDERING DETAILED (PRODUCT) ROW
                      const adj = item;
                      const isIncrease = adj.adjustmentType === 'Increase';
                      return (
                        <tr key={adj._id} style={{ borderBottom: '1px solid #eaeaea' }}>
                          <td style={{ padding: '7px' }}>{srNum}</td>
                          <td style={{ padding: '7px', color: '#555' }}>{formatDate(adj.createdAt)}</td>
                          <td style={{ padding: '7px', fontWeight: 'bold' }}>{adj.invoiceNumber || 'N/A'}</td>
                          <td style={{ padding: '7px', color: '#2b3a4a', fontWeight: '500' }}>
                            {adj.product?.name || adj.productName || 'Unknown'}
                          </td>
                          <td style={{ padding: '7px' }}>
                            <span style={{ 
                              backgroundColor: isIncrease ? '#eaf7f3' : '#fff5f5', 
                              color: isIncrease ? '#205a4e' : '#dc3545', 
                              border: isIncrease ? '1px solid #c8e6c9' : '1px solid #f5c6cb', 
                              padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' 
                            }}>
                              {adj.adjustmentType}
                            </span>
                          </td>
                          <td style={{ padding: '7px', fontWeight: 'bold', color: isIncrease ? '#28a745' : '#dc3545' }}>
                            {isIncrease ? '+' : '-'}{adj.quantity}
                          </td>
                          <td style={{ padding: '7px', textAlign: 'center',marginLeft:'30%' }}>
                            <button 
                              onClick={() => {
                                // Find the group to show full invoice in detailed view
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
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {listToPaginate.length > itemsPerPage && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '8px 16px', backgroundColor: currentPage === 1 ? '#e9ecef' : '#5aa7ef', color: currentPage === 1 ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500' }}>←</button>
                <span style={{ fontSize: '12px', fontWeight: '400', color: '#868484' }}>Page {currentPage} of {totalPages || 1}</span>
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '8px 16px', backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#5aa7ef', color: currentPage >= totalPages ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '500' }}>→</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff', maxWidth: '600px', margin: '0 auto', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative' }}>

            <button
              onClick={() => setShowFormView(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', color: '#6c757d' }}
              title="Close (Esc)"
            >
              ✕
            </button>

            <div style={{ display: 'flex', gap: '12px', width: '70%', margin: '0 auto 20px auto' }}>
              <button
                onClick={() => switchTab('Increase')}
                style={{ padding: '10px', borderRadius: '30px', border: activeTab === 'Increase' ? 'none' : '1px solid #ced4da', cursor: 'pointer', fontWeight: 700, backgroundColor: activeTab === 'Increase' ? '#2b3a4a' : '#fff', color: activeTab === 'Increase' ? '#fff' : '#2b3a4a', transition: '0.2s', flex: 1 }}
                title="Shortcut: Alt + Up Arrow"
              >
                ▲ Increase
              </button>
              <button
                onClick={() => switchTab('Decrease')}
                style={{ padding: '10px', borderRadius: '30px', border: activeTab === 'Decrease' ? 'none' : '1px solid #ced4da', cursor: 'pointer', fontWeight: 700, backgroundColor: activeTab === 'Decrease' ? '#2b3a4a' : '#fff', color: activeTab === 'Decrease' ? '#fff' : '#2b3a4a', transition: '0.2s', flex: 1 }}
                title="Shortcut: Alt + Down Arrow"
              >
                ▼ Decrease
              </button>
            </div>

            {errorMsg && (
              <div style={{ marginBottom: '15px', padding: '10px 15px', borderRadius: '4px', color: '#842029', backgroundColor: '#f8d7da', border: '1px solid #f5c2c7' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddToList}>
              <div style={{ display: 'flex', textAlign: 'left', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1, position: 'relative' }} ref={dropdownRef}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555' }}>Product *</label>
                  <input
                    type="text" value={searchTerm} onChange={handleSearchChange}
                    onFocus={() => { setFilteredProducts(products); setIsDropdownOpen(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search product ..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  />
                  {isDropdownOpen && (
                    <ul
                      ref={listRef}
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                        maxHeight: '200px', overflowY: 'auto', zIndex: 1000, margin: 0, padding: 0, textAlign: 'left',
                        listStyle: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#3d3b3b'
                      }}
                    >
                      {filteredProducts.map((product, index) => (
                        <li
                          key={product._id}
                          onClick={() => selectProduct(product)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', backgroundColor: index === highlightedIndex ? '#e3f2fd' : '#fff' }}
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

              <div style={{ display: 'flex', textAlign: 'left', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555' }}>Quantity *</label>
                  <input
                    ref={quantityRef}
                    type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddToList(e);
                      }
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#555' }}>Reason</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}>
                    <option value="">Select reason (optional)...</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '500', color: '#555' }}>Notes</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da', resize: 'vertical', backgroundColor: 'white' }}
                />
              </div>

              <button type="submit" style={{ width: '25%', padding: '12px', backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Add to Cart
              </button>
            </form>
          </div>

          {pendingItems.length > 0 && (
            <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff', maxWidth: '600px', margin: '0 auto', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Cart Items</h3>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Invoice: {currentBatchInvoice}</span>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #eaeaea', borderRadius: '6px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2b3a4a', color: 'white', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px' }}>Product</th>
                      <th style={{ padding: '12px' }}>Type</th>
                      <th style={{ padding: '12px' }}>Qty</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingItems.map(item => (
                      <tr key={item.tempId} style={{ borderBottom: '1px solid #eaeaea', fontSize: '13px', textAlign: 'left' }}>
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
  actionGroup: { display: 'flex', justifyContent: 'center', gap: '12px' },
  iconBtnView: {
    background: '#f0fdf4', color: '#264b61', border: '1px solid #ddecf5', padding: '8px',marginLeft:'39%',
    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', backgroundColor: '#ebf5fc'
  },
  td: { padding: '10px 12px' },
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
  receiptActions: { margin: '0 70%', display: 'flex', gap: '10px' },
  printReceiptBtn: { background: '#2f3d52', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
  receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px', fontSize: '14px' },
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