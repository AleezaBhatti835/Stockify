import { useState, useEffect } from 'react';

function UOM() {
  const [uoms, setUoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [newUOM, setNewUOM] = useState({ code: '', name: '' });
  const [editUOM, setEditUOM] = useState({ id: '', code: '', name: '' });
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = uoms.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(uoms.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [uoms]);

  useEffect(() => {
    fetchUOMs();
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
          setNewUOM({ code: '', name: '' });
          setAddMessage({ text: '', type: '' });
        }
        if (isEditModalOpen) {
          e.preventDefault();
          setIsEditModalOpen(false);
          setEditUOM({ id: '', code: '', name: '' });
          setEditMessage({ text: '', type: '' });
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
  }, [isAddModalOpen, isEditModalOpen, isDeleteModalOpen]);

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

  // ================= FETCH UOMS =================
  const fetchUOMs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/uoms', {
        headers: { 'Authorization': `Bearer ${token}` }
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

  // ================= FETCH PRODUCTS =================
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

  // ================= HANDLE ADD UOM =================
  const handleAddUOM = async () => {
    if (isSubmitting) return;

    if (!newUOM.code.trim() || !newUOM.name.trim()) {
      showAddMessage('Code and Name are required!', 'error');
      return;
    }

    const codeToCheck = newUOM.code.trim().toUpperCase();
    const nameToCheck = newUOM.name.trim();

    const duplicateCode = uoms.find(u => u.code.toUpperCase() === codeToCheck);
    if (duplicateCode) {
      showAddMessage(`UOM code "${codeToCheck}" already exists!`, 'error');
      return;
    }

    const duplicateName = uoms.find(u => u.name.toLowerCase() === nameToCheck.toLowerCase());
    if (duplicateName) {
      showAddMessage(`UOM name "${nameToCheck}" already exists!`, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/uoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: codeToCheck, name: nameToCheck })
      });

      if (res.ok) {
        showAddMessage('UOM added successfully!', 'success');
        await fetchUOMs();
        setTimeout(() => {
          setNewUOM({ code: '', name: '' });
          setIsAddModalOpen(false);
          setAddMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }, 300);
      } else {
        const errorData = await res.json();
        if (errorData.message && errorData.message.includes('duplicate key error')) {
          showAddMessage(`UOM code "${codeToCheck}" already exists in database!`, 'error');
        } else {
          showAddMessage(errorData.message || 'Error saving UOM.', 'error');
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      showAddMessage('Server error while saving UOM.', 'error');
      setIsSubmitting(false);
    }
  };

  const startEdit = (uom) => {
    setEditMessage({ text: '', type: '' });
    setEditUOM({ id: uom._id, code: uom.code, name: uom.name });
    setIsEditModalOpen(true);
  };

  // ================= HANDLE UPDATE UOM =================
  const handleUpdateUOM = async () => {
    if (isSubmitting) return;

    const originalUOM = uoms.find(u => u._id === editUOM.id);
    const codeToCheck = editUOM.code.trim().toUpperCase();
    const nameToCheck = editUOM.name.trim();

    if (!editUOM.code.trim() || !editUOM.name.trim()) {
      showEditMessage('Code and Name are required!', 'error');
      return;
    }

    if (originalUOM && originalUOM.code === codeToCheck && originalUOM.name === nameToCheck) {
      showEditMessage('Nothing to update!', 'info');
      return;
    }

    const duplicateCode = uoms.find(u => u.code.toUpperCase() === codeToCheck && u._id !== editUOM.id);
    if (duplicateCode) {
      showEditMessage(`UOM code "${codeToCheck}" already exists!`, 'error');
      return;
    }

    const duplicateName = uoms.find(u => u.name.toLowerCase() === nameToCheck.toLowerCase() && u._id !== editUOM.id);
    if (duplicateName) {
      showEditMessage(`UOM name "${nameToCheck}" already exists!`, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/uoms/${editUOM.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: codeToCheck, name: nameToCheck })
      });

      if (res.ok) {
        showEditMessage('UOM updated successfully!', 'success');
        await fetchUOMs();
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditUOM({ id: '', code: '', name: '' });
          setEditMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }, 300);
      } else {
        const errorData = await res.json();
        if (errorData.message && errorData.message.includes('duplicate key error')) {
          showEditMessage(`UOM code "${codeToCheck}" already exists in database!`, 'error');
        } else {
          showEditMessage(errorData.message || 'Error updating UOM.', 'error');
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      showEditMessage('Server error while updating UOM.', 'error');
      setIsSubmitting(false);
    }
  };

  const isUOMInUse = (uomId) => {
    return products.some(p => (p.uomId?._id || p.uomId) === uomId);
  };

  const confirmDelete = (id) => {
    setDeleteMessage({ text: '', type: '' });
    if (isUOMInUse(id)) {
      showDeleteMessage('This UOM is assigned to one or more products and cannot be deleted.', 'error');
      return;
    }
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  // ================= HANDLE DELETE UOM =================
  const handleDelete = async () => {
    if (!deleteTargetId || isSubmitting) return;

    if (isUOMInUse(deleteTargetId)) {
      showDeleteMessage('This UOM is assigned to one or more products and cannot be deleted.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/uoms/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showDeleteMessage('UOM deleted successfully!', 'success');
        await fetchUOMs();
        setTimeout(() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId(null);
          setDeleteMessage({ text: '', type: '' });
          setIsSubmitting(false);
        }, 300);
      } else {
        const errorData = await res.json();
        showDeleteMessage(errorData.message || 'Error deleting UOM.', 'error');
        setIsSubmitting(false);
      }
    } catch (error) {
      showDeleteMessage('Server error while deleting UOM.', 'error');
      setIsSubmitting(false);
    }
  };

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
      
      {/* TOP HEADER */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Units of Measure</h4>
        <button className="btn btn-primary" onClick={() => { setAddMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}>
          + Add UOM
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '10%' }}>Sr#</th>
                <th style={{ ...tableStyles.th, width: '30%' }}>Name</th>
                <th style={{ ...tableStyles.th, width: '30%' }}>Code</th>
                <th style={{ ...tableStyles.th, width: '20%',textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((u, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr 
                      key={u._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ ...tableStyles.td, fontWeight: 500, color: 'var(--text-muted)' }}>{serialNumber}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{u.code}</td>
                      <td style={tableStyles.td}>
                        <div style={styles.actionGroup}>
                          <button style={styles.iconBtnEdit} onClick={() => startEdit(u)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button style={styles.iconBtnDelete} onClick={() => confirmDelete(u._id)} title="Delete">
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
                    No UOMs found. Click "+ Add UOM" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {uoms.length > itemsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
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
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Add New UOM</h3>
              <button className="modal-close" onClick={() => { setIsAddModalOpen(false); setNewUOM({ code: '', name: '' }); setAddMessage({ text: '', type: '' }); }}>&times;</button>
            </div>
            
            <div className="modal-body">
              <InlineMessage message={addMessage.text} type={addMessage.type} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Code <span className="star-red">*</span> </label>
                  <input 
                    className="form-input" 
                    value={newUOM.code} 
                    onChange={(e) => setNewUOM({ ...newUOM, code: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddUOM(); }} 
                    autoFocus 
                    placeholder="e.g., KG" 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Name <span className="star-red">*</span> </label>
                  <input 
                    className="form-input" 
                    value={newUOM.name} 
                    onChange={(e) => setNewUOM({ ...newUOM, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddUOM(); }} 
                    placeholder="e.g., Kilogram" 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" disabled={isSubmitting} onClick={() => { setIsAddModalOpen(false); setNewUOM({ code: '', name: '' }); setAddMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddUOM} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save UOM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Edit UOM</h3>
              <button className="modal-close" onClick={() => { setIsEditModalOpen(false); setEditUOM({ id: '', code: '', name: '' }); setEditMessage({ text: '', type: '' }); }}>&times;</button>
            </div>
            
            <div className="modal-body">
              <InlineMessage message={editMessage.text} type={editMessage.type} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Code <span className="star-red">*</span> </label>
                  <input 
                    className="form-input" 
                    value={editUOM.code} 
                    onChange={(e) => setEditUOM({ ...editUOM, code: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateUOM(); }} 
                    autoFocus 
                    placeholder="e.g., KG" 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Name <span className="star-red">*</span> </label>
                  <input 
                    className="form-input" 
                    value={editUOM.name} 
                    onChange={(e) => setEditUOM({ ...editUOM, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateUOM(); }} 
                    placeholder="e.g., Kilogram" 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" disabled={isSubmitting} onClick={() => { setIsEditModalOpen(false); setEditUOM({ id: '', code: '', name: '' }); setEditMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateUOM} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
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
              
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)' }}>
                !
              </div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete UOM</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to delete <strong>{uoms.find(u => u._id === deleteTargetId)?.name || 'this UOM'}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" disabled={isSubmitting} onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); setDeleteMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-danger" disabled={isSubmitting} onClick={handleDelete}>
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tableStyles = {
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: '600',
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

const styles = {
  actionGroup: { 
    display: 'flex', 
    justifyContent: 'center', 
    gap: '12px' ,
    
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

export default UOM;