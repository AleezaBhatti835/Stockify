import { useState, useEffect } from 'react';
import './roles.css';
import './customer.css';
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
          border: '1px solid #dee2e6', flexShrink: 0
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

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerTypes, setCustomerTypes] = useState([]);
  
  // Pagination states
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

  // Inline message states for modals
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

  // Pagination logic
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
        const res = await fetch(`${API_BASE_URL}/api/customer-types`);
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
      const res = await fetch('http://localhost:5000/api/customers');
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
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
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

    // Check if nothing changed
    const originalCustomer = customers.find(c => c._id === editCustomerId);
    if (originalCustomer) {
      const isSame = 
        originalCustomer.name === editCustomer.name &&
        originalCustomer.email === editCustomer.email &&
        originalCustomer.contact === editCustomer.contact &&
        originalCustomer.address === editCustomer.address &&
        originalCustomer.cnic === editCustomer.cnic &&
        originalCustomer.customerTypeId === editCustomer.customerTypeId;
      
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
      const res = await fetch(`http://localhost:5000/api/customers/${editCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    if (!deleteTarget) {
      console.error('No customer selected for deletion');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${deleteTarget._id}`, {
        method: 'DELETE',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h4 style={{fontWeight:'200px',fontSize:'20px'}}>Manage Customers</h4>
        <button style={{ width: '16%', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setIsAddModalOpen(true); }}>
          + Add Customer
        </button>
      </div>

      {/* RESULTS COUNT */}
      <div style={{
        marginBottom: '15px',
        fontSize: '14px',
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Showing {currentItems.length} of {customers.length} customers</span>
      </div>

      {/* TABLE WRAPPED IN SCROLLABLE DIV */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '8%', textAlign: 'left' }}>Sr #</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Name</th>
              <th style={{ width: '23%', textAlign: 'left' }}>Email</th>
              <th style={{ width: '23%', textAlign: 'left' }}>Contact</th>
              <th style={{ width: '25%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((c, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={c._id}>
                    <td style={{ textAlign: 'left' }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AvatarImage pic={c.pic} name={c.name} size={32} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || 'N/A'}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</td>
                    <td className="actions-cell" style={{ textAlign: 'center', marginLeft: '27px' }}>
                       <div style={styles.actionGroup}>
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => setViewCustomer(c)} title="View">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => startEdit(c)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => requestDelete(c)}
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
                  No customers found. Click "Add Customer" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {customers.length > itemsPerPage && (
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

          <span style={{fontSize: '12px', fontWeight: '400',color:'#868484'}}>
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
        <AddCustomerModal 
          existingCustomers={customers} 
          onClose={() => { setIsAddModalOpen(false); }}
          onSuccess={(newCust) => {
            fetchCustomers();
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editCustomerId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Edit Customer</h3>

            {/* Inline Message */}
            <InlineMessage message={editMessage.text} type={editMessage.type} />

            {/* Image Upload Inline Message */}
            {imageMessage.text && (
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

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.7rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem' }}>Full Name *</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                  value={editCustomer.name} 
                  onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                  autoFocus
                />
              </div>
              
              {/* Email with suffix */}
              <div>
                <label style={{ fontSize: '0.7rem' }}>Email Address *</label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input 
                    style={{ fontSize: '0.7rem', width: '100%', padding: '8px', paddingRight: '85px', boxSizing: 'border-box' }} 
                    value={editCustomer.emailPrefix} 
                    onChange={(e) => setEditCustomer({ ...editCustomer, emailPrefix: e.target.value.replace(/@.*/, ''), email: `${e.target.value.replace(/@.*/, '')}@gmail.com` })} 
                    placeholder="username"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                  />
                  <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '11px', pointerEvents: 'none' }}>
                    @gmail.com
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>Contact Number *</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                  value={editCustomer.contact} 
                  onChange={(e) => setEditCustomer({ ...editCustomer, contact: formatContact(e.target.value) })} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '0.7rem' }}>Customer Type</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.7rem', boxSizing: 'border-box' }}
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

              <div>
                <label style={{ fontSize: '0.7rem' }}>CNIC</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
                  value={editCustomer.cnic || ''} 
                  maxLength={15}
                  onChange={(e) => setEditCustomer({ ...editCustomer, cnic: formatCNIC(e.target.value) })} 
                  placeholder="64822-1648208-2"
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateCustomer)}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.7rem' }}>Address</label>
                <textarea
                  style={{ fontSize: '0.7rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '8px', boxSizing: 'border-box' }}
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

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.7rem' }}>Update Image</label>
                <input style={{ fontSize: '0.7rem' }} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} />
                {uploading.edit ? (
                  <span style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <AvatarImage pic={editCustomer.pic} name={editCustomer.name} size={40} />
                    <span style={{ fontSize: '0.7rem', color: editCustomer.pic ? '#28a745' : '#6c757d' }}>
                      {editCustomer.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateCustomer}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setEditCustomerId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ height: 'auto', maxWidth: '520px', padding: 0, position: 'relative' }}>
            <div style={{
              backgroundColor: '#5aa7ef', padding: '24px 24px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
              <div style={{ borderRadius: '50%' }}>
                <AvatarImage pic={viewCustomer.pic} name={viewCustomer.name} size={84} />
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{viewCustomer.name}</h3>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Email Address</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d', wordBreak: 'break-word' }}>{viewCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Contact Number</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d' }}>{viewCustomer.contact || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Customer Type</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d' }}>{getCustomerTypeName(viewCustomer.customerTypeId)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>CNIC</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d' }}>{viewCustomer.cnic || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Address</label>
                <div style={{
                  marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: '8px',
                  backgroundColor: '#f4f6f8', border: '1px solid #e2e6ea', fontSize: '0.9rem',
                  color: '#212529', whiteSpace: 'pre-wrap', lineHeight: 1.5
                }}>
                  {viewCustomer.address || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewCustomer(null)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>
            
            {/* Inline Message */}
            <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fdecea',
              color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 14px'
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Delete Customer</h3>
            <p style={{ fontSize: '0.9rem', color: '#6c757d', margin: 0 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>

            <div className="modal-actions" style={{ marginTop: '22px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => {
                  setDeleteTarget(null);
                  setIsDeleteModalOpen(false);
                  setDeleteMessage({ text: '', type: '' });
                }} 
                style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
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

export default Customers;