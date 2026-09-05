import { useState, useEffect } from 'react';

function Product() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  
  // 💡 NEW: Suppliers ki list save karne ke liye state
  const [suppliers, setSuppliers] = useState([]); 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUom, setFilterUom] = useState('');

  // Inline message states for each modal
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });

  // Loading states to prevent double submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💡 NEW: initialState mein 'approvedSuppliers' ka array add kar diya
  const initialState = {
    name: '',
    categoryId: '',
    uomId: '',
    costPrice: '',
    retailPrice: '',
    quantity: '',
    expiryDate: '',
    reorderQuantity: '',
    status: 'active',
    approvedSuppliers: [] 
  };

  const [newProduct, setNewProduct] = useState(initialState);
  const [editProduct, setEditProduct] = useState({ id: '', ...initialState });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterUom, products]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUOMs();
    fetchSuppliers(); 
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
          setNewProduct(initialState);
          setAddMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }
        if (isEditModalOpen) {
          e.preventDefault();
          setIsEditModalOpen(false);
          setEditProduct({ id: '', ...initialState });
          setEditMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }
        if (isViewModalOpen) {
          e.preventDefault();
          setIsViewModalOpen(false);
          setViewProduct(null);
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
          setDeleteMessage({ text: '', type: '' });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isEditModalOpen, isViewModalOpen, isDeleteModalOpen, newProduct, editProduct, deleteTargetId, isSubmitting]);

const showAddMessage = (text, type) => {
    setAddMessage({ text, type });
    // 💡 FIX: Error aate hi modal ki body ko upar scroll kar do
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      setAddMessage({ text: '', type: '' });
    }, 3000);
  };

  const showEditMessage = (text, type) => {
    setEditMessage({ text, type });
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      setEditMessage({ text: '', type: '' });
    }, 3000);
  };

 
  const showDeleteMessage = (text, type) => {
    setDeleteMessage({ text, type });
    setTimeout(() => setDeleteMessage({ text: '', type: '' }), 3000);
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const sortedData = Array.isArray(data) ? [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];
        setProducts(sortedData);
      } else { setProducts([]); }
    } catch (error) { setProducts([]); }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/categories', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } else { setCategories([]); }
    } catch (error) { setCategories([]); }
  };

  const fetchUOMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/uoms', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUoms(Array.isArray(data) ? data : []);
      } else { setUoms([]); }
    } catch (error) { setUoms([]); }
  };

