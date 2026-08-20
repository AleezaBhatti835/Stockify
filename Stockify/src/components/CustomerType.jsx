import React, { useState, useEffect } from 'react';

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
      if (e.key === 'Escape') {
        if (isModalOpen) closeModal();
        if (isDeleteModalOpen) closeDeleteModal();
      }

      if (e.key === 'Enter' && isModalOpen) {
        e.preventDefault();
        handleSave();
      }

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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/customer-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setCustomerTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customer types:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type = null) => {
    setMessage({ text: '', type: '' });
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
      const token = localStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_BASE_URL}/api/customer-types/${editingId}`
        : `${API_BASE_URL}/api/customer-types`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/customer-types/${typeToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    const isError = message.type === 'error';
    return (
      <div style={{
        padding: '10px 14px',
        marginBottom: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: isError ? 'var(--danger-bg)' : 'var(--success-bg)',
        color: isError ? 'var(--danger)' : 'var(--success)',
        border: `1px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
        fontSize: '14px',
        fontWeight: 500,
        textAlign: 'center'
      }}>
        {isError ? '⚠️ ' : '✅ '} {message.text}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* Header */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '22px', fontWeight: 600 }}>Customer Types</h4>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Add Customer Type</button>
      </div>

      {/* Main Screen Message (Visible when modals are closed) */}
      {!isModalOpen && !isDeleteModalOpen && renderMessage()}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '10%', textAlign: 'center' }}>Sr#</th>
                <th style={tableStyles.th}>Customer Type</th>
                <th style={{ ...tableStyles.th, width: '20%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={tableStyles.emptyCell}>Loading...</td></tr>
              ) : customerTypes.length === 0 ? (
                <tr><td colSpan="3" style={tableStyles.emptyCell}>No customer types found.</td></tr>
              ) : (
                customerTypes.map((type, idx) => (
                  <tr 
                    key={type._id}
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ ...tableStyles.td, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ ...tableStyles.td, fontWeight: 600, color: 'var(--text-main)' }}>{type.name}</td>
                    <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                      <div style={styles.actionGroup}>
                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => openModal(type)} title="Edit">
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
                          title="Delete Customer Type"
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingId ? 'Edit Customer Type' : 'Add Customer Type'}
              </h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            <div className="modal-body">
              {renderMessage()}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Type Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="e.g. Wholesale, VIP, Retail"
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              {renderMessage()}
              
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
              }}>
                !
              </div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete Customer Type</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to delete this customer type? This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={closeDeleteModal}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Strict Table Styles Rule
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
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  }
};

// Strict Actions Rule Enforced
const actionStyles = {
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

const styles = {
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
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
  }
};

export default CustomerType;