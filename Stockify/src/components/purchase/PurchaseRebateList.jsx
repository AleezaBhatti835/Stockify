import { useState, useEffect } from 'react';

const todayStr = () => new Date().toISOString().slice(0, 10);
const API_BASE_URL = 'http://localhost:5000';

function PurchaseRebateList() {
    const [rebates, setRebates] = useState([]);
    const [filteredRebates, setFilteredRebates] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewRebate, setViewRebate] = useState(null);
    const [viewDetails, setViewDetails] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);

    // ================= FILTER STATES =================
    const [fromDate, setFromDate] = useState(todayStr());
    const [toDate, setToDate] = useState(todayStr());
    const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');

    // ================= PAGINATION STATES =================
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchRebates();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rebates, fromDate, toDate, selectedSupplierFilter]);

    // ================= FETCH REBATES (WITH TOKEN) =================
    const fetchRebates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/purchase-rebates`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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

    // ================= FETCH SUPPLIERS (WITH TOKEN) =================
    const fetchSuppliers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/suppliers`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
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

        if (selectedSupplierFilter) {
            filtered = filtered.filter(r =>
                r.supplier?._id === selectedSupplierFilter ||
                r.supplier === selectedSupplierFilter
            );
        }

        setFilteredRebates(filtered);
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFromDate(todayStr());
        setToDate(todayStr());
        setSelectedSupplierFilter('');
    };

    // ================= OPEN VIEW (WITH TOKEN) =================
    const openView = async (rebate) => {
        setViewLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/purchase-rebates/${rebate._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

    const getSupplierName = (r) => r.supplier?.contactPerson || r.supplier?.companyName || 'Unknown Supplier';

    // ================= A4 PRINT LOGIC =================
    const handlePrintRebate = () => {
        const contentEl = document.getElementById('rebate-receipt-content');
        if (!contentEl || !viewRebate) return;

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
                        .meta-info { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { text-align: left; padding: 10px; background-color: #f1f5f9; border-bottom: 2px solid #000; font-size: 13px; text-transform: uppercase; }
                        td { padding: 10px; border-bottom: 1px solid #ccc; font-size: 14px; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .total-row td { font-weight: bold; font-size: 15px; border-top: 2px solid #000; padding-top: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header-info">
                        <h2>CAPOBIZ</h2>
                        <h4>PURCHASE REBATE RECEIPT</h4>
                    </div>
                    
                    <div class="meta-info">
                        <div><strong>Rebate #:</strong> ${viewRebate.rebateNumber}</div>
                        <div><strong>Date:</strong> ${new Date(viewRebate.rebateDate || viewRebate.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div class="meta-info">
                        <div><strong>Invoice #:</strong> ${viewRebate.invoiceNumber || viewRebate.purchase?.invoiceNumber || '—'}</div>
                        <div><strong>Supplier:</strong> ${getSupplierName(viewRebate)}</div>
                    </div>
                    
                    <div style="border-top: 2px dashed #000; margin: 16px 0;"></div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45%;">Product Name</th>
                                <th class="text-center" style="width: 15%;">Qty</th>
                                <th class="text-right" style="width: 20%;">Unit Price</th>
                                <th class="text-right" style="width: 20%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${viewDetails.map(d => `
                                <tr>
                                    <td>${d.product?.name || 'Unknown Product'}</td>
                                    <td class="text-center">${d.quantity}</td>
                                    <td class="text-right">${d.unitPrice.toFixed(2)}</td>
                                    <td class="text-right">${d.totalPrice.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3" class="text-right">Total Rebate Amount</td>
                                <td class="text-right">Rs. ${viewRebate.totalAmount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="border-top: 2px dashed #000; margin: 30px 0 16px 0;"></div>
                    <div class="text-center" style="color: #555; font-size: 13px;">
                        <p>This is a system generated receipt.</p>
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
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRebates = filteredRebates.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRebates.length / itemsPerPage);

    return (
        <div className="dashboard-wrapper">


            {/* FILTER SECTION */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
                    <label className="form-label">Supplier</label>
                    <select
                        className="form-input"
                        value={selectedSupplierFilter}
                        onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                    >
                        <option value="">All Suppliers</option>
                        {suppliers.map(s => (
                            <option key={s._id} value={s._id}>
                                {s.contactPerson || s.companyName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label">From Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label">To Date</label>
                    <input
                        type="date"
                        className="form-input"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* MAIN SUMMARY TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableStyles.th}>Sr#</th>
                                <th style={tableStyles.th}>Date</th>
                                <th style={tableStyles.th}>Rebate #</th>
                                <th style={tableStyles.th}>Invoice #</th>
                                <th style={tableStyles.th}>Supplier</th>
                                <th style={tableStyles.th}>Amount</th>
                                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={tableStyles.emptyCell}>Loading...</td></tr>
                            ) : currentRebates.length === 0 ? (
                                <tr><td colSpan="7" style={tableStyles.emptyCell}>No purchase rebates found.</td></tr>
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
                                            <td style={tableStyles.td}>{serialNumber}</td>
                                            <td style={tableStyles.td}>{new Date(r.rebateDate || r.createdAt).toLocaleDateString()}</td>
                                            <td style={{ ...tableStyles.td, fontWeight: 500 }}>{r.rebateNumber}</td>
                                            <td style={tableStyles.td}>{r.invoiceNumber || r.purchase?.invoiceNumber || '—'}</td>
                                            <td style={tableStyles.td}>{getSupplierName(r)}</td>
                                            <td style={{ ...tableStyles.td, fontWeight: 'bold', color: 'var(--success)' }}>
                                                Rs. {r.totalAmount.toFixed(2)}
                                            </td>
                                            <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => openView(r)}
                                                        style={actionStyles.iconBtnView}
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

                {/* Pagination */}
                {filteredRebates.length > itemsPerPage && (
                    <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
                        <button
                            className="btn btn-secondary"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            style={{ padding: '6px 12px' }}
                        >
                            ←
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                            Page {currentPage} of {totalPages || 1}
                        </span>
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

            {/* ==================== DETAILED RECEIPT VIEW MODAL ==================== */}
            {viewRebate && (
                <div className="modal-overlay" onClick={() => { setViewRebate(null); setViewDetails([]); }}>
                    <div className="modal-container" style={{ width: '860px', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                        
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: '#000' }}>CAPOBIZ</h3>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-primary" onClick={handlePrintRebate}>🖨️ Print</button>
                                <button className="btn btn-secondary" onClick={() => { setViewRebate(null); setViewDetails([]); }}>✕ Close</button>
                            </div>
                        </div>

                        <div id="rebate-receipt-content" className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto', padding: 'var(--space-lg)' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>PURCHASE REBATE RECEIPT</h4>
                                <p style={{ textAlign: 'left', margin: '4px 0', fontSize: '14px' }}>Rebate #: {viewRebate.rebateNumber}</p>
                                <p style={{ textAlign: 'left', margin: '4px 0', fontSize: '14px' }}>Date: {new Date(viewRebate.rebateDate || viewRebate.createdAt).toLocaleDateString()}</p>
                                <p style={{ textAlign: 'left', margin: '4px 0', fontSize: '14px' }}>Invoice #: {viewRebate.invoiceNumber || viewRebate.purchase?.invoiceNumber || '—'}</p>
                                <p style={{ textAlign: 'left', margin: '4px 0', fontSize: '14px' }}>Supplier: {getSupplierName(viewRebate)}</p>
                            </div>

                            <div style={{ borderTop: '2px dashed #000', margin: '20px 0' }}></div>

                            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.receiptTh, width: '20%' }}>Product Name</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>Qty</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>Unit Price</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'right', width: '20%' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewLoading ? (
                                        <tr><td colSpan="4" style={tableStyles.emptyCell}>Loading...</td></tr>
                                    ) : (
                                        viewDetails.map((d, idx) => (
                                            <tr key={idx}>
                                                <td style={styles.receiptTd}>{d.product?.name || 'Unknown Product'}</td>
                                                <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{d.quantity}</td>
                                                <td style={{ ...styles.receiptTd, textAlign: 'center' }}>{d.unitPrice.toFixed(2)}</td>
                                                <td style={{ ...styles.receiptTd, textAlign: 'right', fontWeight: 600 }}>{d.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="3" style={{ ...styles.receiptTd, textAlign: 'right', fontWeight: 700, borderTop: '2px solid #000' }}>Total Rebate</td>
                                        <td style={{ ...styles.receiptTd, textAlign: 'right', fontWeight: 800, color: 'var(--success)', borderTop: '2px solid #000' }}>
                                            Rs. {viewRebate.totalAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div style={{ borderTop: '2px dashed #000', margin: '20px 0' }}></div>
                            <div style={{ textAlign: 'center', marginTop: '20px', color: '#555', fontSize: '13px' }}>
                                <p>System Generated Receipt</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Strict Table Styles Rule
const tableStyles = {
    th: {
        padding: '12px 16px',
        backgroundColor: 'var(--header)',
        color: '#ffffff',
        fontWeight: '600',
        fontSize: '13px',
        textAlign: 'left'
    },
    td: {
        padding: '8px 16px',
        color: 'var(--text-main)',
        fontSize: '13px',
        textAlign: 'left'
    },
    emptyCell: {
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px'
    }
};

// Strict Actions Rule Enforced
const actionStyles = {
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

const styles = {
    receiptTh: { textAlign: 'left', padding: '10px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase' },
    receiptTd: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' }
};

export default PurchaseRebateList;