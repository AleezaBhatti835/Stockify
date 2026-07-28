import { useState, useEffect } from 'react';
import './roles.css';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

// Fix: Handle both full URLs and relative paths
const getImageUrl = (pic) => {
  if (!pic) return null;

  // Normalize Windows backslashes to forward slashes
  const normalizedPic = pic.replace(/\\/g, '/');

  // If it already has http/https, return as is (already a full URL)
  if (normalizedPic.startsWith('http://') || normalizedPic.startsWith('https://')) {
    return normalizedPic;
  }

  // Otherwise prepend the base URL
  return `${API_BASE_URL}${normalizedPic.startsWith('/') ? '' : '/'}${normalizedPic}`;

};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// Shows the employee's photo; if there's no pic saved, or the URL fails to
// load (e.g. broken path, server not reachable), falls back to an initials avatar.
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

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(2);

  const initialState = {
    name: '',
    email: '',
    phone: '',
    cnic: '',
    address: '',
    pic: '',
    designation: '',
    status: 'Active'
  };

  const [newEmployee, setNewEmployee] = useState(initialState);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editEmployee, setEditEmployee] = useState(initialState);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState({ add: false, edit: false });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = employees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  // Reset to page 1 when employees change
  useEffect(() => {
    setCurrentPage(1);
  }, [employees]);

  useEffect(() => {
    fetchEmployees();
    fetchDesignations();
  }, []);

  // Helper function to show messages and auto-clear them after 6 seconds
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 6000);
  };

  const clearMessage = () => {
    setMessage({ text: '', type: '' });
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/employees');
      if (response.ok) {
        const data = await response.json();
        // Check if data is an array or has an employees property
        let employeesData = [];
        if (Array.isArray(data)) {
          employeesData = data;
        } else if (data.employees && Array.isArray(data.employees)) {
          employeesData = data.employees;
        } else if (data.data && Array.isArray(data.data)) {
          employeesData = data.data;
        } else {
          employeesData = [];
        }

        // Filter to only show active employees (status is 'Active' or not 'inactive')
        const activeEmployees = employeesData.filter(emp =>
          emp.status === 'Active' || emp.status !== 'inactive'
        );
        setEmployees(activeEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/designations');
      if (response.ok) {
        const data = await response.json();
        // Check if data is an array or has a designations property
        if (Array.isArray(data)) {
          setDesignations(data);
        } else if (data.designations && Array.isArray(data.designations)) {
          setDesignations(data.designations);
        } else {
          setDesignations([]);
        }
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setDesignations([]);
    }
  };

  const handleImageUpload = async (e, isEditing) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: true }));

    try {
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
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

      // Store the image URL as returned by the server (it's already a full URL)
      // But we need to store only the path part to avoid double URL issues
      const imagePath = data.imageUrl;

      isEditing
        ? setEditEmployee(prev => ({ ...prev, pic: imagePath }))
        : setNewEmployee(prev => ({ ...prev, pic: imagePath }));
      showMessage('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showMessage('Upload failed: could not reach the server.', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: false }));
    }
  };

  const isValidEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Helper function to check for duplicates
  const checkDuplicates = (payload, employeeIdToExclude = null) => {
    const activeEmployees = employees.filter(e => e.status === 'Active');

    if (payload.email) {
      const duplicateEmail = activeEmployees.find(e =>
        e.email && e.email.toLowerCase() === payload.email.toLowerCase() && e._id !== employeeIdToExclude
      );
      if (duplicateEmail) return "This Email is already registered to another active employee.";
    }

    if (payload.phone) {
      const duplicatePhone = activeEmployees.find(e =>
        e.phone && e.phone === payload.phone && e._id !== employeeIdToExclude
      );
      if (duplicatePhone) return "This Phone Number is already registered to another active employee.";
    }

    if (payload.cnic) {
      const duplicateCnic = activeEmployees.find(e =>
        e.cnic && e.cnic === payload.cnic && e._id !== employeeIdToExclude
      );
      if (duplicateCnic) return "This CNIC is already registered to another active employee.";
    }

    return null;
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.designation) {
      showMessage('Name and Designation are required!', 'error');
      return;
    }

    if (newEmployee.email && !isValidEmail(newEmployee.email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    // Check for duplicates before saving
    const duplicateError = checkDuplicates(newEmployee);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEmployee,
          status: 'Active'
        })
      });
      if (res.ok) {
        showMessage('Employee added successfully!', 'success');
        setNewEmployee(initialState);
        setIsAddModalOpen(false);
        fetchEmployees();
      } else {
        const errorText = await res.text();
        showMessage(`Error saving employee: ${errorText}`, 'error');
      }
    } catch (error) {
      showMessage('Server error.', 'error');
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editEmployee.name || !editEmployee.designation) {
      showMessage('Name and Designation are required!', 'error');
      return;
    }

    // Check for duplicates before saving (excluding the current employee being edited)
    const duplicateError = checkDuplicates(editEmployee, editEmployeeId);
    if (duplicateError) {
      showMessage(duplicateError, 'error');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/employees/${editEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editEmployee.name,
          email: editEmployee.email,
          phone: editEmployee.phone,
          cnic: editEmployee.cnic,
          address: editEmployee.address,
          pic: editEmployee.pic,
          designation: editEmployee.designation
        })
      });
      if (res.ok) {
        showMessage('Employee updated successfully!', 'success');
        setEditEmployeeId(null);
        fetchEmployees();
      } else {
        showMessage('Update failed. Server responded with an error.', 'error');
      }
    } catch (error) {
      showMessage('Update failed. Cannot reach server.', 'error');
    }
  };

  const requestDelete = (employee) => {
    setDeleteTarget(employee);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`http://localhost:5000/api/employees/${deleteTarget._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showMessage('Employee deactivated successfully!', 'success');
        fetchEmployees();
      } else {
        const data = await res.json();
        showMessage(data.message || 'Failed to deactivate employee', 'error');
      }
    } catch (error) {
      showMessage('Server error. Could not connect.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const startEdit = (employee) => {
    setEditEmployeeId(employee._id);
    setEditEmployee({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      cnic: employee.cnic || '',
      address: employee.address || '',
      pic: employee.pic || '',
      designation: employee.designation ? employee.designation._id : ''
    });
  };

  const startView = (employee) => {
    setViewEmployee(employee);
  };

  return (
    <div className="roles-container" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h2>Manage Employees</h2>
        <button style={{ width: 'auto', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap' }}
          onClick={() => setIsAddModalOpen(true)}>
          + Add Employee
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
        <span>Showing {currentItems.length} of {employees.length} employees</span>
      </div>

      {/* TABLE WRAPPED IN SCROLLABLE DIV */}
      <div className="table-scroll-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="roles-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '10%', textAlign: 'center' }}>Sr #</th>
              <th style={{ width: '15%', textAlign: 'left' }}>Name</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Email</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Designation</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((emp, index) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <tr key={emp._id}>
                    <td style={{ textAlign: 'center' }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AvatarImage pic={emp.pic} name={emp.name} size={32} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email || 'N/A'}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.designation ? emp.designation.designation : 'N/A'}
                    </td>
                    <td className="actions-cell" style={{ textAlign: 'center' }}>
                      <div style={styles.actionGroup}>
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => startView(emp)} title="View">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button style={styles.iconBtnEdit} onClick={() => startEdit(emp)} title="Edit">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          style={styles.iconBtnDelete}
                          onClick={() => {
                            requestDelete(emp._id);
                            setIsDeleteModalOpen(true);
                          }}
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  No employees found. Click "Add Employee" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {employees.length > itemsPerPage && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '10px 0'
        }}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{ 
              padding: '8px 16px',
              backgroundColor: currentPage === 1 ? '#e9ecef' : '#5aa7ef',
              color: currentPage === 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            ← 
          </button>
          
          <span style={{ fontSize: '12px', fontWeight: '400',color:'#868484'}}>
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
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
             →
          </button>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Add New Employee</h3>

            <MessagePopup message={message} onClose={clearMessage} />

            <div className="user-form" style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Full Name *</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Email Address</label>
                <input type="email" style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="e.g. john@example.com" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Phone Number</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>CNIC</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }}
                  value={newEmployee.cnic}
                  onChange={(e) => setNewEmployee({ ...newEmployee, cnic: e.target.value })}
                  placeholder="XXXXX-XXXXXXX-X" />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Designation *</label>
                <select
                  value={newEmployee.designation}
                  onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                  style={{ fontSize: '0.85rem', width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">-- Select Designation * --</option>
                  {designations.map(desig => (
                    <option key={desig._id} value={desig._id}>
                      {desig.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Address</label>
                <textarea
                  style={{ fontSize: '0.85rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                  value={newEmployee.address}
                  onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <label style={{ alignItems: 'left', fontSize: '0.8rem' }}>Upload Image</label>
                <input style={{ fontSize: '0.85rem' }} type="file" accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)} disabled={uploading.add} />
                {uploading.add && (
                  <span style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
                )}
                {!uploading.add && newEmployee.pic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <AvatarImage pic={newEmployee.pic} name={newEmployee.name} size={40} />
                    <span style={{ fontSize: '0.75rem', color: '#28a745' }}>✓ Image ready — will be saved with this employee</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddEmployee}>Save Employee</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editEmployeeId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Edit Employee</h3>

            <MessagePopup message={message} onClose={clearMessage} />

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Full Name *</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }}
                  value={editEmployee.name}
                  onChange={(e) => setEditEmployee({ ...editEmployee, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Email Address <span style={{ fontSize: '0.7rem', color: '#6c757d' }}>(view only)</span></label>
                <input
                  style={{ fontSize: '0.85rem', width: '100%', backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                  value={editEmployee.email || 'N/A'}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>Phone Number</label>
                <input style={{ fontSize: '0.85rem', width: '100%' }}
                  value={editEmployee.phone}
                  onChange={(e) => setEditEmployee({ ...editEmployee, phone: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem' }}>CNIC <span style={{ fontSize: '0.7rem', color: '#6c757d' }}></span></label>
                <input
                  style={{ fontSize: '0.85rem', width: '100%' }}
                  value={editEmployee.cnic || 'N/A'}

                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem' }}>Designation *</label>
                <select
                  value={editEmployee.designation}
                  onChange={(e) => setEditEmployee({ ...editEmployee, designation: e.target.value })}
                  style={{ fontSize: '0.85rem', width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="">-- Select Designation * --</option>
                  {designations.map(desig => (
                    <option key={desig._id} value={desig._id}>
                      {desig.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Address</label>
                <textarea
                  style={{ fontSize: '0.85rem', backgroundColor: '#f8f9fa', color: '#212529', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                  value={editEmployee.address}
                  onChange={(e) => setEditEmployee({ ...editEmployee, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem' }}>Update Image</label>
                <input style={{ fontSize: '0.85rem' }} type="file" accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} />
                {uploading.edit ? (
                  <span style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <AvatarImage pic={editEmployee.pic} name={editEmployee.name} size={40} />
                    <span style={{ fontSize: '0.75rem', color: editEmployee.pic ? '#28a745' : '#6c757d' }}>
                      {editEmployee.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateEmployee}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setEditEmployeeId(null); clearMessage(); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ height: 'auto', maxWidth: '520px', padding: 0, position: 'relative' }}>
            {/* Header with photo */}
            <div style={{
              backgroundColor: '#5aa7ef', padding: '24px 24px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
              <div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: '50%', border: '3px solid white' }}>
                <AvatarImage pic={viewEmployee.pic} name={viewEmployee.name} size={84} />
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{viewEmployee.name}</h3>
            </div>

            {/* Details */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Email Address</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529', wordBreak: 'break-word' }}>{viewEmployee.email || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Phone Number</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewEmployee.phone || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>CNIC</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>{viewEmployee.cnic || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Designation</label>
                  <p style={{ fontSize: '0.95rem', margin: '4px 0 0', color: '#212529' }}>
                    {viewEmployee.designation ? viewEmployee.designation.designation : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6c757d', fontWeight: 600 }}>Address</label>
                <div style={{
                  marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: '8px',
                  backgroundColor: '#f4f6f8', border: '1px solid #e2e6ea', fontSize: '0.9rem',
                  color: '#212529', whiteSpace: 'pre-wrap', lineHeight: 1.5
                }}>
                  {viewEmployee.address || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewEmployee(null)} style={{ backgroundColor: '#6c757d', color: 'white' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>
            <MessagePopup message={message} onClose={clearMessage} />

            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#fdecea',
              color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 14px'
            }}>
              !
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Deactivate Employee</h3>
            <p style={{ fontSize: '0.9rem', color: '#6c757d', margin: 0 }}>
              Are you sure you want to deactivate <strong>{deleteTarget.name}</strong>? They will no longer appear in the active employees list.
            </p>

            <div className="modal-actions" style={{ marginTop: '22px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
              <button onClick={handleDelete} style={{ backgroundColor: '#dc3545', color: 'white' }}>Deactivate</button>
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
        justifyContent: 'left',
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
        backgroundColor:'#e9f2e9'
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

export default Employees;