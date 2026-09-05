import { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

const today = new Date().toISOString().split('T')[0];

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

function InvoiceList() {
    const [sales, setSales] = useState([]);
    const [customers, setCustomers] = useState([]);

    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [selectedCustomer, setSelectedCustomer] = useState('');

    const [viewSale, setViewSale] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const { settings: printSettings } = usePrintSettings();

    useEffect(() => {
        fetchSales();
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        setCurrentPage(1);
    }, [fromDate, toDate, selectedCustomer]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/sales', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const sortedData = data.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.saleDate);
                const dateB = new Date(b.createdAt || b.saleDate);
                return dateA - dateB; 
            });
            setSales(sortedData);
        } catch (err) {
            console.error('Error fetching sales:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/customers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const handleView = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/sales/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success || data.saleNumber) {
                const saleData = data.sale || data;
                const fetchedItems = data.items || saleData.items || [];

                const itemsWithTotal = fetchedItems.map(item => {
                    const qty = item.quantity || 0;
                    const unitPrice = item.unitPrice || 0;
                    const itemDiscount = item.discount || 0;
                    const lineTotal = (qty * unitPrice) - itemDiscount;

                    return {
                        ...item,
                        name: item.name || item.product?.name || 'Unknown',
                        lineTotal: lineTotal,
                        discount: itemDiscount
                    };
                });

                setViewSale({
                    ...saleData,
                    items: itemsWithTotal
                });
            }
        } catch (err) {
            console.error('Error fetching sale detail:', err);
        }
    };

    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/sales/${cancelTarget._id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', message: 'Sale cancelled and stock restored.' });
                fetchSales();
            } else {
                setToast({ type: 'error', message: data.message || 'Failed to cancel sale.' });
            }
        } catch (err) {
            console.error('Error cancelling sale:', err);
            setToast({ type: 'error', message: 'Server error while cancelling sale.' });
        } finally {
            setCancelTarget(null);
        }
    };

    const clearFilters = () => {
        setFromDate(today);
        setToDate(today);
        setSelectedCustomer('');
    };

    const filteredSales = sales.filter(s => {
        const saleDate = new Date(s.saleDate);
        const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());

        if (fromDate) {
            const from = new Date(fromDate);
            const fromOnly = new Date(from.getFullYear(), from.getMonth(), from.getDate());
            if (saleDateOnly < fromOnly) return false;
        }

        if (toDate) {
            const to = new Date(toDate);
            const toOnly = new Date(to.getFullYear(), to.getMonth(), to.getDate());
            if (saleDateOnly > toOnly) return false;
        }

        if (selectedCustomer) {
            const customerId = s.customer?._id || s.customerId;
            if (customerId !== selectedCustomer) return false;
        }

        return true;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

    const handlePrint = () => {
        const paperConfig = getPaperConfig(printSettings?.paperSize);
        const contentEl = document.getElementById('receipt-content');
        if (!contentEl || !viewSale) return;

        let pageSizeCss;
        if (paperConfig.mono) {
            const itemCount = (viewSale.items || []).length;
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

    const handleCloseReceipt = () => {
        setViewSale(null);
    };

    // 💡 Render Receipt function instead of separate component
    const renderReceipt = (sale) => {
        if (!sale) return null;
        const paperConfig = getPaperConfig(printSettings?.paperSize);

        const itemsTotal = sale.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice - (Number(item.discount) || 0)), 0);
        const freight = Number(sale.freightAmount) || 0;
        const labour = Number(sale.labourCharges) || 0;
        const discountAmount = Number(sale.discountAmount || sale.discount) || 0;
        
        const finalTotal = Number(sale.totalAmount) || 0;
        const finalPaid = Number(sale.paidAmount) || 0;
        const balance = finalTotal - finalPaid;

        return (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }} onClick={handleCloseReceipt}>
                <div className="card" style={{ width: '800px', maxWidth: '95%', height: '90vh', display: 'flex', flexDirection: 'column', padding: 0, margin: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
                    
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#000' }}>Stockify</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
                            <button className="btn btn-secondary" onClick={handleCloseReceipt}>✕ Close</button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: '24px' }}>
                        <div id="receipt-content" style={{
                            margin: '0 auto', background: '#fff', padding: paperConfig.bodyPadding,
                            maxWidth: paperConfig.maxWidth, fontSize: paperConfig.fontSize,
                            fontFamily: paperConfig.mono ? "'Courier New', monospace" : 'inherit',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minHeight: '400px'
                        }}>
                            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                                <h4 style={{ margin: '4px 0', textAlign:'center', fontSize:'16px' }}>Sales Invoice</h4>

                                <p style={{ margin: '4px 0', color: '#333' }}>Invoice: <strong>{sale.saleNumber}</strong></p>
                                <p style={{ margin: '4px 0', color: '#333' }}>Date: <strong>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</strong></p>
                                <p style={{ margin: '4px 0', color: '#333' }}>
                                    Customer: <strong>{sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</strong>
                                </p>
                                
                                {sale.transporter && (
                                    <p style={{ margin: '4px 0', color: '#333' }}>
                                        Transporter: <strong>{sale.transporter?.name || 'Included'}</strong>
                                    </p>
                                )}
                                {sale.labour && (
                                    <p style={{ margin: '4px 0', color: '#333' }}>
                                        Labour: <strong>{sale.labour?.name || 'Included'}</strong>
                                    </p>
                                )}

                                {sale.status === 'Cancelled' && (
                                    <p style={{ margin: '4px 0', color: 'var(--danger)', fontWeight: 'bold', textAlign: 'center' }}>[ CANCELLED ]</p>
                                )}
                            </div>
                            
                            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

                            {paperConfig.mono ? (
                                <div>
                                    {(sale.items || []).map((item, idx) => (
                                        <div key={idx} style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000' }}>
                                                <span>{item.name || item.product?.name}</span>
                                                <span>x{item.quantity}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '2px' }}>
                                                <span>
                                                    @{item.unitPrice?.toFixed(2)}
                                                    {item.discount > 0 ? ` −${item.discount.toFixed(2)}` : ''}
                                                </span>
                                                <span style={{ fontWeight: 700 }}>{item.lineTotal?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '22%' }}>Product</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '14%' }}>Qty</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '18%' }}>Price</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '16%' }}>Disc</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--primary-light)', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', width: '20%' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(sale.items || []).map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || item.product?.name}</td>
                                                <td style={{ textAlign: 'left',padding: '6px 8px', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.quantity}</td>
                                                <td style={{ textAlign: 'left',padding: '6px 8px', fontSize: '13px', color: '#000' }}>{item.unitPrice?.toFixed(2)}</td>
                                                <td style={{textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#000' }}>{item.discount > 0 ? item.discount.toFixed(2) : '0.00'}</td>
                                                <td style={{textAlign: 'left', padding: '6px 8px', fontSize: '13px', color: '#000', fontWeight: 600 }}>{item.lineTotal?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>
                            
                            <div style={{ marginTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                                    <span>Items Total</span>
                                    <span>Rs. {itemsTotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                                    <span>Discount {sale.discountType === 'cash' ? '(Fixed)' : sale.discountValue ? `(${sale.discountValue}%)` : ''}</span>
                                    <span>Rs. {discountAmount.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                                    <span>Freight Amount</span>
                                    <span>Rs. {freight.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                                    <span>Labour Charges</span>
                                    <span>Rs. {labour.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '1.15em', color: '#000', fontWeight: 700, borderTop: '2px solid #000', paddingTop: '10px' }}>
                                    <span>Grand Total</span>
                                    <span>Rs. {finalTotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }}>
                                    <span>Paid</span>
                                    <span>Rs. {finalPaid.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000', fontWeight: 700 }}>
                                    <span>Balance Due</span>
                                    <span>Rs. {balance.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div style={{ borderTop: '2px dashed #000', margin: '16px 0' }}></div>
                            <div style={{ textAlign: 'center', color: '#555', fontSize: '13px' }}>
                                <p>System Generated Receipt</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="dashboard-wrapper">
            {toast && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
                    padding: '14px 24px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
                    backgroundColor: toast.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${toast.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                    boxShadow: 'var(--shadow-md)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* FILTER BAR */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                    <label className="form-label">Customer</label>
                    <select
                        className="form-input"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                        <option value="">All Customers</option>
                        {customers.map(c => (
                            <option key={c._id} value={c._id}>
                                {c.name || c.customerName || 'Unknown'}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                    <label className="form-label">Date From</label>
                    <input
                        type="date"
                        className="form-input"
                        value={fromDate}
                        max={toDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
                    <label className="form-label">Date To</label>
                    <input
                        type="date"
                        className="form-input"
                        value={toDate}
                        min={fromDate}
                        max={today}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>

                <button className="btn btn-secondary" onClick={clearFilters}>
                    Clear Filters
                </button>
            </div>

            {/* TABLE SECTION */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Showing {currentItems.length} of {filteredSales.length} invoices
                    </span>
                </div>

                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '8%' }}>Sr#</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '20%' }}>Date</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '22%' }}>Invoice</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Customer</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Total Amount</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '10%' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</td></tr>
                            )}
                            {!loading && filteredSales.length === 0 && (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No invoices found.</td></tr>
                            )}
                            {!loading && currentItems.map((s, idx) => {
                                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                                return (
                                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{serialNumber}</td>
                                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left' }}>{new Date(s.saleDate || s.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '600' }}>{s.saleNumber}</td>
                                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{s.customer?.name || s.customer?.customerName || '—'}</td>
                                        <td style={{ padding: '10px 16px', fontSize: '14px', color: 'var(--success)', textAlign: 'left', fontWeight: '600' }}>Rs. {s.totalAmount?.toFixed(2) || '0.00'}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button style={styles.iconBtnView} onClick={() => handleView(s._id)} title="View Receipt">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                </button>
                                              
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                {!loading && filteredSales.length > itemsPerPage && (
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
                        <button
                            className="btn btn-secondary"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            style={{ padding: '6px 12px' }}
                        >
                            ←
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
                        <button
                            className="btn btn-secondary"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            style={{ padding: '6px 12px' }}
                        >
                            →
                        </button>
                    </div>
                )}
            </div>

            {viewSale && renderReceipt(viewSale)}

            {cancelTarget && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setCancelTarget(null)}>
                    <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '95%', padding: 0, margin: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>⚠️ Cancel Sale?</h3>
                            <button onClick={() => setCancelTarget(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                                Are you sure you want to cancel <strong style={{ color: 'var(--text-main)' }}>{cancelTarget.saleNumber}</strong>?
                                This will restore stock and reverse the customer ledger entry.
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-secondary" onClick={() => setCancelTarget(null)}>No, keep it</button>
                            <button className="btn btn-danger" onClick={handleCancelConfirm}>Yes, cancel it</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    iconBtnView: {
        backgroundColor: 'var(--view)',
        color: 'var(--success)',
        border: 'none',
        padding: '6px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    },
    iconBtnDelete: {
        backgroundColor: 'var(--danger-bg)',
        color: 'var(--danger)',
        border: 'none',
        padding: '6px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    }
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;
document.head.appendChild(styleSheet);

export default InvoiceList;