import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function MessagePopup({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className="message-popup-overlay" onClick={onClose} style={{ zIndex: 1000000 }}>
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

function StockBreakage() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState([]);

  // ================= FILTER STATES =================
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  // Search + selection + Remarks
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState(''); 
  
  // Keyboard navigation state
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Cart of items added in this batch
  const [cartItems, setCartItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // ================= VIEW MODAL STATES =================
  const [viewModalData, setViewModalData] = useState(null);

  // ================= PAGINATION STATES =================
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const searchRef = useRef(null);
  const qtyInputRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, fromDate, toDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock-breakage`);
      const data = await res.json();
      
      const groups = {};
      if (Array.isArray(data)) {
        data.forEach(r => {
          const key = r.invoiceNumber || Math.floor(new Date(r.createdAt || r.date).getTime() / 5000);
          if (!groups[key]) {
            groups[key] = {
              id: r._id || key,
              date: r.createdAt || r.date,
              invoiceNumber: r.invoiceNumber || r.breakageNumber || `BRK-${Math.floor(new Date(r.createdAt || r.date).getTime() / 1000)}`,
              remarks: r.notes || r.remarks || '',
              items: []
            };
          }
          groups[key].items.push({
            _id: r._id,
            product: r.product, 
            quantity: r.quantity,
            previousQuantity: r.previousQuantity,
            newQuantity: r.newQuantity,
            breakageNumber: r.breakageNumber
          });
        });
      }
      
      const sortedData = Object.values(groups).sort((a, b) => new Date(a.date) - new Date(b.date));
      setRecords(sortedData);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching breakage records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= from && recordDate <= to;
      });
    }
    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    fetchProducts();
    setCartItems([]);
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity(1);
    setRemarks(''); 
    setSelectedSuggestionIndex(-1);
    setIsAddModalOpen(true);
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUomName = (product) => {
    if (!product?.uomId) return '—';
    if (typeof product.uomId === 'object' && product.uomId.name) return product.uomId.name;
    return '—';
  };

  const getCategoryName = (product) => {
    if (!product?.categoryId) return '—';
    if (typeof product.categoryId === 'object' && product.categoryId.name) return product.categoryId.name;
    return '—';
  };

  const alreadyInCart = (productId) => {
    const existing = cartItems.find(c => c.productId === productId);
    return existing ? existing.quantity : 0;
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSearchTerm('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setQuantity(1);

    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 10);
  };

  const handleKeyDown = (e) => {
    const availableProducts = filteredProducts.filter(p => p.quantity > 0);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < availableProducts.length - 1 ? prev + 1 : prev
      );
      const selectedElement = document.querySelector(`[data-index="${selectedSuggestionIndex + 1}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : -1
      );
      const selectedElement = document.querySelector(`[data-index="${selectedSuggestionIndex - 1}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedProduct = availableProducts[selectedSuggestionIndex];
      if (selectedProduct) {
        handleProductSelect(selectedProduct);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleAddToList = () => {
    if (!selectedProduct) {
      showMessage('Please select a product first.', 'error');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      showMessage('Quantity must be greater than zero.', 'error');
      return;
    }

    const already = alreadyInCart(selectedProduct._id);
    if (already + qty > selectedProduct.quantity) {
      showMessage(`Only ${selectedProduct.quantity} units available.`, 'error');
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(c => c.productId === selectedProduct._id);
      if (existing) {
        return prev.map(c => c.productId === selectedProduct._id ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, {
        productId: selectedProduct._id,
        name: selectedProduct.name,
        category: getCategoryName(selectedProduct),
        uom: getUomName(selectedProduct),
        availableQty: selectedProduct.quantity,
        quantity: qty
      }];
    });

    setSelectedProduct(null);
    setQuantity(1);
    setSelectedSuggestionIndex(-1);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(c => c.productId !== productId));
  };

  const handleSubmitBreakage = async () => {
    if (cartItems.length === 0) {
      showMessage('Please add at least one product.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNumber = `BRK-${Date.now()}`;
      
      const payload = {
        invoiceNumber: invoiceNumber,
        notes: remarks,
        items: cartItems.map(c => ({ 
          product: c.productId,
          productId: c.productId,
          quantity: Number(c.quantity), 
          previousQuantity: Number(c.availableQty),
          newQuantity: Number(c.availableQty) - Number(c.quantity),
          reason: 'Damage/Breakage',
          notes: remarks,
          invoiceNumber: invoiceNumber 
        }))
      };

      const res = await fetch(`${API_BASE_URL}/api/stock-breakage/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from server:", text);
        showMessage('Server returned an invalid response. Check backend logs.', 'error');
        setSubmitting(false);
        return;
      }

      if (res.ok || data.success) {
        showMessage('Broken stock recorded successfully!', 'success');
        setCartItems([]);
        setIsAddModalOpen(false);
        setRemarks(''); 
        fetchRecords(); 
      } else {
        showMessage(data.message || 'Failed to record broken stock.', 'error');
        console.error("Backend Error:", data);
      }
    } catch (err) {
      showMessage('Server error while saving broken stock.', 'error');
      console.error("Catch Error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFromDate(todayStr());
    setToDate(todayStr());
  };

  // ================= A4 PRINT LOGIC =================
  const handlePrintBreakage = () => {
    const contentEl = document.getElementById('breakage-receipt-content');
    if (!contentEl || !viewModalData) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4; margin: 20mm; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; margin: 0; }
            .header-info { text-align: center; margin-bottom: 24px; }
            .header-info h2 { margin: 0 0 8px 0; font-size: 22px; }
            .header-info h4 { margin: 0 0 16px 0; font-size: 16px; color: #444; text-decoration: underline; }
            .meta-info { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; padding: 10px; background-color: #f1f5f9; border-bottom: 2px solid #000; font-size: 13px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #ccc; font-size: 14px; }
            .text-center { text-align: center; }
            .text-danger { color: #ef4444; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2>CAPOBIZ</h2>
            <h4>STOCK BREAKAGE / DAMAGE RECEIPT</h4>
          </div>
          
          <div class="meta-info">
            <div><strong>Breakage #:</strong> ${viewModalData.invoiceNumber}</div>
            <div><strong>Date:</strong> ${new Date(viewModalData.date).toLocaleDateString()}</div>
          </div>
          ${viewModalData.remarks ? `<div class="meta-info"><div><strong>Remarks:</strong> ${viewModalData.remarks}</div></div>` : ''}
          
          <div style="border-top: 2px dashed #000; margin: 16px 0;"></div>

          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Product Name</th>
                <th class="text-center" style="width: 20%;">Qty Broken</th>
                <th class="text-center" style="width: 20%;">Prev Stock</th>
                <th class="text-center" style="width: 20%;">New Stock</th>
              </tr>
            </thead>
            <tbody>
              ${viewModalData.items.map(item => `
                <tr>
                  <td>${item.product?.name || 'Unknown Product'}</td>
                  <td class="text-center text-danger">${item.quantity}</td>
                  <td class="text-center">${item.previousQuantity || '-'}</td>
                  <td class="text-center">${item.newQuantity || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="border-top: 2px dashed #000; margin: 30px 0 16px 0;"></div>
          <div class="text-center" style="color: #555; font-size: 13px;">
            <p>Inventory has been updated successfully.</p>
            <p>System Generated Receipt</p>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 300);
  };

  // ================= PAGINATION LOGIC =================
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  return (
    <div style={styles.wrapper}>
      {message.text && !isAddModalOpen && (
        <MessagePopup message={message.text} type={message.type} onClose={() => setMessage({text:'', type:''})} />
      )}

      {/* ==================== MAIN LIST ==================== */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>

        {/* ==================== FILTERS ==================== */}
        <div style={styles.filterContainer}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>From Date</label>
              <input
                type="date"
                style={styles.filterInput}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>To Date</label>
              <input
                type="date"
                style={styles.filterInput}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <button style={styles.clearFilterBtn} onClick={clearFilters}>
              Clear Filters
            </button>
            <button style={styles.addBtn} onClick={openAddModal}>+ Add Breakage</button>
          </div>

          <div style={styles.filterStats}>
            <span>Showing {filteredRecords.length} of {records.length} invoice{filteredRecords.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ==================== TABLE ==================== */}
        <div style={{ width:'96%', marginLeft:'2%', paddingBottom: '20px' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '10%', textAlign: 'left' }}>Sr#</th>
                <th style={{ ...styles.th, width: '25%' }}>Date</th>
                <th style={{ ...styles.th, width: '45%' }}>Breakage / Invoice #</th>
                <th style={{ ...styles.th, width: '20%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={styles.emptyCell}>Loading...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="4" style={styles.emptyCell}>No records found.</td></tr>
              ) : currentRecords.length === 0 ? (
                <tr><td colSpan="4" style={styles.emptyCell}>No records found on this page.</td></tr>
              ) : (
                currentRecords.map((group, index) => (
                  <tr key={group.id}>
                    <td style={{ ...styles.td, textAlign: 'left' }}>{indexOfFirstRow + index + 1}</td>
                    <td style={styles.td}>{new Date(group.date).toLocaleDateString()}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{group.invoiceNumber}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        onClick={() => setViewModalData(group)}
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
              )}
            </tbody>
          </table>
        </div>

        {/* ==================== PAGINATION CONTROLS ==================== */}
        {filteredRecords.length > rowsPerPage && (
          <div style={styles.paginationContainer}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{
                ...styles.paginationButton,
                backgroundColor: currentPage === 1 ? '#e9ecef' : '#3c4e6b',
                color: currentPage === 1 ? '#6c757d' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            <span style={styles.paginationInfo}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{
                ...styles.paginationButton,
                backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#3c4e6b',
                color: currentPage >= totalPages ? '#6c757d' : 'white',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ==================== VIEW MODAL (INVOICE LIKE) ==================== */}
      {viewModalData && (
        <div style={styles.receiptOverlay} onClick={() => setViewModalData(null)}>
          <div style={styles.receiptContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <h3 style={{ margin: 0, color: '#000' }}>CAPOBIZ</h3>
              <div style={styles.receiptActions}>
                <button style={styles.printReceiptBtn} onClick={handlePrintBreakage}>🖨️ Print</button>
                <button style={styles.closeReceiptBtn} onClick={() => setViewModalData(null)}>✕ Close</button>
              </div>
            </div>

            <div id="breakage-receipt-content" style={styles.receiptBody}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', textDecoration: 'underline' }}>STOCK BREAKAGE RECEIPT</h4>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>Breakage #: <strong>{viewModalData.invoiceNumber}</strong></p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>Date: <strong>{new Date(viewModalData.date).toLocaleDateString()}</strong></p>
                {viewModalData.remarks && <p style={{ margin: '4px 0', fontSize: '14px' }}>Remarks: {viewModalData.remarks}</p>}
              </div>

              <div style={styles.receiptDivider}></div>

              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.receiptTh, width: '20%' }}>Product Name</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>Qty Broken</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>Prev Stock</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>New Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModalData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.receiptTd}>{item.product?.name || 'Unknown Product'}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{item.previousQuantity || '-'}</td>
                      <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{item.newQuantity || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={styles.receiptDivider}></div>
              <div style={{ textAlign: 'center', marginTop: '20px', color: '#555', fontSize: '13px' }}>
                <p>Inventory has been updated successfully.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD BROKEN STOCK MODAL ==================== */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div style={styles.addModalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>Add Broken Stock</h3>
              <button style={styles.closeBtn} onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>

            {message.text && (
              <div style={{
                margin: '12px 0', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                background: message.type === 'error' ? '#fef2f2' : '#ecfdf5',
                color: message.type === 'error' ? '#ef4444' : '#10b981'
              }}>
                {message.text}
              </div>
            )}

            {/* Top Form Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              
              {/* Product Search */}
              <div style={{ position: 'relative' }} ref={searchRef}>
                <label style={styles.label}>Search Product *</label>
                <input
                  ref={searchInputRef}
                  type="text"
                  style={styles.input}
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => { 
                    setSearchTerm(e.target.value); 
                    setShowSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                />
                {showSuggestions && searchTerm && (
                  <ul style={styles.suggestionsList}>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, index) => {
                        const isDisabled = p.quantity <= 0;
                        const isSelected = index === selectedSuggestionIndex;
                        return (
                          <li
                            key={p._id}
                            data-index={index}
                            style={{
                              ...styles.suggestionItem,
                              color: isDisabled ? '#94a3b8' : '#0f172a',
                              background: isSelected ? '#e2e8f0' : 'transparent',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              opacity: isDisabled ? 0.6 : 1
                            }}
                            onClick={() => !isDisabled && handleProductSelect(p)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                          >
                            <div>{p.name}</div>
                            <div style={{ fontSize: '11px' }}>Stock: {p.quantity}</div>
                          </li>
                        );
                      })
                    ) : (
                      <li style={styles.suggestionItem}>No products found</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Remarks Field */}
              <div>
                <label style={styles.label}>Remarks / Notes</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="Optional notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            {selectedProduct && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div style={styles.infoRowCol}><span>Product</span><strong>{selectedProduct.name}</strong></div>
                  <div style={styles.infoRowCol}><span>Category</span><strong>{getCategoryName(selectedProduct)}</strong></div>
                  <div style={styles.infoRowCol}><span>UOM</span><strong>{getUomName(selectedProduct)}</strong></div>
                  <div style={styles.infoRowCol}><span>Stock</span><strong style={{ color:'#10b981' }}>{selectedProduct.quantity}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Broken Quantity *</label>
                    <input
                      ref={qtyInputRef}
                      type="number" min="1" max={selectedProduct.quantity}
                      style={{...styles.input, fontWeight: 'bold'}}
                      value={quantity}
                      onChange={(e) => {
                        let val = e.target.value.replace(/^0+/, ''); 
                        setQuantity(val);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddToList(); }}
                    />
                  </div>
                  <button style={{...styles.addToListBtn, width: '150px'}} onClick={handleAddToList}>+ Add to List</button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <label style={styles.label}>Items to Mark as Broken</label>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', minHeight: '150px' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, textAlign: 'left' }}>Product</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Prev Stock</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Broken Qty</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>New Stock</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.length === 0 ? (
                      <tr><td colSpan="5" style={styles.emptyCell}>No items added yet. Search a product to begin.</td></tr>
                    ) : (
                      cartItems.map(item => (
                        <tr key={item.productId}>
                          <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600 }}>{item.name}</td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>{item.availableQty}</td>
                          <td style={{ ...styles.td, textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{item.quantity}</td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>{item.availableQty - item.quantity}</td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <button style={styles.removeBtn} onClick={() => removeFromCart(item.productId)}>✕ </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button style={styles.cancelBtn} onClick={() => setIsAddModalOpen(false)}>Cancel</button>
              <button
                style={{ ...styles.saveBtn, opacity: submitting || cartItems.length === 0 ? 0.6 : 1, padding: '12px 30px' }}
                onClick={handleSubmitBreakage}
                disabled={submitting || cartItems.length === 0}
              >
                {submitting ? 'Saving...' : 'Confirm Breakage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { width: '90%', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  addBtn: { background: '#223747', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', marginLeft: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px' },
  th: { textAlign: 'center', padding: '12px 16px', background: '#253247', fontSize: '12px', color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '10px 16px', textAlign: 'center', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  emptyCell: { padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  label: { fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block', textAlign: 'left' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff', outline: 'none', boxSizing: 'border-box' },
  
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '19px',
  },
  iconBtnView: {
    background: '#f0fdf4',
    color: '#264b61',
    border: '1px solid #ddecf5',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    backgroundColor: '#ebf5fc',
    margin: '0 auto'
  },
  
  suggestionsList: {
    position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff',
    border: '1px solid #cbd5e1', borderTop: 'none', borderRadius: '0 0 8px 8px',
    maxHeight: '200px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none',
    zIndex: 20, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', textAlign: 'left'
  },
  suggestionItem: { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  
  infoRowCol: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#475569' },
  addToListBtn: { background: '#223747', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  removeBtn: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 },
  
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, backdropFilter: 'blur(4px)' },
  addModalContent: { background: '#fff', padding: '30px', borderRadius: '14px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
  
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '28px', color: '#64748b', cursor: 'pointer', lineHeight: 1 },
  cancelBtn: { padding: '12px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  saveBtn: { padding: '12px 24px', background: '#223747', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  
  paginationContainer: { marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '15px 0', borderTop: '1px solid #e2e8f0' },
  paginationButton: { padding: '8px 16px', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' },
  paginationInfo: { fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'center' },
  
  filterContainer: { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  filterRow: { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', flex: '1', minWidth: '150px' },
  filterLabel: { fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textAlign: 'left' },
  filterInput: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '11px 18px', background: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  filterStats: { marginTop: '16px', fontSize: '13px', color: '#64748b', textAlign: 'right', fontWeight: '600' },

  // Receipt Modal Styles
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { width:'30%',background: '#ffffff', borderRadius: '12px', border: '1px solid #000', width: '100%', maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '2px solid #000', background: '#f8fafc', flexShrink: 0 },
  receiptActions: { display: 'flex', gap: '12px' },
  printReceiptBtn: { background: '#252f47', color: '#fff', border: '1px solid #000', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '30px', color: '#000' },
  receiptDivider: { borderTop: '2px dashed #000', margin: '20px 0' },
  receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
  receiptTh: { textAlign: 'left', padding: '12px 10px', backgroundColor: '#253548', borderBottom: '2px solid #000', fontSize: '13px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase' },
  receiptTd: { textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #ccc', fontSize: '14px', color: '#000' }
};

export default StockBreakage;