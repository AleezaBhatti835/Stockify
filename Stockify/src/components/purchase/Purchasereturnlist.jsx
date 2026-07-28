import React, { useState, useEffect, useRef } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import './purchase.css';
import '../roles.css';

// ============== EXACT PAPER CONFIG FROM POS.JS / INVOICELIST ==============
const getPaperConfig = (paperSize) => {
  switch (paperSize) {
    case 'Thermal58':
      return {
        maxWidth: '320px',
        bodyPadding: '14px',
        fontSize: '12px',
        mono: true,
        narrow: true,
        printCss: `@page { size: 58mm auto; margin: 4mm; }`
      };
    case 'A5':
      return {
        maxWidth: '460px',
        bodyPadding: '20px',
        fontSize: '13px',
        mono: false,
        narrow: false,
        printCss: `@page { size: A5; margin: 12mm; }`
      };
    case 'A4':
    default:
      return {
        maxWidth: '800px',
        bodyPadding: '24px',
        fontSize: '14px',
        mono: false,
        narrow: false,
        printCss: `@page { size: A4; margin: 20mm; }`
      };
  }
};

const PurchaseReturnList = () => {
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Supplier search states
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Use Print Settings Context
  const { settings: printSettings } = usePrintSettings();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get date 30 days ago
  const getLastMonthDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter States with default values
  const [filters, setFilters] = useState({
    search: '', // Now dedicated to Supplier Name
    dateFrom: getLastMonthDate(),
    dateTo: getTodayDate()
  });

  useEffect(() => {
    fetchReturns();
    fetchSuppliers();

    // Click outside handler to close dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply filters whenever returns or filters change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returns, filters]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isDropdownOpen || filteredSuppliers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredSuppliers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        selectSupplier(filteredSuppliers[highlightedIndex]);
      } else if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen, filteredSuppliers, highlightedIndex]);

  const fetchReturns = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/purchase-returns', { cache: 'no-store' });
      const data = await res.json();
      const sortedData = data.sort((a, b) => new Date(a.returnDate) - new Date(b.returnDate));

      setReturns(sortedData);
      setFilteredReturns(sortedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching purchase returns:', error);
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/suppliers');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
      setFilteredSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...returns];

    // Search by Supplier Name - fixed undefined check
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      filtered = filtered.filter(ret => {
        const contactMatch = ret.supplier?.contactPerson?.toLowerCase().includes(term);
        const nameMatch = ret.supplier?.name?.toLowerCase().includes(term);
        const companyMatch = ret.supplier?.companyName?.toLowerCase().includes(term);
        return contactMatch || nameMatch || companyMatch;
      });
    }

    // Filter by Date Range (returnDate)
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter(ret => {
        if (!ret.returnDate) return false;
        const returnDate = new Date(ret.returnDate);
        returnDate.setHours(0, 0, 0, 0);
        return returnDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter(ret => {
        if (!ret.returnDate) return false;
        const returnDate = new Date(ret.returnDate);
        returnDate.setHours(23, 59, 59, 999);
        return returnDate <= toDate;
      });
    }

    setFilteredReturns(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle supplier search input change with dropdown
  const handleSupplierSearchChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      search: value
    }));
    setHighlightedIndex(-1);

    // Filter suppliers based on input
    if (value.trim() === '') {
      setFilteredSuppliers(suppliers);
    } else {
      const term = value.trim().toLowerCase();
      const filtered = suppliers.filter(supplier => {
        const nameMatch = supplier.name?.toLowerCase().includes(term);
        const contactMatch = supplier.contactPerson?.toLowerCase().includes(term);
        const companyMatch = supplier.companyName?.toLowerCase().includes(term);
        return nameMatch || contactMatch || companyMatch;
      });
      setFilteredSuppliers(filtered);
    }
    setIsDropdownOpen(true);
  };

  // Select a supplier from dropdown
  const selectSupplier = (supplier) => {
    setFilters(prev => ({
      ...prev,
      search: supplier.name || supplier.contactPerson || ''
    }));
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    // Close dropdown and keep focus on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: getLastMonthDate(),
      dateTo: getTodayDate()
    });
    setFilteredSuppliers(suppliers);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const openModal = (ret) => {
    setSelectedReturn(ret);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReturn(null);
    setIsModalOpen(false);
  };

  const updateStatus = async (returnId, nextStatus) => {
    const confirmed = window.confirm(`Change status to "${nextStatus}"? This may update stock or supplier ledger.`);
    if (!confirmed) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`http://localhost:5000/api/purchase-returns/${returnId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = await res.json();

      if (result.success) {
        await fetchReturns();
        if (selectedReturn && selectedReturn._id === returnId) {
          setSelectedReturn(result.purchaseReturn);
        }
      } else {
        alert(result.message || 'Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('An error occurred while updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Print Logic matching InvoiceList.jsx
  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('receipt-content');
    if (!contentEl || !selectedReturn) return;

    let pageSizeCss;
    if (paperConfig.mono) {
      const itemCount = (selectedReturn.items || []).length;
      const THERMAL_BASE_MM = 75;   // header block + divider + totals + margins
      const THERMAL_ITEM_MM = 9;    // ~2 lines per item at this font size
      const heightMm = THERMAL_BASE_MM + itemCount * THERMAL_ITEM_MM;
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

  // Render receipt modal mapping InvoiceList layout
  const renderReceipt = () => {
    if (!selectedReturn) return null;

    const paperConfig = getPaperConfig(printSettings?.paperSize);

    return (
      <div style={styles.receiptOverlay} onClick={closeModal}>
        <div style={{ ...styles.receiptContainer, maxWidth: paperConfig.maxWidth }} onClick={(e) => e.stopPropagation()}>

          {/* Header (Non-printable) */}
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
                onClick={closeModal}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Printable Content */}
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
              <h4 style={{ textAlign:'center',margin: '4px 0', color: '#333' }}>PURCHASE RETURN</h4>

              <p style={{ textAlign:'left',margin: '4px 0', color: '#333' }}>Return #: {selectedReturn.returnNumber}</p>
              <p style={{ textAlign:'left',margin: '4px 0', color: '#333' }}>Original PO #: {selectedReturn.purchase?.purchaseNumber || 'N/A'}</p>
              <p style={{ textAlign:'left',margin: '4px 0', color: '#333' }}>Date: {new Date(selectedReturn.returnDate || selectedReturn.createdAt).toLocaleDateString()}</p>
              <p style={{ textAlign:'left',margin: '4px 0', color: '#333' }}>
                Supplier: {selectedReturn.supplier?.contactPerson || selectedReturn.supplier?.name || 'Unknown'}
              </p>
              <p style={{ margin: '4px 0', color: '#119543', fontWeight: 'bold' }}>[ {selectedReturn.status.toUpperCase()} ]</p>
            </div>
            <div style={styles.receiptDivider}></div>

            {paperConfig.mono ? (
              <div>
                {(selectedReturn.items || []).map((item, idx) => {
                  return (
                    <div key={idx} style={styles.thermalItemRow}>
                      <div style={styles.thermalItemLine1}>
                        <span>{item.product?.name || 'Unknown Product'}</span>
                        <span>x{item.quantity}</span>
                      </div>
                      <div style={styles.thermalItemLine2}>
                        <span>
                          @{item.unitPrice?.toFixed(2)} (R: {item.reason} N/A)
                        </span>
                        <span style={{ fontWeight: 700 }}>{item.totalPrice?.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.receiptTh, width: '30%' }}>Product</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '20%' }}>Reason</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'center', width: '10%' }}>Qty</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'right', width: '20%' }}>Price</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'right', width: '20%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReturn.items || []).map((item, idx) => {
                    return (
                      <tr key={idx}>
                        <td style={styles.receiptTdName}>{item.product?.name || 'Unknown Product'}</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.reason}Undefined</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'right' }}>{item.unitPrice?.toFixed(2)}</td>
                        <td style={{ ...styles.receiptTd, fontWeight: 600, textAlign: 'right' }}>
                          {item.totalPrice?.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {selectedReturn.notes && (
              <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#333' }}>
                <strong>Notes:</strong> {selectedReturn.notes}
              </p>
            )}

            <div style={styles.receiptDivider}></div>
            <div style={styles.receiptTotals}>
              <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid #000', paddingTop: '10px' }}>
                <span>Total Credit Amount</span>
                <span>Rs. {(selectedReturn.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status Action Buttons (Non-Printable, stays at bottom of modal) */}
          <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', backgroundColor: '#f8fafc', flexWrap: 'wrap', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
            {selectedReturn.status === 'Draft' && (
              <>
                <button
                  disabled={updatingStatus}
                  onClick={() => updateStatus(selectedReturn._id, 'Pending Approval')}
                  style={{ ...styles.workflowBtn, backgroundColor: '#2b3a4a' }}
                >
                  Submit for Approval
                </button>
                <button
                  disabled={updatingStatus}
                  onClick={() => updateStatus(selectedReturn._id, 'Cancelled')}
                  style={{ ...styles.workflowBtn, backgroundColor: '#dc3545' }}
                >
                  Cancel
                </button>
              </>
            )}

            {selectedReturn.status === 'Pending Approval' && (
              <>
                <button
                  disabled={updatingStatus}
                  onClick={() => updateStatus(selectedReturn._id, 'Approved')}
                  style={{ ...styles.workflowBtn, backgroundColor: '#28a745' }}
                >
                  Approve
                </button>
                <button
                  disabled={updatingStatus}
                  onClick={() => updateStatus(selectedReturn._id, 'Rejected')}
                  style={{ ...styles.workflowBtn, backgroundColor: '#dc3545' }}
                >
                  Reject
                </button>
              </>
            )}

            {selectedReturn.status === 'Approved' && (
              <>
                <button
                  disabled={updatingStatus}
                  onClick={() => updateStatus(selectedReturn._id, 'Shipped to Supplier')}
                  style={{ ...styles.workflowBtn, backgroundColor: '#2b3a4a' }}
                >
                  Mark Shipped
                </button>
                <button
                  disabled={updatingStatus}
                  onClick={() => updateStatus(selectedReturn._id, 'Cancelled')}
                  style={{ ...styles.workflowBtn, backgroundColor: '#dc3545' }}
                >
                  Cancel
                </button>
              </>
            )}

            {selectedReturn.status === 'Shipped to Supplier' && (
              <button
                disabled={updatingStatus}
                onClick={() => updateStatus(selectedReturn._id, 'Completed')}
                style={{ ...styles.workflowBtn, backgroundColor: '#28a745' }}
              >
                Complete Return
              </button>
            )}
          </div>

        </div>
      </div>
    );
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  if (loading) return <div style={{ padding: '20px' }}>Loading purchase returns...</div>;

  return (
    <div className="panel" style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff' }}>
      

      {/* FILTER SECTION */}
      <div style={{
        marginBottom: '2px',
        padding: '15px',
        backgroundColor:'#ffffff'
,        borderRadius: '6px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end'
      }}>

        <div style={{ flex: '1.4', minWidth: '200px', position: 'relative' }} ref={dropdownRef}>
          <label style={{ textAlign:'left',display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
            Search (Supplier Name)
          </label>
          <input
            ref={inputRef}
            type="text"
            name="search"
            value={filters.search}
            onChange={handleSupplierSearchChange}
            onFocus={() => {
              setFilteredSuppliers(suppliers);
              setIsDropdownOpen(true);
            }}
            placeholder="Type supplier name..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px',
                      backgroundColor:'#ffffff'

            }}
          />

          {/* Supplier Dropdown Suggestions - Only shows supplier name */}
          {isDropdownOpen && filteredSuppliers.length > 0 && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              textAlign: 'left',
              color: '#555',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              margin: 0,
              padding: 0,
              listStyle: 'none',
              zIndex: 1000,
            }}>
              {filteredSuppliers.map((supplier, index) => (
                <li
                  key={supplier._id}
                  onClick={() => selectSupplier(supplier)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: '14px',
                    backgroundColor: highlightedIndex === index ? '#e1e8f5' : '#fff'
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseLeave={() => setHighlightedIndex(-1)}
                >
                  <span style={{ fontWeight: '500' }}>
                    {supplier.name || supplier.contactPerson || 'Unknown'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {isDropdownOpen && filters.search && filteredSuppliers.length === 0 && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              margin: 0,
              padding: '10px 12px',
              listStyle: 'none',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <li style={{ color: '#777', fontSize: '14px' }}>No suppliers found</li>
            </ul>
          )}
        </div>

        <div style={{ flex: '1', minWidth: '130px' }}>
          <label style={{ textAlign:'left',display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
            Date From
          </label>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            max={filters.dateTo}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px',
                      backgroundColor:'#ffffff'

            }}
          />
        </div>

        <div style={{ flex: '1', minWidth: '130px' }}>
          <label style={{ textAlign:'left',display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' }}>
            Date To
          </label>
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
            min={filters.dateFrom}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px',
                      backgroundColor:'#ffffff'

            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              height: '38px'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* RESULTS COUNT */}
      <div style={{
        marginBottom: '15px',
        fontSize: '12px',
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between',
        textAlign:'right',
        marginLeft:'78%'
      }}>
        <span>Showing {filteredReturns.length} of {returns.length} purchase returns</span>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #eaeaea' }}>
        <table className="po-table">
          <thead>
            <tr>
              <th>Sr #</th>
              <th>Date</th>
              <th>Inv #</th>
              <th>Purchase Number</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th style={{ textAlign: 'center', width: '200px' }}>Action</th>
            </tr>
          </thead>
          <tbody style={{ color: '#2b3a4a' }}>
            {currentItems.length > 0 ? (
              currentItems.map((ret, index) => (
                <tr key={ret._id}>
                  <td>{indexOfFirstItem + index + 1}</td>
                  <td>{formatDate(ret.returnDate)}</td>
                  <td>{ret.purchase?.invoiceNumber || 'N/A'}</td>
                  <td>{ret.purchase?.purchaseNumber || 'N/A'}</td>
                  <td>{ret.supplier?.contactPerson || ret.supplier?.name || 'Unknown'}</td>
                  <td style={{ fontWeight: 'bold', color: '#137333' }}>{(ret.totalAmount)}</td>
                  <td style={{ textAlign: 'center' }}>
                    {/* View Button - FIXED */}
                    <button
                      style={styles.iconBtnView}
                      onClick={() => openModal(ret)}
                      title="View"
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
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#777' }}>
                  No purchase returns found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{ padding: '8px 16px', background: currentPage === 1 ? '#e9ecef' : '#5aa7ef', color: currentPage === 1 ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            ←
          </button>

          <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484' }}>Page {currentPage} of {totalPages || 1}</span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{ padding: '8px 16px', background: currentPage >= totalPages ? '#e9ecef' : '#5aa7ef', color: currentPage >= totalPages ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            →
          </button>
        </div>
      </div>

      {isModalOpen && selectedReturn && renderReceipt()}

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
    margin: '0 auto',
    transition: 'all 0.2s',
    backgroundColor: '#ebf5fc'
  },
  td: {
    padding: '10px 12px',
  },
  workflowBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#fff'
  },

  // Receipt Modal Styles ported from InvoiceList
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
  receiptActions: { margin: '0 65%', display: 'flex', gap: '10px' },
  printReceiptBtn: { background: '#294463', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
  receiptHeaderInfo: { textAlign: 'center', marginBottom: '16px' },
  receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
  receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
  receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#293746', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTd: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
  receiptTdName: { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTotals: { marginTop: '14px' },
  receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
  thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
  thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
  thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes modalSlideIn {
    from {
      transform: translateY(20px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`;
document.head.appendChild(styleSheet);

export default PurchaseReturnList;