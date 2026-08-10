import { useState, useEffect } from 'react';
import './supplier.css'
const API_BASE_URL = 'http://localhost:5000';

function CustomerType() {
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Message State for Custom Popups
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  
  const [typeName, setTypeName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomerTypes();
  }, []);

  // Reusable Message Handler (Auto-hide after 3 seconds)
  const displayMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 3000);
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC key to close modals
      if (e.key === 'Escape') {
        if (isModalOpen) closeModal();
        if (isDeleteModalOpen) closeDeleteModal();
      }

      // Enter key to save
      if (e.key === 'Enter' && isModalOpen) {
        e.preventDefault();
        handleSave();
      }

      // Enter key to confirm delete
      if (e.key === 'Enter' && isDeleteModalOpen) {
        e.preventDefault();
        confirmDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, isDeleteModalOpen, typeName, editingId]);

  const fetchCustomerTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer-types`);
      const data = await res.json();
      setCustomerTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customer types:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type = null) => {
    setMessage({ text: '', type: '' }); // Clear any previous messages
    if (type) {
      setEditingId(type._id);
      setTypeName(type.name);
    } else {
      setEditingId(null);
      setTypeName('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTypeName('');
    setEditingId(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTypeToDelete(null);
  };

  const handleSave = async () => {
    const trimmedInput = typeName.trim();
    
    if (!trimmedInput) {
      displayMessage('Please enter a customer type name.', 'error');
      return;
    }

    // Strict Frontend Duplicate Check
    const isDuplicate = customerTypes.some(
      (ct) => ct._id !== editingId && ct.name.toLowerCase() === trimmedInput.toLowerCase()
    );
    
    if (isDuplicate) {
      displayMessage('This customer type already exists!', 'error');
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_BASE_URL}/api/customer-types/${editingId}`
        : `${API_BASE_URL}/api/customer-types`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedInput })
      });

      if (res.ok) {
        fetchCustomerTypes();
        closeModal();
        displayMessage(`Customer type ${editingId ? 'updated' : 'added'} successfully.`, 'success');
      } else {
        const errorData = await res.json();
        displayMessage(errorData.message || 'Failed to save customer type.', 'error');
      }
    } catch (error) {
      displayMessage('Server error while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!typeToDelete) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/customer-types/${typeToDelete}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        setCustomerTypes(customerTypes.filter(ct => ct._id !== typeToDelete));
        displayMessage('Customer type deleted successfully.', 'success');
      } else {
        displayMessage(data?.message || 'Failed to delete. It might be in use.', 'error');
      }
    } catch (error) {
      displayMessage('Server error while deleting.', 'error');
    } finally {
      closeDeleteModal();
    }
  };

  // Handle Enter key on input field specifically
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // UI helper for displaying the message
  const renderMessage = () => {
    if (!message.text) return null;
    return (
      <div style={{
        padding: '10px 15px',
        borderRadius: '6px',
        marginBottom: '15px',
        color: '#fff',
        fontWeight: '500',
        fontSize: '14px',
        backgroundColor: message.type === 'error' ? '#ef4444' : '#10b981',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {message.text}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div className='roles-container' style={styles.headerRow}>
        <h4 > Customer Types</h4>
        <button style={styles.addBtn} onClick={() => openModal()}>+ Add Customer Type</button>
      </div>

      {/* Main Screen Message (Visible when modals are closed) */}
      {!isModalOpen && !isDeleteModalOpen && renderMessage()}

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '10%' }}>Sr#</th>
              <th style={styles.th}>Customer Type</th>
              <th style={{ ...styles.th, width: '20%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={styles.emptyCell}>Loading...</td></tr>
            ) : customerTypes.length === 0 ? (
              <tr><td colSpan="3" style={styles.emptyCell}>No customer types found.</td></tr>
            ) : (
              customerTypes.map((type, idx) => (
                <tr key={type._id}>
                  <td style={styles.td}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{type.name}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={styles.actionGroup}>
                      {/* Edit Button */}
                      <button style={styles.iconBtnEdit} onClick={() => openModal(type)}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button 
                        style={styles.iconBtnDelete} 
                        onClick={() => {
                          setTypeToDelete(type._id);
                          setIsDeleteModalOpen(true);
                        }} 
                        title="Delete Customer"
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0f172a' }}>
              {editingId ? 'Edit Customer Type' : 'Add Customer Type'}
            </h3>

            {/* Message Inside Modal */}
            {renderMessage()}

            <label style={{ textAlign: 'left', display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
              Type Name *
            </label>
            <input
              type="text"
              style={styles.inputField}
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="e.g. Wholesale, VIP, Retail"
              autoFocus
            />

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button style={styles.cancelBtn} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {isDeleteModalOpen && (
        <div style={styles.modalOverlay} onClick={closeDeleteModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0f172a' }}>
              Delete Customer Type
            </h3>
            
            {/* Message Inside Delete Modal */}
            {renderMessage()}

            <p style={{ margin: '10px 0 20px', fontSize: '15px', color: '#334155' }}>
              Are you sure you want to delete this customer type? This action cannot be undone.
            </p>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.saveBtn, backgroundColor: '#ef4444' }} onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button style={styles.cancelBtn} onClick={closeDeleteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '14px 24px ', background: '#f8fafc', minHeight: '100%' },
  headerRow: {width:'100%', border:'none',background:'none',display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, color: '#3e576c', fontSize: '20px', fontWeight:'700px' },
  addBtn: { background: '#5aa7ef', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },

  tableWrapper: { background: '#fff', borderRadius: '4px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '14px 16px', background: '#29364b', fontSize: '13px', color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '8px 16px', textAlign: 'left', fontSize: '14px', borderBottom: '1px solid #f3f5f7', color: '#334155' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
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
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 },
  modalContent: { background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  inputField: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  saveBtn: { background: '#3c4e6b', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' },
  cancelBtn: { background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }
};

export default CustomerType;