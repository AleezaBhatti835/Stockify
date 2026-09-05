import React, { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

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

  const [suppliers, setSuppliers] = useState([]);
  const { settings: printSettings } = usePrintSettings();

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filters, setFilters] = useState({
    supplierId: '', 
    dateFrom: getTodayDate(),
    dateTo: getTodayDate()
  });

  useEffect(() => {
    fetchReturns();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returns, filters]);

  // CORE ARCHITECTURE: Centralized data retrieval and dynamic status management for purchase returns workflow.
  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/purchase-returns', {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const sortedData = data.sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate)); // Newest first

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
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...returns];

    if (filters.supplierId) {
      filtered = filtered.filter(ret => {
        const retSupplierId = typeof ret.supplier === 'object' ? ret.supplier?._id : ret.supplier;
        return retSupplierId === filters.supplierId;
      });
    }

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
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      supplierId: '',
      dateFrom: getTodayDate(),
      dateTo: getTodayDate()
    });
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
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/purchase-returns/${returnId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  // UI ENGINE: Adaptive print renderer deploying isolated iframe contexts to ensure pixel-perfect physical receipts across formats.
  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('receipt-content');
    if (!contentEl || !selectedReturn) return;

    let pageSizeCss;
    if (paperConfig.mono) {
      const itemCount = (selectedReturn.items || []).length;
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
    if (!selectedReturn) return null;
    const paperConfig = getPaperConfig(printSettings?.paperSize);

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-container" style={{ width:'70%', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
          
          <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Stockify</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
              <button className="btn btn-secondary" onClick={closeModal}>✕ Close</button>
            </div>
          </div>

          <div className="modal-body" id="receipt-content" style={{ padding: paperConfig.bodyPadding, fontSize: paperConfig.fontSize, fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: '4px 0',fontSize:'16px' }}>PURCHASE RETURN</h4>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Return #: <strong>{selectedReturn.returnNumber}</strong></p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Original PO #: <strong>{selectedReturn.purchase?.invoiceNumber || 'N/A'}</strong></p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Date: <strong>{new Date(selectedReturn.returnDate || selectedReturn.createdAt).toLocaleDateString()}</strong></p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Supplier: <strong>{selectedReturn.supplier?.contactPerson || selectedReturn.supplier?.name || 'Unknown'}</strong></p>
              <p style={{ margin: '4px 0', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>[ {selectedReturn.status.toUpperCase()} ]</p>
            </div>
            
            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

            {paperConfig.mono ? (
              <div>
                {(selectedReturn.items || []).map((item, idx) => (
                  <div key={idx} style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000' }}>
                      <span>{item.product?.name || 'Unknown Product'}</span>
                      <span>x{item.quantity}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }}>
                      <span>@{item.unitPrice?.toFixed(2)} (R: {item.reason})</span>
                      <span style={{ fontWeight: 700 }}>{item.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead style={{borderBottom: '1px solid #5f9382'}}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '32%' }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '32%' }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '32%' }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '32%' }}>Price</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '22%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReturn.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product?.name || 'Unknown Product'}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.reason}N/A</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.quantity}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.unitPrice?.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 600, textAlign: 'left' }}>{item.totalPrice?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReturn.notes && (
              <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#333' }}>
                <strong>Notes:</strong> {selectedReturn.notes}
              </p>
            )}

            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.15em', color: '#000', fontWeight: 700, borderTop: '2px solid #000' }}>
              <span>Total Credit Amount</span>
              <span>Rs. {(selectedReturn.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {selectedReturn.status === 'Draft' && (
              <>
                <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Pending Approval')} className="btn" style={{ backgroundColor: '#2b3a4a', color: 'white' }}>
                  Submit for Approval
                </button>
                <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Cancelled')} className="btn btn-danger">
                  Cancel
                </button>
              </>
            )}

            {selectedReturn.status === 'Pending Approval' && (
              <>
                <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Approved')} className="btn" style={{ backgroundColor: 'var(--success)', color: 'white' }}>
                  Approve
                </button>
                <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Rejected')} className="btn btn-danger">
                  Reject
                </button>
              </>
            )}

            {selectedReturn.status === 'Approved' && (
              <>
                <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Shipped to Supplier')} className="btn" style={{ backgroundColor: '#2b3a4a', color: 'white' }}>
                  Mark Shipped
                </button>
                <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Cancelled')} className="btn btn-danger">
                  Cancel
                </button>
              </>
            )}

            {selectedReturn.status === 'Shipped to Supplier' && (
              <button disabled={updatingStatus} onClick={() => updateStatus(selectedReturn._id, 'Completed')} className="btn" style={{ backgroundColor: 'var(--success)', color: 'white' }}>
                Complete Return
              </button>
            )}
          </div>

        </div>
      </div>
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading purchase returns...</div>;

  return (
    <div className="dashboard-wrapper">
      
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">Select Supplier</label>
          <select className="form-input" name="supplierId" value={filters.supplierId} onChange={handleFilterChange}>
            <option value="">All Suppliers</option>
            {suppliers.map(supplier => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name || supplier.contactPerson || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">Date From</label>
          <input className="form-input" type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} max={filters.dateTo} />
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">Date To</label>
          <input className="form-input" type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} min={filters.dateFrom} max={getTodayDate()} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '8%' }}>Sr #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Date</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Inv #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Return #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '22%' }}>Supplier</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Amount</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '10%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((ret, index) => {
                  const serialNumber = indexOfFirstItem + index + 1;
                  return (
                    <tr 
                      key={ret._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{serialNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{formatDate(ret.returnDate)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '500' }}>{ret.purchase?.invoiceNumber || 'N/A'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '500' }}>{ret.returnNumber || 'N/A'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{ret.supplier?.contactPerson || ret.supplier?.name || 'Unknown'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--success)', textAlign: 'left', fontWeight: '600' }}>Rs. {ret.totalAmount}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button 
                            style={{ backgroundColor: 'var(--view)', color: 'var(--viewtext)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onClick={() => openModal(ret)} 
                            title="View"
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
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No purchase returns found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredReturns.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
        )}
      </div>

      {isModalOpen && selectedReturn && renderReceipt()}
    </div>
  );
};

export default PurchaseReturnList;