import React, { useState, useEffect, useMemo } from 'react';
import { usePrintSettings } from '../../context/PrintSettingsContext';

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

    const { settings: printSettings } = usePrintSettings();

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState(getTodayString());
    const [dateTo, setDateTo] = useState(getTodayString());

    // Suggestions & Keyboard Navigation State
    const [showCustSug, setShowCustSug] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal State
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [retRes, custRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/sale-returns`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/api/customers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
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
            <div className="modal-overlay" onClick={closeReceipt}>
                <div className="modal-container" style={{ width: '850px', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title" style={{ color: '#000' }}>CAPOBIZ</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
                            <button className="btn btn-secondary" onClick={closeReceipt}>✕ Close</button>
                        </div>
                    </div>

                    <div
                        className="modal-body"
                        style={{
                            padding: '24px',
                            fontSize: '14px',
                            fontFamily: 'Arial, sans-serif'
                        }}
                        id="receipt-content"
                    >
                        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', textAlign: 'center' }}>SALES RETURN RECEIPT</h4>
                            <p style={{ margin: '4px 0', color: '#333' }}>Return #: {displayReturnNum}</p>
                            <p style={{ margin: '4px 0', color: '#333' }}>
                                Customer: {getCustomerName(selectedReturn)}
                            </p>
                        </div>
                        <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...tableStyles.th, width: '15%' }}>Product</th>
                                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '15%' }}>Orig. Sale</th>
                                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '15%' }}>Date</th>
                                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '15%' }}>Ret. Qty</th>
                                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '15%' }}>Price</th>
                                    <th style={{ ...tableStyles.th, textAlign: 'left', width: '15%' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(selectedReturn.items || []).map((item, idx) => {
                                    const itemName = (item.product && item.product.name) ? item.product.name : (item.name || 'Unknown Product');
                                    const lineTotal = item.quantity * item.unitPrice;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '8px', fontSize: '13px', color: '#000', overflow: 'hidden',textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemName}</td>
                                            <td style={{ padding: '8px', fontSize: '13px', color: '#000', textAlign: 'left' }}>
                                                {!selectedReturn.isBlindReturn ? invNumber : 'N/A'}
                                            </td>
                                            <td style={{ padding: '8px', fontSize: '13px', color: '#000', textAlign: 'left' }}>{returnDateStr}</td>
                                            <td style={{ padding: '8px', fontSize: '13px', color: '#000', textAlign: 'left' }}>{item.quantity}</td>
                                            <td style={{ padding: '8px', fontSize: '13px', color: '#000', textAlign: 'left' }}>{Number(item.unitPrice || 0).toFixed(2)}</td>
                                            <td style={{ padding: '8px', fontSize: '13px', color: '#000', textAlign: 'left', fontWeight: 600 }}>
                                                {lineTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000', fontWeight: 700, fontSize: '1.15em', borderTop: '2px solid #000', paddingTop: '10px' }}>
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
        <div className="dashboard-wrapper">
       

            {/* ==================== FILTERS ==================== */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0, position: 'relative' }}>
                    <label className="form-label">Search (Customer)</label>
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
                        className="form-input"
                    />

                    {/* Customer Suggestions Dropdown */}
                    {showCustSug && searchTerm && filteredCustSuggestions.length > 0 && (
                        <ul style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                            maxHeight: '180px', overflowY: 'auto', margin: 'var(--space-xs) 0 0 0', padding: 0, listStyle: 'none',
                            zIndex: 1000, boxShadow: 'var(--shadow-md)', textAlign: 'left'
                        }}>
                            {filteredCustSuggestions.map((c, idx) => (
                                <li
                                    key={c._id || idx}
                                    style={{
                                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '13px',
                                        backgroundColor: idx === highlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)',
                                        color: idx === highlightedIndex ? 'var(--primary)' : 'var(--text-main)'
                                    }}
                                    onMouseDown={() => {
                                        setSearchTerm(c.name || c.customerName);
                                        setShowCustSug(false);
                                        setHighlightedIndex(-1);
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                >
                                    {c.name || c.customerName}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label">Date From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="form-input"
                    />
                </div>

                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label">Date To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="form-input"
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
                
                {/* RESULTS COUNT */}
                <div style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <span>Showing {currentItems.length} of {filteredReturns.length} return(s)</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...tableStyles.th, textAlign: 'center', width: '60px' }}>Sr#</th>
                                <th style={tableStyles.th}>Date</th>
                                <th style={tableStyles.th}>Return #</th>
                                <th style={tableStyles.th}>Customer</th>
                                <th style={tableStyles.th}>Refund Amount</th>
                                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={tableStyles.emptyCell}>Loading Returns...</td></tr>
                            ) : filteredReturns.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={tableStyles.emptyCell}>
                                        {returns.length === 0
                                            ? 'No sales returns found in database.'
                                            : 'No sales returns match your current filters.'}
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((r, idx) => {
                                    const customerName = getCustomerName(r);
                                    const serialNumber = indexOfFirstItem + idx + 1;
                                    const displayReturnNum = formatReturnNumber(r.returnNumber);

                                    return (
                                        <tr 
                                            key={r._id}
                                            style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ ...tableStyles.td, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{serialNumber}</td>
                                            <td style={tableStyles.td}>{new Date(r.returnDate || r.createdAt).toLocaleDateString()}</td>
                                            <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--text-main)' }}>{displayReturnNum}</td>
                                            <td style={tableStyles.td}>{customerName}</td>
                                            <td style={{ ...tableStyles.td, fontWeight: 600, color: 'var(--danger)' }}>
                                                Rs. {Number(r.totalAmount || r.refundAmount || 0).toFixed(2)}
                                            </td>
                                            <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button 
                                                        style={actionStyles.iconBtnView} 
                                                        onClick={() => openReceipt(r)} 
                                                        title="View Receipt"
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

                {/* Pagination Controls */}
                {filteredReturns.length > itemsPerPage && (
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

            {/* View Modal */}
            {isModalOpen && renderReceipt()}
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
    receiptHeaderInfo: { textAlign: 'left', marginBottom: '16px' },
    receiptDivider: { borderTop: '2px dashed #000', margin: '14px 0' },
    receiptTable: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' },
    receiptTh: { textAlign: 'left', padding: '6px 8px', backgroundColor: '#394654', borderBottom: '2px solid #000', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    receiptTd: { padding: '6px 8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' },
    receiptTotals: { marginTop: '14px' },
    receiptTotalRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px', color: '#000' }
};

export default SalesReturnList;