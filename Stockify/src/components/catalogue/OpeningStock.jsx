import React, { useState, useEffect, useRef } from 'react';
import '../roles.css';

// Message Popup Component (Moved outside to prevent re-mounting glitches)
function MessagePopup({ message, onClose }) {
    if (!message.text) return null;

    return (
        <div className="message-popup-overlay" onClick={onClose}>
            <div className={`message-popup ${message.type}`} onClick={(e) => e.stopPropagation()}>
                <button className="message-popup-close" onClick={onClose}>×</button>
                <div className="message-popup-content">
                    <span className="message-popup-icon">
                        {message.type === 'error' ? '⚠️' : '✅'}
                    </span>
                    <div className="message-popup-text">
                        <strong>{message.type === 'error' ? 'Error!' : 'Success!'}</strong>
                        {message.text}
                    </div>
                </div>
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
    const timerRef = useRef(null); // Ref to keep track of message timeout

    // Fetch products on mount
    useEffect(() => {
        fetchProducts();

        // Click outside handler to close dropdown
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

    // Keyboard navigation
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
                    setHighlightedIndex(prev =>
                        prev < filteredProducts.length - 1 ? prev + 1 : prev
                    );
                    setTimeout(() => {
                        const highlightedElement = document.querySelector(`[data-index="${highlightedIndex + 1}"]`);
                        if (highlightedElement) {
                            highlightedElement.scrollIntoView({ block: 'nearest' });
                        }
                    }, 50);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                    setTimeout(() => {
                        const highlightedElement = document.querySelector(`[data-index="${highlightedIndex - 1}"]`);
                        if (highlightedElement) {
                            highlightedElement.scrollIntoView({ block: 'nearest' });
                        }
                    }, 50);
                    break;

                case 'Enter':
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
                        selectProduct(filteredProducts[highlightedIndex]);
                        setTimeout(() => {
                            if (quantityRef.current) {
                                quantityRef.current.focus();
                            }
                        }, 100);
                    }
                    break;

                case 'Escape':
                    e.preventDefault();
                    setIsDropdownOpen(false);
                    setHighlightedIndex(-1);
                    if (inputRef.current) {
                        inputRef.current.blur();
                    }
                    break;

                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isDropdownOpen, filteredProducts, highlightedIndex, products]);

    // Global keyboard shortcuts for ESC and Enter on form
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
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
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
            const res = await fetch('http://localhost:5000/api/products');
            const data = await res.json();
            const sortedData = Array.isArray(data) ? [...data].sort((a, b) => a.name.localeCompare(b.name)) : [];
            setProducts(sortedData);
            setFilteredProducts(sortedData);
        } catch (error) {
            console.error('Error fetching products:', error);
            showMessage('Error fetching products. Please try again.', 'error');
        }
    };

    // Helper function to show messages with safe timeout handling
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

    // Handle Search Input
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setHighlightedIndex(-1);
        setIsDropdownOpen(true);

        if (value.trim() === '') {
            setFilteredProducts(products);
            setSelectedProduct(null);
        } else {
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredProducts(filtered);
            if (filtered.length > 0) {
                setHighlightedIndex(0);
            }
        }
    };

    // Handle Product Selection
    const selectProduct = (product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        clearMessage();
        setTimeout(() => {
            if (quantityRef.current) {
                quantityRef.current.focus();
            }
        }, 100);
    };

    // Handle Form Submission
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
            const res = await fetch(`http://localhost:5000/api/products/${selectedProduct._id}/opening-stocks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: Number(quantity) })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                showMessage(`Opening stock added successfully! ${quantity} units added to "${selectedProduct.name}".`, 'success');
                // Reset form
                setSelectedProduct(null);
                setSearchTerm('');
                setQuantity('');
                setFilteredProducts(products);
                setHighlightedIndex(-1);
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
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
        <div className="panel" style={{ width: '90%', padding: '25px', borderRadius: '8px', backgroundColor: '#fff', margin: '0 auto' }}>
            <MessagePopup message={message} onClose={clearMessage} />

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2>Add Opening Stock</h2>
            </div>

            <form onSubmit={handleSubmit}>
                <div>
                    <div style={{ marginBottom: '15px', position: 'relative' }} ref={dropdownRef}>
                        <label style={{ textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
                            Product Name *
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
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
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ced4da',
                                backgroundColor: 'white',
                                fontSize: '14px'
                            }}
                        />

                        {/* Custom Dropdown Suggestions */}
                        {isDropdownOpen && (
                            <ul style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                textAlign: 'left',
                                color: 'black',
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                zIndex: 1000,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
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
                                                borderBottom: '1px solid #f0f0f0',
                                                fontSize: '14px',
                                                backgroundColor: highlightedIndex === index ? '#e3f2fd' : '#fff',
                                                borderLeft: highlightedIndex === index ? '3px solid #5aa7ef' : '3px solid transparent',
                                                transition: 'all 0.1s ease'
                                            }}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            onMouseLeave={() => setHighlightedIndex(-1)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{product.name}</span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#397aac', marginTop: '2px' }}>
                                                Stock: {product.quantity || 0} units
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li style={{ padding: '10px 12px', color: '#777', fontSize: '14px' }}>No products found</li>
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Read-only Prices */}
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', textAlign: 'center', gap: '35px', marginBottom: '15px' }}>
                        <div style={{ alignItems: 'center', textAlign: 'center', flex: 1 }}>
                            <label style={{ textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
                                Cost Price
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={selectedProduct ? selectedProduct.costPrice : ''}
                                placeholder="Auto-loaded"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da',
                                    backgroundColor: '#ffffff',
                                    color: '#495057',
                                    fontSize: '14px',
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                        <div style={{ alignItems: 'center', textAlign: 'center', flex: 1 }}>
                            <label style={{ textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
                                Retail Price
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={selectedProduct ? selectedProduct.retailPrice : ''}
                                placeholder="Auto-loaded"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da',
                                    backgroundColor: '#ffffff',
                                    color: '#495057',
                                    fontSize: '14px',
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                    </div>

                    {/* Current Stock Display */}
                    {selectedProduct && (
                        <div style={{
                            marginBottom: '15px',
                            padding: '10px',
                            backgroundColor: '#eaf7f3',
                            borderRadius: '4px',
                            border: '1px dashed #205a4e',
                            width: '70%',
                            alignItems: 'center',
                            marginLeft: '15%'
                        }}>
                            <span style={{ fontSize: '13px', color: '#555' }}>
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
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ textAlign: 'left', display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
                            Opening Quantity *
                        </label>
                        <input
                            ref={quantityRef}
                            type="number"
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
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                border: '1px solid #ced4da',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>
                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '25%',
                        padding: '12px',
                        backgroundColor: '#2b3a4a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '15px'
                    }}
                >
                    {loading ? 'Saving...' : 'Save Opening Stock'}
                </button>
            </form>
        </div>
    );
};

export default OpeningStock;