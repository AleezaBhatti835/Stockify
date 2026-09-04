import { useState, useEffect } from 'react';
import AddCustomerModal from './AddCustomerModal';

const API_BASE_URL = 'http://localhost:5000';

const getImageUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function AvatarImage({ pic, name, size }) {
  const [failed, setFailed] = useState(false);
  const url = getImageUrl(pic);
  const showImage = url && !failed;

  if (showImage) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1px solid var(--border-color)', flexShrink: 0
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--primary)',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.35}px`, fontWeight: 600, flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  );
}

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerTypes, setCustomerTypes] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const initialState = {
    name: '', emailPrefix: '', contact: '+92', address: '', pic: '', cnic: '', status: 'Active', customerTypeId: ''
  };

  const [editCustomerId, setEditCustomerId] = useState(null);
  const [editCustomer, setEditCustomer] = useState(initialState);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [uploading, setUploading] = useState({ add: false, edit: false });

  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });
  const [imageMessage, setImageMessage] = useState({ text: '', type: '' });

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
        }
        if (editCustomerId) {
          e.preventDefault();
          setEditCustomerId(null);
          setEditMessage({ text: '', type: '' });
          setImageMessage({ text: '', type: '' });
        }
        if (viewCustomer) {
          e.preventDefault();
          setViewCustomer(null);
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          setDeleteTarget(null);
          setIsDeleteModalOpen(false);
          setDeleteMessage({ text: '', type: '' });
        }
      }

      if (e.key === 'Enter') {
        if (editCustomerId) {
          e.preventDefault();
          handleUpdateCustomer();
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editCustomerId, viewCustomer, isDeleteModalOpen, editCustomer, deleteTarget]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = customers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(customers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [customers]);

  useEffect(() => {
    fetchCustomers();
    const fetchCustomerTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/customer-types`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setCustomerTypes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching customer types:', err);
      }
    };
    fetchCustomerTypes();
  }, []);

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

  const showImageMessage = (text, type) => {
    setImageMessage({ text, type });
    setTimeout(() => {
      setImageMessage({ text: '', type: '' });
    }, 3000);
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleImageUpload = async (e, isEditing) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: true }));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const raw = await res.text();

      if (!res.ok) {
        showImageMessage(`❌ Image upload failed (server responded ${res.status}).`, 'error');
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        showImageMessage('❌ Image upload failed: server response was not valid JSON.', 'error');
        return;
      }

      if (!data.imageUrl) {
        showImageMessage('❌ Image upload failed: server response did not include an imageUrl.', 'error');
        return;
      }

      if (isEditing) {
        setEditCustomer(prev => ({ ...prev, pic: data.imageUrl }));
      }
      showImageMessage('✅ Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showImageMessage('❌ Upload failed: could not reach the server.', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: false }));
    }
  };

  const checkDuplicates = (payload, customerIdToExclude = null) => {
    if (payload.email) {
      const duplicateEmail = customers.find(c => c.email && c.email.toLowerCase() === payload.email.toLowerCase() && c._id !== customerIdToExclude);
      if (duplicateEmail) return "This Email is already registered to another customer.";
    }

    if (payload.contact && payload.contact !== '+92') {
      const duplicateContact = customers.find(c => c.contact && c.contact === payload.contact && c._id !== customerIdToExclude);
      if (duplicateContact) return "This Contact Number is already registered to another customer.";
    }

    if (payload.cnic && payload.cnic.trim() !== '') {
      const duplicateCnic = customers.find(c => c.cnic && c.cnic === payload.cnic && c._id !== customerIdToExclude);
      if (duplicateCnic) return "This CNIC is already registered to another customer.";
    }

    return null;
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer.name || !editCustomer.contact) {
      showEditMessage('Name and Contact are required!', 'error');
      return;
    }

    const originalCustomer = customers.find(c => c._id === editCustomerId);
    if (originalCustomer) {
      const isSame =
        originalCustomer.name === editCustomer.name &&
        originalCustomer.email === editCustomer.email &&
        originalCustomer.contact === editCustomer.contact &&
        originalCustomer.address === editCustomer.address &&
        originalCustomer.cnic === editCustomer.cnic &&
        originalCustomer.customerTypeId === editCustomer.customerTypeId &&
        originalCustomer.pic === editCustomer.pic;

      if (isSame) {
        showEditMessage('Nothing to update!', 'info');
        return;
      }
    }

    const duplicateError = checkDuplicates(editCustomer, editCustomerId);
    if (duplicateError) {
      showEditMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/customers/${editCustomerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editCustomer)
      });
      if (res.ok) {
        showEditMessage('Customer updated successfully!', 'success');
        setTimeout(() => {
          setEditCustomerId(null);
          setEditMessage({ text: '', type: '' });
          fetchCustomers();
        }, 500);
      } else {
        showEditMessage('Update failed. Server responded with an error.', 'error');
      }
    } catch (error) {
      showEditMessage('Update failed. Cannot reach server.', 'error');
    }
  };

  const requestDelete = (customer) => {
    setDeleteMessage({ text: '', type: '' });
    setDeleteTarget(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/customers/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showDeleteMessage('Customer deleted successfully!', 'success');
        setTimeout(() => {
          fetchCustomers();
          setDeleteTarget(null);
          setIsDeleteModalOpen(false);
          setDeleteMessage({ text: '', type: '' });
        }, 500);
      } else {
        const errorData = await response.json();
        showDeleteMessage(errorData.message || 'Error deleting customer.', 'error');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      showDeleteMessage('Error deleting customer. Please try again.', 'error');
    }
  };

  const startEdit = (customer) => {
    setEditMessage({ text: '', type: '' });
    setImageMessage({ text: '', type: '' });
    setEditCustomerId(customer._id);
    let emailPrefixVal = customer.email || '';
    if (emailPrefixVal.endsWith('@gmail.com')) {
      emailPrefixVal = emailPrefixVal.replace('@gmail.com', '');
    }

    setEditCustomer({
      name: customer.name || '',
      email: customer.email || '',
      emailPrefix: emailPrefixVal,
      contact: customer.contact || '+92',
      address: customer.address || '',
      pic: customer.pic || '',
      cnic: customer.cnic || '',
      customerTypeId: customer.customerTypeId || ''
    });
  };

  const getCustomerTypeName = (typeId) => {
    if (!typeId) return 'N/A';
    const found = customerTypes.find(ct => ct._id === typeId);
    return found ? found.name : 'N/A';
  };

  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const InlineMessage = ({ message, type }) => {
    if (!message) return null;
    const colors = {
      success: { bg: 'var(--success-bg)', text: 'var(--success)', border: 'var(--success)', icon: '✅' },
      error: { bg: 'var(--danger-bg)', text: 'var(--danger)', border: 'var(--danger)', icon: '⚠️' },
      info: { bg: 'var(--primary-light)', text: 'var(--primary)', border: 'var(--primary)', icon: 'ℹ️' }
    };
    const style = colors[type] || colors.info;

    return (
      <div style={{
        padding: '10px 14px',
        marginBottom: '16px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontSize: '13px',
        fontWeight: 500
      }}>
        {style.icon} {message}
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">

      {/* HEADER SECTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h4 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>Manage Customers</h4>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Customer
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '8%' }}>Sr #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Name</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '27%' }}>Email</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Contact</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((c, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={c._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{serialNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AvatarImage pic={c.pic} name={c.name} size={32} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || 'N/A'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>

                          {/* View Button */}
                          <button style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setViewCustomer(c)} title="View">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>

                          {/* Edit Button */}
                          <button style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => startEdit(c)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => requestDelete(c)} title="Delete">
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
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No customers found. Click "+ Add Customer" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {customers.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <AddCustomerModal
          existingCustomers={customers}
          onClose={() => { setIsAddModalOpen(false); }}
          onSuccess={() => { fetchCustomers(); }}
        />
      )}

      {/* EDIT MODAL */}
      {editCustomerId && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', padding: '16px 20px', flexShrink: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)', margin: 0 }}>Edit Customer</h3>
              <button className="modal-close" onClick={() => { setEditCustomerId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>✕</button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
              <InlineMessage message={editMessage.text} type={editMessage.type} />
              {imageMessage.text && <InlineMessage message={imageMessage.text} type={imageMessage.type} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                    value={editCustomer.name}
                    onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ paddingRight: '90px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                      value={editCustomer.emailPrefix}
                      onChange={(e) => setEditCustomer({ ...editCustomer, emailPrefix: e.target.value.replace(/@.*/, ''), email: `${e.target.value.replace(/@.*/, '')}@gmail.com` })}
                      placeholder="username"
                      onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                    />
                    <span style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', fontSize: '12px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input
                    className="form-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                    value={editCustomer.contact}
                    onChange={(e) => setEditCustomer({ ...editCustomer, contact: formatContact(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <select
                    className="form-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                    value={editCustomer.customerTypeId || ''}
                    onChange={(e) => setEditCustomer({ ...editCustomer, customerTypeId: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateCustomer();
                      }
                    }}
                  >
                    <option value="">-- Select Type --</option>
                    {customerTypes.map(ct => (
                      <option key={ct._id} value={ct._id}>{ct.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">CNIC</label>
                  <input
                    className="form-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                    value={editCustomer.cnic || ''}
                    maxLength={15}
                    onChange={(e) => setEditCustomer({ ...editCustomer, cnic: formatCNIC(e.target.value) })}
                    placeholder="64822-1648208-2"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                    value={editCustomer.address}
                    onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleUpdateCustomer();
                      }
                    }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block' }}>Update Image</label>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '6px', 
                    padding: '4px 4px',
                    backgroundColor: 'white',
                    width: '100%',
                    justifyContent: 'flex-start' 
                  }}>
                    <label style={{
                      backgroundColor: 'var(--header)',
                      color: 'white',
                      padding: '6px 24px',
                      borderRadius: '4px',
                      cursor: uploading.edit ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: 0,
                      border: 'none',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, true)}
                        disabled={uploading.edit}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {editCustomer.pic ? 'File selected' : 'No file chosen'}
                    </span>
                  </div>

                  {uploading.edit ? (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>Uploading image…</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                      <AvatarImage pic={editCustomer.pic} name={editCustomer.name} size={40} />
                      <span style={{ fontSize: '13px', color: editCustomer.pic ? 'var(--success)' : 'var(--text-muted)' }}>
                        {editCustomer.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', padding: '16px 20px', flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => { setEditCustomerId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateCustomer}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '550px', padding: 0, textAlign: 'left' }}>

            <div style={{
              backgroundColor: 'var(--primary-other)', padding: '24px', display: 'flex', textAlign: 'left',
              flexDirection: 'column', alignItems: 'center', gap: '10px', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)'
            }}>
              <AvatarImage pic={viewCustomer.pic} name={viewCustomer.name} size={84} />
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '600' }}>{viewCustomer.name}</h3>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label className="form-label">Email Address</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{viewCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">Contact Number</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)' }}>{viewCustomer.contact || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">Customer Type</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)' }}>{getCustomerTypeName(viewCustomer.customerTypeId)}</p>
                </div>
                <div>
                  <label className="form-label">CNIC</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)' }}>{viewCustomer.cnic || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="form-label">Address</label>
                <div style={{
                  marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '13px',
                  color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5
                }}>
                  {viewCustomer.address || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={() => setViewCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && deleteTarget && (
        <div className="modal-overlay" onClick={() => { setDeleteTarget(null); setIsDeleteModalOpen(false); setDeleteMessage({ text: '', type: '' }); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderTop: '6px solid var(--danger)' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '20px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span> Delete Customer
              </h3>
            </div>

            <div className="modal-body">
              <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteTarget.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', backgroundColor: 'transparent' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDeleteTarget(null);
                  setIsDeleteModalOpen(false);
                  setDeleteMessage({ text: '', type: '' });
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;