import { useState, useEffect } from 'react';

function MessagePopup({ message, onClose }) {
  if (!message.text) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', borderTop: `6px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}` }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h3 className="modal-title" style={{ fontSize: '18px', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{message.type === 'error' ? '⚠️' : '✅'}</span>
            {message.type === 'error' ? 'Error!' : 'Success!'}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            {message.text}
          </p>
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', backgroundColor: 'transparent' }}>
          <button className="btn btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

const MODULE_LIST = [
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'employees', label: 'Employees' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'uom', label: 'UOM' },
  { key: 'stock_adjustment', label: 'Stock Adjustment' },
  { key: 'stock_breakage', label: 'Stock Breakage' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'purchase_returns', label: 'Purchase Returns' },
  { key: 'purchase_rebates', label: 'Purchase Rebates' },
  { key: 'purchase_rate_difference', label: 'Purchase Rate Difference' },
  { key: 'pos', label: 'POS / Sales' },
  { key: 'sale_returns', label: 'Sale Returns' },
  { key: 'sales_rebates', label: 'Sales Rebates' },
  { key: 'sale_rate_difference', label: 'Sale Rate Difference' },
  { key: 'cash_register', label: 'Cash Register' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'expense_category', label: 'Expense Category' },
  { key: 'customer_account', label: 'Customer Account' },
  { key: 'supplier_account', label: 'Supplier Account' },
  { key: 'employee_account', label: 'Employee Account' },
  { key: 'report_people', label: 'People Report' },
  { key: 'report_catalogue', label: 'Catalogue Report' },
  { key: 'report_stock', label: 'Stock Report' },
  { key: 'report_purchase', label: 'Purchase Report' },
  { key: 'report_sales', label: 'Sales Report' },
  { key: 'report_register', label: 'Register Report' },
  { key: 'report_stock_movement', label: 'Stock Movement Report' },
  { key: 'report_accounts', label: 'Accounts Report' },
  { key: 'report_payable_receivable', label: 'Payable/Receivable Report' },
  { key: 'report_profit_loss', label: 'Profit & Loss Report' },
  { key: 'report_business_capital', label: 'Business Capital Report' },
  { key: 'users', label: 'Users' },
  { key: 'roles', label: 'Roles' },
  { key: 'settings', label: 'Settings' },
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

const SYSTEM_PERMISSIONS = MODULE_LIST.flatMap(m =>
  ACTIONS.map(a => ({
    id: `${m.key}_${a.key}`,
    label: `${m.label} — ${a.label}`,
    module: m.key,
    action: a.key
  }))
);

function Roles() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  
  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRolePermissions, setEditRolePermissions] = useState([]);
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [usersWithRole, setUsersWithRole] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); 

  const filteredRoles = roles.filter(role => role.role.toLowerCase() !== 'admin');

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [roles]);

  // CORE ARCHITECTURE: Synchronous fetching of system roles and user assignments on mount to validate dependency constraints.
  useEffect(() => {
    fetchRoles();
    fetchUsers();
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

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const togglePermission = (permId, isEditing = false) => {
    if (isEditing) {
      setEditRolePermissions(prev => 
        prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
      );
    } else {
      setNewRolePermissions(prev => 
        prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
      );
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      showMessage('Please enter a role name!', 'error');
      return;
    }

    const duplicate = roles.find(
      r => r.role.toLowerCase() === newRoleName.trim().toLowerCase()
    );
    if (duplicate) {
      showMessage('This role already exists!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          role: newRoleName.trim(),
          permissions: newRolePermissions 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(Array.isArray(roles) ? [...roles, data] : [data]);
        setNewRoleName('');
        setNewRolePermissions([]);
        setIsAddModalOpen(false);
        showMessage('Role added successfully!', 'success');
      } else {
        const errorData = await response.json().catch(() => null);
        showMessage(errorData?.message || 'Error: Backend rejected the new role.', 'error');
      }
    } catch (error) {
      showMessage('Error adding role. Please try again.', 'error');
    }
  };

  const handleEditRole = (role) => {
    clearMessage();
    setEditRoleId(role._id);
    setEditRoleName(role.role);
    setEditRolePermissions(role.permissions || []);
  };

  const handleUpdateRole = async () => {
    if (!editRoleId) return;

    if (!editRoleName.trim()) {
      showMessage('Please enter a role name!', 'error');
      return;
    }

    const duplicate = roles.find(
      r => r.role.toLowerCase() === editRoleName.trim().toLowerCase() &&
        r._id !== editRoleId
    );
    if (duplicate) {
      showMessage('This role already exists!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/roles/${editRoleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          role: editRoleName.trim(),
          permissions: editRolePermissions 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(roles.map(r => (r._id === editRoleId ? data : r)));
        setEditRoleId(null);
        setEditRoleName('');
        setEditRolePermissions([]);
        showMessage('Role updated successfully!', 'success');
      } else {
        const errorData = await response.json().catch(() => null);
        showMessage(errorData?.message || 'Error updating role.', 'error');
      }
    } catch (error) {
      showMessage('Error updating role. Please try again.', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditRoleId(null);
    setEditRoleName('');
    setEditRolePermissions([]);
    clearMessage();
  };

  const checkRoleAssignedToUsers = async (roleId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/roles/${roleId}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      }
      return [];
    } catch (error) {
      console.error('Error checking role users:', error);
      return [];
    }
  };

  const handleDeleteClick = async (roleId) => {
    const role = roles.find(r => r._id === roleId);
    if (role && role.role.toLowerCase() === 'admin') {
      showMessage('Cannot delete the Admin role!', 'error');
      return;
    }

    const assignedUsers = await checkRoleAssignedToUsers(roleId);
    if (assignedUsers.length > 0) {
      const userNames = assignedUsers.map(u => u.name).join(', ');
      setUsersWithRole(assignedUsers);
      setIsDeleteModalOpen(true);
      showMessage(`Cannot delete: This role is assigned to ${assignedUsers.length} user(s): ${userNames}`, 'error');
      return;
    }

    setRoleToDelete(roleId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/roles/${roleToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setRoles(roles.filter(role => role._id !== roleToDelete));
        setIsDeleteModalOpen(false);
        setRoleToDelete(null);
        setUsersWithRole([]);
        showMessage('Role deleted successfully!', 'success');
      } else {
        showMessage(data?.message || `Error: Server rejected the request (Status ${response.status})`, 'error');
      }
    } catch (error) {
      console.error("Frontend Delete Error:", error);
      showMessage('Error deleting role: Network issue or server is unreachable.', 'error');
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setRoleToDelete(null);
    setUsersWithRole([]);
    clearMessage();
  };

  return (
    <div className="dashboard-wrapper">
      <MessagePopup message={message} onClose={clearMessage} />

      {/* HEADER SECTION */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>Roles Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Configure system roles and assign granular permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { clearMessage(); setIsAddModalOpen(true); }}>
          + Add Role
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Showing {currentItems.length} of {filteredRoles.length} roles
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '10%' }}>Sr #</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Role</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '45%' }}>Permissions Setup</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((role, index) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr 
                      key={role._id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{serialNumber}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {role.role}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {role.permissions && role.permissions.length > 0 
                          ? `${role.permissions.length} module(s) granted` 
                          : 'No permissions set'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => handleEditRole(role)} title="Edit">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => { handleDeleteClick(role._id); setIsDeleteModalOpen(true); }} title="Delete">
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
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No roles found. Click "+ Add Role" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredRoles.length > itemsPerPage && (
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

      {/* ADD ROLE MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: 0 }}>
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)' }}>Add New Role</h3>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Role Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter role name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assign System Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', maxHeight: '320px', overflowY: 'auto' }}>
                  {SYSTEM_PERMISSIONS.map(perm => (
                    <label key={perm.id} style={{ display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={newRolePermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id, false)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={() => { setIsAddModalOpen(false); setNewRoleName(''); setNewRolePermissions([]); clearMessage(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddRole}>Save Role</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editRoleId && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: 0 }}>
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)' }}>Edit Role</h3>
              <button className="modal-close" onClick={handleCancelEdit}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Role Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Update Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', maxHeight: '320px', overflowY: 'auto' }}>
                  {SYSTEM_PERMISSIONS.map(perm => (
                    <label key={perm.id} style={{ display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'pointer', color: 'var(--text-main)', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={editRolePermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id, true)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              <button className="btn btn-secondary" onClick={handleCancelEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateRole}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderTop: '6px solid var(--danger)' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '20px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span> Delete Role?
              </h3>
            </div>
            
            <div className="modal-body">
              {usersWithRole.length > 0 ? (
                <div style={{ margin: '0 0 16px 0', textAlign: 'left' }}>
                  <p style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '14px', margin: '0 0 8px 0' }}>
                    This role is currently assigned to users:
                  </p>
                  <ul style={{ margin: 0, padding: '10px 16px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', maxHeight: '150px', overflowY: 'auto', listStyleType: 'disc', listStylePosition: 'inside' }}>
                    {usersWithRole.map(user => (
                      <li key={user._id} style={{ margin: '4px 0', color: 'var(--text-main)', fontSize: '13px' }}>
                        {user.name} ({user.email})
                      </li>
                    ))}
                  </ul>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px', marginBotto: 0 }}>
                    Please reassign or delete these users before deleting this role.
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                  Are you sure you want to delete this role? This action cannot be undone.
                </p>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', backgroundColor: 'transparent' }}>
              {usersWithRole.length === 0 && (
                <button className="btn btn-danger" onClick={handleDeleteRole}>
                  Yes, Delete
                </button>
              )}
              <button className="btn btn-secondary" onClick={cancelDelete}>
                {usersWithRole.length > 0 ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Roles;