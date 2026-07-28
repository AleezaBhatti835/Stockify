import { useState, useEffect } from 'react';
import './supplier.css';

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

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(2);

  const initialState = {
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ntn: '',
    pic: '',
    status: 'Active'
  };

  const [newSupplier, setNewSupplier] = useState(initialState);
  const [editSupplierId, setEditSupplierId] = useState(null);
  const [editSupplier, setEditSupplier] = useState(initialState);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = suppliers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(suppliers.length / itemsPerPage);

  // Reset to page 1 when suppliers change
  useEffect(() => {
    setCurrentPage(1);
  }, [suppliers]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/suppliers');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  // Helper function to show messages and auto-clear them after 6 seconds
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 6000);
  };

  const clearMessage = () => {
    setMessage({ text: '', type: '' });
  };

  const handleImageUpload = async (e, isEditing) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        isEditing
          ? setEditSupplier({ ...editSupplier, pic: data.imageUrl })
          : setNewSupplier({ ...newSupplier, pic: data.imageUrl });
        showMessage('Image uploaded successfully!', 'success');
      }
    } catch (error) {
      showMessage('Upload failed.', 'error');
    }
  };

  // Validation function for duplicates
  const checkDuplicate = (field, value, excludeId = null) => {
    return suppliers.some(supplier => {
      // Skip checking if it's the current supplier being edited
      if (excludeId && supplier._id === excludeId) return false;

      // Skip if the field is empty
      if (!value || value.trim() === '') return false;

      // Check if the field matches (case insensitive for email)
      if (field === 'email') {
        return supplier.email?.toLowerCase() === value.toLowerCase().trim();
      }

      // For phone and ntn, compare as strings (trimmed)
      if (field === 'phone') {
        return supplier.phone?.trim() === value.trim();
      }

      if (field === 'ntn') {
        return supplier.ntn?.trim() === value.trim();
      }

      return false;
    });
  };

  const validateSupplier = (supplierData, isEditing = false) => {
    // Required fields validation
    if (!supplierData.companyName || !supplierData.contactPerson || !supplierData.phone) {
      showMessage('Company Name, Contact Person and Phone are required!', 'error');
      return false;
    }

    // Email format validation (if provided)
    if (supplierData.email && supplierData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplierData.email)) {
        showMessage('Please enter a valid email address!', 'error');
        return false;
      }
    }

    // Phone number format validation (at least 10 digits)
    if (supplierData.phone) {
      const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
      if (!phoneRegex.test(supplierData.phone.trim())) {
        showMessage('Please enter a valid phone number (10-15 digits)!', 'error');
        return false;
      }
    }

    // Check for duplicate phone
    const excludeId = isEditing ? editSupplierId : null;
    if (checkDuplicate('phone', supplierData.phone, excludeId)) {
      showMessage('This phone number is already registered to another supplier!', 'error');
      return false;
    }

    // Check for duplicate email (if provided)
    if (supplierData.email && supplierData.email.trim() !== '') {
      if (checkDuplicate('email', supplierData.email, excludeId)) {
        showMessage('This email is already registered to another supplier!', 'error');
        return false;
      }
    }

    // Check for duplicate NTN/Tax Number (if provided)
    if (supplierData.ntn && supplierData.ntn.trim() !== '') {
      if (checkDuplicate('ntn', supplierData.ntn, excludeId)) {
        showMessage('This NTN/Tax Number is already registered to another supplier!', 'error');
        return false;
      }
    }

    return true;
  };

  const handleAddSupplier = async () => {
    // Validate the new supplier data
    if (!validateSupplier(newSupplier, false)) {
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });

      if (res.ok) {
        showMessage('Supplier added successfully!', 'success');
        setNewSupplier(initialState);
        setIsAddModalOpen(false);
        fetchSuppliers();
      } else {
        const errorData = await res.json();
        showMessage(errorData.message || 'Error saving supplier.', 'error');
      }
    } catch (error) {
      showMessage('Server error.', 'error');
    }
  };

  const handleUpdateSupplier = async () => {
    // Validate the edited supplier data
    if (!validateSupplier(editSupplier, true)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/suppliers/${editSupplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSupplier)
      });

      if (res.ok) {
        showMessage('Supplier updated successfully!', 'success');
        setEditSupplierId(null);
        fetchSuppliers();
      } else {
        const errorData = await res.json();
        showMessage(errorData.message || 'Error updating supplier.', 'error');
      }
    } catch (error) {
      showMessage('Update failed.', 'error');
    }
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
  };

  const cancelDelete = () => {
    setDeleteTargetId(null);
  };

  const proceedDelete = () => {
    handleDelete(deleteTargetId);
    setDeleteTargetId(null);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/suppliers/${id}`, { method: 'DELETE' });
      showMessage('Supplier deleted successfully!', 'success');
      fetchSuppliers();
    } catch (error) {
      showMessage('Error deleting supplier.', 'error');
    }
  };

  const startEdit = (supplier) => {
    clearMessage();
    setEditSupplierId(supplier._id);
    setEditSupplier({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      ntn: supplier.ntn,
      pic: supplier.pic
    });
  };

  const openView = (supplier) => {
    setViewSupplier(supplier);
  };

  const closeView = () => {
    setViewSupplier(null);
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="roles-container">
      <div className="page-header">
        <h2>Manage Suppliers</h2>
        <button style={{ width: '16%', color: 'white', backgroundColor: '#5aa7ef' }} className="btn btn-primary" onClick={() => { clearMessage(); setIsAddModalOpen(true); }}>+ Add Supplier</button>
      </div>

      {/* RESULTS COUNT */}
      <div style={{
        marginBottom: '15px',
        fontSize: '14px',
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Showing {currentItems.length} of {suppliers.length} suppliers</span>
      </div>

      <div className="roles-table-wrapper">
        <table className="roles-table">
          <thead>
            <tr>
              <th style={{ width: '10%', textAlign: 'center' }}>Sr #</th>
              <th style={{ width: "25%" }}>Company</th>
              <th style={{ width: "22%" }}>Name</th>
              <th style={{ width: "18%" }}>Phone</th>
              <th style={{ width: "15%" }}>City</th>
              <th style={{ width: "20%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((s, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={s._id}>
                    <td style={{ textAlign: 'center' }}>{serialNumber}</td>
                    <td>{s.companyName}</td>
                    <td>{s.contactPerson}</td>
                    <td>{s.phone}</td>
                    <td>{s.city || 'N/A'}</td>
                    <td className="actions-cell">
                      <div style={styles.actionGroup}>
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => openView(s)} title="View">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => startEdit(s)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => {
                            confirmDelete(s._id);
                            setIsDeleteModalOpen(true);
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
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  No suppliers found. Click "Add Supplier" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {suppliers.length > itemsPerPage && (
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
          <div className="custom-modal-content">
            <h3 className="modal-title-left">Add New Supplier</h3>

            {/* Message Popup */}
            <MessagePopup message={message} onClose={clearMessage} />

            <div className="supplier-form-container">
              <div className="form-grid">
                <div className="form-field">
                  <label>Company Name *</label>
                  <input value={newSupplier.companyName} onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Name*</label>
                  <input value={newSupplier.contactPerson} onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Phone *</label>
                  <input value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} placeholder="e.g., 0300-1234567" />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>City</label>
                  <input value={newSupplier.city} onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>CNIC</label>
                  <input value={newSupplier.cnic} onChange={(e) => setNewSupplier({ ...newSupplier, cnic: e.target.value })} placeholder="XXXXXXX-X" />
                </div>
                <div className="form-field form-field-full">
                  <label>Address</label>
                  <textarea
                    rows={3}
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  />
                </div>
                <div className="form-field form-field-full">
                  <label>Upload Logo / Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddSupplier}>Save Supplier</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editSupplierId && (
        <div className="modal-overlay">
          <div className="custom-modal-content">
            <h3 className="modal-title-left">Edit Supplier</h3>

            {/* Message Popup */}
            <MessagePopup message={message} onClose={clearMessage} />

            <div className="supplier-form-container">
              <div className="form-grid">
                <div className="form-field">
                  <label>Company Name *</label>
                  <input value={editSupplier.companyName} onChange={(e) => setEditSupplier({ ...editSupplier, companyName: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Name*</label>
                  <input value={editSupplier.contactPerson} onChange={(e) => setEditSupplier({ ...editSupplier, contactPerson: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Phone *</label>
                  <input value={editSupplier.phone} onChange={(e) => setEditSupplier({ ...editSupplier, phone: e.target.value })} placeholder="e.g., 0300-1234567" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem' }}>Email Address <span style={{ fontSize: '0.7rem', color: '#6c757d' }}>(view only)</span></label>
                  <input
                    style={{ fontSize: '0.85rem', width: '100%', backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                    value={editSupplier.email || 'N/A'}
                    readOnly
                    disabled
                  />
                </div>
                <div className="form-field">
                  <label>City</label>
                  <input value={editSupplier.city} onChange={(e) => setEditSupplier({ ...editSupplier, city: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>CNIC</label>
                  <input style={{ fontSize: '0.85rem', width: '100%' }} value={editSupplier.cnic || 'N/A'} />
                </div>
                <div className="form-field form-field-full">
                  <label>Address</label>
                  <textarea
                    rows={3}
                    value={editSupplier.address}
                    onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })}
                  />
                </div>
                <div className="form-field form-field-full">
                  <label>Update Logo / Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateSupplier}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setEditSupplierId(null); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewSupplier && (
        <div className="modal-overlay">
          <div className="custom-modal-content view-modal-content">
            <div className="view-header-blue">
              {viewSupplier.pic ? (
                <img className="view-avatar-circle" src={viewSupplier.pic} alt={viewSupplier.companyName} />
              ) : (
                <div className="view-avatar-circle">
                  {getInitials(viewSupplier.companyName)}
                </div>
              )}
              <h2 className="view-title-name">{viewSupplier.companyName}</h2>
            </div>

            <div className="view-body">
              <div className="view-grid-centered">
                <div className="view-detail-item">
                  <label>Contact Number</label>
                  <span>{viewSupplier.phone || 'N/A'}</span>
                </div>
                <div className="view-detail-item">
                  <label>Name</label>
                  <span>{viewSupplier.contactPerson || 'N/A'}</span>
                </div>
                <div className="view-detail-item">
                  <label>Email</label>
                  <span>{viewSupplier.email || 'N/A'}</span>
                </div>
                <div className="view-detail-item">
                  <label>CNIC</label>
                  <span>{viewSupplier.cnic || 'N/A'}</span>
                </div>
              </div>

              <div className="view-detail-item view-detail-full">
                <label>Address</label>
                <div className="address-box-gray">
                  {viewSupplier.address || 'No Address Provided'}
                </div>
              </div>
            </div>

            <div className="view-modal-footer">
              <button className="btn btn-view-close" onClick={closeView}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="modal-overlay">
          <div className="custom-modal-content modal-small">
            <h3>Delete Supplier?</h3>

            {/* Message Popup */}
            <MessagePopup message={message} onClose={clearMessage} />

            <p className="confirm-text">
              This will permanently remove this supplier. This action cannot be undone.
            </p>
            <div className="modal-actions modal-actions-center">
              <button className="btn btn-delete" onClick={proceedDelete}>Yes, Delete</button>
              <button className="btn btn-cancel" onClick={cancelDelete}>Cancel</button>
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

export default Suppliers;