const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched Suppliers in Product Page:", data);
        setSuppliers(Array.isArray(data) ? data : (data.data || []));
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      action();
    }
  };

 const validateProduct = (product) => {
    if (!product.name.trim()) return 'Product name is required!';
    if (!product.categoryId) return 'Please select a category!';
    if (!product.uomId) return 'Please select a UOM!';
    
    if (product.approvedSuppliers && product.approvedSuppliers.length > 0) {
        const supplierIds = new Set();
        
        for (let row of product.approvedSuppliers) {
            if (!row.supplier) return 'Please select a supplier in the linked suppliers section.';
            if (row.purchasePrice === '' || row.purchasePrice === null || parseFloat(row.purchasePrice) < 0) {
                return 'Please enter a valid purchase price for all linked suppliers.';
            }
            
            if (supplierIds.has(row.supplier)) {
                return 'You cannot add the same supplier twice for this product. You can update its price instead!';
            }
            supplierIds.add(row.supplier);
        }
    }

    return null;
  };
  const handleAddSupplierRow = (isEdit) => {
      const newRow = { supplier: '', purchasePrice: '', supplierSKU: '' };
      if (isEdit) {
          setEditProduct({ ...editProduct, approvedSuppliers: [...(editProduct.approvedSuppliers || []), newRow] });
      } else {
          setNewProduct({ ...newProduct, approvedSuppliers: [...(newProduct.approvedSuppliers || []), newRow] });
      }
  };

  const handleUpdateSupplierRow = (isEdit, index, field, value) => {
      const target = isEdit ? editProduct : newProduct;
      const updatedSuppliers = [...(target.approvedSuppliers || [])];
      updatedSuppliers[index][field] = value;
      if (isEdit) {
          setEditProduct({ ...target, approvedSuppliers: updatedSuppliers });
      } else {
          setNewProduct({ ...target, approvedSuppliers: updatedSuppliers });
      }
  };

  const handleRemoveSupplierRow = (isEdit, index) => {
      const target = isEdit ? editProduct : newProduct;
      const updatedSuppliers = (target.approvedSuppliers || []).filter((_, i) => i !== index);
      if (isEdit) {
          setEditProduct({ ...target, approvedSuppliers: updatedSuppliers });
      } else {
          setNewProduct({ ...target, approvedSuppliers: updatedSuppliers });
      }
  };

 const handleAddProduct = async () => {
    if (isSubmitting) return;
        const productToSave = {
      ...newProduct,
      costPrice: newProduct.costPrice ? parseFloat(newProduct.costPrice) : 0,
      retailPrice: newProduct.retailPrice ? parseFloat(newProduct.retailPrice) : 0,
      quantity: newProduct.quantity ? parseInt(newProduct.quantity) : 0,
      reorderQuantity: newProduct.reorderQuantity ? parseInt(newProduct.reorderQuantity) : 0,
      status: 'active'
    };

    const validationError = validateProduct(productToSave);
    if (validationError) {
      showAddMessage(validationError, 'error');
      return; 
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productToSave)
      });

      if (res.ok) {
        showAddMessage('Product added successfully!', 'success');
        await fetchProducts();
        setTimeout(() => {
          setNewProduct(initialState);
          setIsAddModalOpen(false);
          setAddMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }, 300);
      } else {
        const errorData = await res.json();
        showAddMessage(errorData.message || 'Error saving product.', 'error');
        setIsSubmitting(false);
      }
    } catch (error) {
      showAddMessage('Server error while saving product.', 'error');
      setIsSubmitting(false);
    }
  };

 const startEdit = (product) => {
    setEditMessage({ text: '', type: '' });
    setIsSubmitting(false);
    setEditProduct({
      id: product._id,
      name: product.name,
      categoryId: product.categoryId?._id || product.categoryId,
      uomId: product.uomId?._id || product.uomId,
      costPrice: product.costPrice,
      retailPrice: product.retailPrice,
      quantity: product.quantity,
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
      reorderQuantity: product.reorderQuantity,
      status: product.status || 'active',
      approvedSuppliers: product.approvedSuppliers?.map(s => ({
          supplier: s.supplier?._id || s.supplier || '',
          purchasePrice: s.purchasePrice || '',
          supplierSKU: s.supplierSKU || ''
      })) || []
    });
    setIsEditModalOpen(true);
  };

