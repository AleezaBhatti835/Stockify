import { useState, useEffect } from 'react';
import '../roles.css';

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

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/expense-categories`);
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
      const url = editingId
        ? `${API_BASE_URL}/api/expense-categories/${editingId}`
        : `${API_BASE_URL}/api/expense-categories`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE_URL}/api/expense-categories/${id}`, { method: 'DELETE' });
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

  return (
    <div style={styles.wrapper}>
      
      {/* ==================== CENTERED NOTIFICATION OVERLAY ==================== */}
      {message.visible && (
        <div style={styles.notificationOverlay}>
          <div style={{
            ...styles.notificationContent,
            background: message.type === 'error' ? '#fef2f2' : '#ecfdf5',
            border: `2px solid ${message.type === 'error' ? '#f87171' : '#34d399'}`
          }}>
            <div style={styles.notificationIcon}>
              {message.type === 'error' ? '⚠️' : '✅'}
            </div>
            <div style={{
              ...styles.notificationText,
              color: message.type === 'error' ? '#ef4444' : '#10b981'
            }}>
              {message.text}
            </div>
          </div>
        </div>
      )}

      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h4 style={{ fontSize: '22px',fontWeight:'400px', color: '#3e576c', fontFamily: 'times new roman' }}>Expense Categories</h4>
          <button style={styles.addBtn} onClick={openAddModal}>+ Add Category</button>
        </div>

        {/* Table without borders */}
        <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
          <table className='roles-table' style={{ 
            width: '100%', 
            maxWidth: '800px',
            borderCollapse: 'collapse',
            border: 'none'
          }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '20%', textAlign: 'left', border: 'none' }}>Sr#</th>
                <th style={{ ...styles.th, width: '55%', textAlign: 'left', border: 'none' }}>Category Name</th>
                <th style={{ ...styles.th, width: '25%', textAlign: 'center', border: 'none' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={styles.emptyCell}>Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan="3" style={styles.emptyCell}>No categories added yet.</td></tr>
              ) : (
                categories.map((cat, index) => (
                  <tr key={cat._id}>
                    <td style={{ ...styles.td, textAlign: 'left', border: 'none' }}>{index + 1}</td>
                    <td style={{ ...styles.td, fontWeight: 600, textAlign: 'left', border: 'none' }}>{cat.name}</td>
                    <td style={{ ...styles.td, textAlign: 'center', border: 'none' }}>
                      <div style={styles.actionGroup}>
                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => openEditModal(cat)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => {
                            setDeleteConfirmId(cat._id);
                          }}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== ADD/EDIT MODAL ==================== */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>{editingId ? 'Edit Category' : 'Add Category'}</h3>
              <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            {modalError && (
              <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: '1px solid #fecaca' }}>
                ⚠️ {modalError}
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <label style={styles.label}>Category Name</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g. Utilities, Rent, Transport"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRM MODAL ==================== */}
      {deleteConfirmId && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirmId(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Delete Category</h3>
            <p style={{ color: '#64748b', marginTop: '12px' }}>Are you sure you want to delete this category?</p>
            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={styles.cancelBtn} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button style={styles.deleteConfirmBtn} onClick={() => handleDelete(deleteConfirmId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '16px' },
  card: { background: '#fff', borderRadius: '8px' },
  addBtn: { background: '#5aa7ef', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  th: { 
    padding: '12px 16px', 
    background: '#26384a', 
    fontSize: '12px', 
    color: '#fff', 
    fontWeight: 600, 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    border: 'none'
  },
  td: { 
    padding: '6px 16px', 
    fontSize: '14px', 
 borderBottom: '1px solid #f2f6f8',
     color: '#334155',
    verticalAlign: 'middle',
    border: 'none'
  },
  emptyCell: { padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  label: { fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block', textAlign: 'left' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 },
  modalContent: { background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer', lineHeight: 1 },
  cancelBtn: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '10px 20px', background: '#3c4e6b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  deleteConfirmBtn: { padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
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
  notificationOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000000,
    animation: 'fadeIn 0.3s ease-out',
  },
  notificationContent: {
    background: '#fff',
    padding: '30px 40px',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    minWidth: '350px',
    maxWidth: '500px',
  },
  notificationIcon: {
    fontSize: '48px',
    lineHeight: 1,
  },
  notificationText: {
    fontSize: '18px',
    fontWeight: 600,
    textAlign: 'center',
  }
};

export default ExpenseCategory;