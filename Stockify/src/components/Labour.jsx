import { useState, useEffect } from 'react';
import AddLabourModal from './AddLabourModal';

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

function Labour() {
  const [labours, setLabours] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Note: For labour, designation/skill type could be added instead of customerType
  const initialState = { 
    name: '', contact: '+92', address: '', pic: '', cnic: '', skillType: '', status: 'Active' 
  };

  const [editLabourId, setEditLabourId] = useState(null);
  const [editLabour, setEditLabour] = useState(initialState);
  const [viewLabour, setViewLabour] = useState(null);
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
        if (editLabourId) {
          e.preventDefault();
          setEditLabourId(null);
          setEditMessage({ text: '', type: '' });
          setImageMessage({ text: '', type: '' });
        }
        if (viewLabour) {
          e.preventDefault();
          setViewLabour(null);
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          setDeleteTarget(null);
          setIsDeleteModalOpen(false);
          setDeleteMessage({ text: '', type: '' });
        }
      }

      if (e.key === 'Enter') {
        if (editLabourId) {
          e.preventDefault();
          handleUpdateLabour();
        }
        if (isDeleteModalOpen) {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editLabourId, viewLabour, isDeleteModalOpen, editLabour, deleteTarget]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = labours.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(labours.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [labours]);

  useEffect(() => {
    fetchLabours();
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

  const fetchLabours = async () => {
    try {
      const token = localStorage.getItem('token');
      // Update endpoint according to your backend
      const res = await fetch(`${API_BASE_URL}/api/labours`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLabours(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching labours:', error);
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
      const res = await fetch(`${API_BASE_URL}/api/upload`, { 
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
        setEditLabour(prev => ({ ...prev, pic: data.imageUrl }));
      }
      showImageMessage('✅ Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showImageMessage('❌ Upload failed: could not reach the server.', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: false }));
    }
  };

  const checkDuplicates = (payload, idToExclude = null) => {
    if (payload.contact && payload.contact !== '+92') {
      const duplicateContact = labours.find(c => c.contact && c.contact === payload.contact && c._id !== idToExclude);
      if (duplicateContact) return "This Contact Number is already registered.";
    }

    if (payload.cnic && payload.cnic.trim() !== '') {
      const duplicateCnic = labours.find(c => c.cnic && c.cnic === payload.cnic && c._id !== idToExclude);
      if (duplicateCnic) return "This CNIC is already registered.";
    }

    return null;
  };

  const handleUpdateLabour = async () => {
    if (!editLabour.name || !editLabour.contact) {
      showEditMessage('Name and Contact are required!', 'error');
      return;
    }

    const duplicateError = checkDuplicates(editLabour, editLabourId);
    if (duplicateError) {
      showEditMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/labours/${editLabourId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editLabour)
      });
      if (res.ok) {
        showEditMessage('Record updated successfully!', 'success');
        setTimeout(() => {
          setEditLabourId(null);
          setEditMessage({ text: '', type: '' });
          fetchLabours();
        }, 500);
      } else {
        showEditMessage('Update failed. Server responded with an error.', 'error');
      }
    } catch (error) {
      showEditMessage('Update failed. Cannot reach server.', 'error');
    }
  };

  const requestDelete = (labour) => {
    setDeleteMessage({ text: '', type: '' });
    setDeleteTarget(labour);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/labours/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showDeleteMessage('Record deleted successfully!', 'success');
        setTimeout(() => {
          fetchLabours();
          setDeleteTarget(null);
          setIsDeleteModalOpen(false);
          setDeleteMessage({ text: '', type: '' });
        }, 500);
      } else {
        const errorData = await response.json();
        showDeleteMessage(errorData.message || 'Error deleting record.', 'error');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showDeleteMessage('Error deleting. Please try again.', 'error');
    }
  };

  const startEdit = (labour) => {
    setEditMessage({ text: '', type: '' });
    setImageMessage({ text: '', type: '' });
    setEditLabourId(labour._id);

    setEditLabour({
      name: labour.name || '',
      contact: labour.contact || '+92',
      address: labour.address || '',
      pic: labour.pic || '',
      cnic: labour.cnic || '',
      skillType: labour.skillType || ''
    });
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
          <h4 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>Manage Labour Profiles</h4>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Labour
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
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '27%' }}>Skill / Type</th>
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
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.skillType || 'General'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          
                          {/* View Button */}
                          <button style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setViewLabour(c)} title="View">
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
                    No records found. Click "+ Add Labour" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {labours.length > itemsPerPage && (
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
        <AddLabourModal 
          existingRecords={labours} 
          onClose={() => { setIsAddModalOpen(false); }}
          onSuccess={() => { fetchLabours(); }}
        />
      )}

      {/* EDIT MODAL */}
      {editLabourId && (
        <div className="modal-overlay">
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: 0 }}>
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)' }}>Edit Labour Profile</h3>
              <button className="modal-close" onClick={() => { setEditLabourId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>✕</button>
            </div>

            <div className="modal-body">
              <InlineMessage message={editMessage.text} type={editMessage.type} />
              {imageMessage.text && <InlineMessage message={imageMessage.text} type={imageMessage.type} />}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    className="form-input"
                    value={editLabour.name} 
                    onChange={(e) => setEditLabour({ ...editLabour, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateLabour)}
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Skill / Type</label>
                  <input 
                    className="form-input"
                    value={editLabour.skillType} 
                    onChange={(e) => setEditLabour({ ...editLabour, skillType: e.target.value })} 
                    placeholder="e.g. Loading, Driver, General"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateLabour)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input 
                    className="form-input"
                    value={editLabour.contact} 
                    onChange={(e) => setEditLabour({ ...editLabour, contact: formatContact(e.target.value) })} 
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateLabour)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CNIC</label>
                  <input 
                    className="form-input"
                    value={editLabour.cnic || ''} 
                    maxLength={15}
                    onChange={(e) => setEditLabour({ ...editLabour, cnic: formatCNIC(e.target.value) })} 
                    placeholder="64822-1648208-2"
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateLabour)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={editLabour.address}
                    onChange={(e) => setEditLabour({ ...editLabour, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleUpdateLabour();
                      }
                    }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Update Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} style={{ fontSize: '13px', color: 'var(--text-muted)' }} />
                  {uploading.edit ? (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>Uploading image…</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                      <AvatarImage pic={editLabour.pic} name={editLabour.name} size={40} />
                      <span style={{ fontSize: '13px', color: editLabour.pic ? 'var(--success)' : 'var(--text-muted)' }}>
                        {editLabour.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={() => { setEditLabourId(null); setEditMessage({ text: '', type: '' }); setImageMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateLabour}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewLabour && (
        <div className="modal-overlay" onClick={() => setViewLabour(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: 0 }}>
            
            <div style={{
              backgroundColor: 'var(--primary)', padding: '24px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '10px', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)'
            }}>
              <AvatarImage pic={viewLabour.pic} name={viewLabour.name} size={84} />
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '600' }}>{viewLabour.name}</h3>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label className="form-label">Skill / Type</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{viewLabour.skillType || 'General'}</p>
                </div>
                <div>
                  <label className="form-label">Contact Number</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)' }}>{viewLabour.contact || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">CNIC</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)' }}>{viewLabour.cnic || 'N/A'}</p>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--success)' }}>Active</p>
                </div>
              </div>

              <div>
                <label className="form-label">Address</label>
                <div style={{
                  marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '13px',
                  color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5
                }}>
                  {viewLabour.address || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={() => setViewLabour(null)}>Close</button>
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
                <span style={{ fontSize: '24px' }}>⚠️</span> Delete Profile
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

export default Labour;