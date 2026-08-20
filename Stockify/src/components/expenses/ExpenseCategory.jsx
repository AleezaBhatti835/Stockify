import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function ExpenseCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [modalError, setModalError] = useState('');

  const [message, setMessage] = useState({ text: '', type: '', visible: false });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // CORE ARCHITECTURE: Unified CRUD operations for managing expense category datasets with centralized error handling.
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/expense-categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type, visible: true });
    setTimeout(() => setMessage({ text: '', type: '', visible: false }), 3000);
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setOriginalName('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingId(cat._id);
    setName(cat.name);
    setOriginalName(cat.name);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setModalError('');
    if (!name.trim()) return setModalError('Category name is required.');

    if (editingId && name.trim() === originalName.trim()) {
      return setModalError('Nothing updated.');
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingId
        ? `${API_BASE_URL}/api/expense-categories/${editingId}`
        : `${API_BASE_URL}/api/expense-categories`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        showMessage(editingId ? 'Category updated successfully!' : 'Category added successfully!', 'success');
        setIsModalOpen(false);
        setName('');
        setEditingId(null);
        fetchCategories();
      } else {
        setModalError(data.message || 'Something went wrong.');
      }
    } catch (err) {
      setModalError('Server error while saving category.');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/expense-categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        showMessage('Category deleted successfully!', 'success');
        fetchCategories();
      } else {
        showMessage(data.message || 'Cannot delete category.', 'error');
      }
    } catch (err) {
      showMessage('Server error while deleting category.', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // UI ENGINE: Dynamic rendering of tables and modals utilizing global theme variables for consistent layout scaling.
  const InlineMessage = ({ msg }) => {
    if (!msg.visible || !msg.text) return null;
    const colors = {
      success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
      error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' }
    };
    const style = colors[msg.type] || colors.success;

    return (
      <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, fontSize: '14px', fontWeight: 500 }}>
        {style.icon} {msg.text}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      
      <InlineMessage msg={message} />

      {/* HEADER SECTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px', fontWeight: '600' }}>Expense Categories</h2>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Category</button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ width: '15%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Sr#</th>
                <th style={{ width: '65%', padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Category Name</th>
                <th style={{ width: '20%', padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No categories added yet.</td></tr>
              ) : (
                categories.map((cat, index) => (
                  <tr key={cat._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{index + 1}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '500' }}>{cat.name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button style={styles.iconBtnEdit} onClick={() => openEditModal(cat)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button style={styles.iconBtnDelete} onClick={() => setDeleteConfirmId(cat._id)} title="Delete">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Category' : 'Add Category'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              {modalError && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '13px', fontWeight: 500, borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', textAlign: 'center' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Category Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Utilities, Rent, Transport" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} 
                  autoFocus 
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto' }}>
                !
              </div>
            </div>
            <div className="modal-body">
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', fontSize: '18px' }}>Delete Category</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Are you sure you want to delete this category? This action cannot be undone.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', borderTop: 'none', backgroundColor: 'transparent' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirmId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
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
  }
};

export default ExpenseCategory;