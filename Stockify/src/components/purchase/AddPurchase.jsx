import React, { useState, useEffect, useRef } from 'react';
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

const AddPurchase = () => {
  // --- Data States ---
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');

  // --- Form States ---
  const [purchaseInfo, setPurchaseInfo] = useState({
    supplierId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    supplierPhone: '',
    supplierCity: ''
  });

  const [items, setItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);

  // --- Draft Item State ---
  const [draftItem, setDraftItem] = useState({
    product: '', productName: '', quantity: 1, unitPrice: 0, expiryDate: ''
  });

  // --- Edit Modal States ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({ product: '', productName: '', quantity: '', unitPrice: '', expiryDate: '' });

  // Modal specific search states
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isModalSearchOpen, setIsModalSearchOpen] = useState(false);
  const [modalHighlightedIndex, setModalHighlightedIndex] = useState(-1);
  const modalSearchRef = useRef(null);

  // --- Main Form Search States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef(null);
  
  // --- NAYA: Quantity Input Focus Ref ---
  const qtyInputRef = useRef(null);

  // --- Initialization ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supplierRes, productRes, purchaseRes] = await Promise.all([
          fetch('http://localhost:5000/api/suppliers'),
          fetch('http://localhost:5000/api/products'),
          fetch('http://localhost:5000/api/purchases/last-invoice')
        ]);
        
        const supplierData = await supplierRes.json();
        const productData = await productRes.json();
        const purchaseData = await purchaseRes.json();

        setSuppliers(supplierData);
        setProducts(productData);
        
        // Generate next invoice number
        generateNextInvoiceNumber(purchaseData.lastInvoiceNumber);
      } catch (error) {
        showMessage('Failed to load database records. Please refresh.', 'error');
      }
    };
    fetchData();
  }, []);

  // Function to generate next invoice number
  const generateNextInvoiceNumber = (lastInvoiceNumber) => {
    if (!lastInvoiceNumber) {
      const newNumber = 'PU-1';
      setNextInvoiceNumber(newNumber);
      setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newNumber }));
      return;
    }

    // Extract the number from the invoice number (e.g., "PU-5" -> 5)
    const match = lastInvoiceNumber.match(/PU-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      const newInvoiceNumber = `PU-${nextNumber}`;
      setNextInvoiceNumber(newInvoiceNumber);
      setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newInvoiceNumber }));
    } else {
      // If format doesn't match, start from PU-1
      const newNumber = 'PU-1';
      setNextInvoiceNumber(newNumber);
      setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newNumber }));
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleInfoChange = (e) => {
    setPurchaseInfo({ ...purchaseInfo, [e.target.name]: e.target.value });
  };

  const handleSupplierChange = (e) => {
    const selectedId = e.target.value;
    const selectedSupplier = suppliers.find(s => s._id === selectedId);

    setPurchaseInfo({
      ...purchaseInfo,
      supplierId: selectedId,
      supplierPhone: selectedSupplier?.phone || '',
      supplierCity: selectedSupplier?.city || ''
    });
  };

  // --- Main Form Search Logic ---
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchKeyDown = (e) => {
    if (!isSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        selectProduct(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const selectProduct = (product) => {
    setDraftItem({
      ...draftItem,
      product: product._id,
      productName: product.name,
      unitPrice: product.retailPrice || 0,
      quantity: 1 // Reset quantity back to 1 when a new product is selected
    });
    setSearchTerm(product.name);
    setIsSearchOpen(false);
    setHighlightedIndex(-1);

    // Focus on the quantity field automatically
    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select(); // Automatically highlights the text so you can easily type over it
      }
    }, 10);
  };

  // --- Modal Form Search Logic ---
  const filteredModalProducts = products.filter(p =>
    p.name.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );

  const handleModalSearchKeyDown = (e) => {
    if (!isModalSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setModalHighlightedIndex(prev => (prev < filteredModalProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setModalHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (modalHighlightedIndex >= 0 && filteredModalProducts[modalHighlightedIndex]) {
        selectModalProduct(filteredModalProducts[modalHighlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsModalSearchOpen(false);
    }
  };

  const selectModalProduct = (product) => {
    setEditFormData({
      ...editFormData,
      product: product._id,
      productName: product.name,
      unitPrice: product.retailPrice || 0,
    });
    setModalSearchTerm(product.name);
    setIsModalSearchOpen(false);
    setModalHighlightedIndex(-1);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (modalSearchRef.current && !modalSearchRef.current.contains(event.target)) {
        setIsModalSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Cart / Table Logic ---
  const handleAddDraftToTable = (e) => {
    if (e) e.preventDefault(); // Sirf tab event prevent kare agar enter press hua ho
    if (!draftItem.product) return showMessage('Please select a valid product.', 'error');
    if (draftItem.quantity <= 0) return showMessage('Quantity must be greater than 0.', 'error');
    if (draftItem.unitPrice < 0) return showMessage('Unit price cannot be negative.', 'error');

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.product === draftItem.product);

      if (existingIndex !== -1) {
        const updated = [...prevItems];
        const existing = updated[existingIndex];
        const newQuantity = existing.quantity + draftItem.quantity;

        updated[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          unitPrice: draftItem.unitPrice,
          expiryDate: draftItem.expiryDate || existing.expiryDate,
          totalPrice: newQuantity * draftItem.unitPrice
        };

        return updated;
      }

      return [...prevItems, { ...draftItem, totalPrice: draftItem.quantity * draftItem.unitPrice }];
    });

    setDraftItem({ product: '', productName: '', quantity: 1, unitPrice: 0, expiryDate: '' });
    setSearchTerm('');
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- Edit Modal Logic ---
  const openEditModal = (index) => {
    const item = items[index];
    setEditingIndex(index);
    setEditFormData({
      product: item.product,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      expiryDate: item.expiryDate || ''
    });
    setModalSearchTerm(item.productName);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingIndex(null);
  };

  const saveEditedItem = () => {
    if (!editFormData.product) return showMessage('Please select a valid product.', 'error');
    if (editFormData.quantity <= 0) return showMessage('Quantity must be greater than 0.', 'error');
    if (editFormData.unitPrice < 0) return showMessage('Unit price cannot be negative.', 'error');

    const updatedItems = [...items];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      product: editFormData.product,
      productName: editFormData.productName,
      quantity: editFormData.quantity,
      unitPrice: editFormData.unitPrice,
      expiryDate: editFormData.expiryDate,
      totalPrice: editFormData.quantity * editFormData.unitPrice
    };

    setItems(updatedItems);
    closeEditModal();
  };

  // --- Calculations ---
  const netPayable = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const balance = netPayable - (Number(paidAmount) || 0);

  // --- Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseInfo.supplierId) return showMessage('Supplier details are required.', 'error');
    if (items.length === 0) return showMessage('Please add at least one item.', 'error');

    // Use the generated invoice number if not manually entered
    const invoiceNumber = purchaseInfo.invoiceNumber || nextInvoiceNumber;

    // Validate PU- format
    if (!invoiceNumber.match(/^PU-\d+$/)) {
      showMessage('Invoice number must be in format PU-1, PU-2, etc.', 'error');
      return;
    }

    const payload = {
      supplierId: purchaseInfo.supplierId,
      invoiceNumber: invoiceNumber,
      purchaseDate: purchaseInfo.purchaseDate,
      totalAmount: netPayable,
      paidAmount: Number(paidAmount),
      balanceAmount: balance,
      items: items.map(item => ({
        product: item.product, 
        quantity: item.quantity, 
        unitPrice: item.unitPrice, 
        totalPrice: item.totalPrice, 
        expiryDate: item.expiryDate || null
      }))
    };

    try {
      const response = await fetch('http://localhost:5000/api/purchases', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        showMessage(`Purchase order ${invoiceNumber} created successfully!`, 'success');
        
        // Generate next invoice number for the next purchase
        const match = invoiceNumber.match(/PU-(\d+)/);
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          const newInvoiceNumber = `PU-${nextNumber}`;
          setNextInvoiceNumber(newInvoiceNumber);
          setPurchaseInfo(prev => ({ ...prev, invoiceNumber: newInvoiceNumber }));
        }
        
        setPurchaseInfo(prev => ({ 
          ...prev,
          supplierId: '', 
          supplierPhone: '', 
          supplierCity: '',
          purchaseDate: new Date().toISOString().split('T')[0]
        }));
        setItems([]); 
        setPaidAmount(0);
      } else {
        showMessage(result.message || 'Failed to process purchase order.', 'error');
      }
    } catch (error) {
      showMessage('Network error occurred while saving the order.', 'error');
    }
  };

  return (
    <div className="add-purchase-wrapper">
      <MessagePopup message={message.text} type={message.type} onClose={() => setMessage({ text: '', type: '' })} />

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="custom-modal-overlay" onClick={closeEditModal}>
          <div className="custom-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Line Item</h3>
              <button className="close-modal-btn" onClick={closeEditModal}>×</button>
            </div>
            <div className="modal-body">

              <div className="form-group search-group mb-3" ref={modalSearchRef}>
                <label>Search Product *</label>
                <input
                  type="text" placeholder="Search product..."
                  value={modalSearchTerm}
                  onChange={(e) => { setModalSearchTerm(e.target.value); setIsModalSearchOpen(true); }}
                  onKeyDown={handleModalSearchKeyDown}
                  onClick={() => setIsModalSearchOpen(true)}
                />
                {isModalSearchOpen && filteredModalProducts.length > 0 && (
                  <ul className="search-dropdown">
                    {filteredModalProducts.map((product, index) => (
                      <li
                        key={product._id}
                        className={index === modalHighlightedIndex ? 'active' : ''}
                        onClick={() => selectModalProduct(product)}
                        onMouseEnter={() => setModalHighlightedIndex(index)}
                      >
                        {product.name} - {product.retailPrice}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group mb-3">
                <label>Unit Price *</label>
                <input
                  type="number"
                  step="10"
                  value={editFormData.unitPrice === 0 || editFormData.unitPrice === '' ? '' : editFormData.unitPrice}
                  onChange={e => {
                    const val = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                    setEditFormData({ ...editFormData, unitPrice: val === '' ? 0 : Number(val) });
                  }}
                />
              </div>
              <div className="form-group mb-3">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={editFormData.quantity === 0 || editFormData.quantity === '' ? '' : editFormData.quantity}
                  onChange={e => {
                    const val = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                    setEditFormData({ ...editFormData, quantity: val === '' ? 0 : Number(val) });
                  }}
                />
              </div>
              <div className="form-group mb-3">
                <label>Expiry Date</label>
                <input type="date" value={editFormData.expiryDate} onChange={e => setEditFormData({ ...editFormData, expiryDate: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeEditModal}>Cancel</button>
              <button type="button" className="btn-save" onClick={saveEditedItem}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', alignItems: 'center' }} className="po-header">
        <h2>Create Purchase Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="po-layout">

        <div className="top-split">

          <section className="card product-entry-section">
            <h3 style={{ textAlign: 'center' }}>Add Products</h3>
            <div className="form-group search-group mb-3" ref={searchRef}>
              <label>Search Product *</label>
              <input
                type="text" placeholder="Type to search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); }}
                onKeyDown={handleSearchKeyDown}
                onClick={() => setIsSearchOpen(true)}
              />
              {isSearchOpen && filteredProducts.length > 0 && (
                <ul className="search-dropdown">
                  {filteredProducts.map((product, index) => (
                    <li
                      key={product._id}
                      className={index === highlightedIndex ? 'active' : ''}
                      onClick={() => selectProduct(product)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      {product.name} - {product.retailPrice}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group-inline mb-3">
              <div className="form-group w-50">
                <label>Unit Price *</label>
                <input
                  type="number"
                  step="10"
                  value={draftItem.unitPrice === 0 || draftItem.unitPrice === '' ? '' : draftItem.unitPrice}
                  className="editable-input"
                  placeholder="Enter price"
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                    setDraftItem({ ...draftItem, unitPrice: val === '' ? 0 : Number(val) });
                  }}
                />
              </div>
              <div className="form-group w-50">
                <label>Quantity *</label>
                <input
                  ref={qtyInputRef} // <-- Reference for autofocus
                  type="number"
                  min="1"
                  value={draftItem.quantity === 0 || draftItem.quantity === '' ? '' : draftItem.quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                    setDraftItem({ ...draftItem, quantity: val === '' ? 0 : Number(val) });
                  }}
                  onKeyDown={(e) => { // <-- Add to Cart on Enter
                    if (e.key === 'Enter') {
                      e.preventDefault(); // Stop form submission
                      handleAddDraftToTable(e);
                    }
                  }}
                />
              </div>
            </div>
            <div className="form-group mb-3">
              <label>Expiry Date</label>
              <input type="date" value={draftItem.expiryDate} onChange={(e) => setDraftItem({ ...draftItem, expiryDate: e.target.value })} />
            </div>

            <div className="text-center mt-3">
              <button type="button" className="btn-add-cart px-5" onClick={handleAddDraftToTable}>
                + Add to Cart
              </button>
            </div>
          </section>

          <section className="card supplier-section">
            <h3 style={{ textAlign: 'center' }}>Supplier Details</h3>
            <div className="form-group mb-3">
              <label>Select Supplier *</label>
              <select name="supplierId" value={purchaseInfo.supplierId} onChange={handleSupplierChange} required>
                <option value="">-- Choose Supplier --</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.contactPerson} {s.companyName ? `(${s.companyName})` : ''}</option>)}
              </select>
            </div>

            <div className="form-group-inline mb-3">
              <div className="form-group w-50">
                <label>Phone</label>
                <input type="text" value={purchaseInfo.supplierPhone} readOnly disabled className="readonly-input" placeholder="Auto-fills on select" />
              </div>
              <div className="form-group w-50">
                <label>City</label>
                <input type="text" value={purchaseInfo.supplierCity} readOnly disabled className="readonly-input" placeholder="Auto-fills on select" />
              </div>
            </div>

          
              <div style={{width:'100%',marginTop:'20px'}} className="form-group w-50">
                <label>Purchase Date *</label>
                <input type="date" name="purchaseDate" value={purchaseInfo.purchaseDate} onChange={handleInfoChange} required />
              </div>
          </section>

        </div>

        {/* --- MIDDLE: DATA TABLE --- */}
        <section className="card table-section">
          <table className="po-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>Sr#</th>
                <th style={{ width: '10%' }}>Product Name</th>
                <th style={{ width: '6%' }}>Qty</th>
                <th style={{ width: '5%' }}>Cost</th>
                <th style={{ width: '8%' }}>Subtotal</th>
                <th style={{ width: '5%' }} className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No products added yet. Use the form above to add items.</td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitPrice.toFixed(2)}</td>
                    <td>{item.totalPrice.toFixed(2)}</td>
                    <td className="text-center table-actions">
                      <button type="button" className="btn-edit" onClick={() => openEditModal(index)}>✎</button>
                      <button type="button" className="btn-remove" onClick={() => removeItemRow(index)}>✕</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* --- BOTTOM: BILLING --- */}
        <div className="bottom-layout">
          <section className="card billing-section">
            <h3 className="mb-4">Billing Summary</h3>
            <div className='billcard'>
              <div className="billing-horizontal-row">
                <div className="summary-col">
                  <label>Net Payable</label>
                  <input type="text" value={netPayable.toFixed(2)} readOnly className="readonly-input bold text-center" />
                </div>

                <div className="summary-col">
                  <label>Paid Amount</label>
                  <input
                    type="number"
                    step="10"
                    value={paidAmount === 0 || paidAmount === '' ? '' : paidAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                      setPaidAmount(val === '' ? 0 : Number(val));
                    }}
                    className="editable-input text-center"
                  />
                </div>

                <div className="summary-col">
                  <label>Balance</label>
                  <input type="text" value={balance.toFixed(2)} readOnly className={`readonly-input text-center bold ${balance > 0 ? 'text-danger' : 'text-success'}`} />
                </div>
              </div>
            </div>
            <div className="text-center mt-4">
              <button type="submit" className="btn-submit-order ">Save Purchase Order</button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
};

export default AddPurchase;