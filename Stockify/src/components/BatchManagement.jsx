import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxOpen, faCheck, faEdit, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const BatchManagement = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Inline editing states
    const [editingId, setEditingId] = useState(null);
    const [editDate, setEditDate] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = batches.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(batches.length / itemsPerPage);

    useEffect(() => {
        fetchBatches();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/batches`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setBatches(data.data);
                setCurrentPage(1);
            }
        } catch (error) {
            showMessage('Error fetching batches.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (batch) => {
        setEditingId(batch._id);
        setEditDate(new Date(batch.expiryDate).toISOString().split('T')[0]);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDate('');
    };

    const handleSave = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/batches/${id}/expiry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ expiryDate: editDate })
            });
            const data = await res.json();

            if (res.ok) {
                showMessage('Expiry date updated successfully!', 'success');
                setBatches(batches.map(b => b._id === id ? { ...b, expiryDate: editDate } : b));
                cancelEdit();
            } else {
                showMessage(data.message || 'Failed to update.', 'error');
            }
        } catch (error) {
            showMessage('Server error.', 'error');
        }
    };

    return (
        <div className="dashboard-wrapper">
            {message.text && (
                <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}` }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={thStyle}>Sr#</th>
                                <th style={thStyle}>Product Name</th>
                                <th style={thStyle}>Batch Number</th>
                                <th style={thStyle}>Available Stock</th>
                                <th style={thStyle}>Expiry Date</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>Loading batches...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>No active stock available.</td></tr>
                            ) : (
                                currentItems.map((batch, idx) => {
                                    const serialNumber = indexOfFirstItem + idx + 1;
                                    return (
                                        <tr key={batch._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={tdStyle}>{serialNumber}</td>
                                            <td style={{ ...tdStyle, fontWeight: '500' }}>{batch.product?.name || 'N/A'}</td>
                                            <td style={tdStyle}>{batch.batchNumber}</td>
                                            <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--primary)' }}>{batch.quantity}</td>

                                            <td style={tdStyle}>
                                                {editingId === batch._id ? (
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={editDate}
                                                        onChange={(e) => setEditDate(e.target.value)}
                                                        style={{ padding: '4px', height: 'auto', minHeight: '30px' }}
                                                    />
                                                ) : (
                                                    new Date(batch.expiryDate).toLocaleDateString('en-GB')
                                                )}
                                            </td>

                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {editingId === batch._id ? (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button className="btn btn-primary" onClick={() => handleSave(batch._id)} style={{ padding: '4px 8px', fontSize: '12px' }}><FontAwesomeIcon icon={faCheck} /></button>
                                                        <button className="btn btn-secondary" onClick={cancelEdit} style={{ padding: '4px 8px', fontSize: '12px' }}><FontAwesomeIcon icon={faTimes} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEdit(batch)} style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', textAlign: 'center' }}>
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 💡 PAGINATION CONTROLS */}
                {batches.length > itemsPerPage && (
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                        <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
                            ←
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
                            →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const thStyle = { padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' };
const tdStyle = { padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' };
const styles = {
    iconBtnEdit: {
        background: 'var(--edit)',
        color: 'var(--primary)',
        border: 'none',
        padding: '6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    }
}
export default BatchManagement;