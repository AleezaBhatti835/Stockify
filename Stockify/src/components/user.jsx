import { useState, useEffect } from 'react';
import './roles.css';

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

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Custom message state
  const [message, setMessage] = useState({ text: '', type: '' });

  // New state for custom delete confirmation modal
  const [userToDelete, setUserToDelete] = useState(null);

  // Initial state with default contact +92
  const initialState = {
    name: '', emailPrefix: '', password: '', confirmPassword: '', cnic: '',
    contact: '+92', address: '', status: 'Active', role: '', pic: ''
  };

  const [newUser, setNewUser] = useState(initialState);
  const [editUserId, setEditUserId] = useState(null);
  const [editUser, setEditUser] = useState(initialState);
  const [viewUser, setViewUser] = useState(null);

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
          setNewUser(initialState);
          clearMessage();
        }
        if (editUserId) {
          e.preventDefault();
          setEditUserId(null);
          clearMessage();
        }
        if (viewUser) {
          e.preventDefault();
          setViewUser(null);
        }
        if (userToDelete) {
          e.preventDefault();
          setUserToDelete(null);
          clearMessage();
        }
      }

      if (e.key === 'Enter' && isAddModalOpen) {
        e.preventDefault();
        handleAddUser();
      }

      if (e.key === 'Enter' && editUserId) {
        e.preventDefault();
        handleUpdateUser();
      }

      if (e.key === 'Enter' && userToDelete) {
        e.preventDefault();
        executeDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editUserId, viewUser, userToDelete, newUser, editUser]);

  // Get filtered users (STRICTLY EXCLUDE ADMINS)
  const filteredUsers = users.filter(u => {
    const emailStr = (u.email || '').toLowerCase();
    const nameStr = (u.name || '').toLowerCase();
    
    if (emailStr === 'admin@gmail.com' || emailStr.includes('admin')) return false;
    if (nameStr === 'admin') return false;

    if (!u.role) return true; 
    
    let roleName = '';
    if (typeof u.role === 'object' && u.role.role) {
      roleName = u.role.role;
    } else {
      const matchedRole = roles.find(r => r._id === u.role);
      roleName = matchedRole ? matchedRole.role : String(u.role);
    }
    
    return roleName.toLowerCase() !== 'admin';
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [users]);

  const openView = (user) => {
    setViewUser(user);
  };

  const closeView = () => {
    setViewUser(null);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 6000);
  };

  const clearMessage = () => {
    setMessage({ text: '', type: '' });
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (data && data.data && Array.isArray(data.data)) {
          setUsers(data.data);
        } else if (data && data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/roles');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRoles(data);
        } else if (typeof data === 'object' && data !== null) {
          const extractedArray = data.roles || data.data || Object.values(data).find(val => Array.isArray(val)) || [];
          setRoles(extractedArray);
        } else {
          setRoles([]);
        }
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  const handleImageUpload = async (e, isEditing) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (isEditing) {
          setEditUser({ ...editUser, pic: data.imageUrl });
        } else {
          setNewUser({ ...newUser, pic: data.imageUrl });
        }
        showMessage('Image uploaded successfully!', 'success');
      } else {
        showMessage('Failed to upload image to server.', 'error');
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showMessage('Server error during image upload.', 'error');
    }
  };

  const checkDuplicates = (payload, userIdToExclude = null) => {
    const duplicateEmail = users.find(u => u.email === payload.email && u._id !== userIdToExclude);
    if (duplicateEmail) return "This Email is already registered.";

    if (payload.cnic && payload.cnic.trim() !== '') {
      const duplicateCnic = users.find(u => u.cnic && u.cnic === payload.cnic && u._id !== userIdToExclude);
      if (duplicateCnic) return "This CNIC is already registered.";
    }

    if (payload.contact && payload.contact.trim() !== '+92' && payload.contact.trim() !== '') {
      const duplicateContact = users.find(u => u.contact && u.contact === payload.contact && u._id !== userIdToExclude);
      if (duplicateContact) return "This Contact Number is already registered.";
    }

    return null;
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.emailPrefix || !newUser.password || !newUser.role) {
      showMessage('Name, Email prefix, Password and Role are required!', 'error');
      return;
    }

    if (newUser.password.length < 8) {
      showMessage('Password must be at least 8 characters long!', 'error');
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      showMessage('Passwords do not match!', 'error');
      return;
    }

    const fullEmail = `${newUser.emailPrefix.trim()}@gmail.com`;
    const payloadObj = { ...newUser, email: fullEmail };
    const duplicateError = checkDuplicates(payloadObj);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const { confirmPassword, emailPrefix, ...payload } = payloadObj;

      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json().catch(() => null);

      if (res.ok) {
        showMessage('User added successfully!', 'success');
        setNewUser(initialState);
        setIsAddModalOpen(false);
        fetchUsers();
      } else {
        showMessage(responseData?.message || 'Error saving user. Backend rejected data.', 'error');
      }
    } catch (error) {
      showMessage('Server error while saving user.', 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!editUserId) return;

    if (editUser.password && editUser.password.length < 8) {
      showMessage('Password must be at least 8 characters long!', 'error');
      return;
    }

    if (editUser.password && editUser.password !== editUser.confirmPassword) {
      showMessage('Passwords do not match!', 'error');
      return;
    }

    const duplicateError = checkDuplicates(editUser, editUserId);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const { confirmPassword, ...payload } = editUser;

      if (!payload.password) delete payload.password;
      if (!payload.role) delete payload.role; 

      const res = await fetch(`http://localhost:5000/api/users/${editUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json().catch(() => null);

      if (res.ok) {
        showMessage('User updated successfully!', 'success');
        setEditUserId(null);
        setEditUser(initialState);
        fetchUsers();
      } else {
        showMessage(responseData?.message || 'Backend rejected data (400 Bad Request).', 'error');
      }
    } catch (error) {
      showMessage('Server error while updating user.', 'error');
    }
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await fetch(`http://localhost:5000/api/users/${userToDelete}`, { method: 'DELETE' });
      showMessage('User deleted successfully!', 'success');
      fetchUsers();
      setUserToDelete(null);
    } catch (error) {
      showMessage('Error deleting user.', 'error');
      setUserToDelete(null);
    }
  };

  const startEdit = (user) => {
    if (!user) return;
    clearMessage();
    setEditUserId(user._id);

    let emailPrefixVal = user.email || '';
    if (emailPrefixVal.endsWith('@gmail.com')) {
      emailPrefixVal = emailPrefixVal.replace('@gmail.com', '');
    }

    setEditUser({
      name: user.name || '',
      email: user.email || '',
      emailPrefix: emailPrefixVal,
      cnic: user.cnic || '',
      contact: user.contact || '+92',
      address: user.address || '',
      role: typeof user.role === 'object' ? (user.role?._id || '') : (user.role || ''),
      status: user.status || 'Active',
      pic: user.pic || '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const formGroupStyle = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' };
  const labelStyle = { marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#333' };

  return (
    <div className="roles-container">
      {/* HEADER WITH TOP RIGHT BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4>Manage System Users</h4>
        <button style={{ width: '14%', color: 'white', backgroundColor: '#5aa7ef', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => { clearMessage(); setIsAddModalOpen(true); }}>
          + Add User
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
        <span>Showing {currentItems.length} of {filteredUsers.length} users</span>
      </div>

      <div className="table-scroll-wrapper">
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '10%', textAlign: 'center', padding: '12px' }}>Sr #</th>
              <th style={{ width: '20%', textAlign: 'left', padding: '12px' }}>Name</th>
              <th style={{ width: '25%', textAlign: 'left', padding: '12px' }}>Email</th>
              <th style={{ width: '20%', textAlign: 'left', padding: '12px' }}>Role</th>
              <th style={{ width: '25%', textAlign: 'center', padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((u, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                
                let displayRoleName = <span style={{ color: 'red' }}>No Role</span>;
                if (u.role) {
                  if (typeof u.role === 'object' && u.role.role) {
                    displayRoleName = u.role.role;
                  } else {
                    const matchedRole = roles.find(r => r._id === u.role);
                    displayRoleName = matchedRole ? matchedRole.role : String(u.role);
                  }
                }

                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ textAlign: 'center', padding: '12px' }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', padding: '12px' }}>
                      {u.name || 'N/A'}
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', padding: '12px' }}>
                      {u.email || 'N/A'}
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', padding: '12px' }}>
                      {displayRoleName}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={styles.actionGroup}>
                        
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => openView(u)} title="View">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => startEdit(u)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => setUserToDelete(u._id)}
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
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#777' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {filteredUsers.length > itemsPerPage && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage === 1 ? '#e9ecef' : '#5aa7ef',
              color: currentPage === 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ←
          </button>

          <span style={{ fontSize: '12px', fontWeight: '400', color:'#868484' }}>
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
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            →
          </button>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
            <h3>Confirm Deletion</h3>

            {/* Message Popup */}
            <MessagePopup message={message} onClose={clearMessage} />

            <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={executeDelete} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
                Yes, Delete
              </button>
              <button onClick={() => { setUserToDelete(null); clearMessage(); }} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW USER MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', position: 'relative' }}>
            <h3>Add New User</h3>

            {/* Message Popup */}
            <MessagePopup message={message} onClose={clearMessage} />

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Full Name *</label>
                <input 
                  placeholder="e.g. John Doe" 
                  autoComplete="off" 
                  value={newUser.name} 
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              {/* Email with right-side @gmail.com suffix */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email Address *</label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input 
                    placeholder="e.g. username" 
                    autoComplete="off" 
                    value={newUser.emailPrefix} 
                    onChange={(e) => setNewUser({ ...newUser, emailPrefix: e.target.value.replace(/@.*/, '') })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                    style={{ width: '100%', padding: '8px', paddingRight: '85px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                  />
                  <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '13px', pointerEvents: 'none' }}>
                    @gmail.com
                  </span>
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Password * (Min 8 chars)</label>
                <input 

                  type="password" 
                  autoComplete="new-password" 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Confirm Password *</label>
                <input 
                  Total 
                  type="password" 
                  autoComplete="new-password" 
                  value={newUser.confirmPassword} 
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              {/* CNIC Automatic Formatting */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>CNIC</label>
                <input 
                  placeholder="64822-1648208-2" 
                  autoComplete="off" 
                  maxLength={15}
                  value={newUser.cnic} 
                  onChange={(e) => setNewUser({ ...newUser, cnic: formatCNIC(e.target.value) })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              {/* Contact Number with default +92 */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Contact Number</label>
                <input 
                  placeholder="+923001234567" 
                  autoComplete="off" 
                  value={newUser.contact} 
                  onChange={(e) => setNewUser({ ...newUser, contact: formatContact(e.target.value) })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Address</label>
                <div style={{ width: '100%' }}>
                  <textarea
                    placeholder="e.g.Block A, City"
                    autoComplete="off"
                    rows={3}
                    value={newUser.address}
                    onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleAddUser();
                      }
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#333333',
                      border: '1px solid #ced4da',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>User Role *</label>
                <select 
                  value={newUser.role} 
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Role * --</option>
                  {Array.isArray(roles) && roles.map(r => <option key={r._id} value={r._id}>{r.role}</option>)}
                </select>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Upload Profile Image</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} style={{ border: '1px solid #ccc', padding: '5px', width: '100%', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddUser} style={{ padding: '10px 15px', background: '#5aa7ef', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Save User</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); setNewUser(initialState); clearMessage(); }} style={{ padding: '10px 15px', background: '#ccc', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="modal-overlay">
          <div className="custom-modal-content view-modal-content">

            <div className="view-header-blue">
              {viewUser.pic ? (
                <img
                  className="view-avatar-circle"
                  src={viewUser.pic}
                  alt={viewUser.name}
                />
              ) : (
                <div className="view-avatar-circle">
                  {viewUser.name
                    ?.split(" ")
                    .map(word => word[0])
                    .join("")
                    .toUpperCase()}
                </div>
              )}

              <h2 className="view-title-name">
                {viewUser.name}
              </h2>
            </div>

            <div className="view-body">

              <div className="view-grid-centered">

                <div className="view-detail-item">
                  <label>Email</label>
                  <span>{viewUser.email || "N/A"}</span>
                </div>

                <div className="view-detail-item">
                  <label>Contact Number</label>
                  <span>{viewUser.contact || "N/A"}</span>
                </div>

                <div className="view-detail-item">
                  <label>CNIC</label>
                  <span>{viewUser.cnic || "N/A"}</span>
                </div>

                <div className="view-detail-item">
                  <label>Role</label>
                  <span>
                    {(() => {
                      if (!viewUser.role) return "N/A";
                      if (typeof viewUser.role === 'object' && viewUser.role.role) return viewUser.role.role;
                      const matched = roles.find(r => r._id === viewUser.role);
                      return matched ? matched.role : String(viewUser.role);
                    })()}
                  </span>
                </div>

              </div>

              <div className="view-detail-item view-detail-full">
                <label>Address</label>

                <div className="address-box-gray">
                  {viewUser.address || "No Address Provided"}
                </div>
              </div>

            </div>

            <div className="view-modal-footer">
              <button
                className="btn btn-view-close"
                onClick={closeView}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUserId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', position: 'relative' }}>
            <h3>Edit User</h3>

            {/* Message Popup */}
            <MessagePopup message={message} onClose={clearMessage} />

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Full Name *</label>
                <input 
                  placeholder="e.g. John Doe" 
                  value={editUser.name} 
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              {/* Email (Readonly during edit to prevent desync) */}
              <div style={formGroupStyle}>
                <label>Email <span className="field-hint" style={{ fontSize: '11px', color: '#888' }}>(view only)</span></label>
                <input style={{
                  width: '100%',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed',
                  padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box'
                }} type="email" readOnly disabled className="input-readonly" value={editUser.email} />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>New Password</label>
                <input 
                  placeholder="Min 8 characters" 
                  type="password" 
                  autoComplete="new-password" 
                  value={editUser.password} 
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Confirm New Password</label>
                <input 
                  type="password" 
                  autoComplete="new-password" 
                  value={editUser.confirmPassword} 
                  onChange={(e) => setEditUser({ ...editUser, confirmPassword: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>CNIC</label>
                <input 
                  placeholder="64822-1648208-2" 
                  maxLength={15}
                  value={editUser.cnic} 
                  onChange={(e) => setEditUser({ ...editUser, cnic: formatCNIC(e.target.value) })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Contact Number</label>
                <input 
                  placeholder="+923001234567" 
                  value={editUser.contact} 
                  onChange={(e) => setEditUser({ ...editUser, contact: formatContact(e.target.value) })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Address</label>
                <textarea
                  className="address-input"
                  placeholder="e.g. Block A, City"
                  value={editUser.address}
                  onChange={(e) => setEditUser({ ...editUser, address: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleUpdateUser();
                    }
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    color: '#333333',
                    border: '1px solid #ced4da',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>User Role *</label>
                <select 
                  value={editUser.role} 
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Role * --</option>
                  {Array.isArray(roles) && roles.map(r => <option key={r._id} value={r._id}>{r.role}</option>)}
                </select>
              </div>

              {/* Spanning full width for image upload in edit modal */}
              <div style={{ ...formGroupStyle, gridColumn: '1 / span 2' }}>
                <label style={labelStyle}>Update Profile Image</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} style={{ border: '1px solid #ccc', padding: '5px', width: '100%', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateUser} style={{ padding: '10px 15px', background: '#5aa7ef', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Save Changes
              </button>
              <button className="btn btn-cancel" onClick={() => { setEditUserId(null); clearMessage(); }} style={{ padding: '10px 15px', background: '#ccc', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Cancel
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
    justifyContent: 'center',
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
    backgroundColor: '#e9f2e9'
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
export default Users;