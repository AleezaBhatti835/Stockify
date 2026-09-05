import React, { useState, useEffect, useRef } from 'react';

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
      width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--primary-light)',
      color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: `${size * 0.35}px`, fontWeight: 600, flexShrink: 0
    }}>
      {getInitials(name)}
    </div>
  );
}

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
  // 💡 1. Initial state mein city: '' add kiya gaya hai
  const initialState = { 
    name: '', email: '', contact: '+92', address: '', pic: '', cnic: '', city: '', status: 'Active', customerTypeId: '' 
  };
  
  const [newCustomer, setNewCustomer] = useState(initialState);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [customerTypes, setCustomerTypes] = useState([]);
  const [cities, setCities] = useState([]); // 💡 2. Cities ki state
  const [isUploading, setIsUploading] = useState(false);
  const [imageMessage, setImageMessage] = useState({ text: '', type: '' });

  const modalBodyRef = useRef(null);

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

    // 💡 3. Cities fetch karne ki logic
    const fetchCities = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/cities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setCities(data.data);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };

    fetchCustomerTypes();
    fetchCities(); // Yahan call kar diya
  }, []);

  const scrollToTop = () => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    scrollToTop(); 
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const showImageMessage = (text, type) => {
    setImageMessage({ text, type });
    scrollToTop();
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
    if (!newCustomer.name || !newCustomer.contact || !newCustomer.email) {
      showMessage('Name, Email, and Contact are required!', 'error');
      return;
    }

    const payloadObj = { ...newCustomer, email: newCustomer.email.trim() };

    const duplicateError = checkDuplicates(payloadObj);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadObj)
      });
      
      if (res.ok) {
        const savedCustomer = await res.json();
        showMessage('Customer added successfully!', 'success');
        setTimeout(() => {
          if (savedCustomer) {
            onSuccess(savedCustomer);
          }
          onClose();
        }, 800);
      } else {
        const errData = await res.json().catch(() => null);
        showMessage(errData?.message || 'Error saving customer.', 'error');
      }
    } catch (error) {
      showMessage('Server error.', 'error');
    }
  };

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

        <div className="modal-body" ref={modalBodyRef} style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          
          <InlineMessage message={message.text} type={message.type} />

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
              <label className="form-label required">Full Name</label>
              <input 
                className="form-input" 
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                value={newCustomer.name} 
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                onKeyDown={handleInputKeyDown}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Email Address</label>
              <input 
                type="email"
                className="form-input" 
                value={newCustomer.email} 
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} 
                onKeyDown={handleInputKeyDown}
                placeholder="customer@domain.com" 
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Contact Number</label>
              <input 
                className="form-input" 
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                value={newCustomer.contact} 
                onChange={(e) => setNewCustomer({ ...newCustomer, contact: formatContact(e.target.value) })} 
                onKeyDown={handleInputKeyDown}
                placeholder="+923001234567" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Customer Type</label>
              <select
                className="form-input"
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
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
              <label className="form-label required">CNIC</label>
              <input 
                className="form-input" 
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                value={newCustomer.cnic} 
                maxLength={15}
                onChange={(e) => setNewCustomer({ ...newCustomer, cnic: formatCNIC(e.target.value) })} 
                onKeyDown={handleInputKeyDown}
                placeholder="64822-1648208-2" 
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">City</label>
              <select
                className="form-input"
                style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
                value={newCustomer.city}
                onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomer();
                  }
                }}
              >
                <option value="">-- Select City --</option>
                {cities.map(city => (
                  <option key={city._id} value={city.name}>{city.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}
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

            <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Upload Image</label>
              
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
                  cursor: isUploading ? 'not-allowed' : 'pointer',
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
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                  />
                </label>
                
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {newCustomer.pic ? 'File selected' : 'No file chosen'}
                </span>
              </div>

              {isUploading ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>Uploading image…</span>
              ) : (
                newCustomer.pic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                    <AvatarImage pic={newCustomer.pic} name={newCustomer.name} size={40} />
                    <span style={{ fontSize: '13px', color: 'var(--success)' }}>
                      ✓ Image ready — will be saved with this customer
                    </span>
                  </div>
                )
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