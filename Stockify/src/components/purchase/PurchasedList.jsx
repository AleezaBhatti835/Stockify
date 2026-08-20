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

const PurchasedList = () => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
const todayDateStr = new Date().toISOString().split('T')[0];
  const { settings: printSettings } = usePrintSettings();

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filters, setFilters] = useState({
    supplier: '',
    product: '',
    dateFrom: getTodayDate(),
    dateTo: getTodayDate()
  });

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases, filters]);

  // CORE ARCHITECTURE: Unified filter and sorting engine for standardizing purchase list data retrieval.
  const fetchPurchases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/purchases', {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      const sortedData = data.sort((a, b) => {
        const dateA = new Date(a.purchaseDate).setHours(0, 0, 0, 0);
        const dateB = new Date(b.purchaseDate).setHours(0, 0, 0, 0);
        if (dateA !== dateB) return dateA - dateB;
        
        const numA = parseInt((a.invoiceNumber || '').replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt((b.invoiceNumber || '').replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB; 
      });
      
      setPurchases(sortedData);
      setFilteredPurchases(sortedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...purchases];

    if (filters.supplier) {
      filtered = filtered.filter(purchase =>
        purchase.supplier?._id === filters.supplier ||
        purchase.supplier?.contactPerson?.toLowerCase().includes(filters.supplier.toLowerCase()) ||
        purchase.supplier?.name?.toLowerCase().includes(filters.supplier.toLowerCase())
      );
    }

    if (filters.product) {
      filtered = filtered.filter(purchase =>
        purchase.items?.some(item =>
          item.product?._id === filters.product ||
          item.product?.name?.toLowerCase().includes(filters.product.toLowerCase())
        )
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(purchase => {
        if (!purchase.purchaseDate) return false;
        const purchaseDate = new Date(purchase.purchaseDate);
        purchaseDate.setHours(0, 0, 0, 0);
        return purchaseDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(purchase => {
        if (!purchase.purchaseDate) return false;
        const purchaseDate = new Date(purchase.purchaseDate);
        purchaseDate.setHours(23, 59, 59, 999);
        return purchaseDate <= toDate;
      });
    }

    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.purchaseDate).setHours(0, 0, 0, 0);
      const dateB = new Date(b.purchaseDate).setHours(0, 0, 0, 0);
      if (dateA !== dateB) return dateA - dateB;
      const numA = parseInt((a.invoiceNumber || '').replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt((b.invoiceNumber || '').replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

    setFilteredPurchases(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      supplier: '',
      product: '',
      dateFrom: getTodayDate(),
      dateTo: getTodayDate()
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const openModal = (purchase) => {
    setSelectedPurchase(purchase);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPurchase(null);
    setIsModalOpen(false);
  };

  const getUniqueSuppliers = () => {
    const uniqueSuppliers = new Map();
    purchases.forEach(purchase => {
      if (purchase.supplier) {
        const id = purchase.supplier._id || purchase.supplier;
        if (!uniqueSuppliers.has(id)) {
          uniqueSuppliers.set(id, {
            _id: id,
            name: purchase.supplier.contactPerson || purchase.supplier.name || 'Unknown'
          });
        }
      }
    });
    return Array.from(uniqueSuppliers.values());
  };

  // UI ENGINE: Dynamic modal rendering with embedded print-specific styles for A4, A5, and Thermal receipt formats.
  const handlePrint = () => {
    const paperConfig = getPaperConfig(printSettings?.paperSize);
    const contentEl = document.getElementById('receipt-content');
    if (!contentEl || !selectedPurchase) return;

    let pageSizeCss;
    if (paperConfig.mono) {
      const itemCount = (selectedPurchase.items || []).length;
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
    if (!selectedPurchase) return null;
    const paperConfig = getPaperConfig(printSettings?.paperSize);

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-container" style={{ width:'70%', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
          
          <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>CAPOBIZ</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
              <button className="btn btn-secondary" onClick={closeModal}>✕ Close</button>
            </div>
          </div>

          <div className="modal-body" id="receipt-content" style={{ padding: paperConfig.bodyPadding, fontSize: paperConfig.fontSize, fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: '4px 0', color: '#333', textDecoration: 'underline' }}>PURCHASE INVOICE</h4>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Invoice #: <strong>{selectedPurchase.invoiceNumber || 'N/A'}</strong></p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Purchase ID: <strong>{selectedPurchase.purchaseNumber || 'N/A'}</strong></p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Date: <strong>{formatDate(selectedPurchase.purchaseDate)}</strong></p>
              <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Supplier: <strong>{selectedPurchase.supplier?.contactPerson || selectedPurchase.supplier?.name || 'Unknown'}</strong></p>
              <p style={{ margin: '4px 0', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>[ COMPLETED ]</p>
            </div>
            
            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

            {paperConfig.mono ? (
              <div>
                {(selectedPurchase.items || []).map((item, idx) => {
                  const lineTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
                  return (
                    <div key={idx} style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000' }}>
                        <span>{item.product?.name || 'Unknown Product'}</span>
                        <span>x{item.quantity}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }}>
                        <span>@{item.unitPrice?.toFixed(2)} {item.expiryDate ? `(Exp: ${formatDate(item.expiryDate)})` : ''}</span>
                        <span style={{ fontWeight: 700 }}>{lineTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '32%' }}>Product Name</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '12%' }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '18%' }}>Unit Price</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '18%' }}>Expiry</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '20%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPurchase.items || []).map((item, idx) => {
                    const lineTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
                    return (
                      <tr key={idx}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product?.name || 'Unknown Product'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.quantity}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.unitPrice?.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 600, textAlign: 'left' }}>{lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                <span>Grand Total</span>
                <span>Rs. {(selectedPurchase.totalAmount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                <span>Paid Amount</span>
                <span>Rs. {(selectedPurchase.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.15em', color: '#000', fontWeight: 700, borderTop: '2px solid #000' }}>
                <span>Balance Due</span>
                <span>Rs. {((selectedPurchase.totalAmount || 0) - (selectedPurchase.paidAmount || 0)).toFixed(2)}</span>
              </div>
            </div>
            
            <div style={{ borderTop: '2px dashed #000', margin: '16px 0' }}></div>
            <div style={{ textAlign: 'center', color: '#555', fontSize: '13px' }}>
              <p>System Generated Receipt</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPurchases.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading purchases...</div>;

  return (
    <div className="dashboard-wrapper">

      {/* FILTER SECTION */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">Supplier</label>
          <select className="form-input" name="supplier" value={filters.supplier} onChange={handleFilterChange}>
            <option value="">All Suppliers</option>
            {getUniqueSuppliers().map(supplier => (
              <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">Date From</label>
          <input className="form-input" type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} max={filters.dateTo} />
        </div>

        <div className="form-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="form-label">Date To</label>
          <input className="form-input" type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} min={filters.dateFrom} max={todayDateStr} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
      

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '8%' }}>Sr #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Invoice #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Date</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Supplier</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '20%' }}>Total Amount</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '17%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((purchase, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr 
                      key={purchase._id || index}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{serialNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '500' }}>{purchase.invoiceNumber || 'N/A'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left' }}>{formatDate(purchase.purchaseDate)}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{purchase.supplier?.contactPerson || purchase.supplier?.name || 'Unknown'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--success)', textAlign: 'left', fontWeight: '600' }}>Rs. {purchase.totalAmount || 0}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button style={styles.iconBtnView} onClick={() => openModal(purchase)} title="View">
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
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No purchases found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredPurchases.length > itemsPerPage && (
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

      {isModalOpen && selectedPurchase && renderReceipt()}
    </div>
  );
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
  }
};

export default PurchasedList;