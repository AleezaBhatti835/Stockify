import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function Designations() {
    const [designations, setDesignations] = useState([]);
    const [newDesignation, setNewDesignation] = useState('');
    const [editId, setEditId] = useState(null);
    const [editDesignation, setEditDesignation] = useState('');
    
    // Updated Message State for Popup Logic
    const [message, setMessage] = useState({ text: '', type: '' });

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [designationToDelete, setDesignationToDelete] = useState(null);

    useEffect(() => {
        fetchDesignations();
    }, []);

    // Reusable Message Handler (Auto-hide after 3 seconds)
    const displayMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 3000);
    };

  // Keyboard shortcut handler (Updated to prevent duplicate triggers)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC key to close modals
            if (e.key === 'Escape') {
                if (isAddModalOpen) setIsAddModalOpen(false);
                if (isDeleteModalOpen) {
                    setIsDeleteModalOpen(false);
                    setDesignationToDelete(null);
                }
                if (editId) setEditId(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isAddModalOpen, isDeleteModalOpen, editId]);

    // ================= FETCH DESIGNATIONS (WITH TOKEN) =================
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
                } else if (data.data && Array.isArray(data.data)) {
                    setDesignations(data.data);
                } else {
                    setDesignations([]);
                }
            } else {
                setDesignations([]);
            }
        } catch (error) {
            console.error('Error fetching designations:', error);
            setDesignations([]);
        }
    };

    // ================= HANDLE ADD (WITH TOKEN) =================
    const handleAdd = async () => {
        const trimmedInput = newDesignation.trim();
        if (!trimmedInput) {
            displayMessage('Please type a designation name first!', 'error');
            return;
        }

        // Check for duplicates
        const isDuplicate = designations.some(
            (d) => d.designation.toLowerCase() === trimmedInput.toLowerCase()
        );
        if (isDuplicate) {
            displayMessage('This designation already exists!', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/designations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ designation: trimmedInput })
            });

            const data = await response.json();

            if (response.ok) {
                setDesignations([...designations, data]);
                setNewDesignation('');
                displayMessage('Designation added successfully', 'success');
                setIsAddModalOpen(false);
            } else {
                displayMessage(data.message || 'Error: Backend rejected the new designation.', 'error');
            }
        } catch (error) {
            displayMessage('Error adding designation. Network issue.', 'error');
        }
    };

    const handleEdit = (item) => {
        setEditId(item._id);
        setEditDesignation(item.designation);
        setMessage({ text: '', type: '' });
    };

    // ================= HANDLE UPDATE (WITH TOKEN) =================
    const handleUpdate = async () => {
        if (!editId) return;
        const trimmedInput = editDesignation.trim();

        if (!trimmedInput) {
            displayMessage('Designation name cannot be empty!', 'error');
            return;
        }

        // Check for duplicates (ignoring the current one being edited)
        const isDuplicate = designations.some(
            (d) => d._id !== editId && d.designation.toLowerCase() === trimmedInput.toLowerCase()
        );
        if (isDuplicate) {
            displayMessage('This designation name already exists!', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/designations/${editId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ designation: trimmedInput })
            });

            const data = await response.json();

            if (response.ok) {
                setDesignations(designations.map(d => (d._id === editId ? data : d)));
                setEditId(null);
                setEditDesignation('');
                displayMessage('Designation updated successfully', 'success');
            } else {
                displayMessage(data.message || 'Error updating designation', 'error');
            }
        } catch (error) {
            displayMessage('Error updating designation. Network issue.', 'error');
        }
    };

    // ================= CONFIRM DELETE (WITH TOKEN) =================
    const confirmDelete = async () => {
        if (!designationToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/designations/${designationToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json().catch(() => null);

            if (response.ok) {
                setDesignations(designations.filter(d => d._id !== designationToDelete));
                displayMessage('Designation deleted successfully', 'success');
            } else {
                displayMessage(data && data.message ? data.message : 'Cannot delete. This designation might be assigned to an employee.', 'error');
            }
        } catch (error) {
            displayMessage('Error deleting designation: Network issue.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setDesignationToDelete(null);
        }
    };

    // Handle Enter key on input fields
    const handleInputKeyDown = (e, action) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            action();
        }
    };

    // UI helper for displaying the message beautifully inside modals or main screen
    const renderMessage = () => {
        if (!message.text) return null;
        const isError = message.type === 'error';
        return (
            <div style={{
                padding: '10px 14px',
                marginBottom: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isError ? 'var(--danger-bg)' : 'var(--success-bg)',
                color: isError ? 'var(--danger)' : 'var(--success)',
                border: `1px solid ${isError ? 'var(--danger)' : 'var(--success)'}`,
                fontSize: '14px',
                fontWeight: 500,
                textAlign: 'center'
            }}>
                {isError ? '⚠️ ' : '✅ '} {message.text}
            </div>
        );
    };

    return (
        <div className="dashboard-wrapper">
            
            {/* HEADER */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '22px', fontWeight: 600 }}>Designations Management</h4>
                <button className="btn btn-primary" onClick={() => { setMessage({text: '', type: ''}); setIsAddModalOpen(true); }}>
                    + Add Designation
                </button>
            </div>

            {/* MAIN SCREEN MESSAGE (Appears only when all modals are closed) */}
            {!isAddModalOpen && !editId && !isDeleteModalOpen && renderMessage()}

            {/* TABLE SECTION */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...tableStyles.th, width: '75%' }}>Designation</th>
                                <th style={{ ...tableStyles.th, width: '25%', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(designations) && designations.length > 0 ? (
                                designations.map((item, index) => (
                                    <tr 
                                        key={item._id} 
                                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ ...tableStyles.td, fontWeight: 500 }}>
                                            {item.designation}
                                        </td>
                                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                            <div style={styles.actionGroup}>
                                                {/* Edit Button */}
                                                <button style={styles.iconBtnEdit} onClick={() => handleEdit(item)} title="Edit">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>

                                                {/* Delete Button */}
                                                <button style={styles.iconBtnDelete} onClick={() => { setDesignationToDelete(item._id); setIsDeleteModalOpen(true); }} title="Delete">
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={tableStyles.emptyCell}>
                                        No designations found. Click the button above to add one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New Designation</h3>
                            <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
                        </div>
                        
                        <div className="modal-body">
                            {renderMessage()}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Designation Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter designation name"
                                    value={newDesignation}
                                    onChange={(e) => setNewDesignation(e.target.value)}
                                    onKeyDown={(e) => handleInputKeyDown(e, handleAdd)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAdd}>Save Designation</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editId && (
                <div className="modal-overlay" onClick={() => setEditId(null)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Designation</h3>
                            <button className="modal-close" onClick={() => setEditId(null)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            {renderMessage()}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Designation Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editDesignation}
                                    onChange={(e) => setEditDesignation(e.target.value)}
                                    onKeyDown={(e) => handleInputKeyDown(e, handleUpdate)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditId(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleUpdate}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="modal-overlay" onClick={() => { setIsDeleteModalOpen(false); setDesignationToDelete(null); }}>
                    <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body">
                            {renderMessage()}
                            
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
                            }}>
                                !
                            </div>
                            <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete Designation</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                                Are you sure you want to delete this designation? This action cannot be undone.
                            </p>
                        </div>

                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => { setIsDeleteModalOpen(false); setDesignationToDelete(null); }}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Yes, Delete</button>
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
const styles = {
    actionGroup: {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
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

export default Designations;