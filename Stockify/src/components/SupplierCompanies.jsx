import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function SupplierCompanies() {
  const [companies, setCompanies] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const initialState = {
    name: '',
    contact: '', // 💡 Default empty rakha hai taake mandatory check sahi kaam kare
    emailPrefix: '',
    email: '',
    address: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/supplier-companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  // 💡 Mandatory 11 digits format check (+92 followed by 9 digits e.g. +923001234567)
  const formatContact = (value) => {
    let numbers = value.replace(/\D/g, '');
    if (numbers.startsWith('92')) {
      numbers = numbers.slice(2);
    }
    numbers = numbers.slice(0, 10);
    if (numbers.length === 0) return '';
    return `+92${numbers}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showMessage('Company name is required', 'error');
      return;
    }

    // 💡 Phone validation: compulsory and exact length check (+92 + 10 digits = 13 characters total)
    if (!formData.contact || formData.contact.length !== 13) {
      showMessage('Phone number is mandatory and must be 11 digits (e.g. +923XXXXXXXXX)', 'error');
      return;
    }

    const fullEmail = formData.emailPrefix.trim() ? `${formData.emailPrefix.trim()}@gmail.com` : '';
    const payload = {
      name: formData.name,
      contact: formData.contact,
      email: fullEmail,
      address: formData.address
    };

    try {
      const token = localStorage.getItem('token');
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `${API_BASE_URL}/api/supplier-companies/${currentId}` 
        : `${API_BASE_URL}/api/supplier-companies`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Company ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
        setIsOpenModal(false);
        setFormData(initialState);
        fetchCompanies();
      } else {
        showMessage(data.message || 'Operation failed', 'error');
      }
    } catch (err) {
      showMessage('Server error', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/supplier-companies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('Company deleted successfully', 'success');
        fetchCompanies();
      } else {
        showMessage(data.message || 'Delete failed', 'error');
      }
    } catch (err) {
      showMessage('Server error', 'error');
    }
  };

  const openAddModal = () => {
    setFormData(initialState);
    setIsEditing(false);
    setIsOpenModal(true);
  };

  const openEditModal = (c) => {
    setCurrentId(c._id);
    let emailPrefixVal = c.email || '';
    if (emailPrefixVal.endsWith('@gmail.com')) {
      emailPrefixVal = emailPrefixVal.replace('@gmail.com', '');
    }
    setFormData({
      name: c.name || '',
      contact: c.contact === '+92' ? '' : (c.contact || ''),
      emailPrefix: emailPrefixVal,
      email: c.email || '',
      address: c.address || ''
    });
    setIsEditing(true);
    setIsOpenModal(true);
  };

  return (
    <div className="dashboard-wrapper">
      {message.text && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0,fontSize:'16px', color: 'var(--text-main)' }}>Manage Supplier Companies</h4>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Company</button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '750px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--header)', color: 'white' }}>
              <th style={{ padding: '12px 16px', width: '6%' }}>Sr#</th>
              <th style={{ padding: '12px 16px', width: '22%' }}>Company Name</th>
              <th style={{ padding: '12px 16px', width: '18%' }}>Contact</th>
              <th style={{ padding: '12px 16px', width: '20%' }}>Email</th>
              <th style={{ padding: '12px 16px', width: '24%' }}>Address</th>
              <th style={{ padding: '12px 16px', width: '10%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, idx) => (
              <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 16px' }}>{idx + 1}</td>
                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-main)' }}>{c.name}</td>
                <td style={{ padding: '12px 16px' }}>{c.contact && c.contact !== '+92' ? c.contact : '-'}</td>
                <td style={{ padding: '12px 16px' }}>{c.email || '-'}</td>
                <td style={{ padding: '12px 16px' }}>{c.address || '-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                   <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                 {/* Edit Button */}
                          <button style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => openEditModal(c)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleDelete(c._id)} title="Delete">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>       </div>      </td>
              </tr>
            ))}
            {companies.length === 0 && <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No supplier companies found.</td></tr>}
          </tbody>
        </table>
      </div>

      {isOpenModal && (
        <div className="modal-overlay" onClick={() => setIsOpenModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? 'Edit Company' : 'Add Company'}</h3>
              <button className="modal-close" onClick={() => setIsOpenModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Company Name *</label>
                  <input className="form-input" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxSizing: 'border-box' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Contact Number *</label>
                  <input className="form-input" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxSizing: 'border-box' }} value={formData.contact} onChange={e => setFormData({...formData, contact: formatContact(e.target.value)} )} placeholder="+923001234567" required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Email Address</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ width: '100%', paddingRight: '95px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxSizing: 'border-box' }}
                      value={formData.emailPrefix}
                      onChange={(e) => setFormData({ ...formData, emailPrefix: e.target.value.replace(/@.*/, '') })}
                      placeholder="username"
                    />
                   <span 
                      title="Domain is automatically handled"
                      style={{ 
                        position: 'absolute', 
                        right: '1px', 
                        color: 'var(--text-main)', 
                        fontSize: '13px', 
                        pointerEvents: 'none',
                        backgroundColor: '#d9f3ea',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--btn-border)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.target.style.color = 'var(--primary)'; e.target.style.borderColor = 'var(--primary)'; }}
                      onMouseLeave={(e) => { e.target.style.color = 'var(--text-main)'; e.target.style.borderColor = '#e2e8f0'; }}
                    >
                      @gmail.com
                    </span>
         
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Address</label>
                  <textarea className="form-input" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', resize: 'vertical', boxSizing: 'border-box' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows="2" />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-app)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOpenModal(false)}>Cancel  </button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierCompanies;