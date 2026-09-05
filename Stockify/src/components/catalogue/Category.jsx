import { useState, useEffect } from 'react';

function Category() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [viewCategory, setViewCategory] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editCategory, setEditCategory] = useState({ id: '', name: '', description: '' });

  const [addMessage, setAddMessage] = useState({ text: '', type: '' });
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setCurrentPage(1);
  }, [categories]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // CORE ARCHITECTURE: Global keyboard event listener for modal accessibility and quick actions.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
          setNewCategory({ name: '', description: '' });
          setAddMessage({ text: '', type: '' });
        }
        if (isEditModalOpen) {
          e.preventDefault();
          setIsEditModalOpen(false);
          setEditCategory({ id: '', name: '', description: '' });
          setEditMessage({ text: '', type: '' });
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
          setDeleteMessage({ text: '', type: '' });
        }
      }

      if (e.key === 'Enter') {
        if (isAddModalOpen) {
          e.preventDefault();
          handleAddCategory();
        } else if (isEditModalOpen) {
          e.preventDefault();
          handleUpdateCategory();
        } else if (isDeleteModalOpen) {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isEditModalOpen, isDeleteModalOpen, newCategory, editCategory, deleteTargetId]);

  const showAddMessage = (text, type) => {
    setAddMessage({ text, type });
    setTimeout(() => setAddMessage({ text: '', type: '' }), 3000);
  };

  const showEditMessage = (text, type) => {
    setEditMessage({ text, type });
    setTimeout(() => setEditMessage({ text: '', type: '' }), 3000);
  };

  const showDeleteMessage = (text, type) => {
    setDeleteMessage({ text, type });
    setTimeout(() => setDeleteMessage({ text: '', type: '' }), 3000);
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
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

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = categories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      showAddMessage('Category name is required!', 'error');
      return;
    }

    const duplicate = categories.find(c => c.name.toLowerCase() === newCategory.name.trim().toLowerCase());
    if (duplicate) {
      showAddMessage('This category already exists!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || ''
        })
      });

      if (res.ok) {
        showAddMessage('Category added successfully!', 'success');
        await fetchCategories();
        setTimeout(() => {
          setNewCategory({ name: '', description: '' });
          setIsAddModalOpen(false);
          setAddMessage({ text: '', type: '' });
        }, 300);
      } else {
        const errorData = await res.json();
        if (errorData.message && errorData.message.includes('duplicate key error')) {
          showAddMessage(`Category "${newCategory.name.trim()}" already exists in database!`, 'error');
        } else {
          showAddMessage(errorData.message || 'Error saving category.', 'error');
        }
      }
    } catch (error) {
      showAddMessage('Server error while saving category.', 'error');
    }
  };

  const startEdit = (category) => {
    setEditMessage({ text: '', type: '' });
    setEditCategory({
      id: category._id,
      name: category.name,
      description: category.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCategory = async () => {
    const originalCategory = categories.find(c => c._id === editCategory.id);
    const nameToCheck = editCategory.name.trim();
    const descToCheck = editCategory.description.trim();

    if (!nameToCheck) {
      showEditMessage('Category name is required!', 'error');
      return;
    }

    if (originalCategory && originalCategory.name === nameToCheck && (originalCategory.description || '') === descToCheck) {
      showEditMessage('Nothing to update!', 'info');
      return;
    }

    const duplicate = categories.find(
      c => c.name.toLowerCase() === nameToCheck.toLowerCase() && c._id !== editCategory.id
    );
    if (duplicate) {
      showEditMessage('This category already exists!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/categories/${editCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nameToCheck,
          description: descToCheck
        })
      });

      if (res.ok) {
        showEditMessage('Category updated successfully!', 'success');
        await fetchCategories();
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditCategory({ id: '', name: '', description: '' });
          setEditMessage({ text: '', type: '' });
        }, 300);
      } else {
        const errorData = await res.json();
        if (errorData.message && errorData.message.includes('duplicate key error')) {
          showEditMessage(`Category "${nameToCheck}" already exists in database!`, 'error');
        } else {
          showEditMessage(errorData.message || 'Error updating category.', 'error');
        }
      }
    } catch (error) {
      showEditMessage('Server error while updating category.', 'error');
    }
  };

  // DATA INTEGRITY: Prevent deletion of categories that are currently referenced by active products.
  const isCategoryInUse = (categoryId) => {
    return products.some(p => (p.categoryId?._id || p.categoryId) === categoryId);
  };

  const confirmDelete = (id) => {
    setDeleteMessage({ text: '', type: '' });

    if (isCategoryInUse(id)) {
      showDeleteMessage('This category is assigned to one or more products and cannot be deleted.', 'error');
      return;
    }

    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    if (isCategoryInUse(deleteTargetId)) {
      showDeleteMessage('This category is assigned to one or more products and cannot be deleted.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/categories/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showDeleteMessage('Category deleted successfully!', 'success');
        await fetchCategories();
        setTimeout(() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
          setDeleteMessage({ text: '', type: '' });
        }, 300);
      } else {
        const errorData = await res.json();
        showDeleteMessage(errorData.message || 'Error deleting category.', 'error');
      }
    } catch (error) {
      showDeleteMessage('Server error while deleting category.', 'error');
    }
  };

  const InlineMessage = ({ message, type }) => {
    if (!message) return null;
    const colors = {
      success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
      error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' },
      info: { bg: 'var(--info-bg)', text: 'var(--info)', border: 'var(--info)', icon: 'ℹ️' }
    };
    const style = colors[type] || colors.info;

    return (
      <div style={{ padding: '10px 14px', marginBottom: '15px', borderRadius: 'var(--radius-sm)', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, fontSize: '14px', fontWeight: 500 }}>
        {style.icon} {message}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* HEADER SECTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px', fontWeight: '600' }}>Categories</h2>
        <button 
          className="btn btn-primary"
          onClick={() => { setAddMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}
        >
          + Add Category
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ width: '10%', padding: '12px 16px', color: '#ffff', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>SR#</th>
                <th style={{ width: '30%', padding: '12px 16px', color: '#ffff', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Name</th>
                <th style={{ width: '40%', padding: '12px 16px',  color: '#ffff', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Description</th>
                <th style={{ width: '20%', padding: '12px 16px',  color: '#ffff', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((c, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr 
                      key={c._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '8px 16px', textAlign: 'left' , fontSize: '13px', color: 'var(--text-main)' }}>{serialNumber}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'left' , fontSize: '13px', color: 'var(--text-main)' }}>{c.name}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'left' , fontSize: '13px', color: 'var(--text-muted)' }}>{c.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>N/A</span>}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button 
                            style={styles.iconBtnEdit} 
                            onClick={() => startEdit(c)} 
                            title="Edit"
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = 'var(--primary)'; }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            style={styles.iconBtnDelete}
                            onClick={() => confirmDelete(c._id)} 
                            title="Delete"
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
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
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {categories.length > itemsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
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

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Category</h2>
              <button 
                className="modal-close" 
                onClick={() => { setIsAddModalOpen(false); setNewCategory({ name: '', description: '' }); setAddMessage({ text: '', type: '' }); }}
              >×</button>
            </div>
            
            <div className="modal-body">
              <InlineMessage message={addMessage.text} type={addMessage.type} />
              
              <div className="form-group">
                <label className="form-label">Category Name <span className="star-red">*</span></label>
                <input 
                  className="form-input"
                  value={newCategory.name} 
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddCategory)}
                  autoFocus
                  placeholder="e.g., Electronics"
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Enter category description (optional)"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => { setIsAddModalOpen(false); setNewCategory({ name: '', description: '' }); setAddMessage({ text: '', type: '' }); }}
              >Cancel</button>
              <button className="btn btn-primary" onClick={handleAddCategory}>
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Category</h2>
              <button 
                className="modal-close" 
                onClick={() => { setIsEditModalOpen(false); setEditCategory({ id: '', name: '', description: '' }); setEditMessage({ text: '', type: '' }); }}
              >×</button>
            </div>

            <div className="modal-body">
              <InlineMessage message={editMessage.text} type={editMessage.type} />

              <div className="form-group">
                <label className="form-label">Category Name <span className="star-red">*</span></label>
                <input 
                  className="form-input"
                  value={editCategory.name} 
                  onChange={(e) => setEditCategory({...editCategory, name: e.target.value})} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCategory)}
                  autoFocus
                  placeholder="e.g., Electronics"
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={editCategory.description}
                  onChange={(e) => setEditCategory({...editCategory, description: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleUpdateCategory();
                    }
                  }}
                  placeholder="Enter category description (optional)"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => { setIsEditModalOpen(false); setEditCategory({ id: '', name: '', description: '' }); setEditMessage({ text: '', type: '' }); }}
              >Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateCategory}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Category</h2>
              <button 
                className="modal-close" 
                onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); setDeleteMessage({ text: '', type: '' }); }}
              >×</button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center' }}>
              <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, margin: '0 auto 16px'
              }}>
                !
              </div>
              
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>
                  {categories.find(c => c._id === deleteTargetId)?.name || 'this category'}
                </strong>? This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); setDeleteMessage({ text: '', type: '' }); }} 
              >Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal inline styles strictly for table-specific action icons
const styles = {
  iconBtnEdit: {
    background: 'var(--edit)',
    color: 'var(--primary)',
    border: 'none',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  iconBtnDelete: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    padding: '8px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
};

export default Category;