import { useState, useEffect } from 'react';

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
          border: '2px solid var(--primary)', flexShrink: 0
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentNode.innerHTML = `
            <div style="width:${size}px;height:${size}px;border-radius:50%;background-color:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:${size * 0.35}px;font-weight:600;flex-shrink:0;">
              ${getInitials(name)}
            </div>
          `;
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--primary-light)',
      color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

  // ================= FETCH SUPPLIERS (WITH TOKEN) =================
  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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

  // ================= HANDLE IMAGE UPLOAD (WITH TOKEN) =================
  const handleImageUpload = async (e, isEditing) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
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

  // ================= HANDLE ADD SUPPLIER (WITH TOKEN) =================
  const handleAddSupplier = async () => {
    const fullEmail = newSupplier.emailPrefix.trim() ? `${newSupplier.emailPrefix.trim()}@gmail.com` : '';
    const payload = { ...newSupplier, email: fullEmail };

    if (!validateSupplier(payload, false)) {
      showAddMessage('Company Name, Contact Person and Phone are required!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { emailPrefix, ...finalPayload } = payload;
      const res = await fetch('http://localhost:5000/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  // ================= HANDLE UPDATE SUPPLIER (WITH TOKEN) =================
  const handleUpdateSupplier = async () => {
    const originalSupplier = suppliers.find(s => s._id === editSupplierId);
    
    if (!editSupplier.companyName || !editSupplier.contactPerson || !editSupplier.phone) {
      showEditMessage('Company Name, Contact Person and Phone are required!', 'error');
      return;
    }

    const fullEmail = editSupplier.emailPrefix.trim() ? `${editSupplier.emailPrefix.trim()}@gmail.com` : '';

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

    const payload = { ...editSupplier, email: fullEmail };

    if (!validateSupplier(payload, true)) {
      showEditMessage('Validation failed. Please check your inputs.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { emailPrefix, ...finalPayload } = payload;
      const res = await fetch(`http://localhost:5000/api/suppliers/${editSupplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  // ================= HANDLE DELETE SUPPLIER (WITH TOKEN) =================
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      
      {/* HEADER */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px', fontWeight: 600 }}>Manage Suppliers</h4>
        <button className="btn btn-primary" onClick={() => { setAddMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}>
          + Add Supplier
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>


        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '6%', textAlign: 'left' }}>Sr #</th>
                <th style={{ ...tableStyles.th, width: '20%' }}>Name</th>
                <th style={{ ...tableStyles.th, width: '20%' }}>Company</th>
                <th style={{ ...tableStyles.th, width: '22%' }}>Email</th>
                <th style={{ ...tableStyles.th, width: '16%' }}>Phone</th>
                <th style={{ ...tableStyles.th, width: '16%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((s, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr 
                      key={s._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ ...tableStyles.td, fontWeight: 500, color: 'var(--text-muted)' }}>{serialNumber}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AvatarImage pic={s.pic} name={s.contactPerson} size={32} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: 'var(--text-main)' }}>{s.contactPerson}</span>
                        </div>
                      </td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.companyName}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email || 'N/A'}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.phone}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <div style={styles.actionGroup}>
                          {/* View Button */}
                          <button style={actionStyles.iconBtnView} onClick={() => openView(s)} title="View">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>

                          {/* Edit Button */}
                          <button style={actionStyles.iconBtnEdit} onClick={() => startEdit(s)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            style={actionStyles.iconBtnDelete}
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
                  <td colSpan="6" style={tableStyles.emptyCell}>
                    No suppliers found. Click "+ Add Supplier" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {suppliers.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
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
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Supplier</h3>
              <button className="modal-close" onClick={() => { setIsAddModalOpen(false); setAddMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <InlineMessage message={addMessage.text} type={addMessage.type} />

              {imageMessage.text && !addMessage.text && (
                <div style={{
                  padding: '10px 14px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  backgroundColor: imageMessage.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: imageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)',
                  border: `1px solid ${imageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                  fontSize: '14px', fontWeight: 500
                }}>
                  {imageMessage.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Company Name *</label>
                  <input 
                    className="form-input"
                    value={newSupplier.companyName} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, companyName: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Name *</label>
                  <input 
                    className="form-input"
                    value={newSupplier.contactPerson} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone *</label>
                  <input 
                    className="form-input"
                    value={newSupplier.phone} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: formatContact(e.target.value) })} 
                    placeholder="+923001234567"
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>
                
                {/* Email with suffix */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input 
                      className="form-input"
                      style={{ paddingRight: '85px' }}
                      value={newSupplier.emailPrefix} 
                      onChange={(e) => setNewSupplier({ ...newSupplier, emailPrefix: e.target.value.replace(/@.*/, '') })} 
                      placeholder="username"
                      onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                    />
                    <span style={{ position: 'absolute', right: '12px', color: 'var(--text-light)', fontSize: '13px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">City</label>
                  <input 
                    className="form-input"
                    value={newSupplier.city} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CNIC</label>
                  <input 
                    className="form-input"
                    value={newSupplier.cnic} 
                    maxLength={15} 
                    onChange={(e) => setNewSupplier({ ...newSupplier, cnic: formatCNIC(e.target.value) })} 
                    placeholder="64822-1648208-2"
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddSupplier)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleAddSupplier();
                      }
                    }}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Upload Logo / Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} style={{ fontSize: '13px' }} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setAddMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSupplier}>Save Supplier</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editSupplierId && (
        <div className="modal-overlay" onClick={() => setEditSupplierId(null)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Supplier</h3>
              <button className="modal-close" onClick={() => { setEditSupplierId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <InlineMessage message={editMessage.text} type={editMessage.type} />

              {imageMessage.text && !editMessage.text && (
                <div style={{
                  padding: '10px 14px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  backgroundColor: imageMessage.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: imageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)',
                  border: `1px solid ${imageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                  fontSize: '14px', fontWeight: 500
                }}>
                  {imageMessage.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Company Name *</label>
                  <input 
                    className="form-input"
                    value={editSupplier.companyName} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, companyName: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Name *</label>
                  <input 
                    className="form-input"
                    value={editSupplier.contactPerson} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, contactPerson: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone *</label>
                  <input 
                    className="form-input"
                    value={editSupplier.phone} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, phone: formatContact(e.target.value) })} 
                    placeholder="+923001234567"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>
                
                {/* Email with suffix */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input 
                      className="form-input"
                      style={{ paddingRight: '85px' }}
                      value={editSupplier.emailPrefix} 
                      onChange={(e) => setEditSupplier({ ...editSupplier, emailPrefix: e.target.value.replace(/@.*/, ''), email: `${e.target.value.replace(/@.*/, '')}@gmail.com` })} 
                      placeholder="username"
                      onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                    />
                    <span style={{ position: 'absolute', right: '12px', color: 'var(--text-light)', fontSize: '13px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">City</label>
                  <input 
                    className="form-input"
                    value={editSupplier.city} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, city: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CNIC</label>
                  <input 
                    className="form-input"
                    value={editSupplier.cnic} 
                    maxLength={15} 
                    onChange={(e) => setEditSupplier({ ...editSupplier, cnic: formatCNIC(e.target.value) })} 
                    placeholder="64822-1648208-2"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateSupplier)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={editSupplier.address}
                    onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleUpdateSupplier();
                      }
                    }}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Update Logo / Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} style={{ fontSize: '13px' }} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setEditSupplierId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateSupplier}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewSupplier && (
        <div className="modal-overlay" onClick={closeView}>
          <div className="modal-container" style={{ maxWidth: '450px', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ backgroundColor: 'var(--primary)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
              {viewSupplier.pic ? (
                <img src={viewSupplier.pic} alt={viewSupplier.companyName} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: 'var(--shadow-sm)' }} />
              ) : (
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700,
                  border: '3px solid white', boxShadow: 'var(--shadow-sm)'
                }}>
                  {getInitials(viewSupplier.companyName)}
                </div>
              )}
              <h3 style={{ color: 'white', margin: 0, fontSize: '18px' }}>{viewSupplier.companyName}</h3>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Contact Number</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewSupplier.phone || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Name</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewSupplier.contactPerson || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Email</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewSupplier.email || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>CNIC</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewSupplier.cnic || 'N/A'}</p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Address</label>
                <p style={{ fontSize: '14px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500, backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  {viewSupplier.address || 'No Address Provided'}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeView}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && deleteTargetId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />
              
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
              }}>
                !
              </div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete Supplier?</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                This will permanently remove this supplier. This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={cancelDelete}>Cancel</button>
              <button className="btn btn-danger" onClick={proceedDelete}>Yes, Delete</button>
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
  }
};

const styles = {
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  }
};

export default Suppliers;