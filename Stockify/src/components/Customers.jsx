import { useState, useEffect } from 'react';
import './roles.css';
import './customer.css';
import AddCustomerModal from './AddCustomerModal';

const API_BASE_URL = 'http://localhost:5000';

// a full URL, depending on how the backend stored them. This normalizes both.
const getImageUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// Shows the customer's photo; if there's no pic saved, or the URL fails to
// load (e.g. broken path, server not reachable), falls back to an initials avatar.
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

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [customerTypes, setCustomerTypes] = useState([]);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(2);

  // Added customerTypeId to initial state
  const initialState = { name: '', email: '', contact: '', address: '', pic: '', cnic: '', status: 'Active', customerTypeId: '' };

  // Note: newCustomer is mostly handled by AddCustomerModal now, but keeping it for reference if needed elsewhere
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [editCustomer, setEditCustomer] = useState(initialState);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState({ add: false, edit: false });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = customers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(customers.length / itemsPerPage);

  // Reset to page 1 when customers change
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
        showMessage(`Image upload failed (server responded ${res.status}).`, 'error');
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        showMessage('Image upload failed: server response was not valid JSON.', 'error');
        return;
      }

      if (!data.imageUrl) {
        showMessage('Image upload failed: server response did not include an imageUrl.', 'error');
        return;
      }

      if (isEditing) {
        setEditCustomer(prev => ({ ...prev, pic: data.imageUrl }));
      }
      showMessage('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showMessage('Upload failed: could not reach the server.', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: false }));
    }
  };

  // Helper function to check for duplicates (for editing)
  const checkDuplicates = (payload, customerIdToExclude = null) => {
    if (payload.email) {
      const duplicateEmail = customers.find(c => c.email && c.email.toLowerCase() === payload.email.toLowerCase() && c._id !== customerIdToExclude);
      if (duplicateEmail) return "This Email is already registered to another customer.";
    }

    if (payload.contact) {
      const duplicateContact = customers.find(c => c.contact && c.contact === payload.contact && c._id !== customerIdToExclude);
      if (duplicateContact) return "This Contact Number is already registered to another customer.";
    }

    if (payload.cnic) {
      const duplicateCnic = customers.find(c => c.cnic && c.cnic === payload.cnic && c._id !== customerIdToExclude);
      if (duplicateCnic) return "This CNIC is already registered to another customer.";
    }

    return null;
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer.name || !editCustomer.contact) {
      showMessage('Name and Contact are required!', 'error');
      return;
    }

    const duplicateError = checkDuplicates(editCustomer, editCustomerId);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/customers/${editCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCustomer)
      });
      if (res.ok) {
        showMessage('Customer updated successfully!', 'success');
        setEditCustomerId(null);
        fetchCustomers();
      } else {
        showMessage('Update failed. Server responded with an error.', 'error');
      }
    } catch (error) {
      showMessage('Update failed. Cannot reach server.', 'error');
    }
  };

  const requestDelete = (customer) => {
    setDeleteTarget(customer);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`http://localhost:5000/api/customers/${deleteTarget._id}`, { method: 'DELETE' });
      showMessage('Customer deleted successfully!', 'success');
      fetchCustomers();
    } catch (error) {
      showMessage('Error deleting customer.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const startEdit = (customer) => {
    setEditCustomerId(customer._id);
    setEditCustomer({
      name: customer.name || '',
      email: customer.email || '',
      contact: customer.contact || '',
      address: customer.address || '',
      pic: customer.pic || '',
      cnic: customer.cnic || '',
      customerTypeId: customer.customerTypeId || ''
    });
  };

  const startView = (customer) => {
    setViewCustomer(customer);
  };

  // Helper function to get customer type name by ID
  const getCustomerTypeName = (typeId) => {
    if (!typeId) return 'N/A';
    const found = customerTypes.find(ct => ct._id === typeId);
    return found ? found.name : 'N/A';
  };

  return (
    <div className="roles-container">
      <MessagePopup message={message} onClose={clearMessage} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h2>Manage Customers</h2>
        <button style={{ width: '16%', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap' }} onClick={() => setIsAddModalOpen(true)}>
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
              <th style={{ width: '8%', textAlign: 'center' }}>Sr #</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Name</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Email</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Contact</th>
              <th style={{ width: '17%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((c, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={c._id}>
                    <td style={{ textAlign: 'center' }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AvatarImage pic={c.pic} name={c.name} size={32} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || 'N/A'}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</td>
                    <td className="actions-cell" style={{ textAlign: 'center' }}>
                       <div style={styles.actionGroup}>
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => startView(c)} title="View">
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
                          onClick={() => {
                            requestDelete(c._id);
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

      {/* ADD MODAL USING THE NEW COMPONENT */}
      {isAddModalOpen && (
        <AddCustomerModal 
          existingCustomers={customers} 
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newCust) => {
            fetchCustomers(); 
            showMessage('Customer added successfully!', 'success');
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editCustomerId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Edit Customer</h3>

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Full Name *</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }} value={editCustomer.name} onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Email Address <span style={{ fontSize: '0.7rem', color: '#6c757d' }}>(view only)</span></label>
                <input
                  style={{ fontSize: '0.85rem', width: '100%', backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                  value={editCustomer.email || 'N/A'}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Contact Number *</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }} value={editCustomer.contact} onChange={(e) => setEditCustomer({ ...editCustomer, contact: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Customer Type</label>
                <select
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.85rem' }}
                  value={editCustomer.customerTypeId || ''}
                  onChange={(e) => setEditCustomer({ ...editCustomer, customerTypeId: e.target.value })}
                >
                  <option value="">-- Select Type --</option>
                  {customerTypes.map(ct => (
                    <option key={ct._id} value={ct._id}>{ct.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>CNIC</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }} value={editCustomer.cnic || ''} onChange={(e) => setEditCustomer({ ...editCustomer, cnic: e.target.value })} placeholder="XXXXX-XXXXXXX-X" />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Address</label>
                <textarea
                  style={{ fontSize: '0.85rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                  value={editCustomer.address}
                  onChange={(e) => setEditCustomer({ ...editCustomer, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Update Image</label>
                <input style={{ fontSize: '0.85rem' }} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} />
                {uploading.edit ? (
                  <span style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <AvatarImage pic={editCustomer.pic} name={editCustomer.name} size={40} />
                    <span style={{ fontSize: '0.75rem', color: editCustomer.pic ? '#28a745' : '#6c757d' }}>
                      {editCustomer.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateCustomer}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setEditCustomerId(null); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL - Added Customer Type */}
      {viewCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ height: 'auto', maxWidth: '520px', padding: 0, position: 'relative' }}>

            {/* Header with photo */}
            <div style={{
              backgroundColor: '#5aa7ef', padding: '24px 24px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
              <div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: '50%', border: '3px solid white' }}>
                <AvatarImage pic={viewCustomer.pic} name={viewCustomer.name} size={84} />
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{viewCustomer.name}</h3>
            </div>

            {/* Details */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Email Address</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529', wordBreak: 'break-word' }}>{viewCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Contact Number</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewCustomer.contact || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Customer Type</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{getCustomerTypeName(viewCustomer.customerTypeId)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>CNIC</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewCustomer.cnic || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Address</label>
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
              <button onClick={() => setViewCustomer(null)} style={{ backgroundColor: '#6c757d', color: 'white' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>

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
              <button onClick={() => setDeleteTarget(null)} style={{ backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
              <button onClick={handleDelete} style={{ backgroundColor: '#dc3545', color: 'white' }}>Delete</button>
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