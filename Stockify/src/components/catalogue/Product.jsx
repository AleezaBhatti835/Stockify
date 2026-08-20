// Product.js
import { useState, useEffect } from 'react';

function Product() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
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

  const initialState = {
    name: '',
    categoryId: '',
    uomId: '',
    costPrice: '',
    retailPrice: '',
    quantity: '',
    expiryDate: '',
    reorderQuantity: '',
    status: 'active'
  };

  const [newProduct, setNewProduct] = useState(initialState);
  const [editProduct, setEditProduct] = useState({ id: '', ...initialState });

  // Reset to page 1 when filters change or products change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterUom, products]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUOMs();
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

      if (e.key === 'Enter') {
        if (isAddModalOpen && !isSubmitting) {
          e.preventDefault();
          handleAddProduct();
        } else if (isEditModalOpen && !isSubmitting) {
          e.preventDefault();
          handleUpdateProduct();
        } else if (isDeleteModalOpen) {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isEditModalOpen, isViewModalOpen, isDeleteModalOpen, newProduct, editProduct, deleteTargetId, isSubmitting]);

  const showAddMessage = (text, type) => {
    setAddMessage({ text, type });
    setTimeout(() => {
      setAddMessage({ text: '', type: '' });
    }, 3000);
  };

  const showEditMessage = (text, type) => {
    setEditMessage({ text, type });
    setTimeout(() => {
      setEditMessage({ text: '', type: '' });
    }, 3000);
  };

  const showDeleteMessage = (text, type) => {
    setDeleteMessage({ text, type });
    setTimeout(() => {
      setDeleteMessage({ text: '', type: '' });
    }, 3000);
  };

  // ================= FETCH PRODUCTS (WITH TOKEN) =================
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const sortedData = Array.isArray(data) ? [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];
        setProducts(sortedData);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  // ================= FETCH CATEGORIES (WITH TOKEN) =================
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  // ================= FETCH UOMS (WITH TOKEN) =================
  const fetchUOMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/uoms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUoms(Array.isArray(data) ? data : []);
      } else {
        setUoms([]);
      }
    } catch (error) {
      console.error('Error fetching UOMs:', error);
      setUoms([]);
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

    const costPrice = product.costPrice === '' || product.costPrice === null || product.costPrice === undefined ? 0 : parseFloat(product.costPrice);
    const retailPrice = product.retailPrice === '' || product.retailPrice === null || product.retailPrice === undefined ? 0 : parseFloat(product.retailPrice);
    const quantity = product.quantity === '' || product.quantity === null || product.quantity === undefined ? 0 : parseInt(product.quantity);
    const reorderQuantity = product.reorderQuantity === '' || product.reorderQuantity === null || product.reorderQuantity === undefined ? 0 : parseInt(product.reorderQuantity);

    if (isNaN(costPrice) || costPrice < 0) return 'Cost price must be a valid number!';
    if (isNaN(retailPrice) || retailPrice < 0) return 'Retail price must be a valid number!';
    if (isNaN(quantity) || quantity < 0) return 'Quantity must be a valid number!';
    if (isNaN(reorderQuantity) || reorderQuantity < 0) return 'Reorder quantity must be a valid number!';

    return null;
  };

  // ================= HANDLE ADD PRODUCT =================
  const handleAddProduct = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const productToSave = {
      ...newProduct,
      costPrice: newProduct.costPrice === '' || newProduct.costPrice === null || newProduct.costPrice === undefined ? 0 : parseFloat(newProduct.costPrice),
      retailPrice: newProduct.retailPrice === '' || newProduct.retailPrice === null || newProduct.retailPrice === undefined ? 0 : parseFloat(newProduct.retailPrice),
      quantity: newProduct.quantity === '' || newProduct.quantity === null || newProduct.quantity === undefined ? 0 : parseInt(newProduct.quantity),
      reorderQuantity: newProduct.reorderQuantity === '' || newProduct.reorderQuantity === null || newProduct.reorderQuantity === undefined ? 0 : parseInt(newProduct.reorderQuantity),
      status: 'active'
    };

    const validationError = validateProduct(productToSave);
    if (validationError) {
      showAddMessage(validationError, 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        if (errorData.message && errorData.message.includes('duplicate key error')) {
          showAddMessage(`Product "${productToSave.name}" already exists!`, 'error');
        } else {
          showAddMessage(errorData.message || 'Error saving product.', 'error');
        }
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
      status: product.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  // ================= HANDLE UPDATE PRODUCT =================
  const handleUpdateProduct = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const productToSave = {
      ...editProduct,
      costPrice: editProduct.costPrice === '' || editProduct.costPrice === null || editProduct.costPrice === undefined ? 0 : parseFloat(editProduct.costPrice),
      retailPrice: editProduct.retailPrice === '' || editProduct.retailPrice === null || editProduct.retailPrice === undefined ? 0 : parseFloat(editProduct.retailPrice),
      quantity: editProduct.quantity === '' || editProduct.quantity === null || editProduct.quantity === undefined ? 0 : parseInt(editProduct.quantity),
      reorderQuantity: editProduct.reorderQuantity === '' || editProduct.reorderQuantity === null || editProduct.reorderQuantity === undefined ? 0 : parseInt(editProduct.reorderQuantity)
    };

    const originalProduct = products.find(p => p._id === editProduct.id);
    if (originalProduct) {
      const isSame =
        originalProduct.name === productToSave.name &&
        (originalProduct.categoryId?._id || originalProduct.categoryId) === productToSave.categoryId &&
        (originalProduct.uomId?._id || originalProduct.uomId) === productToSave.uomId &&
        parseFloat(originalProduct.costPrice || 0) === productToSave.costPrice &&
        parseFloat(originalProduct.retailPrice || 0) === productToSave.retailPrice &&
        parseInt(originalProduct.quantity || 0) === productToSave.quantity &&
        parseInt(originalProduct.reorderQuantity || 0) === productToSave.reorderQuantity &&
        (originalProduct.expiryDate ? new Date(originalProduct.expiryDate).toISOString().split('T')[0] : '') === productToSave.expiryDate;

      if (isSame) {
        showEditMessage('Nothing to update!', 'info');
        setIsSubmitting(false);
        return;
      }
    }

    const validationError = validateProduct(productToSave);
    if (validationError) {
      showEditMessage(validationError, 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/products/${editProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        if (errorData.message && errorData.message.includes('duplicate key error')) {
          showEditMessage(`Product "${productToSave.name}" already exists!`, 'error');
        } else {
          showEditMessage(errorData.message || 'Error updating product.', 'error');
        }
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

  // ================= HANDLE DELETE PRODUCT =================
  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/products/${deleteTargetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const openView = (product) => {
    setViewProduct(product);
    setIsViewModalOpen(true);
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterUom('');
  };

  const hasActiveFilters = filterCategory || filterUom;

  const filteredProducts = products.filter(p => {
    if (filterCategory) {
      const catId = p.categoryId?._id || p.categoryId;
      if (catId !== filterCategory) return false;
    }
    if (filterUom) {
      const uomId = p.uomId?._id || p.uomId;
      if (uomId !== filterUom) return false;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Inline Message Component utilizing global CSS variables
  const InlineMessage = ({ message, type }) => {
    if (!message) return null;

    const isError = type === 'error';
    const isSuccess = type === 'success';

    const bg = isError ? 'var(--danger-bg)' : isSuccess ? 'var(--success-bg)' : 'var(--info-bg)';
    const text = isError ? 'var(--danger)' : isSuccess ? 'var(--success)' : 'var(--info)';
    const icon = isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️';

    return (
      <div style={{
        padding: '10px 14px',
        marginBottom: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${text}`,
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
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
              <select
                className="form-input"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
              <label className="form-label">UOM</label>
              <select
                className="form-input"
                value={filterUom}
                onChange={(e) => setFilterUom(e.target.value)}
              >
                <option value="">All UOMs</option>
                {uoms.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => { setAddMessage({ text: '', type: '' }); setIsSubmitting(false); setIsAddModalOpen(true); }}
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* RESULTS COUNT & TABLE */}
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
                          <button style={styles.iconBtnView} onClick={() => openView(p)} title="View">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button style={styles.iconBtnEdit} onClick={() => startEdit(p)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button style={styles.iconBtnDelete} onClick={() => confirmDelete(p._id)} title="Delete">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px',fontSize:'13px', color: 'var(--text-muted)' }}>
                    {hasActiveFilters ? 'No products match the selected filters.' : 'No products found. Click "Add Product" to create one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredProducts.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '15px 0' }}>
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
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
            >
              →
            </button>
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

            <div className="modal-body">
              <InlineMessage message={addMessage.text} type={addMessage.type} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">UOM *</label>
                  <select
                    className="form-input"
                    value={newProduct.uomId}
                    onChange={(e) => setNewProduct({ ...newProduct, uomId: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  >
                    <option value="">Select UOM</option>
                    {uoms.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Product Name *</label>
                  <input
                    className="form-input"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                    autoFocus
                    placeholder="Enter product name"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cost Price <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(default: 0)</span></label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Retail Price <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(default: 0)</span></label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={newProduct.retailPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(default: 0)</span></label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reorder Quantity <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(default: 0)</span></label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={newProduct.reorderQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, reorderQuantity: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date" className="form-input"
                    value={newProduct.expiryDate}
                    onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setNewProduct(initialState); setIsSubmitting(false); }} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddProduct} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </button>
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

            <div className="modal-body">
              <InlineMessage message={editMessage.text} type={editMessage.type} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={editProduct.categoryId}
                    onChange={(e) => setEditProduct({ ...editProduct, categoryId: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">UOM *</label>
                  <select
                    className="form-input"
                    value={editProduct.uomId}
                    onChange={(e) => setEditProduct({ ...editProduct, uomId: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  >
                    <option value="">Select UOM</option>
                    {uoms.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Product Name *</label>
                  <input
                    className="form-input"
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    autoFocus
                    placeholder="Enter product name"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cost Price</label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={editProduct.costPrice}
                    onChange={(e) => setEditProduct({ ...editProduct, costPrice: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Retail Price</label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={editProduct.retailPrice}
                    onChange={(e) => setEditProduct({ ...editProduct, retailPrice: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity</label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={editProduct.quantity}
                    onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reorder Quantity</label>
                  <input
                    type="number" className="form-input" min="0" placeholder="0"
                    value={editProduct.reorderQuantity}
                    onChange={(e) => setEditProduct({ ...editProduct, reorderQuantity: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date" className="form-input"
                    value={editProduct.expiryDate}
                    onChange={(e) => setEditProduct({ ...editProduct, expiryDate: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsEditModalOpen(false); setEditProduct({ id: '', ...initialState }); setIsSubmitting(false); }} disabled={isSubmitting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateProduct} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewModalOpen && viewProduct && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ padding: 0,width:'40%' }}>
            <div style={{ backgroundColor: 'var(--primary)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 700, border: '3px solid white', boxShadow: 'var(--shadow-sm)'
              }}>
                {viewProduct.name.charAt(0).toUpperCase()}
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{viewProduct.name}</h3>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Category</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewProduct.categoryId?.name || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>UOM</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewProduct.uomId?.name || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Cost Price</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{parseFloat(viewProduct.costPrice).toFixed(2)}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Retail Price</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{parseFloat(viewProduct.retailPrice).toFixed(2)}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Quantity</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewProduct.quantity}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Reorder Quantity</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewProduct.reorderQuantity}</p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Expiry Date</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewProduct.expiryDate ? new Date(viewProduct.expiryDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            <div className="modal-footer">
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
              
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
              }}>
                !
              </div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete Product</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to delete <strong>{products.find(p => p._id === deleteTargetId)?.name || 'this product'}</strong>? This action cannot be undone.
              </p>
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

// Minimal table styling relying heavily on the global variables
const tableStyles = {
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '13px',
    textAlign: 'left'
  },
  td: {
    padding: '8px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left'
  }
};

// Styles for action icons matching the theme variables
const styles = {
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  iconBtnView: {
    backgroundColor: 'var(--view)',
    color: 'var(--success)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnEdit: {
   background: 'var(--edit)',
    color: 'var(--primary)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnDelete: {
    backgroundColor: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
};

export default Product;