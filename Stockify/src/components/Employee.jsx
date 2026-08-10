import { useState, useEffect } from 'react';
import './roles.css';
import './customer.css';

const API_BASE_URL = 'http://localhost:5000';

const getImageUrl = (pic) => {
  if (!pic) return null;
  const normalizedPic = pic.replace(/\\/g, '/');
  if (normalizedPic.startsWith('http://') || normalizedPic.startsWith('https://')) {
    return normalizedPic;
  }
  return `${API_BASE_URL}${normalizedPic.startsWith('/') ? '' : '/'}${normalizedPic}`;
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

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const initialState = {
    name: '',
    emailPrefix: '',
    phone: '+92',
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

  // Inline message states for modals
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });
  const [editMessage, setEditMessage] = useState({ text: '', type: '' });
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });
  const [imageUploadMessage, setImageUploadMessage] = useState({ text: '', type: '' });

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
          setAddMessage({ text: '', type: '' });
          setImageUploadMessage({ text: '', type: '' });
        }
        if (editEmployeeId) {
          e.preventDefault();
          setEditEmployeeId(null);
          setEditMessage({ text: '', type: '' });
          setImageUploadMessage({ text: '', type: '' });
        }
        if (viewEmployee) {
          e.preventDefault();
          setViewEmployee(null);
        }
        if (deleteTarget) {
          e.preventDefault();
          setDeleteTarget(null);
          setDeleteMessage({ text: '', type: '' });
        }
      }
      if (e.key === 'Enter' && isAddModalOpen) {
        e.preventDefault();
        handleAddEmployee();
      }
      if (e.key === 'Enter' && editEmployeeId) {
        e.preventDefault();
        handleUpdateEmployee();
      }
      if (e.key === 'Enter' && deleteTarget) {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editEmployeeId, viewEmployee, deleteTarget, editEmployee, newEmployee]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = employees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [employees]);

  useEffect(() => {
    fetchEmployees();
    fetchDesignations();
  }, []);

  const showAddMessage = (text, type) => {
    setAddMessage({ text, type });
    setTimeout(() => setAddMessage({ text: '', type: '' }), 3000);
  };

  const showEditMessage = (text, type) => {
    setEditMessage({ text, type });
    setTimeout(() => setEditMessage({ text: '', type: '' }), 3000);
  };

  const showDeleteMessage = (text, type) => {
    setDeleteMessage({ text, type });
    setTimeout(() => setDeleteMessage({ text: '', type: '' }), 3000);
  };

  const showImageMessage = (text, type) => {
    setImageUploadMessage({ text, type });
    setTimeout(() => {
      setImageUploadMessage({ text: '', type: '' });
    }, 3000);
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/employees');
      if (response.ok) {
        const data = await response.json();
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

      const imagePath = data.imageUrl;
      isEditing
        ? setEditEmployee(prev => ({ ...prev, pic: imagePath }))
        : setNewEmployee(prev => ({ ...prev, pic: imagePath }));
      
      showImageMessage('✅ Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload request error:', error);
      showImageMessage('❌ Upload failed: could not reach the server.', 'error');
    } finally {
      setUploading(prev => ({ ...prev, [isEditing ? 'edit' : 'add']: false }));
    }
  };

  const checkDuplicates = (payload, employeeIdToExclude = null) => {
    const activeEmployees = employees.filter(e => e.status === 'Active');

    if (payload.email) {
      const duplicateEmail = activeEmployees.find(e =>
        e.email && e.email.toLowerCase() === payload.email.toLowerCase() && e._id !== employeeIdToExclude
      );
      if (duplicateEmail) return "This Email is already registered to another active employee.";
    }

    if (payload.phone && payload.phone !== '+92') {
      const duplicatePhone = activeEmployees.find(e =>
        e.phone && e.phone === payload.phone && e._id !== employeeIdToExclude
      );
      if (duplicatePhone) return "This Phone Number is already registered to another active employee.";
    }

    if (payload.cnic && payload.cnic.trim() !== '') {
      const duplicateCnic = activeEmployees.find(e =>
        e.cnic && e.cnic === payload.cnic && e._id !== employeeIdToExclude
      );
      if (duplicateCnic) return "This CNIC is already registered to another active employee.";
    }

    return null;
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.designation || !newEmployee.emailPrefix) {
      showAddMessage('Name, Email prefix, and Designation are required!', 'error');
      return;
    }

    const fullEmail = `${newEmployee.emailPrefix.trim()}@gmail.com`;
    const payloadObj = { ...newEmployee, email: fullEmail };

    const duplicateError = checkDuplicates(payloadObj);
    if (duplicateError) {
      showAddMessage(duplicateError, 'error');
      return;
    }

    try {
      const { emailPrefix, ...finalPayload } = payloadObj;
      const res = await fetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalPayload,
          status: 'Active'
        })
      });
      if (res.ok) {
        showAddMessage('Employee added successfully!', 'success');
        setTimeout(() => {
          setNewEmployee(initialState);
          setIsAddModalOpen(false);
          setAddMessage({ text: '', type: '' });
          fetchEmployees();
        }, 500);
      } else {
        const errorText = await res.text();
        showAddMessage(`Error saving employee: ${errorText}`, 'error');
      }
    } catch (error) {
      showAddMessage('Server error.', 'error');
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editEmployee.name || !editEmployee.designation) {
      showEditMessage('Name and Designation are required!', 'error');
      return;
    }

    // Build full email from prefix
    const fullEmail = editEmployee.emailPrefix.trim() ? `${editEmployee.emailPrefix.trim()}@gmail.com` : '';
    
    // Check if nothing changed - compare all fields including email
    const originalEmployee = employees.find(e => e._id === editEmployeeId);
    if (originalEmployee) {
      // Get original designation ID properly
      let originalDesignationId = originalEmployee.designation;
      if (typeof originalEmployee.designation === 'object' && originalEmployee.designation !== null) {
        originalDesignationId = originalEmployee.designation._id;
      }
      
      const isSame = 
        originalEmployee.name === editEmployee.name &&
        originalEmployee.phone === editEmployee.phone &&
        originalEmployee.address === editEmployee.address &&
        originalEmployee.cnic === editEmployee.cnic &&
        originalEmployee.email === fullEmail &&
        originalDesignationId === editEmployee.designation;
      
      if (isSame) {
        showEditMessage('Nothing to update!', 'info');
        return;
      }
    }

    // Create payload with full email
    const payload = { ...editEmployee, email: fullEmail };

    const duplicateError = checkDuplicates(payload, editEmployeeId);
    if (duplicateError) {
      showEditMessage(duplicateError, 'error');
      return;
    }

    try {
      const { emailPrefix, ...finalPayload } = payload;
      const res = await fetch(`http://localhost:5000/api/employees/${editEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });
      if (res.ok) {
        showEditMessage('Employee updated successfully!', 'success');
        setTimeout(() => {
          setEditEmployeeId(null);
          setEditMessage({ text: '', type: '' });
          fetchEmployees();
        }, 500);
      } else {
        showEditMessage('Update failed. Server responded with an error.', 'error');
      }
    } catch (error) {
      showEditMessage('Update failed. Cannot reach server.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`http://localhost:5000/api/employees/${deleteTarget._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showDeleteMessage('Employee deactivated successfully!', 'success');
        setTimeout(() => {
          setDeleteTarget(null);
          setDeleteMessage({ text: '', type: '' });
          fetchEmployees();
        }, 500);
      } else {
        const data = await res.json();
        showDeleteMessage(data.message || 'Failed to deactivate employee', 'error');
      }
    } catch (error) {
      showDeleteMessage('Server error. Could not connect.', 'error');
    }
  };

  const startEdit = (employee) => {
    setEditMessage({ text: '', type: '' });
    setImageUploadMessage({ text: '', type: '' });
    setEditEmployeeId(employee._id);
    let emailPrefixVal = employee.email || '';
    if (emailPrefixVal.endsWith('@gmail.com')) {
      emailPrefixVal = emailPrefixVal.replace('@gmail.com', '');
    }

    // Get designation ID properly
    let designationId = employee.designation;
    if (typeof employee.designation === 'object' && employee.designation !== null) {
      designationId = employee.designation._id;
    }

    setEditEmployee({
      name: employee.name || '',
      email: employee.email || '',
      emailPrefix: emailPrefixVal,
      phone: employee.phone || '+92',
      cnic: employee.cnic || '',
      address: employee.address || '',
      pic: employee.pic || '',
      designation: designationId || ''
    });
  };

  // Handle Enter key on input fields
  const handleInputKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="roles-container" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
        <h4>Manage Employees</h4>
        <button style={{ width: 'auto', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => { setAddMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}>
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
              <th style={{ width: '10%', textAlign: 'left' }}>Sr #</th>
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
                    <td style={{ textAlign: 'left' }}>{serialNumber}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AvatarImage pic={emp.pic} name={emp.name} size={32} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email || 'N/A'}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.designation ? (typeof emp.designation === 'object' ? emp.designation.designation : emp.designation) : 'N/A'}
                    </td>
                    <td className="actions-cell" style={{ textAlign: 'center' }}>
                      <div style={styles.actionGroup}>
                        {/* View Button */}
                        <button style={styles.iconBtnView} onClick={() => setViewEmployee(emp)} title="View">
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
                          onClick={() => { setDeleteMessage({ text: '', type: '' }); setDeleteTarget(emp); }}
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

            {/* Inline Message */}
            <InlineMessage message={addMessage.text} type={addMessage.type} />

            {/* Image Upload Inline Message */}
            {imageUploadMessage.text && !addMessage.text && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: '4px',
                backgroundColor: imageUploadMessage.type === 'error' ? '#fdecea' : '#d4edda',
                color: imageUploadMessage.type === 'error' ? '#dc3545' : '#155724',
                border: `1px solid ${imageUploadMessage.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
                fontSize: '13px'
              }}>
                {imageUploadMessage.text}
              </div>
            )}

            <div className="user-form" style={{ fontSize: '0.7rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.7rem' }}>Full Name *</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                  autoFocus
                />
              </div>

              {/* Email with suffix */}
              <div>
                <label style={{ fontSize: '0.7rem' }}>Email Address *</label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input 
                    style={{ fontSize: '0.7rem', width: '100%', padding: '8px', paddingRight: '85px', boxSizing: 'border-box' }}
                    value={newEmployee.emailPrefix}
                    onChange={(e) => setNewEmployee({ ...newEmployee, emailPrefix: e.target.value.replace(/@.*/, '') })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                    placeholder="username" 
                  />
                  <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '11px', pointerEvents: 'none' }}>
                    @gmail.com
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>Phone Number</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: formatContact(e.target.value) })} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                  placeholder="+923001234567"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>CNIC</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={newEmployee.cnic}
                  maxLength={15}
                  onChange={(e) => setNewEmployee({ ...newEmployee, cnic: formatCNIC(e.target.value) })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                  placeholder="64822-1648208-2" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>Designation *</label>
                <select
                  value={newEmployee.designation}
                  onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmployee();
                    }
                  }}
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
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
                <label style={{ fontSize: '0.7rem' }}>Address</label>
                <textarea
                  style={{ fontSize: '0.7rem', backgroundColor: '#f8f9fa', color: '#6c757d', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '8px', boxSizing: 'border-box' }}
                  value={newEmployee.address}
                  onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleAddEmployee();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <label style={{ alignItems: 'left', fontSize: '0.7rem' }}>Upload Image</label>
                <input style={{ fontSize: '0.7rem' }} type="file" accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)} disabled={uploading.add} />
                {uploading.add && (
                  <span style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
                )}
                {!uploading.add && newEmployee.pic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <AvatarImage pic={newEmployee.pic} name={newEmployee.name} size={40} />
                    <span style={{ fontSize: '0.7rem', color: '#28a745' }}>✓ Image ready — will be saved with this employee</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleAddEmployee}>Save Employee</button>
              <button className="btn btn-cancel" onClick={() => { setIsAddModalOpen(false); setAddMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editEmployeeId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', position: 'relative' }}>
            <h3>Edit Employee</h3>

            {/* Inline Message */}
            <InlineMessage message={editMessage.text} type={editMessage.type} />

            {/* Image Upload Inline Message */}
            {imageUploadMessage.text && !editMessage.text && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: '4px',
                backgroundColor: imageUploadMessage.type === 'error' ? '#fdecea' : '#d4edda',
                color: imageUploadMessage.type === 'error' ? '#dc3545' : '#155724',
                border: `1px solid ${imageUploadMessage.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
                fontSize: '13px'
              }}>
                {imageUploadMessage.text}
              </div>
            )}

            <div className="user-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.7rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem' }}>Full Name *</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editEmployee.name}
                  onChange={(e) => setEditEmployee({ ...editEmployee, name: e.target.value })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                  autoFocus
                />
              </div>

              {/* Email with suffix */}
              <div>
                <label style={{ fontSize: '0.7rem' }}>Email Address *</label>
                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <input 
                    style={{ fontSize: '0.7rem', width: '100%', padding: '8px', paddingRight: '85px', boxSizing: 'border-box' }}
                    value={editEmployee.emailPrefix}
                    onChange={(e) => setEditEmployee({ ...editEmployee, emailPrefix: e.target.value.replace(/@.*/, '') })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                    placeholder="username" 
                  />
                  <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '11px', pointerEvents: 'none' }}>
                    @gmail.com
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>Phone Number</label>
                <input 
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editEmployee.phone}
                  onChange={(e) => setEditEmployee({ ...editEmployee, phone: formatContact(e.target.value) })} 
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>CNIC</label>
                <input
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  value={editEmployee.cnic || ''}
                  maxLength={15}
                  onChange={(e) => setEditEmployee({ ...editEmployee, cnic: formatCNIC(e.target.value) })}
                  onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                  placeholder="64822-1648208-2"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem' }}>Designation *</label>
                <select
                  value={editEmployee.designation}
                  onChange={(e) => setEditEmployee({ ...editEmployee, designation: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUpdateEmployee();
                    }
                  }}
                  style={{ fontSize: '0.7rem', width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box' }}
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
                <label style={{ fontSize: '0.7rem' }}>Address</label>
                <textarea
                  style={{ fontSize: '0.7rem', backgroundColor: '#f8f9fa', color: '#6c757d', width: '100%', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', padding: '8px', boxSizing: 'border-box' }}
                  value={editEmployee.address}
                  onChange={(e) => setEditEmployee({ ...editEmployee, address: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      handleUpdateEmployee();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.7rem' }}>Update Image</label>
                <input style={{ fontSize: '0.7rem' }} type="file" accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} />
                {uploading.edit ? (
                  <span style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '8px' }}>Uploading image…</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <AvatarImage pic={editEmployee.pic} name={editEmployee.name} size={40} />
                    <span style={{ fontSize: '0.7rem', color: editEmployee.pic ? '#28a745' : '#6c757d' }}>
                      {editEmployee.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleUpdateEmployee}>Save Changes</button>
              <button className="btn btn-cancel" onClick={() => { setEditEmployeeId(null); setEditMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ height: 'auto', maxWidth: '520px', padding: 0, position: 'relative' }}>
            <div style={{
              backgroundColor: '#5aa7ef', padding: '24px 24px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
              <div style={{ borderRadius: '50%' }}>
                <AvatarImage pic={viewEmployee.pic} name={viewEmployee.name} size={84} />
              </div>
              <h3 style={{ color: 'white', margin: 0 }}>{viewEmployee.name}</h3>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Email Address</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d', wordBreak: 'break-word' }}>{viewEmployee.email || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Phone Number</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d' }}>{viewEmployee.phone || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>CNIC</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d' }}>{viewEmployee.cnic || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Designation</label>
                  <p style={{ fontSize: '0.77rem', margin: '4px 0 0', color: '#6c757d' }}>
                    {viewEmployee.designation ? (typeof viewEmployee.designation === 'object' ? viewEmployee.designation.designation : viewEmployee.designation) : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#212529', fontWeight: 600 }}>Address</label>
                <div style={{
                  marginTop: '6px', padding: '12px', minHeight: '70px', borderRadius: '8px',
                  backgroundColor: '#f4f6f8', border: '1px solid #e2e6ea', fontSize: '0.9rem',
                  color: '#6c757d', whiteSpace: 'pre-wrap', lineHeight: 1.5
                }}>
                  {viewEmployee.address || 'N/A'}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewEmployee(null)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center', position: 'relative' }}>
            
            {/* Inline Message */}
            <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

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
              <button onClick={() => setDeleteTarget(null)} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleDelete} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Deactivate</button>
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