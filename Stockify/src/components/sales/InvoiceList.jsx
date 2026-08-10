import { useState, useEffect } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

const today = new Date().toISOString().split('T')[0];

// ============== EXACT PAPER CONFIG FROM POS.JS ==============
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
    const [itemsPerPage] = useState(5);

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
            const res = await fetch('http://localhost:5000/api/sales');
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
            const res = await fetch('http://localhost:5000/api/customers');
            const data = await res.json();
            setCustomers(data);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const handleView = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/sales/${id}`);
            const data = await res.json();

            if (data.success || data.saleNumber) {
                const saleData = data.sale || data;

                // FIX: Extract items from data.items (where the backend actually sends them)
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
            const res = await fetch(`http://localhost:5000/api/sales/${cancelTarget._id}/cancel`, {
                method: 'PUT'
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

    // Variables Fix added
    const hasActiveFilters = fromDate !== today || toDate !== today || selectedCustomer !== '';


    const handlePrint = () => {
        const paperConfig = getPaperConfig(printSettings?.paperSize);
        const contentEl = document.getElementById('receipt-content');
        if (!contentEl || !viewSale) return;

        let pageSizeCss;
        if (paperConfig.mono) {
            const itemCount = (viewSale.items || []).length;
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

    // ============== EXACT HTML STRUCTURE FROM POS.JS ==============
    const renderReceipt = () => {
        if (!viewSale) return null;

        const paperConfig = getPaperConfig(printSettings?.paperSize);
        const balance = (viewSale.totalAmount || 0) - (viewSale.paidAmount || 0);

        return (
            <div style={styles.receiptOverlay} onClick={() => setViewSale(null)}>
                <div style={{ ...styles.receiptContainer, maxWidth: paperConfig.maxWidth }} onClick={(e) => e.stopPropagation()}>
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
                                onClick={() => setViewSale(null)}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>

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
                            <p style={{ margin: '4px 0', color: '#333' }}>Invoice: {viewSale.saleNumber}</p>
                            <p style={{ margin: '4px 0', color: '#333' }}>Date: {new Date(viewSale.saleDate).toLocaleDateString()}</p>
                            <p style={{ margin: '4px 0', color: '#333' }}>
                                Customer: {viewSale.customer?.name || viewSale.customer?.customerName || 'Walk-in Customer'}
                            </p>
                            {viewSale.status === 'Cancelled' && (
                                <p style={{ margin: '4px 0', color: '#dc2626', fontWeight: 'bold' }}>[ CANCELLED ]</p>
                            )}
                        </div>
                        <div style={styles.receiptDivider}></div>

                        {paperConfig.mono ? (
                            <div>
                                {viewSale.items.map((item, idx) => {
                                    const lineTotal = item.quantity * item.unitPrice - (Number(item.discount) || 0);
                                    return (
                                        <div key={idx} style={styles.thermalItemRow}>
                                            <div style={styles.thermalItemLine1}>
                                                <span>{item.name}</span>
                                                <span>x{item.quantity}</span>
                                            </div>
                                            <div style={styles.thermalItemLine2}>
                                                <span>
                                                    @{item.unitPrice.toFixed(2)}
                                                    {Number(item.discount) > 0 ? ` −${item.discount.toFixed(2)}` : ''}
                                                </span>
                                                <span style={{ fontWeight: 700 }}>{lineTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <table style={styles.receiptTable}>
                                <thead>
                                    <tr>
                                        <th style={{ ...styles.receiptTh, width: '32%' }}>Product</th>
                                        <th style={{ ...styles.receiptTh, textAlign: 'left', width: '14%' }}>Qty</th>
                                        <th style={{ ...styles.receiptTh, width: '18%' }}>Price</th>
                                        <th style={{ ...styles.receiptTh, width: '16%' }}>Disc</th>
                                        <th style={{ ...styles.receiptTh, width: '20%' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewSale.items.map((item, idx) => (
                                        <tr styles={styles.data} key={idx}>
                                            <td style={styles.receiptTdName}>{item.name}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.quantity}</td>
                                            <td style={styles.receiptTd}>{item.unitPrice.toFixed(2)}</td>
                                            <td style={styles.receiptTd}>{item.discount?.toFixed(2) || '0.00'}</td>
                                            <td style={{ ...styles.receiptTd, fontWeight: 600 }}>
                                                {(item.quantity * item.unitPrice - (Number(item.discount) || 0)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={styles.receiptDivider}></div>
                        <div style={styles.receiptTotals}>
                            <div style={styles.receiptTotalRow}>
                                <span>Subtotal</span>
                                <span>Rs. {(viewSale.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div style={styles.receiptTotalRow}>
                                <span>Discount {viewSale.discountType === 'cash' ? '(Fixed)' : `(${viewSale.discountValue || viewSale.discountPercent || 0}%)`}</span>
                                <span>Rs. {(viewSale.discountAmount || viewSale.discount || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                <span>Grand Total</span>
                                <span>Rs. {(viewSale.totalAmount || 0).toFixed(2)}</span>
                            </div>
                            <div style={styles.receiptTotalRow}>
                                <span>Paid</span>
                                <span>Rs. {(viewSale.paidAmount || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ ...styles.receiptTotalRow, fontWeight: 700 }}>
                                <span>Balance</span>
                                <span>Rs. {balance.toFixed(2)} {balance > 0 ? '(Due)' : '(Paid)'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (


        <div style={{ padding: '25px', borderRadius: '8px', backgroundColor: '#fff' }}>
            {toast && (
                <div style={{ ...styles.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
                    {toast.message}
                </div>
            )}



            {/* Filter bar */}
            <div style={styles.filterBar}>

                <div style={styles.customerField}>
                    <label style={styles.dateLabel}>Customer</label>
                    <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        style={styles.customerSelect}
                    >
                        <option value="">All Customers</option>
                        {customers.map(c => (
                            <option key={c._id} value={c._id}>
                                {c.name || c.customerName || 'Unknown'}
                            </option>
                        ))}
                    </select>

                </div>
                <div style={styles.dateField}>
                    <label style={styles.dateLabel}>Date From</label>
                    <input
                        type="date"
                        value={fromDate}
                        max={toDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={styles.dateInput}
                    />
                </div>
                <div style={styles.dateField}>
                    <label style={styles.dateLabel}> Date To</label>
                    <input
                        type="date"
                        value={toDate}
                        min={fromDate}
                        max={today}
                        onChange={(e) => setToDate(e.target.value)}
                        style={styles.dateInput}
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

            {/* Results count */}
            <div style={styles.resultCount}>
                Showing {currentItems.length} of {filteredSales.length} invoices
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Sr#</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Invoice</th>
                            <th style={styles.th}>Customer</th>
                            <th style={styles.th}>Total Amount</th>
                            <th style={styles.th}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="6" style={styles.emptyCell}>Loading...</td></tr>
                        )}
                        {!loading && filteredSales.length === 0 && (
                            <tr><td colSpan="6" style={styles.emptyCell}>No invoices found.</td></tr>
                        )}
                        {!loading && currentItems.map((s, idx) => {
                            const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                            return (
                                <tr key={s._id}>
                                    <td style={styles.td}>{serialNumber}</td>
                                    <td style={styles.td}>{new Date(s.saleDate).toLocaleDateString()}</td>
                                    <td style={{ ...styles.td, fontWeight: 600, color: '#0f172a' }}>{s.saleNumber}</td>
                                    <td style={styles.td}>{s.customer?.name || s.customer?.customerName || '—'}</td>
                                    <td style={styles.td}>Rs. {s.totalAmount?.toFixed(2) || '0.00'}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <div style={styles.actionGroup}>
                                            {/* View Button */}
                                            <button style={styles.iconBtnView} onClick={() => handleView(s._id)} title="View">
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

            <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    style={{
                        padding: '8px 16px',
                        background: currentPage === 1 ? '#e9ecef' : '#5aa7ef',
                        color: currentPage === 1 ? '#6c757d' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontWeight: '600'
                    }}
                >
                    ←
                </button>
                <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484' }}>Page {currentPage} of {totalPages || 1}</span>
                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    style={{
                        padding: '8px 16px',
                        background: currentPage >= totalPages ? '#e9ecef' : '#5aa7ef',
                        color: currentPage >= totalPages ? '#6c757d' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                        fontWeight: '600'
                    }}
                >
                    →
                </button>
            </div>

            {/* View modal */}
            {viewSale && renderReceipt()}

            {cancelTarget && (
                <div style={styles.overlay} onClick={() => setCancelTarget(null)}>
                    <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.cancelModalHeader}>
                            <span style={styles.cancelIcon}>⚠️</span>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>Cancel Sale?</h3>
                        </div>
                        <p style={{ color: '#475569', lineHeight: 1.6 }}>
                            Are you sure you want to cancel <strong style={{ color: '#0f172a' }}>{cancelTarget.saleNumber}</strong>?
                            This will restore stock and reverse the customer ledger entry.
                        </p>
                        <div style={styles.cancelModalFooter}>
                            <button style={styles.cancelNoBtn} onClick={() => setCancelTarget(null)}>
                                No, keep it
                            </button>
                            <button style={styles.cancelYesBtn} onClick={handleCancelConfirm}>
                                Yes, cancel it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    filterBar: { display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap',padding:'0px' },
    dateField: { display: 'flex', flexDirection: 'column', gap: '5px', width: '28%', minWidth: '190px' },
    customerField: { backgroundColor:'none',display: 'flex', flexDirection: 'column', gap: '5px', width: '27%', minWidth: '200px' },
    dateLabel: { fontSize: '12px', fontWeight: 500, color: '#475569', textAlign: 'left',marginBottom:'none' },
    dateInput: { padding: '8px 14px', borderRadius: '4px', border: '1px solid #cfd0d3', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', width: '100%', boxSizing: 'border-box' },
    customerSelect: { padding: '9px 14px', borderRadius: '4px', border: '1px solid #cfd0d3', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none', width: '100%', cursor: 'pointer', boxSizing: 'border-box' },
    clearBtn: { padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              height: '38px'},
    resultCount: { textAlign: 'right', marginBottom: '10px',marginTop:'10px', fontSize: '13px', color: '#475569',marginRight:'15px' },
    tableWrapper: { background: '#fff', borderRadius: '8px', overflow: 'hidden', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px 18px', background: '#26384a', color: '#ffffff', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #1e293b' },
    td: { padding: '5px 18px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#475569' },
    emptyCell: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '15px' },

    iconBtnView: {
        background: '#f0fdf4',
        color: '#264b61',
        border: '1px solid #ddecf5',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
        backgroundColor: '#ebf5fc'
    },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '20px' },
    modal: { background: '#ffffff', padding: '32px', borderRadius: '16px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalSlideIn 0.3s ease-out', boxSizing: 'border-box' },
    cancelModalHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
    cancelIcon: { fontSize: '28px' },
    cancelModalFooter: { marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    cancelNoBtn: { background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' },
    cancelYesBtn: { background: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' },
    toast: { position: 'fixed', top: '24px', right: '24px', color: '#fff', padding: '14px 24px', borderRadius: '10px', zIndex: 2000, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', fontSize: '14px', fontWeight: 600, animation: 'slideIn 0.3s ease-out' },

    // Receipt Modal Styles from POS.js
    receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
    receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
    receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
    receiptActions: { margin: '0 65%', display: 'flex', gap: '10px' },
    printReceiptBtn: { background: '#294463', color: '#fff', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
    closeReceiptBtn: { background: '#fff', color: '#000', border: '1px solid #000', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' },
    receiptBody: { overflowY: 'auto', overflowX: 'hidden', flex: 1, color: '#000' },
    receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px' },
    receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
    receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
    receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#394654', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    receiptTd: { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
    receiptTdName: { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    data: { textAlign: 'left' },
    clearBtn: { width: '60%', border: '1px solid #b6b0b0', background: '#c7c9ca', color: '#ffffff', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, height: '38px', whiteSpace: 'nowrap' },

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



export default InvoiceList;