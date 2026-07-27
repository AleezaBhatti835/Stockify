// src/components/catalogue/UOM.js
import { useState, useEffect } from 'react';
import './catalogue.css';
import '../roles.css';
import '../customer.css';

// Message Popup Component
function MessagePopup({ message, onClose }) {
  if (!message.text) return null;

  return (
    <div className="message-popup-overlay" onClick={onClose}>
      <div className={`message-popup ${message.type}`} onClick={(e) => e.stopPropagation()}>
        <button className="message-popup-close" onClick={onClose}>×</button>
        <div className="message-popup-content">
          <span className="message-popup-icon">
            {message.type === 'error' ? '⚠️' : '✅'}
          </span>
          <div className="message-popup-text">
            <strong>{message.type === 'error' ? 'Error!' : 'Success!'}</strong>
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}

function UOM() {
  const [uoms, setUoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);

  const [newUOM, setNewUOM] = useState({ code: '', name: '' });
  const [editUOM, setEditUOM] = useState({ id: '', code: '', name: '' });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = uoms.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(uoms.length / itemsPerPage);

  // Reset to page 1 when uoms change
  useEffect(() => {
    setCurrentPage(1);
  }, [uoms]);

  useEffect(() => {
    fetchUOMs();
    fetchProducts();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 6000);
  };

  const clearMessage = () => {
    setMessage({ text: '', type: '' });
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

  const handleAddUOM = async () => {
    if (!newUOM.code.trim() || !newUOM.name.trim()) {
      showMessage('Code and Name are required!', 'error');
      return;
    }

    // Check for duplicate code (case insensitive)
    const duplicateCode = uoms.find(
      u => u.code.toLowerCase() === newUOM.code.trim().toLowerCase()
    );
    if (duplicateCode) {
      showMessage('This UOM code already exists!', 'error');
      return;
    }

    // Check for duplicate name (case insensitive)
    const duplicateName = uoms.find(
      u => u.name.toLowerCase() === newUOM.name.trim().toLowerCase()
    );
    if (duplicateName) {
      showMessage('This UOM name already exists!', 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/uoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newUOM.code.trim().toUpperCase(),
          name: newUOM.name.trim(),
        })
      });

      if (res.ok) {
        showMessage('UOM added successfully!', 'success');
        setNewUOM({ code: '', name: '' });
        setIsAddModalOpen(false);
        fetchUOMs();
      } else {
        const errorData = await res.json();
        showMessage(errorData.message || 'Error saving UOM.', 'error');
      }
    } catch (error) {
      showMessage('Server error while saving UOM.', 'error');
    }
  };

  const startEdit = (uom) => {
    clearMessage();
    setEditUOM({
      id: uom._id,
      code: uom.code,
      name: uom.name,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUOM = async () => {
    if (!editUOM.code.trim() || !editUOM.name.trim()) {
      showMessage('Code and Name are required!', 'error');
      return;
    }

    // Check for duplicate code (case insensitive) excluding current
    const duplicateCode = uoms.find(
      u => u.code.toLowerCase() === editUOM.code.trim().toLowerCase() &&
           u._id !== editUOM.id
    );
    if (duplicateCode) {
      showMessage('This UOM code already exists!', 'error');
      return;
    }

    // Check for duplicate name (case insensitive) excluding current
    const duplicateName = uoms.find(
      u => u.name.toLowerCase() === editUOM.name.trim().toLowerCase() &&
           u._id !== editUOM.id
    );
    if (duplicateName) {
      showMessage('This UOM name already exists!', 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/uoms/${editUOM.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editUOM.code.trim().toUpperCase(),
          name: editUOM.name.trim(),
        })
      });

      if (res.ok) {
        showMessage('UOM updated successfully!', 'success');
        setIsEditModalOpen(false);
        setEditUOM({ id: '', code: '', name: '' });
        fetchUOMs();
      } else {
        const errorData = await res.json();
        showMessage(errorData.message || 'Error updating UOM.', 'error');
      }
    } catch (error) {
      showMessage('Server error while updating UOM.', 'error');
    }
  };

  // Checks whether any product currently references this UOM
  const isUOMInUse = (uomId) => {
    return products.some(p => (p.uomId?._id || p.uomId) === uomId);
  };

  const confirmDelete = (id) => {
    clearMessage();

    if (isUOMInUse(id)) {
      showMessage('This UOM is assigned to one or more products and cannot be deleted.', 'error');
      return;
    }

    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    // Re-check right before deleting in case product data changed since the modal opened
    if (isUOMInUse(deleteTargetId)) {
      showMessage('This UOM is assigned to one or more products and cannot be deleted.', 'error');
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/uoms/${deleteTargetId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showMessage('UOM deleted successfully!', 'success');
        setIsDeleteModalOpen(false);
        setDeleteTargetId(null);
        fetchUOMs();
      } else {
        const errorData = await res.json();
        showMessage(errorData.message || 'Error deleting UOM.', 'error');
      }
    } catch (error) {
      showMessage('Server error while deleting UOM.', 'error');
    }
  };

  return (
    <div className="roles-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h2>Units of Measure</h2>
        <button style={{ width: '16%', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }} onClick={() => { clearMessage(); setIsAddModalOpen(true); }}>
          + Add UOM
        </button>
      </div>

      <MessagePopup message={message} onClose={clearMessage} />

      {/* RESULTS COUNT */}
      <div style={{
        marginBottom: '15px',
        fontSize: '14px',
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Showing {currentItems.length} of {uoms.length} UOMs</span>
      </div>

      {/* TABLE WRAPPED IN SCROLLABLE DIV */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '15%', textAlign: 'left' }}>Sr#</th>
              <th style={{ width: '25%', textAlign: 'left' }}>Code</th>
              <th style={{ width: '40%', textAlign: 'left' }}>Name</th>
              <th style={{ width: '18%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((u, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={u._id}>
                    <td style={{ textAlign: 'left', color: '#424345', fontWeight: 500 }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#5aa7ef',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {u.code.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{u.code}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</td>
                    <td className="actions-cell" style={{ textAlign: 'left' }}>
                      <div style={styles.actionGroup}>
                       

                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() =>startEdit(u)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() =>confirmDelete(u._id)} title="Delete">
                        
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
                  No UOMs found. Click "Add UOM" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {uoms.length > itemsPerPage && (
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
          <div className="modal-content" style={{ maxWidth: '550px', position: 'relative' }}>
            <h3>Add New UOM</h3>
            
            {/* Message Popup inside modal */}
            <MessagePopup message={message} onClose={clearMessage} />
            
            <div className="user-form" style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Code *</label>
                <input 
                  style={{ fontSize: '0.85rem', width: '100%' }} 
                  value={newUOM.code} 
                  onChange={(e) => setNewUOM({...newUOM, code: e.target.value.toUpperCase()})} 
                  placeholder="e.g., KG"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Name *</label>
                <input 
                  style={{ fontSize: '0.85rem', width: '100%' }} 
                  value={newUOM.name} 
                  onChange={(e) => setNewUOM({...newUOM, name: e.target.value})} 
                  placeholder="e.g., Kilogram"
                />
              </div>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddUOM}>Save UOM</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); setNewUOM({ code: '', name: ''}); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', position: 'relative' }}>
            <h3>Edit UOM</h3>

            {/* Message Popup inside modal */}
            <MessagePopup message={message} onClose={clearMessage} />

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Code *</label>
                <input 
                  style={{ fontSize: '0.85rem', width: '100%' }} 
                  value={editUOM.code} 
                  onChange={(e) => setEditUOM({...editUOM, code: e.target.value.toUpperCase()})} 
                  placeholder="e.g., KG"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Name *</label>
                <input 
                  style={{ fontSize: '0.85rem', width: '100%' }} 
                  value={editUOM.name} 
                  onChange={(e) => setEditUOM({...editUOM, name: e.target.value})} 
                  placeholder="e.g., Kilogram"
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateUOM}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setIsEditModalOpen(false); setEditUOM({ id: '', code: '', name: ''}); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>
            
            {/* Message Popup inside delete modal */}
            <MessagePopup message={message} onClose={clearMessage} />

            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fdecea',
              color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 14px'
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Delete UOM</h3>
            <p style={{ fontSize: '0.9rem', color: '#6c757d', margin: 0 }}>
              Are you sure you want to delete <strong>{uoms.find(u => u._id === deleteTargetId)?.name || 'this UOM'}</strong>? This action cannot be undone.
            </p>

            <div className="modal-actions" style={{ marginTop: '22px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => { setIsDeleteModalOpen(false); setDeleteTargetId(null); clearMessage(); }} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
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
        backgroundColor:'#e9f2e9'
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
export default UOM;