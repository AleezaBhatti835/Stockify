import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const getImageUrl = (pic) => {
  if (!pic) return null;
  if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
  return `${API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
};

const getInitials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function AvatarImage({ pic, name, size }) {
  const [failed, setFailed] = useState(false);
  const url = getImageUrl(pic);
  if (url && !failed) {
    return <img src={url} alt={name} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${size * 0.35}px`, fontWeight: 600, flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  );
}

function Transporters() {
  const [transporterList, setTransporterList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [viewRecord, setViewRecord] = useState(null);

  const initialState = { _id: null, name: '', companyName: '', vehicleNumber: '', vehicleModel: '', contact: '+92', address: '', cnic: '', pic: '' };
  const [formData, setFormData] = useState(initialState);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = transporterList.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => { fetchTransporters(); }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const fetchTransporters = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/transporters`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      setTransporterList(Array.isArray(data) ? data : []);
    } catch (error) { console.error('Error fetching transporters:', error); }
  };

  const formatContact = (value) => {
    let numbers = value.replace(/\D/g, '');
    if (numbers.startsWith('92')) numbers = numbers.slice(2);
    return `+92${numbers.slice(0, 10)}`;
  };

  const formatCNIC = (value) => {
    const numbers = value.replace(/\D/g, '').slice(0, 13);
    if (numbers.length <= 5) return numbers;
    if (numbers.length <= 12) return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 12)}-${numbers.slice(12, 13)}`;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append('image', file);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: uploadData });
      const data = await res.json();
      if (res.ok && data.imageUrl) setFormData({ ...formData, pic: data.imageUrl });
    } catch (err) { alert('Upload failed'); } finally { setUploading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.contact === '+92') return showMessage('Name and Contact are required', 'error');
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_BASE_URL}/api/transporters/${formData._id}` : `${API_BASE_URL}/api/transporters`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showMessage(`Transporter ${isEditing ? 'updated' : 'added'} successfully!`, 'success');
        setIsModalOpen(false);
        fetchTransporters();
      } else {
        showMessage('Operation failed', 'error');
      }
    } catch (error) { showMessage('Server error', 'error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transporter?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/transporters/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) { showMessage('Deleted successfully', 'success'); fetchTransporters(); }
    } catch (err) { showMessage('Delete failed', 'error'); }
  };

  const openAddModal = () => { setFormData(initialState); setIsEditing(false); setIsModalOpen(true); };
  const openEditModal = (t) => { setFormData(t); setIsEditing(true); setIsModalOpen(true); };

  return (
    <div className="dashboard-wrapper">
      {message.text && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Manage Transporters</h4>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Transporter</button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--header)', color: 'white' }}>
              <th style={{ padding: '12px' }}>Driver Name </th>
              <th style={{ padding: '12px' }}>Company</th>
              <th style={{ padding: '12px' }}>Vehicle #</th>
              <th style={{ padding: '12px' }}>Contact</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map(t => (
              <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'left',
                    gap: '10px',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    backgroundColor: 'white',
                    width: 'max-content',
                    justifyContent: 'flex-start'
                  }}>
                    <AvatarImage pic={t.pic} name={t.name} size={32} />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px' }}>{t.companyName || '-'}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{t.vehicleNumber || '-'}</td>
                <td style={{ padding: '12px' }}>{t.contact}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button style={actionStyles.iconBtnView} onClick={() => setViewRecord(t)} title="View">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button style={actionStyles.iconBtnEdit} onClick={() => openEditModal(t)} title="Edit">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button style={actionStyles.iconBtnDelete} onClick={() => handleDelete(t._id)} title="Delete">
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
            {currentItems.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', fontSize: '12px', textAlign: 'center' }}>No records found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL (Professional Style) */}
      {viewRecord && (
        <div className="modal-overlay" onClick={() => setViewRecord(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '620px', padding: 0 }}>
            <div style={{ backgroundColor: 'var(--primary-other)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderTopLeftRadius: '2px', borderTopRightRadius: '2px' }}>
              <AvatarImage pic={viewRecord.pic} name={viewRecord.name} size={84} />
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '600' }}>{viewRecord.name}</h3>
              {viewRecord.companyName && (
                <span style={{ color: 'rgba(45, 66, 60, 0.9)', fontSize: '13px', backgroundColor: 'rgba(189, 232, 223, 0.79)', padding: '4px 10px', borderRadius: '4px' }}>
                  {viewRecord.companyName}
                </span>
              )}
            </div>

            <div className="modal-body" style={{ padding: '24px 44px', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label">Vehicle Number</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--primary)', fontWeight: 'bold' }}>{viewRecord.vehicleNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">Vehicle Model</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: '500' }}>{viewRecord.vehicleModel || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">Contact Number</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: '500' }}>{viewRecord.contact || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">CNIC</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-main)', fontWeight: '500' }}>{viewRecord.cnic || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="form-label">Address</label>
                <div style={{ marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: '4px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {viewRecord.address || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={() => setViewRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', width: '95%', padding: 0 }}>
            
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-main)' }}>
                {isEditing ? 'Edit Transporter' : 'Add Transporter'}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '16px 24px' }}>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Name </label>
                  <input className="form-input" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required autoFocus />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Contact </label>
                  <input className="form-input" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} required />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>CNIC</label>
                  <input className="form-input" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.cnic} onChange={e => setFormData({...formData, cnic: e.target.value})} required />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Vehicle Number</label>
                  <input className="form-input" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="ABC-1234" />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label " style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Vehicle Model</label>
                  <input className="form-input" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.vehicleModel} onChange={e => setFormData({...formData, vehicleModel: e.target.value})} placeholder="e.g. Toyota Hilux" />
                </div>

                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label required" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>CNIC</label>
                  <input className="form-input" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.cnic} onChange={e => setFormData({...formData, cnic: formatCNIC(e.target.value)})} placeholder="00000-0000000-0" />
                </div>
                
                <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                  <label className="form-label " style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Image</label>
                  
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
                      cursor: uploading ? 'not-allowed' : 'pointer',
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
                        disabled={uploading} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formData.pic ? 'File selected' : 'No file chosen'}
                    </span>
                  </div>

                  {uploading && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Uploading image…</span>
                  )}
                </div>
                
                <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Address</label>
                  <textarea className="form-input" style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows="2" />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-app)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading || uploading}>{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Action Button Styles
const actionStyles = {
  iconBtnView: { backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  iconBtnEdit: { background: 'var(--edit)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  iconBtnDelete: { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }
};

export default Transporters;