const handleUpdateProduct = async () => {
    if (isSubmitting) return;

    const productToSave = {
      ...editProduct,
      costPrice: editProduct.costPrice ? parseFloat(editProduct.costPrice) : 0,
      retailPrice: editProduct.retailPrice ? parseFloat(editProduct.retailPrice) : 0,
      quantity: editProduct.quantity ? parseInt(editProduct.quantity) : 0,
      reorderQuantity: editProduct.reorderQuantity ? parseInt(editProduct.reorderQuantity) : 0
    };

    const validationError = validateProduct(productToSave);
    if (validationError) {
      showEditMessage(validationError, 'error');
      return; 
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/products/${editProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productToSave)
      });

      if (res.ok) {
        showEditMessage('Product updated successfully!', 'success');
        await fetchProducts();
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditProduct({ id: '', ...initialState });
          setEditMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }, 300);
      } else {
        const errorData = await res.json();
        showEditMessage(errorData.message || 'Error updating product.', 'error');
        setIsSubmitting(false);
      }
    } catch (error) {
      showEditMessage('Server error while updating product.', 'error');
      setIsSubmitting(false);
    }
  };
  const confirmDelete = (id) => {
    setDeleteMessage({ text: '', type: '' });
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/products/${deleteTargetId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showDeleteMessage('Product deleted successfully!', 'success');
        await fetchProducts();
        setTimeout(() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
          setDeleteMessage({ text: '', type: '' });
        }, 300);
      } else {
        const errorData = await res.json();
        showDeleteMessage(errorData.message || 'Error deleting product.', 'error');
      }
    } catch (error) {
      showDeleteMessage('Server error while deleting product.', 'error');
    }
  };

  const openView = async (product) => {
    setViewProduct(product); 
    setIsViewModalOpen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/reports/expiring-stock?days=3650`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const productBatches = data.data.filter(b => b.productName === product.name);
        setViewProduct({ ...product, batches: productBatches });
      }
    } catch (error) { console.error("Error fetching product batches", error); }
  };

  const clearFilters = () => { setFilterCategory(''); setFilterUom(''); };
  const hasActiveFilters = filterCategory || filterUom;
  const filteredProducts = products.filter(p => {
    if (filterCategory && (p.categoryId?._id || p.categoryId) !== filterCategory) return false;
    if (filterUom && (p.uomId?._id || p.uomId) !== filterUom) return false;
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const InlineMessage = ({ message, type }) => {
    if (!message) return null;
    const isError = type === 'error';
    const isSuccess = type === 'success';
    const bg = isError ? 'var(--danger-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)';
    const text = isError ? 'var(--danger)' : isSuccess ? 'var(--success)' : 'var(--info)';
    const icon = isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️';

    return (
      <div style={{ padding: '10px 14px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-md)', backgroundColor: bg, color: text, border: `1px solid ${text}`, fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span> {message}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* FILTER BAR & ADD BUTTON */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
              <label className="form-label">Category</label>
              <select className="form-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
              <label className="form-label">UOM</label>
              <select className="form-input" value={filterUom} onChange={(e) => setFilterUom(e.target.value)}>
                <option value="">All UOMs</option>
                {uoms.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            {hasActiveFilters && ( <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button> )}
          </div>
          <button className="btn btn-primary" onClick={() => { setAddMessage({ text: '', type: '' }); setIsSubmitting(false); setIsAddModalOpen(true); }}>+ Add Product</button>
        </div>
      </div>

      {/* RESULTS TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>SR#</th>
                <th style={tableStyles.th}>Name</th>
                <th style={tableStyles.th}>Category</th>
                <th style={tableStyles.th}>UOM</th>
                <th style={tableStyles.th}>Cost Price</th>
                <th style={tableStyles.th}>Retail Price</th>
                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((p, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={tableStyles.td}>{serialNumber}</td>
                      <td style={tableStyles.td}>{p.name}</td>
                      <td style={tableStyles.td}>{p.categoryId?.name || 'N/A'}</td>
                      <td style={tableStyles.td}>{p.uomId?.name || 'N/A'}</td>
                      <td style={tableStyles.td}>{parseFloat(p.costPrice).toFixed(2)}</td>
                      <td style={tableStyles.td}>{parseFloat(p.retailPrice).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <div style={styles.actionGroup}>
                          <button style={styles.iconBtnView} onClick={() => openView(p)} title="View"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                          <button style={styles.iconBtnEdit} onClick={() => startEdit(p)} title="Edit"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                          <button style={styles.iconBtnDelete} onClick={() => confirmDelete(p._id)} title="Delete"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px',fontSize:'13px', color: 'var(--text-muted)' }}>{hasActiveFilters ? 'No products match the selected filters.' : 'No products found. Click "Add Product" to create one.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '15px 0' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>←</button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>→</button>
          </div>
        )}
      </div>

   {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container modal-container-wide">
            <div className="modal-header">
              <h3 className="modal-title">Add New Product</h3>
              <button className="modal-close" onClick={() => { setIsAddModalOpen(false); setNewProduct(initialState); setIsSubmitting(false); }}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
              <InlineMessage message={addMessage.text} type={addMessage.type} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Category <span className="star-red">*</span></label><select className="form-input" value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}><option value="">Select Category</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">UOM <span className="star-red">*</span></label><select className="form-input" value={newProduct.uomId} onChange={(e) => setNewProduct({ ...newProduct, uomId: e.target.value })}><option value="">Select UOM</option>{uoms.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}><label className="form-label">Product Name <span className="star-red">*</span></label><input className="form-input" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} autoFocus placeholder="Enter product name" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Base Cost Price</label><input type="number" className="form-input" min="0" value={newProduct.costPrice} onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Retail Price</label><input type="number" className="form-input" min="0" value={newProduct.retailPrice} onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Quantity</label><input type="number" className="form-input" min="0" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Reorder Quantity</label><input type="number" className="form-input" min="0" value={newProduct.reorderQuantity} onChange={(e) => setNewProduct({ ...newProduct, reorderQuantity: e.target.value })} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}><label className="form-label">Expiry Date</label><input type="date" className="form-input" value={newProduct.expiryDate} onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })} /></div>
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px', gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>Linked Suppliers (Optional)</label>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px', height: '30px' }} onClick={() => handleAddSupplierRow(false)}>+ Add Supplier</button>
                  </div>
                  
                  {newProduct.approvedSuppliers.length === 0 ? (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>No suppliers linked yet. Link a supplier to auto-fetch rates during purchase.</div>
                  ) : (
                      newProduct.approvedSuppliers.map((row, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 2 }}>
                                  <select className="form-input" value={row.supplier} onChange={(e) => handleUpdateSupplierRow(false, idx, 'supplier', e.target.value)}>
                                     <option value="">Select Supplier <span className="star-red">*</span></option>
                                      {suppliers && suppliers.length > 0 ? (
                                          suppliers.map(s => (
                                              <option key={s._id || s.id} value={s._id || s.id}>
                                                  {s.name || s.contactPerson || 'Unnamed Supplier'}
                                              </option>
                                          ))
                                      ) : (
                                          <option value="" disabled>No suppliers found in database</option>
                                      )}
                                  </select>
                              </div>
                              <div style={{ flex: 1 }}>
                                  <input type="number" className="form-input" placeholder="Price *" value={row.purchasePrice} onChange={(e) => handleUpdateSupplierRow(false, idx, 'purchasePrice', e.target.value)} />
                              </div>
                              <div style={{ flex: 1 }}>
                                  <input type="text" className="form-input" placeholder="Supplier SKU" value={row.supplierSKU} onChange={(e) => handleUpdateSupplierRow(false, idx, 'supplierSKU', e.target.value)} />
                              </div>
                              <button type="button" className="btn btn-danger" style={{ padding: '0 12px', height: '40px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleRemoveSupplierRow(false, idx)}>✕</button>
                          </div>
                      ))
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setNewProduct(initialState); setIsSubmitting(false); }} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddProduct} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Product'}</button>
            </div>
          </div>
        </div>
      )}

    {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container modal-container-wide">
            <div className="modal-header">
              <h3 className="modal-title">Edit Product</h3>
              <button className="modal-close" onClick={() => { setIsEditModalOpen(false); setEditProduct({ id: '', ...initialState }); setIsSubmitting(false); }}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
              <InlineMessage message={editMessage.text} type={editMessage.type} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Category <span className="star-red">*</span></label><select className="form-input" value={editProduct.categoryId} onChange={(e) => setEditProduct({ ...editProduct, categoryId: e.target.value })}><option value="">Select Category</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">UOM <span className="star-red">*</span></label><select className="form-input" value={editProduct.uomId} onChange={(e) => setEditProduct({ ...editProduct, uomId: e.target.value })}><option value="">Select UOM</option>{uoms.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}><label className="form-label">Product Name <span className="star-red">*</span></label><input className="form-input" value={editProduct.name} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} autoFocus /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Cost Price</label><input type="number" className="form-input" min="0" value={editProduct.costPrice} onChange={(e) => setEditProduct({ ...editProduct, costPrice: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Retail Price</label><input type="number" className="form-input" min="0" value={editProduct.retailPrice} onChange={(e) => setEditProduct({ ...editProduct, retailPrice: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Quantity</label><input type="number" className="form-input" min="0" value={editProduct.quantity} onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Reorder Quantity</label><input type="number" className="form-input" min="0" value={editProduct.reorderQuantity} onChange={(e) => setEditProduct({ ...editProduct, reorderQuantity: e.target.value })} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}><label className="form-label">Expiry Date</label><input type="date" className="form-input" value={editProduct.expiryDate} onChange={(e) => setEditProduct({ ...editProduct, expiryDate: e.target.value })} /></div>
                
                {/* Linked Suppliers Section (Edit Mode) */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px', gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>Linked Suppliers</label>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px', height: '30px' }} onClick={() => handleAddSupplierRow(true)}>+ Add Supplier</button>
                  </div>
                  
                  {(!editProduct.approvedSuppliers || editProduct.approvedSuppliers.length === 0) ? (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>No suppliers linked yet.</div>
                  ) : (
                      editProduct.approvedSuppliers.map((row, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 2 }}>
                                  <select className="form-input" value={row.supplier} onChange={(e) => handleUpdateSupplierRow(true, idx, 'supplier', e.target.value)}>
                                      <option value="">Select Supplier <span className="star-red">*</span></option>
                                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName || s.name || s.contactPerson}</option>)}
                                  </select>
                              </div>
                              <div style={{ flex: 1 }}>
                                  <input type="number" className="form-input" placeholder="Price *" value={row.purchasePrice} onChange={(e) => handleUpdateSupplierRow(true, idx, 'purchasePrice', e.target.value)} />
                              </div>
                              <div style={{ flex: 1 }}>
                                  <input type="text" className="form-input" placeholder="Supplier SKU" value={row.supplierSKU} onChange={(e) => handleUpdateSupplierRow(true, idx, 'supplierSKU', e.target.value)} />
                              </div>
                              <button type="button" className="btn btn-danger" style={{ padding: '0 12px', height: '40px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleRemoveSupplierRow(true, idx)}>✕</button>
                          </div>
                      ))
                  )}
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditProduct({ id: '', ...initialState }); setIsSubmitting(false); }} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateProduct} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
   {/* VIEW MODAL */}
      {isViewModalOpen && viewProduct && (
        <div className="modal-overlay" onClick={() => { setIsViewModalOpen(false); setViewProduct(null); }}>
          <div className="modal-container" style={{ width: '600px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', padding: '16px 20px' }}>
              <div>
                <h3 className="modal-title" style={{ color: 'var(--text-main)', margin: 0, fontSize: '18px' }}>{viewProduct.name}</h3>
              </div>
              <button className="modal-close" onClick={() => { setIsViewModalOpen(false); setViewProduct(null); }}>&times;</button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              
              {/* Product Basic Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Category</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 600 }}>{viewProduct.categoryId?.name || 'N/A'}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>UOM</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 600 }}>{viewProduct.uomId?.name || 'N/A'}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Total Quantity</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--primary)', fontWeight: 700 }}>{viewProduct.quantity || 0}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Cost Price</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 600 }}>PKR {parseFloat(viewProduct.costPrice || 0).toFixed(2)}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Retail Price</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--success)', fontWeight: 600 }}>PKR {parseFloat(viewProduct.retailPrice || 0).toFixed(2)}</p>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Reorder Level</label>
                  <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--warning)', fontWeight: 600 }}>{viewProduct.reorderQuantity || 0}</p>
                </div>
              </div>

              {/* Approved Suppliers Section */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, margin: '0 0 8px 0', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px' }}>
                  Approved Suppliers & Rates
                </h4>
                {viewProduct.approvedSuppliers && viewProduct.approvedSuppliers.length > 0 ? (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: 'var(--header)',color:'#fff' }}>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Supplier Name</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Purchase Price</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Supplier SKU</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewProduct.approvedSuppliers.map((supRow, index) => (
                          <tr key={index} style={{ borderTop: index !== 0 ? '1px solid #e2e8f0' : 'none' }}>
                            <td style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-main)' }}>
                              {supRow.supplier?.companyName || supRow.supplier?.name || supRow.supplier?.contactPerson || 'Supplier'}
                            </td>
                            <td style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 'bold', color: 'var(--success)' }}>
                              PKR {parseFloat(supRow.purchasePrice || 0).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)' }}>
                              {supRow.supplierSKU || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>No approved suppliers linked to this product.</p>
                  </div>
                )}
              </div>

              {/* Batches Table Section */}
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-main)', fontWeight: 700, margin: '0 0 8px 0', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px' }}>
                  Active Batches / Lots
                </h4>
                {viewProduct.batches && viewProduct.batches.length > 0 ? (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#f1f5f9' }}>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Batch No.</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewProduct.batches.map((b, index) => (
                          <tr key={b._id} style={{ borderTop: index !== 0 ? '1px solid #e2e8f0' : 'none' }}>
                            <td style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-main)', fontWeight: 500 }}>{b.batchNumber}</td>
                            <td style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 'bold', color: 'var(--primary)' }}>{b.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: b.status === 'Expired' ? 'var(--danger)' : 'var(--warning)' }}>
                              {new Date(b.expiryDate).toLocaleDateString('en-GB')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      {viewProduct.batches ? 'No active stock batches found.' : 'Loading stock details...'}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ backgroundColor: 'var(--bg-app)', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => { setIsViewModalOpen(false); setViewProduct(null); }}>Close</button>
            </div>

          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div className="modal-body">
              <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)' }}>!</div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete Product</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Are you sure you want to delete <strong>{products.find(p => p._id === deleteTargetId)?.name || 'this product'}</strong>? This action cannot be undone.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tableStyles = {
  th: { padding: '12px 16px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: 600, fontSize: '13px', textAlign: 'left' },
  td: { padding: '8px 16px', color: 'var(--text-main)', fontSize: '13px', textAlign: 'left' }
};

const styles = {
  actionGroup: { display: 'flex', justifyContent: 'center', gap: '12px' },
  iconBtnView: { backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  iconBtnEdit: { background: 'var(--edit)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  iconBtnDelete: { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }
};

export default Product;