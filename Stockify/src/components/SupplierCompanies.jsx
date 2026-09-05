import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function SupplierCompanies() {
  const [companies, setCompanies] = useState([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // View Modal States
  const [viewModalData, setViewModalData] = useState(null);
  const [linkedSuppliers, setLinkedSuppliers] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  
  const initialState = {
    name: '',
    contact: '', 
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

    if (!formData.contact || formData.contact.length !== 13) {
      showMessage('Phone number is mandatory and must be 11 digits (e.g. +923XXXXXXXXX)', 'error');
      return;
    }

    const payload = {
      name: formData.name,
      contact: formData.contact,
      email: formData.email.trim(),
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
    setFormData({
      name: c.name || '',
      contact: c.contact === '+92' ? '' : (c.contact || ''),
      email: c.email || '',
      address: c.address || ''
    });
    setIsEditing(true);
    setIsOpenModal(true);
  };

  const openViewModal = async (c) => {
    setViewModalData(c);
    setIsLoadingSuppliers(true);
    setLinkedSuppliers([]);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const filtered = data.filter(s => 
          (s.companyId && s.companyId._id === c._id) || 
          s.companyId === c._id ||
          (s.companyName && s.companyName.toLowerCase() === c.name.toLowerCase())
        );
        setLinkedSuppliers(filtered);
      }
    } catch (err) {
      console.error('Error fetching linked suppliers:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const closeViewModal = () => {
    setViewModalData(null);
    setLinkedSuppliers([]);
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
                          
                          {/* 💡 View Button */}
                          <button style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => openViewModal(c)} title="View">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>

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
                          </button> 
                    </div> 
                 </td>
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
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px' }}>Company Name </label>
                  <input className="form-input" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxSizing: 'border-box' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px' }}>Contact Number </label>
                  <input className="form-input" style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxSizing: 'border-box' }} value={formData.contact} onChange={e => setFormData({...formData, contact: formatContact(e.target.value)} )} placeholder="+923001234567" required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label " style={{ display: 'block', marginBottom: '8px' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', boxSizing: 'border-box' }}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="company@domain.com"
                  />
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

      {/* 💡 VIEW COMPANY MODAL */}
      {viewModalData && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ width: '650px', padding: 0, overflow: 'hidden' }}>
            
            <div style={{ backgroundColor: 'var(--primary-other)', padding: '24px', textAlign: 'center', color: 'white' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 700 }}>{viewModalData.name}</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>Supplier Company Overview</p>
            </div>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
    
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Contact Number</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewModalData.contact || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500 }}>{viewModalData.email || 'N/A'}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Physical Address</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: 500, backgroundColor: 'var(--bg-app)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {viewModalData.address || 'N/A'}
                  </p>
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px 0',fontSize: '16px',  color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                Linked Suppliers ({linkedSuppliers.length})
              </h4>
              
              {isLoadingSuppliers ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Loading suppliers...</p>
              ) : linkedSuppliers.length > 0 ? (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: 'var(--header)', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Contact Person</th>
                        <th style={{ padding: '8px 12px' }}>Phone</th>
                        <th style={{ padding: '8px 12px' }}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedSuppliers.map((sup, idx) => (
                        <tr key={sup._id} style={{ borderBottom: idx !== linkedSuppliers.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-main)' }}>{sup.contactPerson || sup.name}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>{sup.phone || sup.contact || '-'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>{sup.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ backgroundColor: 'var(--bg-app)', padding: '20px', textAlign: 'center', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>No suppliers are currently linked to this company.</p>
                </div>
              )}

            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 20px', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={closeViewModal}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SupplierCompanies;