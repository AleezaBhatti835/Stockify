// Category.js
import { useState, useEffect } from 'react';
import './catalogue.css';
import '../roles.css';
import '../customer.css';

function Category() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [viewCategory, setViewCategory] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editCategory, setEditCategory] = useState({ id: '', name: '', description: '' });

  // Inline message states for each modal
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });

  // Reset to page 1 when categories change
  useEffect(() => {
    setCurrentPage(1);
  }, [categories]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Keyboard shortcut handler
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

  const fetchProducts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = categories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(categories.length / itemsPerPage);

  // Handle Enter key on input fields
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

    const duplicate = categories.find(
      c => c.name.toLowerCase() === newCategory.name.trim().toLowerCase()
    );
    if (duplicate) {
      showAddMessage('This category already exists!', 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    // Check if nothing changed
    if (originalCategory && originalCategory.name === nameToCheck && (originalCategory.description || '') === descToCheck) {
      showEditMessage('Nothing to update!', 'info');
      return;
    }

    const duplicate = categories.find(
      c => c.name.toLowerCase() === nameToCheck.toLowerCase() &&
           c._id !== editCategory.id
    );
    if (duplicate) {
      showEditMessage('This category already exists!', 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/categories/${editCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  // Checks whether any product currently references this category
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

    // Re-check right before deleting in case product data changed since the modal opened
    if (isCategoryInUse(deleteTargetId)) {
      showDeleteMessage('This category is assigned to one or more products and cannot be deleted.', 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/categories/${deleteTargetId}`, {
        method: 'DELETE'
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', width: '100%' }}>
        <h4>Categories</h4>
        <button style={{ width: '16%', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setAddMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}>
          + Add Category
        </button>
      </div>

      {/* RESULTS COUNT */}
      <div style={{
        fontSize: '13px',
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between',
        marginLeft: '82%'
      }}>
        <span>Showing {currentItems.length} of {categories.length} categories</span>
      </div>

      {/* TABLE WRAPPED IN SCROLLABLE DIV */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '15%', textAlign: 'left' }}>SR#</th>
              <th style={{ width: '30%', textAlign: 'left' }}>Name</th>
              <th style={{ width: '55%', textAlign: 'left' }}>Description</th>
              <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((c, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={c._id}>
                    <td style={{ textAlign: 'left', color: '#94a3b8', fontWeight: 500 }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                     
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>N/A</span>}
                    </td>
                    <td className="actions-cell" style={{ textAlign: 'center' }}>
                      <div style={styles.actionGroup}>
                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => startEdit(c)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => confirmDelete(c._id)} title="Delete">
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
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  No categories found. Click "Add Category" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {categories.length > itemsPerPage && (
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
          
          <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484' }}>
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
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Add New Category</h3>
            
            {/* Inline Message inside Add Modal */}
            <InlineMessage message={addMessage.text} type={addMessage.type} />
            
            <div className="user-form" style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Category Name *</label>
                <input 
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                  value={newCategory.name} 
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddCategory)}
                  autoFocus
                  placeholder="e.g., Electronics"
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Description</label>
                <textarea
                  style={{ fontSize: '0.85rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '8px', boxSizing: 'border-box' }}
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
            
            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddCategory}>Save Category</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); setNewCategory({ name: '', description: '' }); setAddMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Edit Category</h3>

            {/* Inline Message inside Edit Modal */}
            <InlineMessage message={editMessage.text} type={editMessage.type} />

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Category Name *</label>
                <input 
                  style={{ fontSize: '0.85rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                  value={editCategory.name} 
                  onChange={(e) => setEditCategory({...editCategory, name: e.target.value})} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCategory)}
                  autoFocus
                  placeholder="e.g., Electronics"
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Description</label>
                <textarea
                  style={{ fontSize: '0.85rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '8px', boxSizing: 'border-box' }}
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

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateCategory}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setIsEditModalOpen(false); setEditCategory({ id: '', name: '', description: '' }); setEditMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>
            
            {/* Inline Message inside Delete Modal */}
            <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fdecea',
              color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 14px'
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Delete Category</h3>
            <p style={{ fontSize: '0.9rem', color: '#6c757d', margin: 0 }}>
              Are you sure you want to delete <strong>{categories.find(c => c._id === deleteTargetId)?.name || 'this category'}</strong>? This action cannot be undone.
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
        justifyContent: 'left',
        gap: '12px',
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

export default Category;