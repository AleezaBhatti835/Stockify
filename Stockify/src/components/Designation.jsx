import { useState, useEffect } from 'react';
import './roles.css';

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
    const fetchDesignations = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/designations');
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
            const response = await fetch('http://localhost:5000/api/designations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    };

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
            const response = await fetch(`http://localhost:5000/api/designations/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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

    const confirmDelete = async () => {
        if (!designationToDelete) return;

        try {
            const response = await fetch(`http://localhost:5000/api/designations/${designationToDelete}`, {
                method: 'DELETE'
            });

            const data = await response.json().catch(() => null);

            if (response.ok) {
                setDesignations(designations.filter(d => d._id !== designationToDelete));
                displayMessage('Designation deleted successfully', 'success');
            } else {
                // Catches the backend error if designation is assigned to an employee
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
        return (
            <div style={{
                padding: '10px 15px',
                borderRadius: '6px',
                marginBottom: '15px',
                color: '#fff',
                fontWeight: '500',
                fontSize: '14px',
                backgroundColor: message.type === 'error' ? '#e47f7f' : '#6dd3b1',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                {message.text}
            </div>
        );
    };

    return (
        <div style={{ width: '100%' }} className="roles-container">
            {/* HEADER */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4>Designations Management</h4>
                <button 
                    style={{ width: 'auto', padding: '10px 20px', whiteSpace: 'nowrap', color: 'white', backgroundColor: '#5aa7ef', border: 'none', borderRadius: '4px', cursor: 'pointer' }} 
                    onClick={() => { setMessage({text: '', type: ''}); setIsAddModalOpen(true); }}
                >
                    + Add Designation
                </button>
            </div>

            {/* MAIN SCREEN MESSAGE (Appears only when all modals are closed) */}
            {!isAddModalOpen && !editId && !isDeleteModalOpen && renderMessage()}

            <div style={{
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                width: '100%',
                marginTop: '10px'
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    margin: 0,
                    padding: 0,
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#29364b', color: '#f8fafc' }}>
                            <th style={{ width: '75%', textAlign: 'left', padding: '16px 24px', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px', borderBottom: '2px solid #334155' }}>
                                Designation
                            </th>
                            <th style={{ width: '25%', textAlign: 'center', padding: '16px 24px', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px', borderBottom: '2px solid #334155' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(designations) && designations.length > 0 ? (
                            designations.map((item, index) => (
                                <tr key={item._id} style={{
                                    borderBottom: '1px solid #e2e8f0',
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc'
                                }}>
                                    <td style={{ textAlign: 'left', padding: '7px 24px', color: '#334155', fontSize: '14px', wordWrap: 'break-word', verticalAlign: 'left' }}>
                                        {item.designation}
                                    </td>
                                    <td style={{ padding: '7px 24px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            {/* Edit Button */}
                                            <button style={{ ...styles.iconBtnEdit, padding: '8px 12px' }} onClick={() => handleEdit(item)} title="Edit">
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>

                                            {/* Delete Button */}
                                            <button style={{ ...styles.iconBtnDelete, padding: '7px 12px' }} onClick={() => { setDesignationToDelete(item._id); setIsDeleteModalOpen(true); }} title="Delete">
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
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
                                <td colSpan="2" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
                                    No designations found. Click the button above to add one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ marginBottom: '15px' }}>Add New Designation</h3>
                        
                        {/* MESSAGE INSIDE ADD MODAL */}
                        {renderMessage()}

                        <div className="modal-form-group">
                            <input
                                type="text"
                                placeholder="Enter designation name"
                                value={newDesignation}
                                onChange={(e) => setNewDesignation(e.target.value)}
                                onKeyDown={(e) => handleInputKeyDown(e, handleAdd)}
                                autoFocus
                                style={{ width: '100%', padding: '10px', marginTop: '5px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleAdd} style={{ backgroundColor: '#5aa7ef', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Save Designation
                            </button>
                            <button className="btn btn-cancel" onClick={() => setIsAddModalOpen(false)} style={{ backgroundColor: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editId && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ marginBottom: '15px' }}>Edit Designation</h3>

                        {/* MESSAGE INSIDE EDIT MODAL */}
                        {renderMessage()}

                        <div className="modal-form-group">
                            <input
                                type="text"
                                value={editDesignation}
                                onChange={(e) => setEditDesignation(e.target.value)}
                                onKeyDown={(e) => handleInputKeyDown(e, handleUpdate)}
                                autoFocus
                                style={{ width: '100%', padding: '10px', marginTop: '5px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div className="modal-actions" style={{
                            marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end'
                        }}>
                            <button style={{ backgroundColor: '#2a8ae3', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={handleUpdate}>
                                Save Changes
                            </button>
                            <button onClick={() => setEditId(null)} style={{ backgroundColor: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ marginBottom: '15px' }}>Delete Designation</h3>

                        {/* MESSAGE INSIDE DELETE MODAL */}
                        {renderMessage()}

                        <p style={{ margin: '10px 0 20px', fontSize: '16px', color: '#333' }}>
                            Are you sure you want to delete this designation? This action cannot be undone.
                        </p>
                        <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={confirmDelete} style={{ backgroundColor: '#e96e7a', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Yes, Delete
                            </button>
                            <button onClick={() => { setIsDeleteModalOpen(false); setDesignationToDelete(null); }} style={{ backgroundColor: '#6c757d', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
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
    iconBtnEdit: {
        background: '#eff6ff',
        color: '#3b82f6',
        border: 'none',
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
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s',
    },
}

export default Designations;