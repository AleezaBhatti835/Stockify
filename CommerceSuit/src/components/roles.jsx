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

function Roles() {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [newRole, setNewRole] = useState('');
    const [editRoleId, setEditRoleId] = useState(null);
    const [editRole, setEditRole] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [usersWithRole, setUsersWithRole] = useState([]);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(3); // Changed to 5 for testing

    // Get filtered roles (exclude admin)
    const filteredRoles = roles.filter(role => role.role.toLowerCase() !== 'admin');

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

    // Reset to page 1 when roles change
    useEffect(() => {
        setCurrentPage(1);
    }, [roles]);

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
            const response = await fetch('http://localhost:5000/api/roles');
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
            const response = await fetch('http://localhost:5000/api/users');
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

    const handleAddRole = async () => {
        if (!newRole.trim()) {
            showMessage('Please enter a role name!', 'error');
            return;
        }

        const duplicate = roles.find(
            r => r.role.toLowerCase() === newRole.trim().toLowerCase()
        );
        if (duplicate) {
            showMessage('This role already exists!', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                setRoles(Array.isArray(roles) ? [...roles, data] : [data]);
                setNewRole('');
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
        setEditRole(role.role);
    };

    const handleUpdateRole = async () => {
        if (!editRoleId) return;

        if (!editRole.trim()) {
            showMessage('Please enter a role name!', 'error');
            return;
        }

        const duplicate = roles.find(
            r => r.role.toLowerCase() === editRole.trim().toLowerCase() &&
                r._id !== editRoleId
        );
        if (duplicate) {
            showMessage('This role already exists!', 'error');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/roles/${editRoleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: editRole.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                setRoles(roles.map(r => (r._id === editRoleId ? data : r)));
                setEditRoleId(null);
                setEditRole('');
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
        setEditRole('');
        clearMessage();
    };

    const checkRoleAssignedToUsers = async (roleId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/roles/${roleId}/users`);
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
            const response = await fetch(`http://localhost:5000/api/roles/${roleToDelete}`, {
                method: 'DELETE'
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
        <div className="roles-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Roles Management</h2>
                <button
                    style={{ width: '14%', color: 'white', backgroundColor: '#5aa7ef', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    onClick={() => { clearMessage(); setIsAddModalOpen(true); }}
                >
                    + Add Role
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
                <span>Showing {currentItems.length} of {filteredRoles.length} roles</span>
            </div>

            <div className="table-scroll-wrapper">
                <table  style={{ width: '50%', tableLayout: 'fixed' }} className="roles-table">
                    <thead style={{ width: '50%'}}>
                        <tr>
                            <th style={{ width: '10%', textAlign: 'left' }}>Sr #</th>
                            <th style={{ width: '25%', textAlign: 'left' }}>Role</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.length > 0 ? (
                            currentItems.map((role, index) => {
                                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                return (
                                    <tr key={role._id}>
                                        <td style={{ textAlign: 'left' }}>{serialNumber}</td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                            {role.role}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            <div style={styles.actionGroup}>
                                                {/* Edit Button */}
                                                <button
                                                    style={styles.iconBtnEdit}
                                                    onClick={() => handleEditRole(role)}
                                                    title="Edit"
                                                >
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    style={styles.iconBtnDelete}
                                                    onClick={() => {
                                                        handleDeleteClick(role._id);
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
                                <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                                    No roles found. Click "Add Role" to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            {filteredRoles.length > itemsPerPage && (
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

            {/* REST OF YOUR MODALS - Keep them as they are */}
            {/* ADD ROLE MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px', position: 'relative' }}>
                        <h3>Add New Role</h3>

                        {/* Message Popup */}
                        <MessagePopup message={message} onClose={clearMessage} />

                        <div className="modal-form-group" style={{ marginTop: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                                Role Name *
                            </label>
                            <input
                                type="text"
                                placeholder="Enter role name"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddRole();
                                    }
                                }}
                            />
                        </div>
                        <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleAddRole}
                                style={{ padding: '10px 24px', backgroundColor: '#5aa7ef', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                Save Role
                            </button>
                            <button
                                onClick={() => { setIsAddModalOpen(false); setNewRole(''); clearMessage(); }}
                                style={{ padding: '10px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT ROLE MODAL */}
            {editRoleId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px', position: 'relative' }}>
                        <h3>Edit Role</h3>

                        {/* Message Popup */}
                        <MessagePopup message={message} onClose={clearMessage} />

                        <div className="modal-form-group" style={{ marginTop: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                                Role Name *
                            </label>
                            <input
                                type="text"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '5px',
                                    fontSize: '14px',
                                    boxSizing: 'border-box'
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleUpdateRole();
                                    }
                                }}
                            />
                        </div>

                        <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleUpdateRole}
                                style={{ padding: '10px 24px', backgroundColor: '#5aa7ef', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                style={{ padding: '10px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center', position: 'relative' }}>
                        <h3>Delete Role?</h3>

                        {/* Message Popup */}
                        <MessagePopup message={message} onClose={clearMessage} />

                        {usersWithRole.length > 0 ? (
                            <div style={{ margin: '20px 0', textAlign: 'left' }}>
                                <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                    ⚠️ This role is currently assigned to users:
                                </p>
                                <ul style={{
                                    margin: '10px 0',
                                    padding: '10px 20px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '5px',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}>
                                    {usersWithRole.map(user => (
                                        <li key={user._id} style={{ margin: '5px 0', color: '#495057' }}>
                                            {user.name} ({user.email})
                                        </li>
                                    ))}
                                </ul>
                                <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
                                    Please reassign or delete these users before deleting this role.
                                </p>
                            </div>
                        ) : (
                            <p style={{ margin: '20px 0', color: '#6c757d' }}>
                                Are you sure you want to delete this role? This action cannot be undone.
                            </p>
                        )}

                        <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            {usersWithRole.length === 0 && (
                                <button
                                    onClick={handleDeleteRole}
                                    style={{ padding: '10px 24px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                    Yes, Delete
                                </button>
                            )}
                            <button
                                onClick={cancelDelete}
                                style={{ padding: '10px 24px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                {usersWithRole.length > 0 ? 'Close' : 'Cancel'}
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

export default Roles;