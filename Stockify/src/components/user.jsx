import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function MessagePopup({ message, onClose }) {
  if (!message.text) return null;
  const isError = message.type === 'error';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999999 }}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: '320px', maxWidth: '90%', padding: 'var(--space-md)',
          borderLeft: `4px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 'var(--space-md)', boxShadow: 'var(--shadow-modal)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '20px' }}>{isError ? '⚠️' : '✅'}</span>
          <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            <strong style={{ color: isError ? 'var(--danger)' : 'var(--success)' }}>
              {isError ? 'Error! ' : 'Success! '}
            </strong>
            {message.text}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
      </div>
    </div>
  );
}

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

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [creationMode, setCreationMode] = useState('new');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [message, setMessage] = useState({ text: '', type: '' });

  const [userToDelete, setUserToDelete] = useState(null);
  const [uploading, setUploading] = useState({ add: false, edit: false });

  const [showPermissions, setShowPermissions] = useState(false);

  const initialState = {
    name: '', email: '', password: '', confirmPassword: '', cnic: '',
    contact: '+92', address: '', status: 'Active', role: '', pic: '', employeeId: ''
  };

  const [newUser, setNewUser] = useState(initialState);
  const [editUserId, setEditUserId] = useState(null);
  const [editUser, setEditUser] = useState(initialState);
  const [viewUser, setViewUser] = useState(null);

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
          setCreationMode('new');
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
    setShowPermissions(false);
  };

  const closeView = () => {
    setViewUser(null);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchEmployees();
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

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setUsers(data);
        else if (data?.data && Array.isArray(data.data)) setUsers(data.data);
        else if (data?.users && Array.isArray(data.users)) setUsers(data.users);
        else setUsers([]);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  // ================= FETCH ROLES =================
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRoles(data);
        else if (typeof data === 'object' && data !== null) {
          const extractedArray = data.roles || data.data || Object.values(data).find(val => Array.isArray(val)) || [];
          setRoles(extractedArray);
        } else setRoles([]);
      } else setRoles([]);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    }
  };

  // ================= FETCH EMPLOYEES =================
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find(e => e._id === empId);
    if (emp) {
      let matchedRoleId = '';
      const empRole = emp.role?._id || emp.role;
      const empDesig = emp.designation?._id || emp.designationId || emp.designation;

      if (empRole) {
        const found = roles.find(r => r._id === empRole || r._id === empRole.toString());
        if (found) matchedRoleId = found._id;
      }

      if (!matchedRoleId && empDesig) {
        const foundById = roles.find(r => r._id === empDesig || r._id === empDesig.toString());
        if (foundById) {
          matchedRoleId = foundById._id;
        } else {
          const desigName = typeof emp.designation === 'object' ? emp.designation.designation : empDesig;
          const foundByName = roles.find(r => r.role && r.role.toLowerCase() === String(desigName).toLowerCase());
          if (foundByName) {
            matchedRoleId = foundByName._id;
          }
        }
      }

      setNewUser({
        ...newUser,
        employeeId: emp._id,
        name: emp.name || '',
        email: emp.email || '',
        role: matchedRoleId,
        contact: emp.contact ? formatContact(emp.contact) : '+92',
        cnic: emp.cnic ? formatCNIC(emp.cnic) : '',
        address: emp.address || ''
      });
    } else {
      setNewUser({
        ...newUser,
        employeeId: '',
        name: '',
        email: '',
        role: '',
        contact: '+92',
        cnic: '',
        address: ''
      });
    }
  };

  // ================= HANDLE IMAGE UPLOAD =================
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

      if (res.ok) {
        const data = await res.json();
        if (isEditing) setEditUser({ ...editUser, pic: data.imageUrl });
        else setNewUser({ ...newUser, pic: data.imageUrl });
        showMessage('Image uploaded successfully!', 'success');
      } else {
        showMessage('Failed to upload image to server.', 'error');
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showMessage('Server error during image upload.', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: false }));
    }
  };

  const checkDuplicates = (payload, userIdToExclude = null) => {
    if (payload.email) {
      const duplicateEmail = users.find(u => u.email && u.email.toLowerCase() === payload.email.toLowerCase() && u._id !== userIdToExclude);
      if (duplicateEmail) return "This Email is already registered.";
    }

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

  // ================= HANDLE ADD USER =================
  const handleAddUser = async () => {
    if (creationMode === 'employee' && !newUser.employeeId) {
      showMessage('Please select an employee to link!', 'error');
      return;
    }

    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      showMessage('Name, Email, Password and Role are required!', 'error');
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

    const payloadObj = { ...newUser, email: newUser.email.trim() };
    const duplicateError = checkDuplicates(payloadObj);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { confirmPassword, ...payload } = payloadObj;

      if (!payload.employeeId) delete payload.employeeId;

      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json().catch(() => null);

      if (res.ok) {
        showMessage('User added successfully!', 'success');
        setNewUser(initialState);
        setCreationMode('new');
        setIsAddModalOpen(false);
        fetchUsers();
      } else {
        showMessage(responseData?.message || 'Error saving user. Backend rejected data.', 'error');
      }
    } catch (error) {
      showMessage('Server error while saving user.', 'error');
    }
  };

  // ================= HANDLE UPDATE USER =================
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

    const payload = { ...editUser, email: editUser.email.trim() };

    const duplicateError = checkDuplicates(payload, editUserId);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { confirmPassword, ...finalPayload } = payload;

      if (!finalPayload.password) delete finalPayload.password;
      if (!finalPayload.role) delete finalPayload.role;
      if (!finalPayload.employeeId) finalPayload.employeeId = null;

      const res = await fetch(`${API_BASE_URL}/api/users/${editUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalPayload)
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

  // ================= EXECUTE DELETE =================
  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

    setEditUser({
      name: user.name || '',
      email: user.email || '',
      cnic: user.cnic || '',
      contact: user.contact || '+92',
      address: user.address || '',
      role: typeof user.role === 'object' ? (user.role?._id || '') : (user.role || ''),
      employeeId: typeof user.employeeId === 'object' ? (user.employeeId?._id || '') : (user.employeeId || ''),
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

  return (
    <div className="dashboard-wrapper">

      {/* HEADER */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px', fontWeight: 600 }}>Manage System Users</h4>
        <button
          className="btn btn-primary"
          onClick={() => { clearMessage(); setIsAddModalOpen(true); }}
        >
          + Add User
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '10%', textAlign: 'center' }}>Sr #</th>
                <th style={{ ...tableStyles.th, width: '25%' }}>Name</th>
                <th style={{ ...tableStyles.th, width: '30%' }}>Email</th>
                <th style={{ ...tableStyles.th, width: '20%' }}>Role</th>
                <th style={{ ...tableStyles.th, width: '15%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((u, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;

                  let displayRoleName = <span style={{ color: 'var(--danger)' }}>No Role</span>;
                  if (u.role) {
                    if (typeof u.role === 'object' && u.role.role) {
                      displayRoleName = u.role.role;
                    } else {
                      const matchedRole = roles.find(r => r._id === u.role);
                      displayRoleName = matchedRole ? matchedRole.role : String(u.role);
                    }
                  }

                  return (
                    <tr
                      key={u._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ ...tableStyles.td, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{serialNumber}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AvatarImage pic={u.pic} name={u.name} size={32} />
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email || 'N/A'}
                      </td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayRoleName}
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <div style={styles.actionGroup}>
                          <button style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => openView(u)} title="View">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>

                          <button style={actionStyles.iconBtnEdit} onClick={() => startEdit(u)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          <button style={actionStyles.iconBtnDelete} onClick={() => setUserToDelete(u._id)} title="Delete">
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
                  <td colSpan="5" style={tableStyles.emptyCell}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredUsers.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '6px 12px' }}
            >
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '6px 12px' }}
            >
              →
            </button>
          </div>
        )}
      </div>

      {userToDelete && (
        <div className="modal-overlay" onClick={() => setUserToDelete(null)}>
          <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <MessagePopup message={message} onClose={clearMessage} />
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
              }}>
                !
              </div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Confirm Deletion</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => { setUserToDelete(null); clearMessage(); }}>Cancel</button>
              <button className="btn btn-danger" onClick={executeDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="modal-overlay" onClick={closeView}>
          <div className="modal-container" style={{ maxWidth: '700px', width: '90%', padding: 0, overflow: 'hidden', borderRadius: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ backgroundColor: 'var(--primary-other)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
              {viewUser.pic ? (
                <img src={viewUser.pic} alt={viewUser.name} style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              ) : (
                <div style={{
                  width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700,
                  border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  {getInitials(viewUser.name)}
                </div>
              )}
              <h3 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '600' }}>{viewUser.name}</h3>
            </div>

            <div className="modal-body" style={{ display: 'grid', textAlign: 'left', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', padding: '14px 54px', overflowY: 'auto', height: '55vh' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-main)', fontWeight: 600 }}>Email Address</label>
                <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500, wordBreak: 'break-word' }}>{viewUser.email || "N/A"}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-main)', fontWeight: 600 }}>Contact Number</label>
                <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>{viewUser.contact || "N/A"}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-main)', fontWeight: 600 }}>CNIC</label>
                <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>{viewUser.cnic || "N/A"}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-main)', fontWeight: 600 }}>Role</label>
                <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {(() => {
                    if (!viewUser.role) return "N/A";
                    if (typeof viewUser.role === 'object' && viewUser.role.role) return viewUser.role.role;
                    const matched = roles.find(r => r._id === viewUser.role);
                    return matched ? matched.role : String(viewUser.role);
                  })()}
                </p>
              </div>

             

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-main)', fontWeight: 600 }}>Address</label>
                <p style={{ fontSize: '13px', margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500, backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {viewUser.address || "No Address Provided"}
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ backgroundColor: '#fff', borderTop: '1px solid var(--border-color)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeView}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New User</h3>
              <button className="modal-close" onClick={() => { setIsAddModalOpen(false); setNewUser(initialState); setCreationMode('new'); clearMessage(); }}>&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <MessagePopup message={message} onClose={clearMessage} />

              <div style={{ backgroundColor: 'var(--bg-app)', width: '55%', marginLeft: '22%', padding: '6px', borderRadius: '2px', display: 'flex', gap: '4px', marginBottom: '24px', border: '1px solid var(--btn-border)' }}>
                <button
                  type="button"
                  onClick={() => { setCreationMode('new'); setNewUser(initialState); clearMessage(); }}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '2px', backgroundColor: creationMode === 'new' ? 'var(--header)' : 'transparent', color: creationMode === 'new' ? '#fff' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: creationMode === 'new' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                >
                  Create Fresh User
                </button>
                <button
                  type="button"
                  onClick={() => { setCreationMode('employee'); setNewUser(initialState); clearMessage(); }}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '2px', backgroundColor: creationMode === 'employee' ? 'var(--header)' : 'transparent', color: creationMode === 'employee' ? '#fff' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: creationMode === 'employee' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                >
                  Link Existing Employee
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>

                {creationMode === 'employee' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <select
                      className="form-input"
                      value={newUser.employeeId || ''}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      style={{ marginTop: '6px', border: '1px solid var(--btn-border) ', width: '100%', padding: '10px', borderRadius: '6px' }}
                    >
                      <option value="">-- Choose an Employee --</option>
                      {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.designation?.designation || 'Staff'})</option>)}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Full Name </label>
                  <input
                    className="form-input"
                    placeholder="e.g. John Doe"
                    autoComplete="off"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Email Address </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="user@domain.com"
                    autoComplete="off"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">User Role </label>
                  <select
                    className="form-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Role  --</option>
                    {Array.isArray(roles) && roles.map(r => <option key={r._id} value={r._id}>{r.role}</option>)}
                  </select>
                </div>

                {/* Password Field */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Password </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                      style={{ paddingRight: '40px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
                    >
                     <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />      
                    </span>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Confirm Password </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                      style={{ paddingRight: '40px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />                   
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contact Number</label>
                  <input
                    className="form-input"
                    placeholder="+923001234567"
                    autoComplete="off"
                    value={newUser.contact}
                    onChange={(e) => setNewUser({ ...newUser, contact: formatContact(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* CNIC Automatic Formatting */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">CNIC</label>
                  <input
                    className="form-input"
                    placeholder="64822-1648208-2"
                    autoComplete="off"
                    maxLength={15}
                    value={newUser.cnic}
                    onChange={(e) => setNewUser({ ...newUser, cnic: formatCNIC(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    placeholder="e.g. Block A, City"
                    autoComplete="off"
                    rows={2}
                    value={newUser.address}
                    onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleAddUser();
                      }
                    }}
                    style={{ resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Upload Profile Image</label>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #cbd5e1', 
                    borderRadius: '6px', padding: '6px', backgroundColor: 'white', width: '100%', justifyContent: 'flex-start'
                  }}>
                    <label style={{
                      backgroundColor: 'var(--header)', color: 'white', padding: '6px 24px', borderRadius: '4px',
                      cursor: uploading.add ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: 0, border: 'none', transition: 'opacity 0.2s'
                    }}>
                      Choose File
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} disabled={uploading.add} style={{ display: 'none' }} />
                    </label>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {newUser.pic ? 'File selected' : 'No file chosen'}
                    </span>
                  </div>
                  {uploading.add ? (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>Uploading image…</span>
                  ) : (
                    newUser.pic && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                        <AvatarImage pic={newUser.pic} name={newUser.name} size={40} />
                        <span style={{ fontSize: '13px', color: 'var(--success)' }}>✓ Image ready</span>
                      </div>
                    )
                  )}
                </div>

              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setNewUser(initialState); setCreationMode('new'); clearMessage(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddUser}>Save User</button>
            </div>
          </div>
        </div>
      )}

      {editUserId && (
        <div className="modal-overlay" onClick={() => setEditUserId(null)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User</h3>
              <button className="modal-close" onClick={() => { setEditUserId(null); clearMessage(); }}>&times;</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <MessagePopup message={message} onClose={clearMessage} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>

                {/* --- ACCOUNT SECURITY SECTION --- */}
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Account & Security</h4>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>(view only)</span></label>
                  <input type="email" readOnly disabled className="form-input" value={editUser.email} style={{ backgroundColor: 'var(--bg-app)', cursor: 'not-allowed', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">User Role </label>
                  <select
                    className="form-input"
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Role  --</option>
                    {Array.isArray(roles) && roles.map(r => <option key={r._id} value={r._id}>{r.role}</option>)}
                  </select>
                </div>

                {/* Password Field */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">New Password </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      value={editUser.password}
                      onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                      style={{ paddingRight: '40px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />                    
                    </span>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Confirm new Password </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      value={editUser.confirmPassword}
                      onChange={(e) => setEditUser({ ...editUser, confirmPassword: e.target.value })}
                      onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                      style={{ paddingRight: '40px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <span
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />      
                    </span>
                  </div>
                </div>

                {/* --- PERSONAL DETAILS SECTION --- */}
                <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Personal Details</h4>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Full Name </label>
                  <input
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={editUser.name}
                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Contact Number</label>
                  <input
                    className="form-input"
                    placeholder="+923001234567"
                    value={editUser.contact}
                    onChange={(e) => setEditUser({ ...editUser, contact: formatContact(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CNIC</label>
                  <input
                    className="form-input"
                    placeholder="64822-1648208-2"
                    maxLength={15}
                    value={editUser.cnic}
                    onChange={(e) => setEditUser({ ...editUser, cnic: formatCNIC(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateUser)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Linked Employee</label>
                  <select
                    className="form-input"
                    value={editUser.employeeId}
                    onChange={(e) => setEditUser({ ...editUser, employeeId: e.target.value })}
                    style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Unlinked --</option>
                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    placeholder="e.g. Block A, City"
                    value={editUser.address}
                    onChange={(e) => setEditUser({ ...editUser, address: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleUpdateUser();
                      }
                    }}
                    style={{ minHeight: '60px', resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>Update Profile Image</label>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #cbd5e1', 
                    borderRadius: '6px', padding: '6px', backgroundColor: 'white', width: '100%', justifyContent: 'flex-start'
                  }}>
                    <label style={{
                      backgroundColor: 'var(--header)', color: 'white', padding: '6px 24px', borderRadius: '4px',
                      cursor: uploading.edit ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: 0, border: 'none', transition: 'opacity 0.2s'
                    }}>
                      Choose File
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} style={{ display: 'none' }} />
                    </label>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {editUser.pic ? 'File selected' : 'No file chosen'}
                    </span>
                  </div>
                  {uploading.edit ? (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>Uploading image…</span>
                  ) : (
                    editUser.pic && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                        <AvatarImage pic={editUser.pic} name={editUser.name} size={40} />
                        <span style={{ fontSize: '13px', color: 'var(--success)' }}>✓ Current image — pick a new file to replace it</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => { setEditUserId(null); clearMessage(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateUser}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tableStyles = {
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '13px',
    textAlign: 'left'
  },
  td: {
    padding: '8px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  }
};

const actionStyles = {
  iconBtnView: {
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnEdit: {
    background: 'var(--edit)',
    color: 'var(--primary)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  iconBtnDelete: {
    backgroundColor: 'var(--danger-bg)',
    color: 'var(--danger)',
    border: 'none',
    padding: '6px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};

const styles = {
  actionGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  }
};

export default Users;