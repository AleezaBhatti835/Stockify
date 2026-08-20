import React, { useState, useEffect } from 'react';

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
          border: '2px solid var(--primary)', flexShrink: 0
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

// Inline Message Component
function InlineMessage({ message, type }) {
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
}

export default function AddCustomerModal({ onClose, onSuccess, existingCustomers = [] }) {
  const initialState = { 
    name: '', emailPrefix: '', contact: '+92', address: '', pic: '', cnic: '', status: 'Active', customerTypeId: '' 
  };
  
  const [newCustomer, setNewCustomer] = useState(initialState);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [customerTypes, setCustomerTypes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
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
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newCustomer]);

  // Fetch Customer Types on mount (With Token)
  useEffect(() => {
    const fetchCustomerTypes = async () => {
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
      }
    };
    fetchCustomerTypes();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const showImageMessage = (text, type) => {
    setImageMessage({ text, type });
    setTimeout(() => setImageMessage({ text: '', type: '' }), 3000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/upload`, { 
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${token}`
        },
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

      setNewCustomer(prev => ({ ...prev, pic: data.imageUrl }));
      showImageMessage('✅ Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showImageMessage('❌ Upload failed: could not reach the server.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const checkDuplicates = (payload) => {
    if (payload.email) {
      const duplicateEmail = existingCustomers.find(c => c.email && c.email.toLowerCase() === payload.email.toLowerCase());
      if (duplicateEmail) return "This Email is already registered to another customer.";
    }
    if (payload.contact && payload.contact !== '+92') {
      const duplicateContact = existingCustomers.find(c => c.contact && c.contact === payload.contact);
      if (duplicateContact) return "This Contact Number is already registered to another customer.";
    }
    if (payload.cnic && payload.cnic.trim() !== '') {
      const duplicateCnic = existingCustomers.find(c => c.cnic && c.cnic === payload.cnic);
      if (duplicateCnic) return "This CNIC is already registered to another customer.";
    }
    return null;
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.contact || !newCustomer.emailPrefix) {
      showMessage('Name, Email prefix, and Contact are required!', 'error');
      return;
    }

    const fullEmail = `${newCustomer.emailPrefix.trim()}@gmail.com`;
    const payloadObj = { ...newCustomer, email: fullEmail };

    const duplicateError = checkDuplicates(payloadObj);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { emailPrefix, ...finalPayload } = payloadObj;
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalPayload)
      });
      
      if (res.ok) {
        const savedCustomer = await res.json();
        showMessage('Customer added successfully!', 'success');
        setTimeout(() => {
          if (savedCustomer) {
            onSuccess(savedCustomer);
          }
          onClose();
        }, 500);
      } else {
        const errData = await res.json().catch(() => null);
        showMessage(errData?.message || 'Error saving customer.', 'error');
      }
    } catch (error) {
      showMessage('Server error.', 'error');
    }
  };

  // Handle Enter key on input fields
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomer();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add New Customer</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Inline Message */}
          <InlineMessage message={message.text} type={message.type} />

          {/* Image Upload Inline Message */}
          {imageMessage.text && !message.text && (
            <div style={{
              padding: '10px 14px',
              marginBottom: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: imageMessage.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
              color: imageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)',
              border: `1px solid ${imageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
              fontSize: '14px',
              fontWeight: 500
            }}>
              {imageMessage.text}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name *</label>
              <input 
                className="form-input" 
                value={newCustomer.name} 
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                onKeyDown={handleInputKeyDown}
                autoFocus
              />
            </div>

            {/* Email with suffix */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address *</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input 
                  className="form-input" 
                  value={newCustomer.emailPrefix} 
                  onChange={(e) => setNewCustomer({ ...newCustomer, emailPrefix: e.target.value.replace(/@.*/, '') })} 
                  onKeyDown={handleInputKeyDown}
                  placeholder="username" 
                  style={{ paddingRight: '85px' }}
                />
                <span style={{ position: 'absolute', right: '12px', color: 'var(--text-light)', fontSize: '13px', pointerEvents: 'none' }}>
                  @gmail.com
                </span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contact Number *</label>
              <input 
                className="form-input" 
                value={newCustomer.contact} 
                onChange={(e) => setNewCustomer({ ...newCustomer, contact: formatContact(e.target.value) })} 
                onKeyDown={handleInputKeyDown}
                placeholder="+923001234567" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Customer Type</label>
              <select
                className="form-input"
                value={newCustomer.customerTypeId || ''}
                onChange={(e) => setNewCustomer({ ...newCustomer, customerTypeId: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomer();
                  }
                }}
              >
                <option value="">-- Select Type --</option>
                {customerTypes.map(ct => (
                  <option key={ct._id} value={ct._id}>{ct.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">CNIC</label>
              <input 
                className="form-input" 
                value={newCustomer.cnic} 
                maxLength={15}
                onChange={(e) => setNewCustomer({ ...newCustomer, cnic: formatCNIC(e.target.value) })} 
                onKeyDown={handleInputKeyDown}
                placeholder="64822-1648208-2" 
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleAddCustomer();
                  }
                }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Upload Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} style={{ fontSize: '13px' }} />
              {isUploading && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Uploading image…</span>
              )}
              {!isUploading && newCustomer.pic && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  <AvatarImage pic={newCustomer.pic} name={newCustomer.name} size={40} />
                  <span style={{ fontSize: '13px', color: 'var(--success)' }}>✓ Image ready — will be saved with this customer</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddCustomer}>Save Customer</button>
        </div>
      </div>
    </div>
  );
}