import { useState, useEffect } from 'react';
import './roles.css';

function Designations() {
    const [designations, setDesignations] = useState([]);
    const [newDesignation, setNewDesignation] = useState('');
    const [editId, setEditId] = useState(null);
    const [editDesignation, setEditDesignation] = useState('');
    const [message, setMessage] = useState('');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [designationToDelete, setDesignationToDelete] = useState(null);

    useEffect(() => {
        fetchDesignations();
    }, []);

    const fetchDesignations = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/designations');
            if (response.ok) {
                const data = await response.json();
                console.log('Designations data:', data); // Debug log

                // Check if data is an array or has a designations property
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
        if (!newDesignation.trim()) {
            setMessage('Please type a designation name first!');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/designations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designation: newDesignation })
            });

            if (response.ok) {
                const data = await response.json();
                setDesignations([...designations, data]);
                setNewDesignation('');
                setMessage('Designation added successfully');
                setIsAddModalOpen(false);
            } else {
                setMessage('Error: Backend rejected the new designation.');
            }
        } catch (error) {
            setMessage('Error adding designation');
        }
    };

    const handleEdit = (item) => {
        setEditId(item._id);
        setEditDesignation(item.designation);
    };

    const handleUpdate = async () => {
        if (!editId) return;

        try {
            const response = await fetch(`http://localhost:5000/api/designations/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designation: editDesignation })
            });

            if (response.ok) {
                const data = await response.json();
                setDesignations(designations.map(d => (d._id === editId ? data : d)));
                setEditId(null);
                setEditDesignation('');
                setMessage('Designation updated successfully');
            }
        } catch (error) {
            setMessage('Error updating designation');
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
                setMessage('Designation deleted successfully');
            } else {
                setMessage(data && data.message ? `Error: ${data.message}` : `Error: Server rejected the request`);
            }
        } catch (error) {
            setMessage('Error deleting designation: Network issue.');
        } finally {
            setIsDeleteModalOpen(false);
            setDesignationToDelete(null);
        }
    };

    return (
        <div style={{ width: '70%' }} className="roles-container">
            {/* HEADER */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Designations Management</h2>
                {/* Changed width to 'auto' and added whiteSpace: 'nowrap' so the text stays on one line */}
                <button style={{ width: 'auto', padding: '10px 20px', whiteSpace: 'nowrap', color: 'white', backgroundColor: '#5aa7ef' }} onClick={() => { setMessage(''); setIsAddModalOpen(true); }}>
                    + Add Designation
                </button>
            </div>

            {message && <p className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>{message}</p>}

            {/* TABLE */}
            {/* Changed width to 100% to fill the container nicely and removed the strict column percentages */}
            <table style={{ width: '100%', margin: 'auto' }} className="roles-table">
                <thead>
                    <tr>
                        <th>Designation</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.isArray(designations) && designations.map((item) => (
                        <tr key={item._id}>
                            <td>{item.designation}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
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
                    ))}
                </tbody>
            </table>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add New Designation</h3>
                        <div className="modal-form-group">
                            <input
                                type="text"
                                placeholder="Enter designation name"
                                value={newDesignation}
                                onChange={(e) => setNewDesignation(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions" style={{ marginTop: '20px', marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleAdd}>
                                Save Designation
                            </button>
                            <button className="btn btn-cancel" onClick={() => setIsAddModalOpen(false)}>
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
                        <h3>Edit Designation</h3>
                        <div className="modal-form-group">
                            <input
                                type="text"
                                value={editDesignation}
                                onChange={(e) => setEditDesignation(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions" style={{
                            marginTop: '25px', display: 'flex', gap: '10px', alignItems: 'right', justifyContent: 'flex-end'
                        }}>
                            <button style={{ backgroundColor: '#2a8ae3', color: 'white' }} onClick={handleUpdate}>
                                Save Changes
                            </button>
                            <button onClick={() => setEditId(null)} style={{ backgroundColor: '#6c757d', color: 'white' }}>
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
                        <h3>Delete Designation</h3>
                        <p style={{ margin: '20px 0', fontSize: '16px', color: '#333' }}>
                            Are you sure you want to delete this designation? This action cannot be undone.
                        </p>
                        <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={confirmDelete} style={{ backgroundColor: '#dc3545', color: 'white' }}>
                                Yes, Delete
                            </button>
                            <button onClick={() => { setIsDeleteModalOpen(false); setDesignationToDelete(null); }} style={{ backgroundColor: '#6c757d', color: 'white' }}>
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


export default Designations;