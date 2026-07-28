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

// Local Message Popup Component
function MessagePopup({ message, onClose }) {
  if (!message.text) return null;

  return (
    <div className="message-popup-overlay" onClick={onClose} style={{ zIndex: 999999 }}>
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

export default function AddCustomerModal({ onClose, onSuccess, existingCustomers = [] }) {
  const initialState = { name: '', email: '', contact: '', address: '', pic: '', cnic: '', status: 'Active', customerTypeId: '' };
  
  const [newCustomer, setNewCustomer] = useState(initialState);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [customerTypes, setCustomerTypes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

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
    setTimeout(() => setMessage({ text: '', type: '' }), 6000);
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

      setNewCustomer(prev => ({ ...prev, pic: data.imageUrl }));
      showMessage('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showMessage('Upload failed: could not reach the server.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const isValidEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkDuplicates = (payload) => {
    if (payload.email) {
      const duplicateEmail = existingCustomers.find(c => c.email && c.email.toLowerCase() === payload.email.toLowerCase());
      if (duplicateEmail) return "This Email is already registered to another customer.";
    }
    if (payload.contact) {
      const duplicateContact = existingCustomers.find(c => c.contact && c.contact === payload.contact);
      if (duplicateContact) return "This Contact Number is already registered to another customer.";
    }
    if (payload.cnic) {
      const duplicateCnic = existingCustomers.find(c => c.cnic && c.cnic === payload.cnic);
      if (duplicateCnic) return "This CNIC is already registered to another customer.";
    }
    return null;
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.contact || !newCustomer.email) {
      showMessage('Name, Email, and Contact are required!', 'error');
      return;
    }

    if (!isValidEmail(newCustomer.email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    const duplicateError = checkDuplicates(newCustomer);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      if (res.ok) {
        const savedCustomer = await res.json();
        // Inform parent component that saving was successful
        onSuccess(savedCustomer); 
        onClose(); // Close modal automatically
      } else {
        showMessage('Error saving customer.', 'error');
      }
    } catch (error) {
      showMessage('Server error.', 'error');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '600px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>Add New Customer</h3>

        <MessagePopup message={message} onClose={() => setMessage({ text: '', type: '' })} />

        <div className="user-form" style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: '#1b2f41' }}>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Full Name *</label>
            <input style={{ fontSize: '0.85rem', width: '100%' }} value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Email Address *</label>
            <input type="email" style={{ fontSize: '0.85rem', width: '100%' }} value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="e.g. john@example.com" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Contact Number *</label>
            <input style={{ fontSize: '0.85rem', width: '100%' }} value={newCustomer.contact} onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem' }}>Customer Type</label>
            <select
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: '#f8f9fa' }}
              value={newCustomer.customerTypeId || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, customerTypeId: e.target.value })}
            >
              <option value="">-- Select Type --</option>
              {customerTypes.map(ct => (
                <option key={ct._id} value={ct._id}>{ct.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem' }}>CNIC</label>
            <input style={{ fontSize: '0.85rem', width: '100%' }} value={newCustomer.cnic} onChange={(e) => setNewCustomer({ ...newCustomer, cnic: e.target.value })} placeholder="XXXXX-XXXXXXX-X" />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem' }}>Address</label>
            <textarea
              style={{ fontSize: '0.85rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
            <label style={{ alignItems: 'left', fontSize: '0.8rem' }}>Upload Image</label>
            <input style={{ fontSize: '0.85rem' }} type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
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