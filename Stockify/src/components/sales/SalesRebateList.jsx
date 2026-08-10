import { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';
import '../purchase/purchase.css';
import '../roles.css';

// ============== EXACT PAPER CONFIG ==============
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

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function SalesRebateList() {
  const { settings: printSettings } = usePrintSettings();
  
  const [rebates, setRebates] = useState([]);
  const [filteredRebates, setFilteredRebates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewRebate, setViewRebate] = useState(null);
  const [viewDetails, setViewDetails] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchRebates();
    fetchCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebates, fromDate, toDate, selectedCustomerFilter]);

  const fetchRebates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sales-rebates`);
      const data = await res.json();
      // Sort in ascending order (oldest first, latest at the end)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const dateA = new Date(a.rebateDate || a.createdAt);
        const dateB = new Date(b.rebateDate || b.createdAt);
        return dateA - dateB;
      });
      setRebates(sortedData);
    } catch (err) {
      console.error('Error fetching rebates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...rebates];

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        const rDate = new Date(r.rebateDate || r.createdAt);
        return rDate >= from && rDate <= to;
      });
    }

    if (selectedCustomerFilter) {
      filtered = filtered.filter(r =>
        r.customer?._id === selectedCustomerFilter || r.customer === selectedCustomerFilter
      );
    }

    setFilteredRebates(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFromDate(todayStr());
    setToDate(todayStr());
    setSelectedCustomerFilter('');
  };

  const openView = async (rebate) => {
    setViewLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sales-rebates/${rebate._id}`);
      const data = await res.json();
      if (data.success) {
        setViewRebate(data.rebate);
        setViewDetails(data.details || []);
      }
    } catch (err) {
      console.error('Error fetching rebate details:', err);
    } finally {
      setViewLoading(false);
    }
  };

  const closeModal = () => {
    setViewRebate(null);
    setViewDetails([]);
  };

  const getCustomerName = (r) => r.customer?.name || r.customer?.customerName || 'Walk-in Customer';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ================= PRINT LOGIC =================
  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('rebate-receipt-content');
    if (!contentEl || !viewRebate) return;

    let pageSizeCss;
    if (paperConfig.mono) {
      const itemCount = (viewDetails || []).length;
      const THERMAL_BASE_MM = 75;
      const THERMAL_ITEM_MM = 9;
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

  // ================= RENDER RECEIPT MODAL =================
  const renderReceipt = () => {
    if (!viewRebate) return null;

    const paperConfig = getPaperConfig(printSettings?.paperSize);

    return (
      <div style={styles.receiptOverlay} onClick={closeModal}>
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
                onClick={closeModal}
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
            id="rebate-receipt-content"
          >
            <div style={styles.receiptHeaderInfo}>
              <h4 style={{ textAlign: 'center', margin: '4px 0', color: '#333' }}>SALES REBATE RECEIPT</h4>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Rebate #: {viewRebate.rebateNumber || 'N/A'}</p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Invoice #: {viewRebate.invoiceNumber || viewRebate.sale?.saleNumber || '—'}</p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Date: {formatDate(viewRebate.rebateDate || viewRebate.createdAt)}</p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>
                Customer: {getCustomerName(viewRebate)}
              </p>
            </div>
            <div style={styles.receiptDivider}></div>

            {paperConfig.mono ? (
              <div>
                {(viewDetails || []).map((d, idx) => (
                  <div key={idx} style={styles.thermalItemRow}>
                    <div style={styles.thermalItemLine1}>
                      <span>{d.product?.name || 'Unknown Product'}</span>
                      <span>x{d.quantity}</span>
                    </div>
                    <div style={styles.thermalItemLine2}>
                      <span>@{d.unitPrice?.toFixed(2)}</span>
                      <span style={{ fontWeight: 700 }}>{d.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.receiptTh, width: '20%' }}>Product Name</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '20%' }}>Qty</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '25%' }}>Unit Price</th>
                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '10%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLoading ? (
                    <tr><td colSpan="4" style={styles.emptyCell}>Loading...</td></tr>
                  ) : (
                    (viewDetails || []).map((d, idx) => (
                      <tr key={idx}>
                        <td style={styles.receiptTdName}>{d.product?.name || 'Unknown Product'}</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{d.quantity}</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{d.unitPrice?.toFixed(2)}</td>
                        <td style={{ ...styles.receiptTd, textAlign: 'left', fontWeight: 600 }}>{d.totalPrice?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            <div style={styles.receiptDivider}></div>
            <div style={styles.receiptTotals}>
              <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid #000', paddingTop: '10px' }}>
                <span>Total Rebate Amount</span>
                <span style={{ color: '#10b981' }}>Rs. {(viewRebate.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRebates = filteredRebates.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRebates.length / itemsPerPage);

  return (
    <div style={{...styles.wrapper}}>
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
       
        <div style={styles.filterContainer}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Customer</label>
              <select
                style={styles.filterInput}
                value={selectedCustomerFilter}
                onChange={(e) => setSelectedCustomerFilter(e.target.value)}
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.name || c.customerName}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>From Date</label>
              <input type="date" style={styles.filterInput} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>To Date</label>
              <input type="date" style={styles.filterInput} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <button style={styles.clearFilterBtn} onClick={clearFilters}>Clear Filters</button>
          </div>

          <div style={styles.filterStats}>
            Showing {filteredRebates.length} of {rebates.length} record{filteredRebates.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: '0 24px 10px 24px' }}>
          <div style={{ 
            borderRadius: '4px', 
            overflow: 'hidden',
          }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, borderTopLeftRadius: '6px' }}>Sr#</th>
                  <th style={{ ...styles.th, textAlign: 'left', width: '13%' }}>Date</th>
                  <th style={{ ...styles.th, textAlign: 'left', width: '15%' }}>Rebate #</th>
                  <th style={{ ...styles.th, textAlign: 'left', width: '15%' }}>Invoice #</th>
                  <th style={{ ...styles.th, textAlign: 'left', width: '18%' }}>Customer</th>
                  <th style={{ ...styles.th, textAlign: 'left', width: '15%' }}>Amount</th>
                  <th style={{ ...styles.th, textAlign: 'center', borderTopRightRadius: '6px', width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={styles.emptyCell}>Loading...</td></tr>
                ) : currentRebates.length === 0 ? (
                  <tr><td colSpan="7" style={styles.emptyCell}>No sales rebates found.</td></tr>
                ) : (
                  currentRebates.map((r, index) => {
                    const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    return (
                      <tr key={r._id}>
                        <td style={styles.td}>{serialNumber}</td>
                        <td style={styles.td}>{new Date(r.rebateDate || r.createdAt).toLocaleDateString()}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{r.rebateNumber}</td>
                        <td style={styles.td}>{r.invoiceNumber || r.sale?.saleNumber || '—'}</td>
                        <td style={styles.td}>{getCustomerName(r)}</td>
                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600, color: '#10b981' }}>
                          Rs. {r.totalAmount.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            style={styles.iconBtnView}
                            onClick={() => openView(r)}
                            title="View Details"
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================== PAGINATION CONTROLS ==================== */}
        <div style={{ marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{ padding: '8px 16px', backgroundColor: currentPage <= 1 ? '#e9ecef' : '#3c4e6b', color: currentPage <= 1 ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            ←
          </button>
          <span style={{ fontSize: '12px', fontWeight: '400', color: '#818992' }}>Page {currentPage} of {totalPages || 1}</span>
          <button
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{ padding: '8px 16px', backgroundColor: (currentPage >= totalPages || totalPages === 0) ? '#e9ecef' : '#3c4e6b', color: (currentPage >= totalPages || totalPages === 0) ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: (currentPage >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', fontWeight: '600' }}
          >
            →
          </button>
        </div>
      </div>

      {/* ==================== DETAILED RECEIPT VIEW MODAL ==================== */}
      {viewRebate && renderReceipt()}
    </div>
  );
}

const styles = {
  wrapper: { width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '300px' },
  card: { background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 1px rgba(226, 31, 31, 0.05)' },
  filterContainer: { padding: '16px 20px', backgroundColor: '#ffffff', marginTop: '0px' },
  filterRow: { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', flex: '1', minWidth: '160px' },
  filterLabel: { fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'left' },
  filterInput: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  clearFilterBtn: { padding: '9px 16px', background: '#6c757d', color: '#ffffff', border: '1px solid #cfcece', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  filterStats: { marginTop: '10px', fontSize: '12px', color: '#64748b', textAlign: 'right'},
  table: { 
    width: '100%', 
    borderCollapse: 'collapse',
    margin: 0,
   
  },

  th: { 
    textAlign: 'left', 
    padding: '10px 16px', 
    background: '#26384a', 
    fontSize: '12px', 
    color: '#fff', 
    fontWeight: 600, 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px',
    borderBottom: 'none',
    borderradius: '10px'
  },
  td: { padding: '10px 16px', textAlign: 'left', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  emptyCell: { padding: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  iconBtnView: {
    background: '#f0fdf4',
    color: '#264b61',
    border: '1px solid #ddecf5',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    backgroundColor: '#ebf5fc'
  },

  // Receipt Modal Styles
  receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
  receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
  receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
  receiptActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  printReceiptBtn: { background: '#294463', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
  receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
  receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px' },
  receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
  receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
  receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#293746', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  receiptTd: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
  receiptTdName: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' },
  receiptTotals: { marginTop: '14px' },
  receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
  thermalItemRow: { borderBottom: '1px dashed #000', padding: '6px 0' },
  thermalItemLine1: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1em', color: '#000' },
  thermalItemLine2: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }
};

export default SalesRebateList;