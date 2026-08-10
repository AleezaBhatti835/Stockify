import { useState, useEffect } from 'react';
import './supplier.css';

// ====== AVATAR COMPONENT ======
function AvatarImage({ pic, name, size }) {
  const getInitials = (name) => {
    if (!name) return 'S';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  if (pic) {
    return (
      <img
        src={pic.startsWith('http') ? pic : `http://localhost:5000${pic.startsWith('/') ? '' : '/'}${pic}`}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1px solid #dee2e6', flexShrink: 0
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentNode.innerHTML = `
            <div style="width:${size}px;height:${size}px;border-radius:50%;background-color:#5aa7ef;color:white;display:flex;align-items:center;justify-content:center;font-size:${size * 0.35}px;font-weight:600;flex-shrink:0;">
              ${getInitials(name)}
            </div>
          `;
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: '#5aa7ef',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.35}px`, fontWeight: 600, flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  );
}

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const initialState = {
    companyName: '',
    contactPerson: '',
    phone: '+92',
    emailPrefix: '',
    email: '',
    address: '',
    city: '',
    cnic: '',
    pic: '',
    status: 'Active'
  };

  const [newSupplier, setNewSupplier] = useState(initialState);
  const [editSupplierId, setEditSupplierId] = useState(null);
  const [editSupplier, setEditSupplier] = useState(initialState);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [viewSupplier, setViewSupplier] = useState(null);

  // Inline message states for modals
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });
  const [imageMessage, setImageMessage] = useState({ text: '', type: '' });

  // Helper functions for formatting CNIC and Contact
  const formatCNIC = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 13);
    if (numbers.length <= 5) {
      return numbers;
    } else if (numbers.length <= 12) {
      return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    } else {
      return `${numbers.slice(0, 5)}-${numbers.slice(5, 12)}-${numbers.slice(12, 13)}`;
    }
  };

  const formatContact = (value) => {
    let numbers = value.replace(/\D/g, '');
    if (numbers.startsWith('92')) {
      numbers = numbers.slice(2);
    }
    numbers = numbers.slice(0, 10);
    return `+92${numbers}`;
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
          setNewSupplier(initialState);
          setAddMessage({ text: '', type: '' });
          setImageMessage({ text: '', type: '' });
        }
        if (editSupplierId) {
          e.preventDefault();
          setEditSupplierId(null);
          setEditMessage({ text: '', type: '' });
          setImageMessage({ text: '', type: '' });
        }
        if (viewSupplier) {
          e.preventDefault();
          setViewSupplier(null);
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          setDeleteTargetId(null);
          setIsDeleteModalOpen(false);
          setDeleteMessage({ text: '', type: '' });
        }
      }

      if (e.key === 'Enter') {
        if (isAddModalOpen) {
          e.preventDefault();
          handleAddSupplier();
        } else if (editSupplierId) {
          e.preventDefault();
          handleUpdateSupplier();
        } else if (isDeleteModalOpen) {
          e.preventDefault();
          proceedDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editSupplierId, viewSupplier, isDeleteModalOpen, newSupplier, editSupplier, deleteTargetId]);

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

  const showImageMessage = (text, type) => {
    setImageMessage({ text, type });
    setTimeout(() => setImageMessage({ text: '', type: '' }), 3000);
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
        showImageMessage('✅ Image uploaded successfully!', 'success');
      } else {
        showImageMessage('❌ Upload failed. Server error.', 'error');
      }
    } catch (error) {
      showImageMessage('❌ Upload failed. Could not reach server.', 'error');
    }
  };

  const checkDuplicate = (field, value, excludeId = null) => {
    return suppliers.some(supplier => {
      if (excludeId && supplier._id === excludeId) return false;
      if (!value || value.trim() === '') return false;
      
      if (field === 'email') {
        return supplier.email?.toLowerCase() === value.toLowerCase().trim();
      }
      if (field === 'phone') {
        return supplier.phone?.trim() === value.trim();
      }
      if (field === 'cnic') {
        return supplier.cnic?.trim() === value.trim();
      }
      return false;
    });
  };

  const validateSupplier = (supplierData, isEditing = false) => {
    if (!supplierData.companyName || !supplierData.contactPerson || !supplierData.phone) {
      return false;
    }

    if (supplierData.email && supplierData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(supplierData.email)) {
        return false;
      }
    }

    if (supplierData.phone && supplierData.phone !== '+92') {
      const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
      if (!phoneRegex.test(supplierData.phone.trim())) {
        return false;
      }
    }

    const excludeId = isEditing ? editSupplierId : null;
    if (supplierData.phone && supplierData.phone !== '+92') {
      if (checkDuplicate('phone', supplierData.phone, excludeId)) {
        return false;
      }
    }

    if (supplierData.email && supplierData.email.trim() !== '') {
      if (checkDuplicate('email', supplierData.email, excludeId)) {
        return false;
      }
    }

    if (supplierData.cnic && supplierData.cnic.trim() !== '') {
      if (checkDuplicate('cnic', supplierData.cnic, excludeId)) {
        return false;
      }
    }

    return true;
  };

  const handleAddSupplier = async () => {
    const fullEmail = newSupplier.emailPrefix.trim() ? `${newSupplier.emailPrefix.trim()}@gmail.com` : '';
    const payload = { ...newSupplier, email: fullEmail };

    if (!validateSupplier(payload, false)) {
      showAddMessage('Company Name, Contact Person and Phone are required!', 'error');
      return;
    }

    try {
      const { emailPrefix, ...finalPayload } = payload;
      const res = await fetch('http://localhost:5000/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      if (res.ok) {
        showAddMessage('Supplier added successfully!', 'success');
        setTimeout(() => {
          setNewSupplier(initialState);
          setIsAddModalOpen(false);
          setAddMessage({ text: '', type: '' });
          fetchSuppliers();
        }, 500);
      } else {
        const errorData = await res.json();
        showAddMessage(errorData.message || 'Error saving supplier.', 'error');
      }
    } catch (error) {
      showAddMessage('Server error.', 'error');
    }
  };

  const handleUpdateSupplier = async () => {
    const originalSupplier = suppliers.find(s => s._id === editSupplierId);
    
    if (!editSupplier.companyName || !editSupplier.contactPerson || !editSupplier.phone) {
      showEditMessage('Company Name, Contact Person and Phone are required!', 'error');
      return;
    }

    // Build full email from prefix
    const fullEmail = editSupplier.emailPrefix.trim() ? `${editSupplier.emailPrefix.trim()}@gmail.com` : '';

    // Check if nothing changed
    if (originalSupplier) {
      const isSame = 
        originalSupplier.companyName === editSupplier.companyName &&
        originalSupplier.contactPerson === editSupplier.contactPerson &&
        originalSupplier.phone === editSupplier.phone &&
        originalSupplier.email === fullEmail &&
        originalSupplier.address === editSupplier.address &&
        originalSupplier.city === editSupplier.city &&
        originalSupplier.cnic === editSupplier.cnic;
      
      if (isSame) {
        showEditMessage('Nothing to update!', 'info');
        return;
      }
    }

    // Create payload with full email
    const payload = { ...editSupplier, email: fullEmail };

    if (!validateSupplier(payload, true)) {
      showEditMessage('Validation failed. Please check your inputs.', 'error');
      return;
    }

    try {
      const { emailPrefix, ...finalPayload } = payload;
      const res = await fetch(`http://localhost:5000/api/suppliers/${editSupplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      if (res.ok) {
        showEditMessage('Supplier updated successfully!', 'success');
        setTimeout(() => {
          setEditSupplierId(null);
          setEditMessage({ text: '', type: '' });
          fetchSuppliers();
        }, 500);
      } else {
        const errorData = await res.json();
        showEditMessage(errorData.message || 'Error updating supplier.', 'error');
      }
    } catch (error) {
      showEditMessage('Update failed.', 'error');
    }
  };

  const confirmDelete = (id) => {
    setDeleteMessage({ text: '', type: '' });
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const cancelDelete = () => {
    setDeleteTargetId(null);
    setIsDeleteModalOpen(false);
    setDeleteMessage({ text: '', type: '' });
  };

  const proceedDelete = () => {
    handleDelete(deleteTargetId);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/suppliers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showDeleteMessage('Supplier deleted successfully!', 'success');
        setTimeout(() => {
          setDeleteTargetId(null);
          setIsDeleteModalOpen(false);
          setDeleteMessage({ text: '', type: '' });
          fetchSuppliers();
        }, 500);
      } else {
        const errorData = await res.json();
        showDeleteMessage(errorData.message || 'Error deleting supplier.', 'error');
      }
    } catch (error) {
      showDeleteMessage('Error deleting supplier.', 'error');
    }
  };

  const startEdit = (supplier) => {
    setEditMessage({ text: '', type: '' });
    setImageMessage({ text: '', type: '' });
    setEditSupplierId(supplier._id);
    
    let emailPrefixVal = supplier.email || '';
    if (emailPrefixVal.endsWith('@gmail.com')) {
      emailPrefixVal = emailPrefixVal.replace('@gmail.com', '');
    }

    setEditSupplier({
      companyName: supplier.companyName || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '+92',
      email: supplier.email || '',
      emailPrefix: emailPrefixVal,
      address: supplier.address || '',
      city: supplier.city || '',
      cnic: supplier.cnic || '',
      pic: supplier.pic || ''
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

  // Handle Enter key on input fields
  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
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
      <div className="page-header">
        <h4>Manage Suppliers</h4>
        <button style={{ width: '16%', color: 'white', backgroundColor: '#5aa7ef' }} className="btn btn-primary" onClick={() => { setAddMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}>+ Add Supplier</button>
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
              <th style={{ width: '6%', textAlign: 'left' }}>Sr #</th>
              <th style={{ width: "14%" }}>Name</th>
              <th style={{ width: "12%" }}>Company</th>
              <th style={{ width: "18%" }}>Email</th>
              <th style={{ width: "16%" }}>Phone</th>
              <th style={{ width: "16%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((s, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={s._id}>
                    <td style={{ textAlign: 'left' }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AvatarImage pic={s.pic} name={s.contactPerson} size={32} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.contactPerson}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.companyName}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email || 'N/A'}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.phone}</td>
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
                          onClick={() => confirmDelete(s._id)}
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
          <div className="custom-modal-content">
            <h3 className="modal-title-left">Add New Supplier</h3>

            {/* Inline Message */}
            <InlineMessage message={addMessage.text} type={addMessage.type} />

            {/* Image Upload Inline Message */}
            {imageMessage.text && !addMessage.text && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: '4px',
                backgroundColor: imageMessage.type === 'error' ? '#fdecea' : '#d4edda',
                color: imageMessage.type === 'error' ? '#dc3545' : '#155724',
                border: `1px solid ${imageMessage.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
                fontSize: '13px'
              }}>
                {imageMessage.text}
              </div>
            )}

            <div className="supplier-form-container">
              <div className="form-grid">
                <div className="form-field">
                  <label>Company Name *</label>
                  <input 
                    value={newSupplier.companyName} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                    autoFocus
                  />
                </div>
                <div className="form-field">
                  <label>Name *</label>
                  <input 
                    value={newSupplier.contactPerson} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>
                <div className="form-field">
                  <label>Phone *</label>
                  <input 
                    value={newSupplier.phone} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: formatContact(e.target.value) })} 
                    placeholder="+923001234567"
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>
                
                {/* Email with suffix */}
                <div className="form-field">
                  <label>Email</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input 
                      style={{ width: '100%', paddingRight: '85px', boxSizing: 'border-box' }}
                      value={newSupplier.emailPrefix} 
                      onChange={(e) => setNewSupplier({ ...newSupplier, emailPrefix: e.target.value.replace(/@.*/, '') })} 
                      placeholder="username"
                      onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                    />
                    <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '12px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-field">
                  <label>City</label>
                  <input 
                    value={newSupplier.city} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>
                
                <div className="form-field">
                  <label>CNIC</label>
                  <input 
                    value={newSupplier.cnic} 
                    maxLength={15} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, cnic: formatCNIC(e.target.value) })} 
                    placeholder="64822-1648208-2"
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Address</label>
                  <textarea
                    rows={3}
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleAddSupplier();
                      }
                    }}
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
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); setAddMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editSupplierId && (
        <div className="modal-overlay">
          <div className="custom-modal-content">
            <h3 className="modal-title-left">Edit Supplier</h3>

            {/* Inline Message */}
            <InlineMessage message={editMessage.text} type={editMessage.type} />

            {/* Image Upload Inline Message */}
            {imageMessage.text && !editMessage.text && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: '4px',
                backgroundColor: imageMessage.type === 'error' ? '#fdecea' : '#d4edda',
                color: imageMessage.type === 'error' ? '#dc3545' : '#155724',
                border: `1px solid ${imageMessage.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
                fontSize: '13px'
              }}>
                {imageMessage.text}
              </div>
            )}

            <div className="supplier-form-container">
              <div className="form-grid">
                <div className="form-field">
                  <label>Company Name *</label>
                  <input 
                    value={editSupplier.companyName} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, companyName: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                    autoFocus
                  />
                </div>
                <div className="form-field">
                  <label>Name *</label>
                  <input 
                    value={editSupplier.contactPerson} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, contactPerson: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>
                <div className="form-field">
                  <label>Phone *</label>
                  <input 
                    value={editSupplier.phone} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, phone: formatContact(e.target.value) })} 
                    placeholder="+923001234567"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>
                
                {/* Email with suffix */}
                <div className="form-field">
                  <label>Email</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input 
                      style={{ width: '100%', paddingRight: '85px', boxSizing: 'border-box' }}
                      value={editSupplier.emailPrefix} 
                      onChange={(e) => setEditSupplier({ ...editSupplier, emailPrefix: e.target.value.replace(/@.*/, ''), email: `${e.target.value.replace(/@.*/, '')}@gmail.com` })} 
                      placeholder="username"
                      onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                    />
                    <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '12px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-field">
                  <label>City</label>
                  <input 
                    value={editSupplier.city} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, city: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>

                <div className="form-field">
                  <label>CNIC</label>
                  <input 
                    value={editSupplier.cnic} 
                    maxLength={15} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, cnic: formatCNIC(e.target.value) })} 
                    placeholder="64822-1648208-2"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>

                <div className="form-field form-field-full">
                  <label>Address</label>
                  <textarea
                    rows={3}
                    value={editSupplier.address}
                    onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleUpdateSupplier();
                      }
                    }}
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
              <button className="btn btn-cancel" onClick={() => { setEditSupplierId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewSupplier && (
        <div className="modal-overlay">
          <div style={{width:'20%'}} className="custom-modal-content view-modal-content">
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
      {isDeleteModalOpen && deleteTargetId && (
        <div className="modal-overlay">
          <div className="custom-modal-content modal-small">
            <h3>Delete Supplier?</h3>

            {/* Inline Message */}
            <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

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

export default Suppliers;