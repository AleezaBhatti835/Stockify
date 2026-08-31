import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const ClientDetails = () => {
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        businessName: '',
        contact: '',
        address: '',
        logo: null
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchClient();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    // CORE ARCHITECTURE: Asynchronous retrieval of primary business profile records from the backend API.
    const fetchClient = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/client`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                setClient(data[0]);
            } else if (data && data._id) {
                setClient(data);
            } else {
                setClient(null);
            }
        } catch (err) {
            console.error('Error fetching client:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prev) => ({ ...prev, logo: file }));
        }
    };

    const handleOpenAddModal = () => {
        if (client) return;
        setIsEditing(false);
        setFormData({ businessName: '', contact: '', address: '', logo: null });
        setShowModal(true);
    };

    const handleOpenEditModal = () => {
        setIsEditing(true);
        setFormData({
            businessName: client.businessName || '',
            contact: client.contact || '',
            address: client.address || '',
            logo: null
        });
        setShowModal(true);
    };

    // DATA INTEGRITY ENGINE: Handles multipart logo file uploads and synchronizes business client profile additions or updates.
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            let finalLogoUrl = client?.logo || '';

            if (formData.logo instanceof File) {
                const uploadData = new FormData();
                uploadData.append('image', formData.logo);

                const uploadRes = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadData,
                });
                const uploadResult = await uploadRes.json();
                finalLogoUrl = uploadResult.imageUrl;
            }

            const method = isEditing ? 'PUT' : 'POST';
            const endpoint = isEditing ? `${API_BASE}/client/${client._id}` : `${API_BASE}/client`;

            const res = await fetch(endpoint, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    businessName: formData.businessName,
                    contact: formData.contact,
                    address: formData.address,
                    logo: finalLogoUrl
                }),
            });

            const data = await res.json();

            if (res.ok || data.success) {
                setToast({ type: 'success', message: 'Client details saved!' });
                setShowModal(false);
                fetchClient();
            } else {
                throw new Error(data.message || 'Failed to save');
            }
        } catch (err) {
            setToast({ type: 'error', message: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!client) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this client?");
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/client/${client._id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok || data.success) {
                setToast({ type: 'success', message: 'Client deleted successfully!' });
                setClient(null);
            } else {
                throw new Error(data.message || 'Failed to delete');
            }
        } catch (err) {
            setToast({ type: 'error', message: err.message });
        }
    };

    const getImageUrl = (pic) => {
        if (!pic) return null;
        if (pic.startsWith('http://') || pic.startsWith('https://')) return pic;
        return `http://localhost:5000${pic.startsWith('/') ? '' : '/'}${pic}`;
    };

    const hasClient = !!client;

    return (
        <div className="dashboard-wrapper">
            {toast && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
                    padding: '14px 24px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600,
                    backgroundColor: toast.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${toast.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                    boxShadow: 'var(--shadow-md)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* HEADER AREA */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>Business / Client Details</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Manage your main business information and logo.</p>
                </div>
                <button
                    className={`btn ${hasClient ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={handleOpenAddModal}
                    disabled={hasClient}
                    style={hasClient ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Client
                </button>
            </div>

            {/* TABLE SECTION */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Logo</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Business Name</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Contact</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Address</th>
                                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '10%' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading details...</td>
                                </tr>
                            ) : !hasClient ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                                        No client details found. Please add a client.
                                    </td>
                                </tr>
                            ) : (
                                <tr style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '10px 16px', textAlign: 'left' }}>
                                        {client.logo ? (
                                            <img src={getImageUrl(client.logo)} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }} />
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No Logo</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
                                        {client.businessName}
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}>{client.contact}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}>{client.address}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'left', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button 
                                                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                                                onClick={handleOpenEditModal} 
                                                title="Edit Client"
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button 
                                                style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                                                onClick={handleDelete} 
                                                title="Delete Client"
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
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0 }}>
                        <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)' }}>{isEditing ? 'Edit Client Details' : 'Add Client Details'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Business Name *</label>
                                <input
                                    type="text"
                                    name="businessName"
                                    required
                                    className="form-input"
                                    value={formData.businessName}
                                    onChange={handleChange}
                                    placeholder="e.g. Acme Corporation"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Contact Info</label>
                                <input
                                    type="text"
                                    name="contact"
                                    className="form-input"
                                    value={formData.contact}
                                    onChange={handleChange}
                                    placeholder="e.g. +92 300 1234567 or email@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <textarea
                                    name="address"
                                    className="form-input"
                                    style={{ minHeight: '80px', resize: 'vertical' }}
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter full business address"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Company Logo (Optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        style={{ fontSize: '13px', color: 'var(--text-muted)' }}
                                    />
                                    {formData.logo instanceof File && (
                                        <img
                                            src={URL.createObjectURL(formData.logo)}
                                            alt="Preview"
                                            style={{ width: '50px', height: '50px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px' }}
                                        />
                                    )}
                                    {!formData.logo && client?.logo && (
                                        <img
                                            src={getImageUrl(client.logo)}
                                            alt="Current Logo"
                                            style={{ width: '50px', height: '50px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px' }}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDetails;