import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function StockBreakage() {
  const [records, setRecords] = useState({ groups: [], flat: [] });
  const [loading, setLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState([]);

  const [viewMode, setViewMode] = useState('summary');

  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState('');

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const [cartItems, setCartItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState({ text: '', type: '' });

  const [viewModalData, setViewModalData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const searchRef = useRef(null);
  const qtyInputRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, fromDate, toDate]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
          setCartItems([]);
          setSelectedProduct(null);
          setSearchTerm('');
          setQuantity(1);
          setRemarks('');
          setMessage({ text: '', type: '' });
        }
        if (viewModalData) {
          e.preventDefault();
          setViewModalData(null);
        }
      }

      if (e.key === 'Enter') {
        if (isAddModalOpen && !submitting && cartItems.length > 0) {
          if (e.ctrlKey) {
            e.preventDefault();
            handleSubmitBreakage();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, viewModalData, submitting, cartItems]);

  // CORE ARCHITECTURE: Grouping and flattening breakage records for dynamic Abstract and Detailed view modes.
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/stock-breakage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      const groups = {};
      const flatList = [];

      if (Array.isArray(data)) {
        data.forEach(r => {
          flatList.push(r);

          const key = r.invoiceNumber || Math.floor(new Date(r.createdAt || r.date).getTime() / 5000);
          if (!groups[key]) {
            groups[key] = {
              id: r._id || key,
              date: r.createdAt || r.date,
              invoiceNumber: r.invoiceNumber || r.breakageNumber || `BRK-${Math.floor(new Date(r.createdAt || r.date).getTime() / 1000)}`,
              remarks: r.notes || r.remarks || '',
              items: [],
              itemCount: 0,
              totalBrokenQty: 0,
              productNames: []
            };
          }
          groups[key].items.push({
            _id: r._id,
            product: r.product,
            productName: r.product?.name || 'Unknown',
            quantity: r.quantity,
            previousQuantity: r.previousQuantity,
            newQuantity: r.newQuantity,
            breakageNumber: r.breakageNumber
          });
          groups[key].itemCount += 1;
          groups[key].totalBrokenQty += r.quantity;

          const pName = r.product?.name || 'Unknown';
          if (!groups[key].productNames.includes(pName)) {
            groups[key].productNames.push(pName);
          }
        });
      }

      const sortedGroups = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
      const sortedFlat = flatList.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

      setRecords({ groups: sortedGroups, flat: sortedFlat });
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching breakage records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const filteredRecords = React.useMemo(() => {
    if (!records.groups) return [];

    let dataToFilter = viewMode === 'summary' ? records.groups : records.flat;
    let filtered = [...dataToFilter];

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date || record.createdAt);
        return recordDate >= from && recordDate <= to;
      });
    }

    return filtered;
  }, [records, viewMode, fromDate, toDate]);

  const openAddModal = () => {
    fetchProducts();
    setCartItems([]);
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity(1);
    setRemarks('');
    setSelectedSuggestionIndex(-1);
    setMessage({ text: '', type: '' });
    setIsAddModalOpen(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
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
    setMessage({ text: '', type: '' });

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
      setSelectedSuggestionIndex(prev => prev < availableProducts.length - 1 ? prev + 1 : prev);
      const selectedElement = document.querySelector(`[data-index="${selectedSuggestionIndex + 1}"]`);
      if (selectedElement) selectedElement.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      const selectedElement = document.querySelector(`[data-index="${selectedSuggestionIndex - 1}"]`);
      if (selectedElement) selectedElement.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedProduct = availableProducts[selectedSuggestionIndex];
      if (selectedProduct) handleProductSelect(selectedProduct);
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
    setMessage({ text: '', type: '' });
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
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
      const token = localStorage.getItem('token');
      const invoiceNumber = `BRK-${Date.now()}`;

      const payload = {
        invoiceNumber: invoiceNumber,
        notes: remarks,
        items: cartItems.map((c, idx) => ({
          product: c.productId,
          productId: c.productId,
          quantity: Number(c.quantity),
          previousQuantity: Number(c.availableQty),
          newQuantity: Number(c.availableQty) - Number(c.quantity),
          reason: 'Damage/Breakage',
          notes: remarks,
          invoiceNumber: invoiceNumber,
          breakageNumber: `${invoiceNumber}-${idx + 1}`
        }))
      };

      const res = await fetch(`${API_BASE_URL}/api/stock-breakage/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        showMessage('Server returned an invalid response.', 'error');
        setSubmitting(false);
        return;
      }

      if (res.ok || data.success) {
        showMessage('Broken stock recorded successfully!', 'success');
        setTimeout(() => {
          setCartItems([]);
          setIsAddModalOpen(false);
          setRemarks('');
          setMessage({ text: '', type: '' });
          fetchRecords();
        }, 500);
      } else {
        showMessage(data.message || 'Failed to record broken stock.', 'error');
      }
    } catch (err) {
      showMessage('Server error while saving broken stock.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setFromDate(todayStr());
    setToDate(todayStr());
  };

  // PRINT ENGINE: Generates an isolated iframe document to render a clean, unstyled professional A4 breakage receipt.
  const handlePrintBreakage = () => {
    if (!viewModalData) return;

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
            <h2>Stockify</h2>
            <h4>STOCK BREAKAGE / DAMAGE RECEIPT ${viewModalData.isSingleItemView ? '(SINGLE ITEM)' : ''}</h4>
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
                  <td>${item.product?.name || item.productName || 'Unknown Product'}</td>
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

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  const InlineMessage = ({ message, type }) => {
    if (!message) return null;
    const colors = {
      success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
      error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' }
    };
    const style = colors[type] || colors.error;

    return (
      <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, fontSize: '13px', fontWeight: 500 }}>
        {style.icon} {message}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">

      <InlineMessage message={message.text} type={message.type} />

      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">View Mode</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '6px 12px', border: '1px solid #eaeaea', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)' }}>
           <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
  <input 
    type="radio" 
    name="viewMode" 
    value="summary" 
    checked={viewMode === 'summary'} 
    onChange={(e) => setViewMode(e.target.value)} 
    style={{
      appearance: 'none', WebkitAppearance: 'none', width: '12px', height: '12px', borderRadius: '50%', margin: 0, cursor: 'pointer',
      backgroundColor: viewMode === 'summary' ? 'var(--primary)' : '#fff',
      border: viewMode === 'summary' ? '2px solid #fff' : '1px solid #ccc',
      boxShadow: viewMode === 'summary' ? '0 0 0 1px var(--primary)' : 'none'
    }}
  />
  Abstract
</label>

<label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
  <input 
    type="radio" 
    name="viewMode" 
    value="detailed" 
    checked={viewMode === 'detailed'} 
    onChange={(e) => setViewMode(e.target.value)} 
    style={{
      appearance: 'none', WebkitAppearance: 'none', width: '12px', height: '12px', borderRadius: '50%', margin: 0, cursor: 'pointer',
      backgroundColor: viewMode === 'detailed' ? 'var(--primary)' : '#fff',
      border: viewMode === 'detailed' ? '2px solid #fff' : '1px solid #ccc',
      boxShadow: viewMode === 'detailed' ? '0 0 0 1px var(--primary)' : 'none'
    }}
  />
  Product
</label>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">From Date</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">To Date</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={clearFilters}>Reset to Today </button>
          <button className="btn btn-primary" onClick={openAddModal}>+ Add Breakage</button>
        </div>

      </div>

      {/* TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Sr#</th>
                <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Date</th>
                <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Breakage / Invoice #</th>
                {viewMode === 'summary' ? (
                  <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Summary</th>
                ) : (
                  <>
                    <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Product</th>
                    <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Qty</th>
                  </>
                )}
                <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={viewMode === 'summary' ? 5 : 6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={viewMode === 'summary' ? 5 : 6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No records found.</td></tr>
              ) : currentRecords.length === 0 ? (
                <tr><td colSpan={viewMode === 'summary' ? 5 : 6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No records found on this page.</td></tr>
              ) : (
                currentRecords.map((item, index) => {
                  const srNum = indexOfFirstRow + index + 1;

                  if (viewMode === 'summary') {
                    const group = item;
                    return (
                      <tr key={group.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', textAlign: 'left' }}>{srNum}</td>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)' }}>{new Date(group.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{group.invoiceNumber}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>
                              {group.itemCount} Item{group.itemCount !== 1 ? 's' : ''}
                            </span>
                            <span style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                              ↓ {group.totalBrokenQty} broken
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setViewModalData(group)}
                            style={{
                              backgroundColor: 'var(--view)',
                              color: 'var(--viewtext)', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: '0.2s'
                            }}
                            title="View Invoice"
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  } else {
                    const row = item;
                    return (
                      <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', textAlign: 'left' }}>{srNum}</td>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)' }}>{new Date(row.createdAt || row.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)' }}>{row.invoiceNumber || row.breakageNumber}</td>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)' }}>{row.product?.name || 'Unknown'}</td>
                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--danger)', fontWeight: 'bold', textAlign: 'center' }}>{row.quantity}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setViewModalData({
                                invoiceNumber: row.invoiceNumber || row.breakageNumber,
                                date: row.createdAt || row.date,
                                isSingleItemView: true,
                                remarks: row.notes || row.remarks,
                                items: [{
                                  product: row.product,
                                  productName: row.product?.name || 'Unknown',
                                  quantity: row.quantity,
                                  previousQuantity: row.previousQuantity,
                                  newQuantity: row.newQuantity
                                }]
                              });
                            }}
                            style={{  backgroundColor: 'var(--view)',
    color: 'var(--success)',border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: '0.2s' }}
                            title="View Detail"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > rowsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODAL (INVOICE LIKE) */}
      {viewModalData && (
        <div className="modal-overlay" onClick={() => setViewModalData(null)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Stockify</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={handlePrintBreakage}>🖨️ Print</button>
                <button className="btn btn-secondary" onClick={() => setViewModalData(null)}>✕ Close</button>
              </div>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '18px'}}>
                  STOCK BREAKAGE RECEIPT {viewModalData.isSingleItemView ? '(SINGLE ITEM)' : ''}
                </h4>
                <p style={{ margin: '4px 0', fontSize: '14px',textAlign:'left'  }}>Breakage #: <strong>{viewModalData.invoiceNumber}</strong></p>
                <p style={{ margin: '4px 0', fontSize: '14px' ,textAlign:'left' }}>Date: <strong>{new Date(viewModalData.date).toLocaleDateString()}</strong></p>
                {viewModalData.remarks && <p style={{ margin: '4px 0', fontSize: '14px',textAlign:'left'  }}>Remarks: {viewModalData.remarks}</p>}
              </div>

              <div style={{ borderTop: '2px dashed var(--border-color)', margin: '20px 0' }}></div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px',color:'#fff', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Product Name</th>
                    <th style={{ textAlign: 'center', padding: '10px',color:'#fff', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Qty Broken</th>
                    <th style={{ textAlign: 'center', padding: '10px',color:'#fff', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>Prev Stock</th>
                    <th style={{ textAlign: 'center', padding: '10px',color:'#fff', backgroundColor: 'var(--header)', borderBottom: '2px solid var(--border-color)', fontSize: '13px' }}>New Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModalData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px',textAlign:'left'  }}>{item.product?.name || item.productName || 'Unknown Product'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px', textAlign: 'center', color: 'var(--danger)', fontWeight: '600' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px', textAlign: 'center' }}>{item.previousQuantity || '-'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', fontSize: '14px', textAlign: 'center' }}>{item.newQuantity || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '2px dashed var(--border-color)', margin: '30px 0 16px 0' }}></div>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <p>Inventory has been updated successfully.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD BROKEN STOCK MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Broken Stock</h2>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto' }}>
              <InlineMessage message={message.text} type={message.type} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ position: 'relative' }} ref={searchRef}>
                  <label className="form-label required">Search Product </label>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="form-input"
                    placeholder="Search product..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      setSelectedSuggestionIndex(-1);
                      setMessage({ text: '', type: '' });
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                  />
                  {showSuggestions && searchTerm && (
                    <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', maxHeight: '200px', overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none', zIndex: 20, boxShadow: 'var(--shadow-md)' }}>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p, index) => {
                          const isDisabled = p.quantity <= 0;
                          const isSelected = index === selectedSuggestionIndex;
                          return (
                            <li
                              key={p._id}
                              data-index={index}
                              style={{
                                padding: '10px 14px',
                                borderBottom: '1px solid var(--border-color)',
                                fontSize: '13px',
                                color: isDisabled ? 'var(--text-light)' : 'var(--text-main)',
                                backgroundColor: isSelected ? 'var(--bg-app)' : 'transparent',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.6 : 1
                              }}
                              onClick={() => !isDisabled && handleProductSelect(p)}
                              onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            >
                              <div>{p.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stock: {p.quantity}</div>
                            </li>
                          );
                        })
                      ) : (
                        <li style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--text-muted)' }}>No products found</li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedProduct) {
                        e.preventDefault();
                        handleAddToList();
                      }
                    }}
                  />
                </div>
              </div>

              {selectedProduct && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}><span>Product</span><strong style={{ color: 'var(--text-main)' }}>{selectedProduct.name}</strong></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}><span>Category</span><strong style={{ color: 'var(--text-main)' }}>{getCategoryName(selectedProduct)}</strong></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}><span>UOM</span><strong style={{ color: 'var(--text-main)' }}>{getUomName(selectedProduct)}</strong></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}><span>Stock</span><strong style={{ color: 'var(--success)' }}>{selectedProduct.quantity}</strong></div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label required">Broken Quantity </label>
                      <input
                        ref={qtyInputRef}
                        type="number" min="1" max={selectedProduct.quantity}
                        className="form-input"
                        style={{ fontWeight: 'bold' }}
                        value={quantity}
                        onChange={(e) => {
                          let val = e.target.value.replace(/^0+/, '');
                          setQuantity(val);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddToList(); }}
                      />
                    </div>
                    <button className="btn btn-secondary" style={{ backgroundColor: 'var(--primary)', color: 'white' }} onClick={handleAddToList}>+ Add to List</button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '24px' }}>
                <label className="form-label">Items to Mark as Broken</label>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: '150px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Product</th>
                        <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'center', fontSize: '13px' }}>Prev Stock</th>
                        <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'center', fontSize: '13px' }}>Broken Qty</th>
                        <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'center', fontSize: '13px' }}>New Stock</th>
                        <th style={{ backgroundColor: 'var(--header)', color: 'white', padding: '12px 16px', textAlign: 'center', fontSize: '13px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No items added yet. Search a product to begin.</td></tr>
                      ) : (
                        cartItems.map(item => (
                          <tr key={item.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{item.name}</td>
                            <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', textAlign: 'center' }}>{item.availableQty}</td>
                            <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--danger)', fontWeight: 'bold', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--text-main)', textAlign: 'center' }}>{item.availableQty - item.quantity}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <button style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }} onClick={() => removeFromCart(item.productId)}>✕</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
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

export default StockBreakage;