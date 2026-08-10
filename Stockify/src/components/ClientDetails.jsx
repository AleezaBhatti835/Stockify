import React, { useState, useEffect } from 'react';
import './supplier.css'

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
        logo: null // Changed from '' to null
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

    const fetchClient = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/client`);
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
            logo: null // Don't load existing logo
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalLogoUrl = client?.logo || '';

            // If logo is a File object, upload it
            if (formData.logo instanceof File) {
                const uploadData = new FormData();
                uploadData.append('image', formData.logo);

                const uploadRes = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: uploadData,
                });
                const uploadResult = await uploadRes.json();
                finalLogoUrl = uploadResult.imageUrl;
            }

            const method = isEditing ? 'PUT' : 'POST';
            const endpoint = isEditing ? `${API_BASE}/client/${client._id}` : `${API_BASE}/client`;

            const res = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName: formData.businessName,
                    contact: formData.contact,
                    address: formData.address,
                    logo: finalLogoUrl // This is now a path, not base64!
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
            const res = await fetch(`${API_BASE}/client/${client._id}`, { method: 'DELETE' });
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
        <div style={styles.pageContainer}>
            {toast && (
                <div style={{ ...styles.toast, background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
                    {toast.message}
                </div>
            )}

            <div className='roles-container' style={styles.headerArea}>
                <div>
                    <h4 style={styles.pageTitle}>Business / Client Details</h4>
                    <p style={styles.pageSubtitle}>Manage your main business information and logo.</p>
                </div>
                <button
                    style={hasClient ? styles.addBtnDisabled : styles.addBtn}
                    onClick={handleOpenAddModal}
                    disabled={hasClient}
                >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Client
                </button>
            </div>

            <div style={styles.card}>
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Logo</th>
                                <th style={styles.th}>Business Name</th>
                                <th style={styles.th}>Contact</th>
                                <th style={styles.th}>Address</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={styles.emptyCell}>Loading details...</td>
                                </tr>
                            ) : !hasClient ? (
                                <tr>
                                    <td colSpan="5" style={styles.emptyCell}>
                                        No client details found. Please add a client.
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td style={styles.td}>
                                        {client.logo ? (
                                            <img src={getImageUrl(client.logo)} alt="Logo" style={styles.logoImg} />
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>No Logo</span>
                                        )}
                                    </td>
                                    <td style={{ ...styles.td, fontWeight: '600', color: '#0f172a' }}>
                                        {client.businessName}
                                    </td>
                                    <td style={styles.td}>{client.contact}</td>
                                    <td style={styles.td}>{client.address}</td>
                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                        <div style={styles.actionGroup}>
                                            <button style={styles.iconBtnEdit} onClick={handleOpenEditModal} title="Edit Client">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button style={styles.iconBtnDelete} onClick={handleDelete} title="Delete Client">
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

            {showModal && (
                <div style={styles.overlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{isEditing ? 'Edit Client Details' : 'Add Client Details'}</h3>
                            <button style={styles.closeBtnText} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSave} style={styles.modalBody}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Business Name *</label>
                                <input
                                    type="text"
                                    name="businessName"
                                    required
                                    style={styles.input}
                                    value={formData.businessName}
                                    onChange={handleChange}
                                    placeholder="e.g. Acme Corporation"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Contact Info</label>
                                <input
                                    type="text"
                                    name="contact"
                                    style={styles.input}
                                    value={formData.contact}
                                    onChange={handleChange}
                                    placeholder="e.g. +92 300 1234567 or email@example.com"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Address</label>
                                <textarea
                                    name="address"
                                    style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter full business address"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Company Logo (Optional)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        style={styles.fileInput}
                                    />
                                    {formData.logo instanceof File && (
                                        <img
                                            src={URL.createObjectURL(formData.logo)}
                                            alt="Preview"
                                            style={styles.logoPreview}
                                        />
                                    )}
                                    {!formData.logo && client?.logo && (
                                        <img
                                            src={getImageUrl(client.logo)}
                                            alt="Current Logo"
                                            style={styles.logoPreview}
                                        />
                                    )}
                                </div>
                            </div>

                            <div style={styles.modalFooter}>
                                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" style={styles.saveBtn} disabled={saving}>
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

// ================= STYLES =================
const styles = {
    pageContainer: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '24px 20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        textAlign: 'left',
        color: '#0f172a',
        boxSizing: 'border-box'
    },
    headerArea: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
    },
    pageTitle: {
         color: '#3e576c', fontSize: '20px',
         fontWeight: '700',
        margin: '0 0 6px 0',
    },
    pageSubtitle: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0,
    },
    addBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    addBtnDisabled: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#9aa1a8',
        color: '#ffffff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'not-allowed',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
    },
    tableWrapper: {
        width: '100%',
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
    },
    th: {
        padding: '16px 20px',
        background: '#26384a',
        color: '#fdfdfd',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderBottom: '1px solid #e2e8f0',
    },
    td: {
        padding: '16px 20px',
        fontSize: '14px',
        color: '#334155',
        borderBottom: '1px solid #f1f5f9',
        verticalAlign: 'middle',
    },
    emptyCell: {
        textAlign: 'center',
        padding: '40px 20px',
        color: '#64748b',
        fontSize: '14px',
    },
    logoImg: {
        width: '40px',
        height: '40px',
        objectFit: 'contain',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
    },
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
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500,
        padding: '20px'
    },
    modal: {
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        animation: 'modalSlideIn 0.3s ease-out',
        boxSizing: 'border-box',
        overflow: 'hidden'
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        background: '#26384a',
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#ffffff',
    },
    closeBtnText: {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        color: '#64748b',
        cursor: 'pointer',
    },
    modalBody: {
        padding: '24px',
    },
    inputGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#475569',
        marginBottom: '8px',
    },
    input: {
        width: '100%',
        padding: '12px 14px',
        fontSize: '14px',
        color: '#0f172a',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    fileInput: {
        fontSize: '13px',
        color: '#64748b',
    },
    logoPreview: {
        width: '50px',
        height: '50px',
        objectFit: 'contain',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        padding: '2px'
    },
    modalFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '32px',
    },
    cancelBtn: {
        background: '#f1f5f9',
        color: '#475569',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    saveBtn: {
        background: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    toast: {
        position: 'fixed',
        top: '24px',
        right: '24px',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: '10px',
        zIndex: 2000,
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        fontSize: '14px',
        fontWeight: '600',
    }
};

// Auto-inject focus styles & animations
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
    @keyframes modalSlideIn {
      from { transform: translateY(20px) scale(0.95); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    input:focus, textarea:focus {
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
  `;
    document.head.appendChild(style);
}

export default ClientDetails;