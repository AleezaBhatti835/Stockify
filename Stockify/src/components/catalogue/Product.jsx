// Product.js
import { useState, useEffect } from 'react';
import './catalogue.css';
import '../roles.css';
import '../customer.css';

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

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      if (res.ok) {
        const data = await res.json();
        // Sort ascending by createdAt (oldest first)
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

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories');
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

  const fetchUOMs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/uoms');
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

  // Handle Enter key on input fields
  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      action();
    }
  };

  const validateProduct = (product) => {
    if (!product.name.trim()) {
      return 'Product name is required!';
    }
    if (!product.categoryId) {
      return 'Please select a category!';
    }
    if (!product.uomId) {
      return 'Please select a UOM!';
    }

    const costPrice = product.costPrice === '' || product.costPrice === null || product.costPrice === undefined ? 0 : parseFloat(product.costPrice);
    const retailPrice = product.retailPrice === '' || product.retailPrice === null || product.retailPrice === undefined ? 0 : parseFloat(product.retailPrice);
    const quantity = product.quantity === '' || product.quantity === null || product.quantity === undefined ? 0 : parseInt(product.quantity);
    const reorderQuantity = product.reorderQuantity === '' || product.reorderQuantity === null || product.reorderQuantity === undefined ? 0 : parseInt(product.reorderQuantity);

    if (isNaN(costPrice) || costPrice < 0) {
      return 'Cost price must be a valid number!';
    }
    if (isNaN(retailPrice) || retailPrice < 0) {
      return 'Retail price must be a valid number!';
    }
    if (isNaN(quantity) || quantity < 0) {
      return 'Quantity must be a valid number!';
    }
    if (isNaN(reorderQuantity) || reorderQuantity < 0) {
      return 'Reorder quantity must be a valid number!';
    }

    return null;
  };

  const handleAddProduct = async () => {
    // Prevent double submission
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
      const res = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleUpdateProduct = async () => {
    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);

    const productToSave = {
      ...editProduct,
      costPrice: editProduct.costPrice === '' || editProduct.costPrice === null || editProduct.costPrice === undefined ? 0 : parseFloat(editProduct.costPrice),
      retailPrice: editProduct.retailPrice === '' || editProduct.retailPrice === null || editProduct.retailPrice === undefined ? 0 : parseFloat(editProduct.retailPrice),
      quantity: editProduct.quantity === '' || editProduct.quantity === null || editProduct.quantity === undefined ? 0 : parseInt(editProduct.quantity),
      reorderQuantity: editProduct.reorderQuantity === '' || editProduct.reorderQuantity === null || editProduct.reorderQuantity === undefined ? 0 : parseInt(editProduct.reorderQuantity)
    };

    // Check if nothing changed
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
      const res = await fetch(`http://localhost:5000/api/products/${editProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetch(`http://localhost:5000/api/products/${deleteTargetId}`, {
        method: 'DELETE'
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

  // Apply Category / UOM filters on top of the fetched products
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Inline Message Component
  const InlineMessage = ({ message, type }) => {
    if (!message) return null;

    const colors = {
      success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb', icon: '✅' },
      error: { bg: '#fdecea', text: '#dc3545', border: '#f5c6cb', icon: '⚠️' },
      info: { bg: '#e7f3ff', text: '#0056b3', border: '#b8d4f0', icon: 'ℹ️' }
    };

    const style = colors[type] || colors.info;

    return (
      <div style={{
        padding: '10px 14px',
        marginBottom: '15px',
        borderRadius: '6px',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontSize: '14px',
        fontWeight: 500
      }}>
        {style.icon} {message}
      </div>
    );
  };

  return (
    <div className="roles-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  width: '100%' }}>
         {/* FILTER BAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end',

        borderRadius: '6px'
      }}>
        <div style={{ minWidth: '180px' }}>
          <label style={{ textAlign:'left',fontSize: '0.65rem', fontWeight: 600, color: '#495057', display: 'block'}}>Category</label>
          <select
            style={{ fontSize: '0.7rem', width: '100%', padding: '7px 10px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: 'white' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '180px' }}>
          <label style={{ textAlign:'left',fontSize: '0.65rem', fontWeight: 600, color: '#495057', display: 'block'}}>UOM</label>
          <select
            style={{ fontSize: '0.7rem', width: '100%', padding: '7px 10px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: 'white' }}
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
          <button
            onClick={clearFilters}
            style={{
              padding: '6px 10px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap'
            }}
          >
            Clear Filters
          </button>
        )}

      </div>
        <button
          style={{ width: '16%', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setAddMessage({ text: '', type: '' }); setIsSubmitting(false); setIsAddModalOpen(true); }}
        >
          + Add Product
        </button>
      </div>



     
      {/* RESULTS COUNT */}
      <div style={{
        marginBottom: '10px',
        fontSize: '13px',
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between',
        marginLeft: '81%',
      }}>
        <span>Showing {currentItems.length} of {filteredProducts.length} products</span>
      </div>

      {/* TABLE */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'left' }}>SR#</th>
              <th style={{ width: '11%', textAlign: 'left' }}>Name</th>
              <th style={{ width: '14%', textAlign: 'left' }}>Category</th>
              <th style={{ width: '10%', textAlign: 'left' }}>UOM</th>
              <th style={{ width: '12%', textAlign: 'left' }}>Cost Price</th>
              <th style={{ width: '12%', textAlign: 'left' }}>Retail Price</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((p, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={p._id}>
                    <td style={{ textAlign: 'left', color: '#4b4b4c', fontWeight: 500 }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.categoryId?.name || 'N/A'}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.uomId?.name || 'N/A'}</td>
                    <td style={{ textAlign: 'left' }}>{parseFloat(p.costPrice).toFixed(2)}</td>
                    <td style={{ textAlign: 'left' }}>{parseFloat(p.retailPrice).toFixed(2)}</td>
                    <td className="actions-cell" style={{ textAlign: 'center' }}>
                      <div style={styles.actionGroup}>
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => openView(p)} title="View">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => startEdit(p)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => confirmDelete(p._id)}
                          title="Delete"
                        >
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
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  {hasActiveFilters ? 'No products match the selected filters.' : 'No products found. Click "Add Product" to create one.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {filteredProducts.length > itemsPerPage && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px 0'
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage === 1 ? '#e9ecef' : '#5aa7ef',
              color: currentPage === 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            ←
          </button>

          <span style={{ fontSize: '12px', fontWeight: '400', color: '#868484' }}>
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#5aa7ef',
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
      )}

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', position: 'relative' }}>
            <h3>Add New Product</h3>

            <InlineMessage message={addMessage.text} type={addMessage.type} />

            <div className="user-form" style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Category *</label>
                <select
                  style={{ fontSize: '0.85rem', width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                  value={newProduct.categoryId}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>UOM *</label>
                <select
                  style={{ fontSize: '0.85rem', width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                  value={newProduct.uomId}
                  onChange={(e) => setNewProduct({ ...newProduct, uomId: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                >
                  <option value="">Select UOM</option>
                  {uoms.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Product Name *</label>
                <input
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  autoFocus
                  placeholder="Enter product name"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Cost Price <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newProduct.costPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Retail Price <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newProduct.retailPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Quantity <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Reorder Quantity <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newProduct.reorderQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, reorderQuantity: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Expiry Date</label>
                <input
                  type="date"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddProduct)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleAddProduct}
                disabled={isSubmitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isSubmitting ? '#6c757d' : '#5aa7ef',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </button>
              <button
                className="btn btn-cancel"
                onClick={() => { setIsAddModalOpen(false); setNewProduct(initialState); setAddMessage({ text: '', type: '' }); setIsSubmitting(false); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', position: 'relative' }}>
            <h3>Edit Product</h3>

            <InlineMessage message={editMessage.text} type={editMessage.type} />

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Category *</label>
                <select
                  style={{ fontSize: '0.85rem', width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                  value={editProduct.categoryId}
                  onChange={(e) => setEditProduct({ ...editProduct, categoryId: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>UOM *</label>
                <select
                  style={{ fontSize: '0.85rem', width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                  value={editProduct.uomId}
                  onChange={(e) => setEditProduct({ ...editProduct, uomId: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                >
                  <option value="">Select UOM</option>
                  {uoms.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Product Name *</label>
                <input
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editProduct.name}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  autoFocus
                  placeholder="Enter product name"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Cost Price <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editProduct.costPrice}
                  onChange={(e) => setEditProduct({ ...editProduct, costPrice: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Retail Price <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editProduct.retailPrice}
                  onChange={(e) => setEditProduct({ ...editProduct, retailPrice: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Quantity <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editProduct.quantity}
                  onChange={(e) => setEditProduct({ ...editProduct, quantity: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Reorder Quantity <span style={{ color: '#6c757d', fontSize: '0.7rem' }}>(default: 0)</span></label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editProduct.reorderQuantity}
                  onChange={(e) => setEditProduct({ ...editProduct, reorderQuantity: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Expiry Date</label>
                <input
                  type="date"
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editProduct.expiryDate}
                  onChange={(e) => setEditProduct({ ...editProduct, expiryDate: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateProduct)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleUpdateProduct}
                disabled={isSubmitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isSubmitting ? '#6c757d' : '#5aa7ef',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="btn btn-cancel"
                onClick={() => { setIsEditModalOpen(false); setEditProduct({ id: '', ...initialState }); setEditMessage({ text: '', type: '' }); setIsSubmitting(false); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewModalOpen && viewProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ height: 'auto', maxWidth: '550px', padding: 0, position: 'relative' }}>

            <div style={{
              backgroundColor: '#5aa7ef', padding: '24px 24px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 700,
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                {viewProduct.name.charAt(0).toUpperCase()}
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{viewProduct.name}</h3>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Category</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewProduct.categoryId?.name || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>UOM</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewProduct.uomId?.name || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Cost Price</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{parseFloat(viewProduct.costPrice).toFixed(2)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Retail Price</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{parseFloat(viewProduct.retailPrice).toFixed(2)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Quantity</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewProduct.quantity}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Reorder Quantity</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewProduct.reorderQuantity}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Expiry Date</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewProduct.expiryDate ? new Date(viewProduct.expiryDate).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setIsViewModalOpen(false); setViewProduct(null); }} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>

            <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fdecea',
              color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 14px'
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Delete Product</h3>
            <p style={{ fontSize: '0.9rem', color: '#6c757d', margin: 0 }}>
              Are you sure you want to delete <strong>{products.find(p => p._id === deleteTargetId)?.name || 'this product'}</strong>? This action cannot be undone.
            </p>

            <div className="modal-actions" style={{ marginTop: '22px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); setDeleteMessage({ text: '', type: '' }); }} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleDelete} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  iconBtnView: {
    background: '#f0fdf4',
    color: '#59956f',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    backgroundColor: '#e9f2e9'
  },
  iconBtnEdit: {
    background: '#eff6ff',
    color: '#3b82f6',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  iconBtnDelete: {
    background: '#fef2f2',
    color: '#ef4444',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
}

export default Product;