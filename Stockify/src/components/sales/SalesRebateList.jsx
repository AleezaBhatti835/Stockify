import { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

const todayStr = () => new Date().toISOString().slice(0, 10);

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

  // CORE ARCHITECTURE: Asynchronous fetching and ascending chronological sorting of sales rebate records from backend endpoints.
  const fetchRebates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales-rebates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/sales-rebates/${rebate._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

  // UI ENGINE: Isolated iframe document generator ensuring pixel-perfect physical receipt printing across multiple paper configurations.
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

  const renderReceipt = () => {
    if (!viewRebate) return null;
    const paperConfig = getPaperConfig(printSettings?.paperSize);

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-container" style={{ width:'850px', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
          
          <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>CAPOBIZ</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
              <button className="btn btn-secondary" onClick={closeModal}>✕ Close</button>
            </div>
          </div>

          <div
            style={{
              padding: paperConfig.bodyPadding,
              fontSize: paperConfig.fontSize,
              fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit',
              overflowY: 'auto',
              flex: 1
            }}
            id="rebate-receipt-content"
          >
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <h4 style={{ textAlign: 'center', margin: '4px 0',fontSize:'16px'}}>SALES REBATE RECEIPT</h4>
              <p style={{ margin: '4px 0', color: '#333' }}>Rebate #: <strong>{viewRebate.rebateNumber || 'N/A'}</strong></p>
              <p style={{ margin: '4px 0', color: '#333' }}>Invoice #: <strong>{viewRebate.invoiceNumber || viewRebate.sale?.saleNumber || '—'}</strong></p>
              <p style={{ margin: '4px 0', color: '#333' }}>Date: <strong>{formatDate(viewRebate.rebateDate || viewRebate.createdAt)}</strong></p>
              <p style={{ margin: '4px 0', color: '#333' }}>Customer: <strong>{getCustomerName(viewRebate)}</strong></p>
            </div>
            
            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

            {paperConfig.mono ? (
              <div>
                {(viewDetails || []).map((d, idx) => (
                  <div key={idx} style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000' }}>
                      <span>{d.product?.name || 'Unknown Product'}</span>
                      <span>x{d.quantity}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }}>
                      <span>@{d.unitPrice?.toFixed(2)}</span>
                      <span style={{ fontWeight: 700 }}>{d.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#fbfbfb', textTransform: 'uppercase', width: '30%' }}>Product Name</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#fbfbfb', textTransform: 'uppercase', width: '20%' }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#fbfbfb', textTransform: 'uppercase', width: '30%' }}>Unit Price</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#fbfbfb', textTransform: 'uppercase', width: '20%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLoading ? (
                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : (
                    (viewDetails || []).map((d, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '6px 8px',textAlign:'left', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.product?.name || 'Unknown Product'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{d.quantity}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{d.unitPrice?.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 600, textAlign: 'left' }}>{d.totalPrice?.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.15em', color: '#000', fontWeight: 700, borderTop: '2px solid #000' }}>
              <span>Total Rebate Amount</span>
              <span style={{ color: 'var(--success)' }}>Rs. {(viewRebate.totalAmount || 0).toFixed(2)}</span>
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
    <div className="dashboard-wrapper">
      
      {/* FILTER SECTION */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">Customer</label>
          <select
            className="form-input"
            value={selectedCustomerFilter}
            onChange={(e) => setSelectedCustomerFilter(e.target.value)}
          >
            <option value="">All Customers</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name || c.customerName}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">From Date</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">To Date</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Showing {filteredRebates.length} of {rebates.length} record{filteredRebates.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '8%' }}>Sr#</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Date</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Rebate #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Invoice #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '22%' }}>Customer</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Amount</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '10%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</td></tr>
              ) : currentRebates.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No sales rebates found.</td></tr>
              ) : (
                currentRebates.map((r, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr 
                      key={r._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{serialNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{new Date(r.rebateDate || r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '600' }}>{r.rebateNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{r.invoiceNumber || r.sale?.saleNumber || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{getCustomerName(r)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--success)', textAlign: 'left', fontWeight: '600' }}>Rs. {r.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onClick={() => openView(r)}
                            title="View Details"
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredRebates.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
        )}
      </div>

      {viewRebate && renderReceipt()}
    </div>
  );
}

export default SalesRebateList;