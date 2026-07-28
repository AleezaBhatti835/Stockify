import React, { useState, useEffect, useMemo } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

function SalesReturnList() {
    const [returns, setReturns] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState(getTodayString());
    const [dateTo, setDateTo] = useState(getTodayString());

    // Suggestions & Keyboard Navigation State
    const [showCustSug, setShowCustSug] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    // Modal State
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    // Jab bhi filters change hon, page 1 par wapas aayen
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [retRes, custRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/sale-returns`),
                fetch(`${API_BASE_URL}/api/customers`)
            ]);

            if (custRes.ok) {
                const custData = await custRes.json();
                let fetchedCustomers = [];
                if (Array.isArray(custData)) fetchedCustomers = custData;
                else if (custData.data && Array.isArray(custData.data)) fetchedCustomers = custData.data;
                setCustomers(fetchedCustomers);
            }

            if (retRes.ok) {
                const retData = await retRes.json();
                let dataToSet = [];
                if (Array.isArray(retData)) {
                    dataToSet = retData;
                } else if (retData && Array.isArray(retData.saleReturns)) {
                    dataToSet = retData.saleReturns;
                } else if (retData && Array.isArray(retData.returns)) {
                    dataToSet = retData.returns;
                } else if (retData && Array.isArray(retData.data)) {
                    dataToSet = retData.data;
                }

                // Sorting in ASCENDING order (Oldest first, Most recent at the end)
                dataToSet.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                
                setReturns(dataToSet);
            } else {
                setReturns([]);
            }

        } catch (err) {
            console.error('Network Error while fetching data:', err);
            setReturns([]);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDateFrom('');
        setDateTo('');
    };

    const getCustomerName = (r) => {
        if (r.customer && typeof r.customer === 'object') {
            return r.customer.name || r.customer.customerName || 'Walk-in Customer';
        }
        if (r.customer && typeof r.customer === 'string') {
            const found = customers.find(c => c._id === r.customer);
            return found ? (found.name || found.customerName) : 'Walk-in Customer';
        }
        return 'Walk-in Customer';
    };

    const filteredReturns = useMemo(() => {
        return returns.filter(r => {
            const dateString = r.returnDate || r.createdAt;
            if (!dateString) return false;

            const returnDate = new Date(dateString);
            const customerName = getCustomerName(r).toLowerCase();
            const searchMatch = !searchTerm || customerName.includes(searchTerm.toLowerCase());

            let fromMatch = true;
            if (dateFrom) {
                const fDate = new Date(dateFrom);
                fDate.setHours(0, 0, 0, 0);
                fromMatch = returnDate >= fDate;
            }

            let toMatch = true;
            if (dateTo) {
                const tDate = new Date(dateTo);
                tDate.setHours(23, 59, 59, 999);
                toMatch = returnDate <= tDate;
            }

            return searchMatch && fromMatch && toMatch;
        });
    }, [returns, customers, searchTerm, dateFrom, dateTo]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredReturns.length / itemsPerPage) || 1;

    const filteredCustSuggestions = customers.filter(c =>
        (c.name || c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Keyboard Shortcuts Logic for Search Input
    const handleKeyDown = (e) => {
        if (!showCustSug || filteredCustSuggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < filteredCustSuggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredCustSuggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredCustSuggestions.length) {
                const selected = filteredCustSuggestions[highlightedIndex];
                setSearchTerm(selected.name || selected.customerName);
                setShowCustSug(false);
                setHighlightedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            setShowCustSug(false);
            setHighlightedIndex(-1);
        }
    };

    const openReceipt = (returnItem) => {
        setSelectedReturn(returnItem);
        setIsModalOpen(true);
    };

    const closeReceipt = () => {
        setSelectedReturn(null);
        setIsModalOpen(false);
    };

    // Helper: Remove zeros from SR- (e.g. SR-0005 -> SR-5)
    const formatReturnNumber = (numStr) => {
        if (!numStr) return '—';
        return numStr.replace(/SR-0+/, 'SR-');
    };

    // ONLY A4 PRINT LOGIC
    const handlePrint = () => {
        const contentEl = document.getElementById('receipt-content');
        if (!contentEl || !selectedReturn) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '210mm';
        iframe.style.height = '297mm';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <style>
                        * { box-sizing: border-box; }
                        @page { size: A4; margin: 20mm; }
                        html, body { margin: 0; padding: 0; }
                        body {
                            padding: 24px;
                            font-family: Arial, sans-serif;
                            font-size: 14px;
                            color: #000;
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

    // Render Receipt Modal
    const renderReceipt = () => {
        if (!selectedReturn) return null;

        const invNumber = selectedReturn.invoiceNumber || (selectedReturn.sale && selectedReturn.sale.saleNumber) || 'Linked';
        const displayReturnNum = formatReturnNumber(selectedReturn.returnNumber);
        const returnDateStr = new Date(selectedReturn.returnDate || selectedReturn.createdAt).toLocaleDateString();

        return (
            <div style={styles.receiptOverlay} onClick={closeReceipt}>
                <div style={{ ...styles.receiptContainer, maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ ...styles.receiptHeader, flexDirection: 'row', gap: '0' }}>
                        <h3 style={{ margin: 0, color: '#000' }}>CAPOBIZ</h3>
                        <div style={{ ...styles.receiptActions, width: 'auto', margin: '0' }}>
                            <button
                                className="receipt-print-btn"
                                style={styles.printReceiptBtn}
                                onClick={handlePrint}
                            >
                                🖨️ Print
                            </button>
                            <button
                                className="receipt-close-btn"
                                style={styles.closeReceiptBtn}
                                onClick={closeReceipt}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            ...styles.receiptBody,
                            padding: '24px',
                            fontSize: '14px',
                            fontFamily: 'Arial, sans-serif'
                        }}
                        id="receipt-content"
                    >
                        <div style={styles.receiptHeaderInfo}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', textAlign: 'center' }}>SALES RETURN RECEIPT</h4>
                            <p style={{ margin: '4px 0', color: '#333' }}>Return #: {displayReturnNum}</p>
                            <p style={{ margin: '4px 0', color: '#333' }}>
                                Customer: {getCustomerName(selectedReturn)}
                            </p>
                        </div>
                        <div style={styles.receiptDivider}></div>

                        <table style={styles.receiptTable}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.receiptTh, width: '15%' }}>Product</th>
                                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '15%' }}>Orig. Sale</th>
                                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '15%' }}>Date</th>
                                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '15%' }}>Ret. Qty</th>
                                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '15%' }}>Price</th>
                                    <th style={{ ...styles.receiptTh, textAlign: 'left', width: '15%' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(selectedReturn.items || []).map((item, idx) => {
                                    const itemName = (item.product && item.product.name) ? item.product.name : (item.name || 'Unknown Product');
                                    const lineTotal = item.quantity * item.unitPrice;
                                    return (
                                        <tr style={styles.data} key={idx}>
                                            <td style={styles.receiptTdName}>{itemName}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>
                                                {!selectedReturn.isBlindReturn ? invNumber : 'N/A'}
                                            </td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{returnDateStr}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{item.quantity}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left' }}>{Number(item.unitPrice || 0).toFixed(2)}</td>
                                            <td style={{ ...styles.receiptTd, textAlign: 'left', fontWeight: 600 }}>
                                                {lineTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div style={styles.receiptDivider}></div>
                        <div style={styles.receiptTotals}>
                            <div style={{ ...styles.receiptTotalRow, fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                <span>Total Refunded</span>
                                <span>Rs. {Number(selectedReturn.totalAmount || selectedReturn.refundAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', margin: '40px 0 10px 0', fontSize: '13px', color: '#555' }}>
                            <p>Items returned successfully.</p>
                            <p>Thank you!</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{padding: '25px', borderRadius: '8px', backgroundColor: '#fff' }}>
            {/* ==================== FILTERS ==================== */}
            <div style={styles.filterCard}>
                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Search (Customer)</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type="text"
                            name="customer-search-field"
                            autoComplete="new-password"
                            placeholder="Type customer name..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowCustSug(true);
                                setHighlightedIndex(-1);
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setShowCustSug(true)}
                            onBlur={() => setTimeout(() => setShowCustSug(false), 200)}
                            style={{ ...styles.filterInput, width: '100%' }}
                        />

                        {/* Customer Suggestions Dropdown */}
                        {showCustSug && searchTerm && filteredCustSuggestions.length > 0 && (
                            <div style={styles.suggestionsList}>
                                {filteredCustSuggestions.map((c, idx) => (
                                    <div
                                        key={c._id || idx}
                                        className="suggestion-hover"
                                        style={{
                                            ...styles.suggestionItem,
                                            backgroundColor: idx === highlightedIndex ? '#e8f4fd' : 'transparent',
                                            color: idx === highlightedIndex ? '#007bff' : '#334155'
                                        }}
                                        onMouseDown={() => {
                                            setSearchTerm(c.name || c.customerName);
                                            setShowCustSug(false);
                                            setHighlightedIndex(-1);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                    >
                                        {c.name || c.customerName}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Date From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        style={styles.filterInput}
                    />
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Date To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        style={styles.filterInput}
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

            <div style={styles.resultCount}>
                Showing {currentItems.length} of {filteredReturns.length} return(s)
            </div>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, textAlign: 'left', width: '10%' }}>Sr#</th>
                            <th style={{ ...styles.th, textAlign: 'left', width: '15%' }}>Date</th>
                            <th style={{ ...styles.th, textAlign: 'left', width: '15%' }}>Return #</th>
                            <th style={{ ...styles.th, textAlign: 'left', width: '15%' }}>Customer </th>
                            <th style={{ ...styles.th, textAlign: 'left' }}>Refund Amount</th>
                            <th style={{ ...styles.th, textAlign: 'left' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={styles.emptyCell}>Loading Returns...</td></tr>
                        ) : filteredReturns.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={styles.emptyCell}>
                                    {returns.length === 0
                                        ? 'No sales returns found in database. (Note: Ensure Backend API is running)'
                                        : 'No sales returns match your current filters. (Tip: Click "Clear Filters")'}
                                </td>
                            </tr>
                        ) : (
                            currentItems.map((r, idx) => {
                                const customerName = getCustomerName(r);
                                const invNumber = r.invoiceNumber || (r.sale && r.sale.saleNumber) || 'Linked';
                                const serialNumber = indexOfFirstItem + idx + 1;
                                const displayReturnNum = formatReturnNumber(r.returnNumber);
                                
                                // Proper quantity sum instead of length
                                const totalQty = r.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

                                return (
                                    <tr key={r._id}>
                                        <td style={styles.td}>{serialNumber}</td>
                                        <td style={styles.td}>{new Date(r.returnDate || r.createdAt).toLocaleDateString()}</td>
                                        <td style={{ ...styles.td,  color: '#0f172a' }}>{displayReturnNum}</td>
                                     
                                        <td style={styles.td}>{customerName}</td>
                                        <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600, color: '#ef4444' }}>
                                            Rs. {Number(r.totalAmount || r.refundAmount || 0).toFixed(2)}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'left' }}>
                                            <div style={{ display: 'flex', justifyContent: 'left' }}>
                                                <button style={styles.iconBtnView} onClick={() => openReceipt(r)} title="View Receipt">
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

            {/* Pagination Controls */}
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
                <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484' }}>Page {currentPage} of {totalPages}</span>
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

            {/* View Modal */}
            {isModalOpen && renderReceipt()}

            <style>{`
                .suggestion-hover:hover {
                    background-color: #e8f4fd !important;
                    color: #007bff !important;
                }
            `}</style>
        </div>
    );
}

const styles = {
    page: { padding: '24px', background: '#eff0f3', minHeight: '100%' },
    
    filterCard: {  padding: '16px', borderRadius: '8px', marginBottom: '10px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' },
    filterGroup: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: '200px' },
    filterLabel: { textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' },
    filterInput: { textAlign: 'left', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', color: '#334155' },
    clearBtn: { width: '60%', border: '1px solid #b6b0b0', background: '#c7c9ca', color: '#ffffff', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, height: '38px', whiteSpace: 'nowrap' },

    suggestionsList: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 6px 6px', maxHeight: '180px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
    suggestionItem: { textAlign: 'left', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#334155' },

    resultCount: { textAlign: 'right', marginBottom: '12px', fontSize: '13px', color: '#475569', fontWeight: 600 },
    
    tableWrapper: { background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '14px 18px', background: '#26384a', color: '#ffffff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1' },
    td: { padding: '14px 18px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
    emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },

    iconBtnView: {
        background: '#f0fdf4',
        color: '#264b61',
        border: '1px solid #ddecf5',
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        backgroundColor: '#ebf5fc'
    },
    blindBadge: { display: 'inline-block', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '11px', fontWeight: 600, padding: '2px 8px' },

    receiptOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' },
    receiptContainer: { background: '#ffffff', borderRadius: '10px', border: '1px solid #000', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' },
    receiptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '2px solid #000', background: '#ffffff', flexShrink: 0 },
    receiptActions: { display: 'flex', gap: '10px' },
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
    receiptTotals: { marginTop: '14px' },
    receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' },
};

export default SalesReturnList;