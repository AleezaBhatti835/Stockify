import React, { useState, useEffect, useRef } from 'react';

// Message Popup Component styled with global CSS variables
function MessagePopup({ message, onClose }) {
    if (!message.text) return null;

    const isError = message.type === 'error';

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999999 }}>
            <div 
                className="card" 
                onClick={(e) => e.stopPropagation()} 
                style={{
                    minWidth: '320px',
                    maxWidth: '90%',
                    padding: 'var(--space-md)',
                    borderLeft: `4px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)',
                    boxShadow: 'var(--shadow-modal)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontSize: '20px' }}>
                        {isError ? '⚠️' : '✅'}
                    </span>
                    <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                        <strong style={{ color: isError ? 'var(--danger)' : 'var(--success)' }}>
                            {isError ? 'Error! ' : 'Success! '}
                        </strong>
                        {message.text}
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        lineHeight: 1
                    }}
                >
                    &times;
                </button>
            </div>
        </div>
    );
}

const OpeningStock = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const quantityRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchProducts();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isDropdownOpen || filteredProducts.length === 0) {
                if (e.key === 'ArrowDown' && !isDropdownOpen) {
                    e.preventDefault();
                    setFilteredProducts(products);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(0);
                }
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : prev);
                    setTimeout(() => {
                        const highlightedElement = document.querySelector(`[data-index="${highlightedIndex + 1}"]`);
                        if (highlightedElement) highlightedElement.scrollIntoView({ block: 'nearest' });
                    }, 50);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                    setTimeout(() => {
                        const highlightedElement = document.querySelector(`[data-index="${highlightedIndex - 1}"]`);
                        if (highlightedElement) highlightedElement.scrollIntoView({ block: 'nearest' });
                    }, 50);
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
                        selectProduct(filteredProducts[highlightedIndex]);
                        setTimeout(() => {
                            if (quantityRef.current) quantityRef.current.focus();
                        }, 100);
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    setIsDropdownOpen(false);
                    setHighlightedIndex(-1);
                    if (inputRef.current) inputRef.current.blur();
                    break;

                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isDropdownOpen, filteredProducts, highlightedIndex, products]);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (isDropdownOpen) return;

            if (e.key === 'Escape') {
                if (selectedProduct || searchTerm) {
                    e.preventDefault();
                    setSelectedProduct(null);
                    setSearchTerm('');
                    setFilteredProducts(products);
                    setQuantity('');
                    clearMessage();
                    if (inputRef.current) inputRef.current.focus();
                }
            }

            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handleSubmit(e);
            }

            if (e.key === 'Enter' && document.activeElement === quantityRef.current) {
                e.preventDefault();
                handleSubmit(e);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isDropdownOpen, selectedProduct, searchTerm, products, quantity]);

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const sortedData = Array.isArray(data) ? [...data].sort((a, b) => a.name.localeCompare(b.name)) : [];
            setProducts(sortedData);
            setFilteredProducts(sortedData);
        } catch (error) {
            console.error('Error fetching products:', error);
            showMessage('Error fetching products. Please try again.', 'error');
        }
    };

    const showMessage = (text, type) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setMessage({ text, type });
        const duration = type === 'error' ? 4000 : 2500;
        timerRef.current = setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, duration);
    };

    const clearMessage = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setMessage({ text: '', type: '' });
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setHighlightedIndex(-1);
        setIsDropdownOpen(true);

        if (value.trim() === '') {
            setFilteredProducts(products);
            setSelectedProduct(null);
        } else {
            const filtered = products.filter(p => p.name.toLowerCase().includes(value.toLowerCase()));
            setFilteredProducts(filtered);
            if (filtered.length > 0) setHighlightedIndex(0);
        }
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        clearMessage();
        setTimeout(() => {
            if (quantityRef.current) quantityRef.current.focus();
        }, 100);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        clearMessage();

        if (!selectedProduct) {
            showMessage('Please select a product first.', 'error');
            if (inputRef.current) inputRef.current.focus();
            return;
        }
        if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
            showMessage('Please enter a valid quantity.', 'error');
            if (quantityRef.current) quantityRef.current.focus();
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/products/${selectedProduct._id}/opening-stocks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quantity: Number(quantity) })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                showMessage(`Opening stock added successfully! ${quantity} units added to "${selectedProduct.name}".`, 'success');
                setSelectedProduct(null);
                setSearchTerm('');
                setQuantity('');
                setFilteredProducts(products);
                setHighlightedIndex(-1);
                setTimeout(() => {
                    if (inputRef.current) inputRef.current.focus();
                }, 300);
            } else {
                showMessage(result.message || 'Failed to add opening stock.', 'error');
            }
        } catch (error) {
            console.error('Error submitting opening stock:', error);
            showMessage('Server error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-wrapper">
            <MessagePopup message={message} onClose={clearMessage} />

            <div className="card" style={{padding:'50px 20px', maxWidth: '800px', margin: '2% auto', width: '100%',border:'1px solid #c8efec' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                    <h2 style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: '700' }}>
                        Add Opening Stock
                    </h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                        <label className="form-label">Product Name <span className="star-red">*</span></label>
                        <input
                            ref={inputRef}
                            type="text"
                            className="form-input"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onFocus={() => {
                                setFilteredProducts(products);
                                setIsDropdownOpen(true);
                                if (filteredProducts.length > 0 && highlightedIndex === -1) {
                                    setHighlightedIndex(0);
                                }
                            }}
                            placeholder="Search or click to select product..."
                        />

                        {/* Custom Dropdown Suggestions */}
                        {isDropdownOpen && (
                            <ul style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: 'var(--shadow-md)',
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                marginTop: 'var(--space-xs)'
                            }}>
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((product, index) => (
                                        <li
                                            key={product._id}
                                            data-index={index}
                                            onClick={() => selectProduct(product)}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border-color)',
                                                fontSize: '14px',
                                                backgroundColor: highlightedIndex === index ? 'var(--primary-light)' : 'var(--bg-surface)',
                                                borderLeft: highlightedIndex === index ? '3px solid var(--primary)' : '3px solid transparent',
                                                transition: 'all 0.1s ease',
                                                color: 'var(--text-main)'
                                            }}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            onMouseLeave={() => setHighlightedIndex(-1)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: highlightedIndex === index ? '600' : '400' }}>
                                                    {product.name}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                Stock: {product.quantity || 0} units
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                        No products found
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Read-only Prices */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label">Cost Price</label>
                            <input
                                type="text"
                                className="form-input"
                                readOnly
                                value={selectedProduct ? selectedProduct.costPrice : ''}
                                placeholder="Auto-loaded"
                                style={{
                                    backgroundColor: 'var(--bg-app)',
                                    color: 'var(--text-muted)',
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label">Retail Price</label>
                            <input
                                type="text"
                                className="form-input"
                                readOnly
                                value={selectedProduct ? selectedProduct.retailPrice : ''}
                                placeholder="Auto-loaded"
                                style={{
                                    backgroundColor: 'var(--bg-app)',
                                    color: 'var(--text-muted)',
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                    </div>

                    {/* Current Stock Display */}
                    {selectedProduct && (
                        <div style={{
                            marginBottom: 'var(--space-md)',
                            padding: 'var(--space-md)',
                            backgroundColor: 'var(--primary-light)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px dashed var(--btn-border)', // Using the requested --btn-border
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                                <strong>Current Stock:</strong> {selectedProduct.quantity || 0} units
                                {selectedProduct.openingStockQuantity !== undefined && (
                                    <span style={{ marginLeft: '15px' }}>
                                        <strong>Opening Stock:</strong> {selectedProduct.openingStockQuantity || 0} units
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Quantity Input */}
                    <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                        <label className="form-label">Opening Quantity *</label>
                        <input
                            ref={quantityRef}
                            type="number"
                            className="form-input"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="Enter quantity..."
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '25%', minWidth: '150px' }}
                    >
                        {loading ? 'Saving...' : 'Save Opening Stock'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OpeningStock;