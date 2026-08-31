import React, { useState, useEffect, useRef } from 'react';
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
          border: '2px solid var(--primary)', flexShrink: 0
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

// Inline Message Component
function InlineMessage({ message, type }) {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';
  const addModalBodyRef = React.useRef(null);
  const editModalBodyRef = React.useRef(null);
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

function Employees() {
  const addModalBodyRef = useRef(null);
  const editModalBodyRef = useRef(null);
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
    joiningDate: new Date().toISOString().split('T')[0],
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

  // Keyboard shortcut handler (Only handling ESC key safely now)
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
          setViewReference(null); // or setViewEmployee(null)
          setViewEmployee(null);
        }
        if (deleteTarget) {
          e.preventDefault();
          setDeleteTarget(null);
          setDeleteMessage({ text: '', type: '' });
        }
      }
      // Note: Enter key submit hata diya hai taake date/inputs freely edit ho sakein
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editEmployeeId, viewEmployee, deleteTarget]);
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
useEffect(() => {
    if (addMessage.text && addModalBodyRef.current) {
      addModalBodyRef.current.scrollTop = 0;
    }
  }, [addMessage]);

  useEffect(() => {
    if (editMessage.text && editModalBodyRef.current) {
      editModalBodyRef.current.scrollTop = 0;
    }
  }, [editMessage]);
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/designations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
      const token = localStorage.getItem('token');
      const { emailPrefix, ...finalPayload } = payloadObj;
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

    const fullEmail = editEmployee.emailPrefix.trim() ? `${editEmployee.emailPrefix.trim()}@gmail.com` : '';

    const originalEmployee = employees.find(e => e._id === editEmployeeId);
    if (originalEmployee) {
      let originalDesignationId = originalEmployee.designation;
      if (typeof originalEmployee.designation === 'object' && originalEmployee.designation !== null) {
        originalDesignationId = originalEmployee.designation._id;
      }

      // 💡 Purani date ko proper format (YYYY-MM-DD) mein laane ke liye check
      const originalDate = originalEmployee.joiningDate ? originalEmployee.joiningDate.split('T')[0] : '';
      const newDate = editEmployee.joiningDate ? editEmployee.joiningDate.split('T')[0] : '';

      const isSame =
        originalEmployee.name === editEmployee.name &&
        originalEmployee.phone === editEmployee.phone &&
        originalEmployee.address === editEmployee.address &&
        originalEmployee.cnic === editEmployee.cnic &&
        originalEmployee.email === fullEmail &&
        originalDesignationId === editEmployee.designation &&
        originalDate === newDate; // 💡 Yahan joiningDate bhi compare hogi

      if (isSame) {
        showEditMessage('Nothing to update!', 'info');
        return;
      }
    }

    const payload = { ...editEmployee, email: fullEmail };

    const duplicateError = checkDuplicates(payload, editEmployeeId);
    if (duplicateError) {
      showEditMessage(duplicateError, 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { emailPrefix, ...finalPayload } = payload;
      const res = await fetch(`${API_BASE_URL}/api/employees/${editEmployeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/employees/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      designation: designationId || '',
      // 💡 Yeh line lazmi honi chahiye taake date load ho
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0]
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
        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px', fontWeight: 600 }}>Manage Employees</h4>
        <button
          className="btn btn-primary"
          onClick={() => { setAddMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); setIsAddModalOpen(true); }}
        >
          + Add Employee
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '8%', textAlign: 'left' }}>Sr #</th>
                <th style={{ ...tableStyles.th, width: '22%' }}>Name</th>
                <th style={{ ...tableStyles.th, width: '26%' }}>Email</th>
                <th style={{ ...tableStyles.th, width: '24%' }}>Designation</th>
                <th style={{ ...tableStyles.th, width: '20%', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((emp, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr
                      key={emp._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{serialNumber}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AvatarImage pic={emp.pic} name={emp.name} size={32} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email || 'N/A'}</td>
                      <td style={{ ...tableStyles.td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {emp.designation ? (typeof emp.designation === 'object' ? emp.designation.designation : emp.designation) : 'N/A'}
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <div style={styles.actionGroup}>
                          {/* View Button */}
                          <button style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setViewEmployee(emp)} title="View">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>

                          {/* Edit Button */}
                          <button style={actionStyles.iconBtnEdit} onClick={() => startEdit(emp)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            style={actionStyles.iconBtnDelete}
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
                  <td colSpan="5" style={tableStyles.emptyCell}>
                    No employees found. Click "+ Add Employee" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {employees.length > itemsPerPage && (
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

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Employee</h3>
              <button className="modal-close" onClick={() => { setIsAddModalOpen(false); setAddMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); }}>&times;</button>
            </div>

            <div className="modal-body" ref={addModalBodyRef} style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <InlineMessage message={addMessage.text} type={addMessage.type} />

              {imageUploadMessage.text && !addMessage.text && (
                <div style={{
                  padding: '10px 14px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  backgroundColor: imageUploadMessage.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: imageUploadMessage.type === 'error' ? 'var(--danger)' : 'var(--success)',
                  border: `1px solid ${imageUploadMessage.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                  fontSize: '14px', fontWeight: 500
                }}>
                  {imageUploadMessage.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                    autoFocus
                  />
                </div>

                {/* Email with suffix */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address *</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ paddingRight: '85px' }}
                      value={newEmployee.emailPrefix}
                      onChange={(e) => setNewEmployee({ ...newEmployee, emailPrefix: e.target.value.replace(/@.*/, '') })}
                      onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                      placeholder="username"
                    />
                    <span style={{ position: 'absolute', right: '12px', color: 'var(--text-light)', fontSize: '13px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: formatContact(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                    placeholder="+923001234567"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CNIC</label>
                  <input
                    className="form-input"
                    value={newEmployee.cnic}
                    maxLength={15}
                    onChange={(e) => setNewEmployee({ ...newEmployee, cnic: formatCNIC(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleAddEmployee)}
                    placeholder="64822-1648208-2"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Designation *</label>
                  <select
                    className="form-input"
                    value={newEmployee.designation}
                    onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEmployee();
                      }
                    }}
                  >
                    <option value="">-- Select Designation * --</option>
                    {designations.map(desig => (
                      <option key={desig._id} value={desig._id}>
                        {desig.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
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
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Joining Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newEmployee.joiningDate}
                    onChange={(e) => setNewEmployee({ ...newEmployee, joiningDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Upload Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} disabled={uploading.add} style={{ fontSize: '13px' }} />
                  {uploading.add && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Uploading image…</span>
                  )}
                  {!uploading.add && newEmployee.pic && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                      <AvatarImage pic={newEmployee.pic} name={newEmployee.name} size={40} />
                      <span style={{ fontSize: '13px', color: 'var(--success)' }}>✓ Image ready — will be saved with this employee</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setAddMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddEmployee}>Save Employee</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editEmployeeId && (
        <div className="modal-overlay" onClick={() => setEditEmployeeId(null)}>
          <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Employee</h3>
              <button className="modal-close" onClick={() => { setEditEmployeeId(null); setEditMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); }}>&times;</button>
            </div>

            <div className="modal-body" ref={editModalBodyRef} style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <InlineMessage message={editMessage.text} type={editMessage.type} />

              {imageUploadMessage.text && !editMessage.text && (
                <div style={{
                  padding: '10px 14px', marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  backgroundColor: imageUploadMessage.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: imageUploadMessage.type === 'error' ? 'var(--danger)' : 'var(--success)',
                  border: `1px solid ${imageUploadMessage.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                  fontSize: '14px', fontWeight: 500
                }}>
                  {imageUploadMessage.text}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    value={editEmployee.name}
                    onChange={(e) => setEditEmployee({ ...editEmployee, name: e.target.value })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                    autoFocus
                  />
                </div>

                {/* Email with suffix */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address *</label>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ paddingRight: '85px' }}
                      value={editEmployee.emailPrefix}
                      onChange={(e) => setEditEmployee({ ...editEmployee, emailPrefix: e.target.value.replace(/@.*/, '') })}
                      onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                      placeholder="username"
                    />
                    <span style={{ position: 'absolute', right: '12px', color: 'var(--text-light)', fontSize: '13px', pointerEvents: 'none' }}>
                      @gmail.com
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={editEmployee.phone}
                    onChange={(e) => setEditEmployee({ ...editEmployee, phone: formatContact(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CNIC</label>
                  <input
                    className="form-input"
                    value={editEmployee.cnic || ''}
                    maxLength={15}
                    onChange={(e) => setEditEmployee({ ...editEmployee, cnic: formatCNIC(e.target.value) })}
                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdateEmployee)}
                    placeholder="64822-1648208-2"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Designation *</label>
                  <select
                    className="form-input"
                    value={editEmployee.designation}
                    onChange={(e) => setEditEmployee({ ...editEmployee, designation: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateEmployee();
                      }
                    }}
                  >
                    <option value="">-- Select Designation * --</option>
                    {designations.map(desig => (
                      <option key={desig._id} value={desig._id}>
                        {desig.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
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
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Joining Date *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={editEmployee.joiningDate || ''}
                    onChange={(e) => setEditEmployee({ ...editEmployee, joiningDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Update Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={uploading.edit} style={{ fontSize: '13px' }} />
                  {uploading.edit ? (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Uploading image…</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                      <AvatarImage pic={editEmployee.pic} name={editEmployee.name} size={40} />
                      <span style={{ fontSize: '13px', color: editEmployee.pic ? 'var(--success)' : 'var(--text-muted)' }}>
                        {editEmployee.pic ? '✓ Current image — pick a new file to replace it' : 'No image on file yet'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setEditEmployeeId(null); setEditMessage({ text: '', type: '' }); setImageUploadMessage({ text: '', type: '' }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateEmployee}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

   {/* VIEW MODAL */}
      {viewEmployee && (
        <div className="modal-overlay" onClick={() => setViewEmployee(null)}>
          <div className="modal-container" style={{ maxWidth: '580px', width: '90%', padding: 0, overflow: 'hidden', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header Section with Gradient/Primary BG */}
            <div style={{ backgroundColor: 'var(--primary)', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative' }}>
              <div style={{ padding: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                <AvatarImage pic={viewEmployee.pic} name={viewEmployee.name} size={84} />
              </div>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>{viewEmployee.name}</h3>
              <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 12px', borderRadius: '20px', fontWeight: '500' }}>
                {viewEmployee.designation ? (typeof viewEmployee.designation === 'object' ? viewEmployee.designation.designation : viewEmployee.designation) : 'Staff'}
              </span>
            </div>

            {/* Body Details (Compact Grid Layout) */}
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '20px', backgroundColor: '#f8fafc' }}>
              
              <div style={compactCardStyle}>
                <span style={compactLabelStyle}>Email Address</span>
                <span style={compactValueStyle}>{viewEmployee.email || 'N/A'}</span>
              </div>

              <div style={compactCardStyle}>
                <span style={compactLabelStyle}>Phone Number</span>
                <span style={compactValueStyle}>{viewEmployee.phone || 'N/A'}</span>
              </div>

              <div style={compactCardStyle}>
                <span style={compactLabelStyle}>CNIC</span>
                <span style={compactValueStyle}>{viewEmployee.cnic || 'N/A'}</span>
              </div>

              <div style={compactCardStyle}>
                <span style={compactLabelStyle}>Joining Date</span>
                <span style={compactValueStyle}>
                  {viewEmployee.joiningDate ? new Date(viewEmployee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>

              <div style={{ ...compactCardStyle, gridColumn: 'span 2' }}>
                <span style={compactLabelStyle}>Address</span>
                <span style={compactValueStyle}>{viewEmployee.address || 'N/A'}</span>
              </div>

            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '12px 20px', backgroundColor: '#fff', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewEmployee(null)} style={{ padding: '8px 24px', fontWeight: '600' }}>Close</button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <InlineMessage message={deleteMessage.text} type={deleteMessage.type} />

              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
              }}>
                !
              </div>
              <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Deactivate Employee</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to deactivate <strong>{deleteTarget.name}</strong>? They will no longer appear in the active employees list.
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Strict Table Styles Rule
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

// Strict Actions Rule Enforced
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
const compactCardStyle = {
  backgroundColor: '#fff',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
};

const compactLabelStyle = {
  fontSize: '11px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  fontWeight: '700',
  letterSpacing: '0.5px'
};

const compactValueStyle = {
  fontSize: '13px',
  color: 'var(--text-main)',
  fontWeight: '600',
  wordBreak: 'break-word'
};

export default Employees;