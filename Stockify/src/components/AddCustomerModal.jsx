import React, { useState, useEffect } from 'react';
import './roles.css';
import './customer.css';

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

// Inline Message Component
function InlineMessage({ message, type }) {
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

  // Fetch Customer Types on mount
  useEffect(() => {
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
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
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
      const { emailPrefix, ...finalPayload } = payloadObj;
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h3>Add New Customer</h3>

        {/* Inline Message */}
        <InlineMessage message={message.text} type={message.type} />

        {/* Image Upload Inline Message */}
        {imageMessage.text && !message.text && (
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

        <div className="user-form" style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: '#1b2f41' }}>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Full Name *</label>
            <input 
              style={{ fontSize: '0.65rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
              value={newCustomer.name} 
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              onKeyDown={handleInputKeyDown}
              autoFocus
            />
          </div>

          {/* Email with suffix */}
          <div>
            <label style={{ fontSize: '0.8rem' }}>Email Address *</label>
            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <input 
                style={{ fontSize: '0.65rem', width: '100%', padding: '8px', paddingRight: '85px', boxSizing: 'border-box' }} 
                value={newCustomer.emailPrefix} 
                onChange={(e) => setNewCustomer({ ...newCustomer, emailPrefix: e.target.value.replace(/@.*/, '') })} 
                onKeyDown={handleInputKeyDown}
                placeholder="username" 
              />
              <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '12px', pointerEvents: 'none' }}>
                @gmail.com
              </span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem' }}>Contact Number *</label>
            <input 
              style={{ fontSize: '0.65rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
              value={newCustomer.contact} 
              onChange={(e) => setNewCustomer({ ...newCustomer, contact: formatContact(e.target.value) })} 
              onKeyDown={handleInputKeyDown}
              placeholder="+923001234567" 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem' }}>Customer Type</label>
            <select
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.65rem', backgroundColor: '#f8f9fa', boxSizing: 'border-box' }}
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

          <div>
            <label style={{ fontSize: '0.8rem' }}>CNIC</label>
            <input 
              style={{ fontSize: '0.65rem', width: '100%', padding: '8px', boxSizing: 'border-box' }} 
              value={newCustomer.cnic} 
              maxLength={15}
              onChange={(e) => setNewCustomer({ ...newCustomer, cnic: formatCNIC(e.target.value) })} 
              onKeyDown={handleInputKeyDown}
              placeholder="64822-1648208-2" 
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem' }}>Address</label>
            <textarea
              style={{ fontSize: '0.65rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '8px', boxSizing: 'border-box' }}
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

          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
            <label style={{ alignItems: 'left', fontSize: '0.8rem' }}>Upload Image</label>
            <input style={{ fontSize: '0.65rem' }} type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            {isUploading && (
              <span style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
            )}
            {!isUploading && newCustomer.pic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <AvatarImage pic={newCustomer.pic} name={newCustomer.name} size={40} />
                <span style={{ fontSize: '0.75rem', color: '#28a745' }}>✓ Image ready — will be saved with this customer</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleAddCustomer}>Save Customer</button>
          <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}