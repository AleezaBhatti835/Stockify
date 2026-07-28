import { useState, useEffect, useRef } from 'react';
import './purchase.css';

function MessagePopup({ message, type, onClose }) {
    if (!message) return null;
    return (
        <div className="message-popup-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div className={`message-popup ${type}`} onClick={(e) => e.stopPropagation()}>
                <button className="message-popup-close" onClick={onClose}>×</button>
                <div className="message-popup-content">
                    <span className="message-popup-icon">{type === 'error' ? '⚠️' : '✅'}</span>
                    <div className="message-popup-text">
                        <strong>{type === 'error' ? 'Error: ' : 'Success: '}</strong>
                        {message}
                    </div>
                </div>
            </div>
        </div>
    );
}

const PurchaseRateDifference = () => {
    const [message, setMessage] = useState({ text: '', type: '' });
    const [completing, setCompleting] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

    const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
    const [searching, setSearching] = useState(false);
    const [purchase, setPurchase] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const firstQtyInputRef = useRef(null);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/purchases', { cache: 'no-store' });
                const data = await res.json();
                const numbers = Array.isArray(data)
                    ? data.map(p => p.invoiceNumber).filter(num => num && num.startsWith('PU-'))
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
        setTimeout(() => setMessage({ text: '', type: '' }), 6000);
    };

    const openConfirmDialog = (message, onConfirm) => {
        setConfirmDialog({ isOpen: true, message, onConfirm });
    };
    const closeConfirmDialog = () => {
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
    };

    useEffect(() => {
        if (searchInvoiceNumber.trim() === '') {
            setFilteredSuggestions([]);
            setShowSuggestions(false);
            setHighlightedIndex(-1);
            return;
        }
        const filtered = availableInvoiceNumbers.filter(num =>
            num.toLowerCase().includes(searchInvoiceNumber.toLowerCase())
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setHighlightedIndex(-1);
    }, [searchInvoiceNumber, availableInvoiceNumbers]);

    const handleKeyDown = (e) => {
        if (!showSuggestions && filteredSuggestions.length === 0) {
            if (e.key === 'Enter') {
                e.preventDefault();
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
                if (highlightedIndex >= 0) {
                    const selected = filteredSuggestions[highlightedIndex];
                    setSearchInvoiceNumber(selected);
                    setShowSuggestions(false);
                    handleSearch(selected);
                } else {
                    handleSearch();
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    const handleSearch = async (overrideNumber = null) => {
        const queryNumber = typeof overrideNumber === 'string' ? overrideNumber : searchInvoiceNumber;
        if (!queryNumber || !queryNumber.trim()) return showMessage('Enter an invoice number.', 'error');

        setSearching(true);
        setPurchase(null);
        setLineItems([]);
        setShowSuggestions(false);

        try {
            const res = await fetch(`http://localhost:5000/api/purchase-rate-difference/search?invoiceNumber=${encodeURIComponent(queryNumber.trim())}`, { cache: 'no-store' });
            const data = await res.json();

            if (data.success && data.purchase) {
                setPurchase(data.purchase);
                setLineItems(
                    data.purchase.items.map(item => ({
                        productId: item.product._id,
                        productName: item.product.name,
                        purchasedQuantity: item.quantity,
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

    const handleCompleteDifference = async () => {
        closeConfirmDialog();

        const itemsToUpdate = lineItems.filter(row => row.newRate !== row.prevRate).map(row => ({
            product: row.productId,
            purchasedQuantity: row.purchasedQuantity,
            prevRate: row.prevRate,
            newRate: Number(row.newRate),
            totalDifference: (Number(row.newRate) - row.prevRate) * row.purchasedQuantity
        }));

        if (itemsToUpdate.length === 0) {
            showMessage('No rate differences found to submit.', 'error');
            return;
        }

        setCompleting(true);
        try {
            const res = await fetch('http://localhost:5000/api/purchase-rate-difference/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchaseId: purchase._id,
                    supplierId: purchase.supplier?._id,
                    invoiceNumber: purchase.invoiceNumber,
                    netDifference: totalAmount,
                    items: itemsToUpdate
                })
            });
            const result = await res.json();
            if (result.success) {
                showMessage(`Rate difference recorded successfully.`, 'success');
                setPurchase(null);
                setLineItems([]);
                setSearchInvoiceNumber('');
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
        const diff = (Number(row.newRate) - row.prevRate) * row.purchasedQuantity;
        return sum + diff;
    }, 0);

    return (
        <div className="add-purchase-wrapper" style={{ width: '95%',marginBottom:'90px' }}>
            <MessagePopup message={message.text} type={message.type} onClose={() => setMessage({ text: '', type: '' })} />

            <div style={{ textAlign: 'center', alignItems: 'center' }} className="po-header">
                <h2>Purchase Rate Difference</h2>
            </div>

            <div className="card" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="text"
                            autoComplete="off"
                            placeholder="Search Invoice Number... (e.g. PU-1)"
                            value={searchInvoiceNumber}
                            onChange={(e) => { setSearchInvoiceNumber(e.target.value.toUpperCase()); setShowSuggestions(e.target.value.trim() !== ''); }}
                            onFocus={() => { if (searchInvoiceNumber.trim()) setShowSuggestions(true); }}
                            onKeyDown={handleKeyDown}
                            style={{ width: '100%', padding: '12px 14px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                        />
                        {showSuggestions && filteredSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, textAlign: 'left', fontSize: '12px', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 4px 4px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                                {filteredSuggestions.map((num, index) => (
                                    <div
                                        key={index}
                                        onClick={() => { setSearchInvoiceNumber(num); setShowSuggestions(false); handleSearch(num); }}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        style={{ padding: '10px 14px', cursor: 'pointer', backgroundColor: index === highlightedIndex ? '#e8f4fd' : 'white', color: index === highlightedIndex ? '#007bff' : '#333', borderBottom: '1px solid #f0f0f0' }}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {purchase && (
                    <div style={{ marginTop: '15px', display: 'flex', gap: '30px', fontSize: '13px', color: '#444', flexWrap: 'wrap', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span><strong>Invoice #:</strong> {purchase.invoiceNumber}</span>
                        <span><strong>Supplier:</strong> {purchase.supplier?.contactPerson || purchase.supplier?.companyName || 'Unknown'}</span>
                    </div>
                )}
            </div>

            <div className="card table-section" style={{ marginTop: '20px' }}>
                <table className="po-table">
                    <thead>
                        <tr>
                            <th style={{ width: '18%' }}>Product</th>
                            <th style={{ width: '11%' }}>Prev Rate</th>
                            <th style={{ width: '11%' }}>New Rate</th>
                            <th style={{ width: '9%' }}>Qty</th>
                            <th style={{ width: '13%' }}>Prev Total</th>
                            <th style={{ width: '13%' }}>New Total</th>
                            <th style={{ width: '13%' }}>Diff</th>
                            <th style={{ width: '12%' }} className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineItems.length === 0 ? (
                            <tr><td colSpan="8" className="empty-state">No invoice items.</td></tr>
                        ) : (
                            lineItems.map((row, index) => {
                                const numericNewRate = Number(row.newRate) || 0;
                                const prevTotal = row.prevRate * row.purchasedQuantity;
                                const newTotal = numericNewRate * row.purchasedQuantity;
                                const rowDiff = newTotal - prevTotal;

                                return (
                                    <tr key={row.productId}>
                                        <td>{row.productName}</td>
                                        <td>{row.prevRate.toFixed(2)}</td>
                                        <td>
                                            <input
                                                ref={index === 0 ? firstQtyInputRef : null}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={row.newRate}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, newRate: val } : r));
                                                }}
                                                style={{ width: '90%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                                            />
                                        </td>
                                        <td>{row.purchasedQuantity}</td>
                                        <td>{prevTotal.toFixed(2)}</td>
                                        <td>{newTotal.toFixed(2)}</td>
                                        <td style={{ fontWeight: 'bold', color: rowDiff > 0 ? 'red' : (rowDiff < 0 ? 'green' : 'inherit') }}>
                                            {rowDiff > 0 ? '+' : ''}{rowDiff.toFixed(2)}
                                        </td>
                                        <td className="text-center">
                                            <button
                                                className="btn-remove"
                                                onClick={() => setLineItems(prev => prev.map(r => r.productId === row.productId ? { ...r, newRate: r.prevRate } : r))}
                                                disabled={Number(row.newRate) === row.prevRate}
                                                style={{ opacity: Number(row.newRate) === row.prevRate ? 0.3 : 1, cursor: 'pointer' }}
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

            <div style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ border: '1px solid #1f6b3a', width: '30%', borderRadius: '8px', padding: '14px 24px', backgroundColor: '#f8f9fa' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#1f6b3a', display: 'block' }}>NET RATE DIFFERENCE</label>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: totalAmount > 0 ? 'red' : (totalAmount < 0 ? 'green' : 'inherit') }}>
                        {totalAmount > 0 ? '+' : ''}{totalAmount.toFixed(2)}
                    </div>
                </div>
                <button
                    className="btn-submit-order"
                    style={{ backgroundColor: '#4d9b6b', width: '23%', padding: '15px 1px', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    disabled={completing || !purchase || totalAmount === 0}
                    onClick={() => {
                        if (totalAmount !== 0) {
                            openConfirmDialog(`Submit net rate difference of Rs ${totalAmount.toFixed(2)}?`, handleCompleteDifference);
                        }
                    }}
                >
                    {completing ? 'Processing...' : 'Submit Difference'}
                </button>
            </div>

            {confirmDialog.isOpen && (
                <div
                    className="modal-force-top"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(51, 69, 86, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(4px)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeConfirmDialog(); }}
                >
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderTop: '6px solid #1f6b3a' }}>
                        <h3 style={{ marginTop: 0, color: '#1f6b3a', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>⚠️</span> Confirm Submission
                        </h3>
                        <p style={{ color: '#555', fontSize: '15px', lineHeight: '1.6', margin: '16px 0 24px 0' }}>{confirmDialog.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={closeConfirmDialog} style={{ padding: '10px 24px', backgroundColor: '#f1f1f1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#333' }}>Cancel</button>
                            <button onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()} style={{ padding: '10px 24px', backgroundColor: '#1f6b3a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Yes, Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseRateDifference;