import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCity, faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function City() {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const [cityName, setCityName] = useState('');
    const [editId, setEditId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [pageMessage, setPageMessage] = useState({ text: '', type: '' });

    const fetchCities = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/cities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCities(data.data);
            }
        } catch (error) {
            console.error("Error fetching cities", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    // Modal Messages
    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    // Page Level Messages
    const showPageMessage = (text, type) => {
        setPageMessage({ text, type });
        setTimeout(() => setPageMessage({ text: '', type: '' }), 3000);
    };

    const openAddModal = () => {
        setEditId(null);
        setCityName('');
        setMessage({ text: '', type: '' });
        setIsModalOpen(true);
    };

    const startEdit = (city) => {
        setEditId(city._id);
        setCityName(city.name);
        setMessage({ text: '', type: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCityName('');
        setEditId(null);
        setMessage({ text: '', type: '' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!cityName.trim()) {
            showMessage("City name cannot be empty.", "error");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const method = editId ? 'PUT' : 'POST';
            const url = editId ? `${API_BASE_URL}/api/cities/${editId}` : `${API_BASE_URL}/api/cities`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: cityName })
            });

            const data = await res.json();
            if (data.success) {
                closeModal();
                showPageMessage(data.message, "success");
                fetchCities();
            } else {
                showMessage(data.message, "error");
            }
        } catch (error) {
            showMessage("Server error. Please try again.", "error");
        }
    };

    const confirmDelete = (id) => {
        setDeleteTargetId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/cities/${deleteTargetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setIsDeleteModalOpen(false);
                setDeleteTargetId(null);
                showPageMessage("City deleted successfully", "success");
                fetchCities();
            }
        } catch (error) {
            setIsDeleteModalOpen(false);
            showPageMessage("Error deleting city.", "error");
        }
    };

    return (
        <div className="dashboard-wrapper">

            {/* HEADER */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '16px', fontWeight: 600 }}>
                    City Configuration
                </h4>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <FontAwesomeIcon icon={faPlus} style={{ marginRight: '1px' }} /> Add City
                </button>
            </div>

            {/* PAGE LEVEL NOTIFICATION */}
            {pageMessage.text && (
                <div style={{
                    padding: '12px 16px', marginBottom: '20px', borderRadius: '6px',
                    backgroundColor: pageMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: pageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    border: `1px solid ${pageMessage.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                    fontSize: '14px', fontWeight: '500'
                }}>
                    {pageMessage.text}
                </div>
            )}

            {/* CITIES LIST TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ ...tableStyles.th, width: '10%' }}>Sr#</th>
                            <th style={{ ...tableStyles.th, width: '70%' }}>City Name</th>
                            <th style={{ ...tableStyles.th, textAlign: 'center', width: '20%' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={tableStyles.emptyCell}>Loading cities...</td></tr>
                        ) : cities.length === 0 ? (
                            <tr><td colSpan="3" style={tableStyles.emptyCell}>No cities configured yet. Click "+ Add City" to create one.</td></tr>
                        ) : (
                            cities.map((city, index) => (
                                <tr key={city._id} style={tableStyles.tr} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={tableStyles.td}>{index + 1}</td>
                                    <td style={{ ...tableStyles.td, fontWeight: '600' }}>{city.name}</td>
                                    <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-other)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => startEdit(city)} title="Edit">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>                     </button>
                                            <button style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => confirmDelete(city._id)} title="Delete">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <path d="M3 6h18"></path>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD / EDIT MODAL */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editId ? 'Edit City' : 'Add New City'}</h3>
                            <button className="modal-close" onClick={closeModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                {message.text && (
                                    <div style={{
                                        padding: '10px 14px', marginBottom: '16px', borderRadius: '6px',
                                        backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                        color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                                        border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                                        fontSize: '13px', fontWeight: '500'
                                    }}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">City Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Lahore, Karachi"
                                        value={cityName}
                                        onChange={(e) => setCityName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editId ? 'Update City' : 'Save City'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
                    <div className="modal-container" style={{ maxWidth: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body">
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--danger-bg)',
                                color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '24px', fontWeight: 700, margin: '0 auto var(--space-md)'
                            }}>
                                !
                            </div>
                            <h3 style={{ margin: '0 0 var(--space-sm)', color: 'var(--text-main)', fontSize: '18px' }}>Delete City?</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                                This action cannot be undone. Are you sure?
                            </p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

const tableStyles = {
    th: { padding: '12px 16px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: '600', fontSize: '13px', textAlign: 'left' },
    td: { padding: '10px 16px', color: 'var(--text-main)', fontSize: '13px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' },
    tr: { transition: 'background-color 0.2s' },
    emptyCell: { padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }
};

const actionStyles = {
    iconBtnEdit: { background: 'var(--edit)', color: 'var(--primary)', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' },
    iconBtnDelete: { backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }
};

export default City;