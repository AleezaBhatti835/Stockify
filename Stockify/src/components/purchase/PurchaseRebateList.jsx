import { useState, useEffect } from 'react';
import './purchase.css';
import '../roles.css';
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
    const [itemsPerPage] = useState(15);

    useEffect(() => {
        fetchRebates();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rebates, fromDate, toDate, selectedSupplierFilter]);

    const fetchRebates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/purchase-rebates`);
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

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/suppliers`);
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

    const openView = async (rebate) => {
        setViewLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/purchase-rebates/${rebate._id}`);
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

    // Supplier's own NAME first (contactPerson), company name only as fallback
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
        <div style={{ ...styles.wrapper, marginBottom: '50%' }}>
            <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
               

                {/* ==================== FILTERS ==================== */}
                <div style={styles.filterContainer}>
                    
                    <div style={styles.filterRow}>
                          <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Supplier</label>
                            <select
                                style={styles.filterInput}
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
                    </div>

                    <div style={styles.filterStats}>
                        Showing {filteredRebates.length} of {rebates.length} record{filteredRebates.length !== 1 ? 's' : ''}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className='roles-table' style={{width:'80%',marginLeft:'30px'}}>
                        <thead>
                            <tr>
                                <th style={{ ...styles.th, textAlign: 'left',width:'10%' }}>Sr#</th>
                                <th style={{ ...styles.th, textAlign: 'left',width:'15%' }}>Date</th>
                                <th style={styles.th}>Rebate #</th>
                                <th style={styles.th}>Invoice #</th>
                                <th style={styles.th}>Supplier</th>
                                <th style={{ ...styles.th, textAlign: 'left' ,width:'17%'}}>Amount</th>
                                <th style={{ ...styles.th, textAlign: 'center',width:'17%' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={styles.emptyCell}>Loading...</td></tr>
                            ) : currentRebates.length === 0 ? (
                                <tr><td colSpan="7" style={styles.emptyCell}>No purchase rebates found.</td></tr>
                            ) : (
                                currentRebates.map((r, index) => {
                                    const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                    return (
                                        <tr key={r._id}>
                                            <td style={styles.td}>{serialNumber}</td>
                                            <td style={styles.td}>{new Date(r.rebateDate || r.createdAt).toLocaleDateString()}</td>
                                            <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{r.rebateNumber}</td>
                                            <td style={styles.td}>{r.invoiceNumber || r.purchase?.invoiceNumber || '—'}</td>
                                            <td style={styles.td}>{getSupplierName(r)}</td>
                                            <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600, color: '#10b981' }}>
                                                Rs. {r.totalAmount.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'left', marginLeft: '10%' }}>
                                                <button
                                                    onClick={() => openView(r)}
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ==================== PAGINATION CONTROLS ==================== */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: currentPage <= 1 ? '#e9ecef' : '#5aa7ef',
                            color: currentPage <= 1 ? '#6c757d' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        ←
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: '400', color: '#868484' }}>
                        Page {currentPage} of {totalPages || 1}
                    </span>
                    <button
                        disabled={currentPage >= totalPages || totalPages === 0}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: (currentPage >= totalPages || totalPages === 0) ? '#e9ecef' : '#5aa7ef',
                            color: (currentPage >= totalPages || totalPages === 0) ? '#6c757d' : 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: (currentPage >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        →
                    </button>
                </div>
            </div>

            {/* ==================== DETAILED RECEIPT VIEW MODAL ==================== */}
            {viewRebate && (
                <div style={styles.receiptOverlay} onClick={() => { setViewRebate(null); setViewDetails([]); }}>
                    <div style={styles.receiptContainer} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.receiptHeader}>
                            <h3 style={{ margin: 0, color: '#000' }}>CAPOBIZ</h3>
                            <div style={styles.receiptActions}>
                                <button style={styles.printReceiptBtn} onClick={handlePrintRebate}>🖨️ Print</button>
                                <button style={styles.closeReceiptBtn} onClick={() => { setViewRebate(null); setViewDetails([]); }}>✕ Close</button>
                            </div>
                        </div>

                        <div id="rebate-receipt-content" style={styles.receiptBody}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '18px',color:'#24354e' }}>PURCHASE REBATE RECEIPT</h4>
                                <p style={{ margin: '4px 0', fontSize: '14px' }}>Rebate #: <strong>{viewRebate.rebateNumber}</strong></p>
                                <p style={{ margin: '4px 0', fontSize: '14px' }}>Date: <strong>{new Date(viewRebate.rebateDate || viewRebate.createdAt).toLocaleDateString()}</strong></p>
                                <p style={{ margin: '4px 0', fontSize: '14px' }}>Invoice #: <strong>{viewRebate.invoiceNumber || viewRebate.purchase?.invoiceNumber || '—'}</strong></p>
                                <p style={{ margin: '4px 0', fontSize: '14px' }}>Supplier: <strong>{getSupplierName(viewRebate)}</strong></p>
                            </div>

                            <div style={styles.receiptDivider}></div>

                            <table style={styles.receiptTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.receiptTh, width: '15%' }}>Product Name</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>Qty</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'center', width: '20%' }}>Unit Price</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'right', width: '20%' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewLoading ? (
                                        <tr><td colSpan="4" style={styles.emptyCell}>Loading...</td></tr>
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
                                        <td style={{ ...styles.receiptTd, textAlign: 'left', fontWeight: 800, color: '#10b981', borderTop: '2px solid #000' }}>
                                            Rs. {viewRebate.totalAmount.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div style={styles.receiptDivider}></div>
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

const styles = {
    wrapper: { background: '#fff', borderBottom: '1px solid #e2e8f0',borderRadius:'20px',
display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '0px',width:'95%',marginLeft:'20px' },
    card: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    table: { width: '100%',borderRadius:'20%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 16px', background: ' #26384a', fontSize: '12px', color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    td: { padding: '10px 16px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
    emptyCell: { padding: '30px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
    iconBtnView: {
        background: '#f0fdf4',
        color: '#264b61',
        border: '1px solid #ddecf5',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'right',
        transition: 'all 0.2s',
        backgroundColor: '#ebf5fc',
        marginLeft: '50px'
    },

    // Filter styles
    filterContainer: {
        padding: '16px 30px',
    },
    filterRow: {
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end',
        flexWrap: 'wrap'
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        minWidth: '160px'
    },
    filterLabel: {
        fontSize: '12px',
        fontWeight: 700,
        color: '#475569',
        marginBottom: '4px',
        textAlign: 'left'
    },
    filterInput: {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #cbd5e1',
        fontSize: '13px',
        backgroundColor: '#fff',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    },
    clearFilterBtn: {
        padding: '9px 16px',
        background: '#6c757d',
        color: '#fafafa',
        border: '1px solid #cfcece',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '13px',
        whiteSpace: 'nowrap'
    },
    filterStats: {
        marginTop: '10px',
        fontSize: '12px',
        color: '#555',
        textAlign: 'right'
    },

    // Receipt Modal Styles
    receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
    receiptContainer: { background: '#ffffff', borderRadius: '12px', border: '1px solid #000', width: '100%', maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
    receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '2px solid #000', background: '#f8fafc', flexShrink: 0 },
    receiptActions: { display: 'flex', gap: '12px' },
    printReceiptBtn: { background: '#213451', color: '#fff', border: '1px solid #000', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' },
    closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' },
    receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '30px', color: '#000' },
    receiptDivider: { borderTop: '2px dashed #000', margin: '20px 0' },
    receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
    receiptTh: { textAlign: 'left', padding: '12px 10px', backgroundColor: '#1e2d47', borderBottom: '2px solid #000', fontSize: '13px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase' },
    receiptTd: { textAlign: 'left', padding: '12px 10px', borderBottom: '1px solid #ccc', fontSize: '14px', color: '#000' }
};

export default PurchaseRebateList;