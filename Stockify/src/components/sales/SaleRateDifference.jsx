import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const SaleRateDifference = () => {
    const [message, setMessage] = useState({ text: '', type: '' });
    const [completing, setCompleting] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

    const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
    const [searching, setSearching] = useState(false);
    const [sale, setSale] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const firstQtyInputRef = useRef(null);
    const messageRef = useRef(null);
    const confirmButtonRef = useRef(null);
    const searchWrapperRef = useRef(null);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Enter' && confirmDialog.isOpen) {
                e.preventDefault();
                if (confirmDialog.onConfirm) {
                    confirmDialog.onConfirm();
                }
            }
            if (e.key === 'Escape' && confirmDialog.isOpen) {
                e.preventDefault();
                closeConfirmDialog();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [confirmDialog.isOpen, confirmDialog.onConfirm]);

    useEffect(() => {
        if (confirmDialog.isOpen) {
            setTimeout(() => {
                if (confirmButtonRef.current) {
                    confirmButtonRef.current.focus();
                }
            }, 100);
        }
    }, [confirmDialog.isOpen]);

    useEffect(() => {
        if (message.text && messageRef.current) {
            messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [message.text]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setFilteredSuggestions([]);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // CORE ARCHITECTURE: Fetch and filter sale invoice numbers for dynamic autocomplete search and rate difference adjustments.
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/sales`, { 
                    cache: 'no-store',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                const numbers = Array.isArray(data)
                    ? data.map(s => s.saleNumber || s.invoiceNumber).filter(num => num && num.startsWith('SL-'))
                        .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
                    : [];
                setAvailableInvoiceNumbers(numbers);
            } catch (error) {
                console.error('Error fetching invoices:', error);
            }
        };
        fetchInvoices();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const openConfirmDialog = (message, onConfirm) => {
        setConfirmDialog({ isOpen: true, message, onConfirm });
    };
    const closeConfirmDialog = () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
    };

    useEffect(() => {
        if (showSuggestions && highlightedIndex >= 0) {
            const el = document.getElementById(`invoice-item-${highlightedIndex}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [highlightedIndex, showSuggestions]);

    const handleKeyDown = (e) => {
        if (!showSuggestions || filteredSuggestions.length === 0) {
            if (e.key === 'Enter') {
                e.preventDefault();
                setShowSuggestions(false);
                setFilteredSuggestions([]);
                handleSearch();
            }
            return;
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                    const selected = filteredSuggestions[highlightedIndex];
                    setSearchInvoiceNumber(selected);
                    setShowSuggestions(false);
                    setFilteredSuggestions([]);
                    setHighlightedIndex(-1);
                    handleSearch(selected);
                } else {
                    setShowSuggestions(false);
                    setFilteredSuggestions([]);
                    handleSearch();
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                setFilteredSuggestions([]);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    const handleSearch = async (overrideNumber = null) => {
        const queryNumber = typeof overrideNumber === 'string' ? overrideNumber : searchInvoiceNumber;
        
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        setHighlightedIndex(-1);

        if (!queryNumber || !queryNumber.trim()) return showMessage('Enter an invoice number.', 'error');

        setSearching(true);
        setSale(null);
        setLineItems([]);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/sale-rate-difference/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, {
                cache: 'no-store',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.sale) {
                setSale(data.sale);
                setLineItems(
                    data.items.map(item => ({
                        productId: item.product._id,
                        productName: item.product.name,
                        soldQuantity: item.saleQty,
                        prevRate: item.unitPrice,
                        newRate: item.unitPrice
                    }))
                );

                setTimeout(() => {
                    if (firstQtyInputRef.current) {
                        firstQtyInputRef.current.focus();
                        firstQtyInputRef.current.select();
                    }
                }, 100);
            } else {
                showMessage(data.message || 'No invoice found.', 'error');
            }
        } catch (error) {
            showMessage('Failed to search invoice.', 'error');
        } finally {
            setSearching(false);
        }
    };

    // DATA INTEGRITY: Validate line items, aggregate financial differences, and securely complete rate modification workflows.
    const handleCompleteDifference = async () => {
        closeConfirmDialog();

        const itemsToUpdate = lineItems.filter(row => row.newRate !== row.prevRate).map(row => ({
            product: row.productId,
            soldQuantity: row.soldQuantity,
            prevRate: row.prevRate,
            newRate: Number(row.newRate),
            totalDifference: (Number(row.newRate) - row.prevRate) * row.soldQuantity
        }));

        if (itemsToUpdate.length === 0) {
            showMessage('No rate differences found to submit.', 'error');
            return;
        }

        setCompleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/sale-rate-difference/complete`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    saleId: sale._id,
                    customerId: sale.customer?._id,
                    invoiceNumber: sale.invoiceNumber || sale.saleNumber,
                    netDifference: totalAmount,
                    items: itemsToUpdate
                })
            });
            const result = await res.json();
            if (result.success) {
                showMessage(`Rate difference recorded successfully.`, 'success');
                setSale(null);
                setLineItems([]);
                setSearchInvoiceNumber('');
                setShowSuggestions(false);
                setFilteredSuggestions([]);
            } else {
                showMessage(result.message || 'Failed to record rate difference.', 'error');
            }
        } catch (error) {
            showMessage('Network error.', 'error');
        } finally {
            setCompleting(false);
        }
    };

    const totalAmount = lineItems.reduce((sum, row) => {
        const diff = (Number(row.newRate) - row.prevRate) * row.soldQuantity;
        return sum + diff;
    }, 0);

    const InlineMessage = ({ message, type }) => {
        if (!message) return null;
        const colors = {
            success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
            error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' }
        };
        const style = colors[type] || colors.error;

        return (
            <div ref={messageRef} style={{ padding: '12px 16px', marginBottom: '20px', borderRadius: 'var(--radius-sm)', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, fontSize: '14px', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{style.icon} {message}</span>
                <button onClick={() => setMessage({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'inherit', lineHeight: '1' }}>×</button>
            </div>
        );
    };

    return (
        <div className="dashboard-wrapper" style={{ paddingBottom: '90px' }}>

            <InlineMessage message={message.text} type={message.type} />

            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px', fontWeight: '600' }}>Sale Rate Difference</h2>
            </div>

            {/* SEARCH SECTION */}
            <div className="card" style={{ position: 'relative', zIndex: 1000 }}>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={searchWrapperRef}>
                    <label className="form-label">Search Sale Invoice Number</label>
                    <input
                        type="text"
                        className="form-input"
                        autoComplete="off"
                        placeholder="Search Sale Invoice Number... (e.g. SL-1)"
                        value={searchInvoiceNumber}
                        onChange={(e) => { 
                            const val = e.target.value.toUpperCase();
                            setSearchInvoiceNumber(val); 
                            if (val.trim() !== '') {
                                const filtered = availableInvoiceNumbers.filter(num =>
                                    num.toLowerCase().includes(val.toLowerCase())
                                );
                                setFilteredSuggestions(filtered);
                                setShowSuggestions(filtered.length > 0);
                            } else {
                                setShowSuggestions(false);
                                setFilteredSuggestions([]);
                                setHighlightedIndex(-1);
                            }
                        }}
                        onFocus={() => { 
                            if (searchInvoiceNumber.trim() && filteredSuggestions.length > 0) {
                                setShowSuggestions(true);
                            } 
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                        <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', maxHeight: '200px', overflowY: 'auto', zIndex: 9999, margin: 0, padding: 0, listStyle: 'none', boxShadow: 'var(--shadow-md)' }}>
                            {filteredSuggestions.map((num, index) => (
                                <li
                                    key={index}
                                    id={`invoice-item-${index}`}
                                    onClick={() => { 
                                        setSearchInvoiceNumber(num); 
                                        setShowSuggestions(false); 
                                        setFilteredSuggestions([]);
                                        setHighlightedIndex(-1);
                                        handleSearch(num); 
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', backgroundColor: index === highlightedIndex ? 'var(--primary-light)' : 'var(--bg-surface)', color: index === highlightedIndex ? 'var(--primary)' : 'var(--text-main)', fontWeight: index === highlightedIndex ? '600' : '400', fontSize: '13px' }}
                                >
                                    {num}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {sale && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '30px', fontSize: '14px', color: 'var(--text-main)', backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <span><strong>Invoice #:</strong> {sale.invoiceNumber || sale.saleNumber}</span>
                        <span><strong>Customer:</strong> {sale.customer?.name || sale.customer?.customerName || 'Walk-in Customer'}</span>
                    </div>
                )}
            </div>

            {/* LINE ITEMS TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', zIndex: 1 }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '18%' }}>Product</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '11%' }}>Prev Rate</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '11%' }}>New Rate</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '9%' }}>Qty</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '13%' }}>Prev Total</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '13%' }}>New Total</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '13%' }}>Diff</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '12%' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searching ? (
                                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Searching...</td></tr>
                            ) : lineItems.length === 0 ? (
                                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No invoice items.</td></tr>
                            ) : (
                                lineItems.map((row, index) => {
                                    const numericNewRate = Number(row.newRate) || 0;
                                    const prevTotal = row.prevRate * row.soldQuantity;
                                    const newTotal = numericNewRate * row.soldQuantity;
                                    const rowDiff = newTotal - prevTotal;

                                    return (
                                        <tr key={row.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{row.productName}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.prevRate.toFixed(2)}</td>
                                            <td style={{ padding: '10px 16px' }}>
                                                <input
                                                    ref={index === 0 ? firstQtyInputRef : null}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="form-input"
                                                    style={{ padding: '6px 10px' }}
                                                    value={row.newRate}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, newRate: val } : r));
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && totalAmount !== 0) {
                                                            e.preventDefault();
                                                            openConfirmDialog(`Submit net rate difference of Rs ${totalAmount.toFixed(2)}?`, handleCompleteDifference);
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.soldQuantity}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{prevTotal.toFixed(2)}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{newTotal.toFixed(2)}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 'bold', color: rowDiff > 0 ? 'var(--success)' : (rowDiff < 0 ? 'var(--danger)' : 'inherit') }}>
                                                {rowDiff > 0 ? '+' : ''}{rowDiff.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, newRate: r.prevRate } : r))}
                                                    disabled={Number(row.newRate) === row.prevRate}
                                                    style={{ padding: '4px 8px', opacity: Number(row.newRate) === row.prevRate ? 0.3 : 1 }}
                                                    title="Revert to Previous Rate"
                                                >
                                                    ✕
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

            {/* BOTTOM ACTION BAR */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ padding: '12px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NET RATE DIFFERENCE</label>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: totalAmount > 0 ? 'var(--success)' : (totalAmount < 0 ? 'var(--danger)' : 'var(--text-main)') }}>
                        {totalAmount > 0 ? '+' : ''}{totalAmount.toFixed(2)}
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    style={{ padding: '14px 32px', fontSize: '15px' }}
                    disabled={completing || !sale || totalAmount === 0}
                    onClick={() => {
                        if (totalAmount !== 0) {
                            openConfirmDialog(`Submit net rate difference of Rs ${totalAmount.toFixed(2)}?`, handleCompleteDifference);
                        }
                    }}
                >
                    {completing ? 'Processing...' : 'Submit Difference'}
                </button>
            </div>

            {/* CONFIRMATION MODAL */}
            {confirmDialog.isOpen && (
                <div className="modal-overlay" onClick={closeConfirmDialog}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderTop: '6px solid var(--primary)' }}>
                        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <h3 className="modal-title" style={{ fontSize: '20px' }}>
                                <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Submission
                            </h3>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                                {confirmDialog.message}
                            </p>
                        </div>
                        <div className="modal-footer" style={{ borderTop: 'none', backgroundColor: 'transparent' }}>
                            <button className="btn btn-secondary" onClick={closeConfirmDialog}>Cancel (Esc)</button>
                            <button className="btn btn-primary" ref={confirmButtonRef} onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}>Yes, Submit (Enter)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaleRateDifference;