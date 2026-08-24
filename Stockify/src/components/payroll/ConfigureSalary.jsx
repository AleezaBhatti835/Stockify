import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const ConfigureSalary = () => {
    const [configs, setConfigs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [formData, setFormData] = useState({
        employeeId: '',
        basicSalary: '',
        allowances: '0',
        deductions: '0',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Auto-calculate Net Salary for UI display
    const calculatedNet = (Number(formData.basicSalary) || 0) + (Number(formData.allowances) || 0) - (Number(formData.deductions) || 0);

    useEffect(() => {
        fetchConfigs();
        fetchEmployees();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/salary-config`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setConfigs(data.data);
        } catch (error) {
            showMessage('Error fetching configurations', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching employees");
        }
    };

    const handleEdit = (config) => {
        setFormData({
            employeeId: config.employee._id,
            basicSalary: config.basicSalary,
            allowances: config.allowances || 0,
            deductions: config.deductions || 0,
            effectiveDate: new Date(config.effectiveDate).toISOString().split('T')[0],
            notes: config.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setFormData({
            employeeId: '',
            basicSalary: '',
            allowances: '0',
            deductions: '0',
            effectiveDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleSaveConfig = async () => {
        if (!formData.employeeId) return showMessage('Please select an employee', 'error');
        if (!formData.basicSalary || Number(formData.basicSalary) <= 0) return showMessage('Enter a valid basic salary', 'error');

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/salary-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                showMessage('Salary configuration saved successfully!', 'success');
                setIsModalOpen(false);
                fetchConfigs();
            } else {
                showMessage(data.message || 'Failed to save configuration', 'error');
            }
        } catch (error) {
            showMessage('Server error', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter out employees who already have a configuration (for the dropdown)
    // Only apply this when adding a new config. If editing, we show the current one.
    const availableEmployees = employees.filter(emp =>
        !configs.some(c => c.employee?._id === emp._id) || formData.employeeId === emp._id
    );

    return (
        <div className="dashboard-wrapper">
            {/* HEADER */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ fontSize: '20px', color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Configure Employee Salaries</h3>
                </div>
                <button className="btn btn-primary" onClick={handleAddNew}>
                    Setup New Salary
                </button>
            </div>

            {message.text && (
                <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}` }}>
                    {message.text}
                </div>
            )}

            {/* TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={thStyle}>Sr#</th>
                                <th style={thStyle}>Employee Name</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Basic Salary</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Allowances (+)</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Deductions (-)</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Net Fixed Salary</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center' }}>Loading configurations...</td></tr>
                            ) : configs.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '40px', fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>No salary configurations found.</td></tr>
                            ) : (
                                configs.map((config, idx) => (
                                    <tr key={config._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--text-main)' }}>{config.employee?.name || 'N/A'}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left' }}>{parseFloat(config.basicSalary).toFixed(2)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--success)' }}>{parseFloat(config.allowances).toFixed(2)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--danger)' }}>{parseFloat(config.deductions).toFixed(2)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold', color: 'var(--primary)', fontSize: '14px' }}>
                                            PKR {parseFloat(config.netSalary).toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <button className="btn btn-secondary" onClick={() => handleEdit(config)} style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CONFIGURATION MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ width: '500px', height: '90%' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Salary Configuration</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Employee *</label>
                                <select className="form-input" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} disabled={configs.some(c => c.employee?._id === formData.employeeId)}>
                                    <option value="">Select Employee</option>
                                    {availableEmployees.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label className="form-label">Basic Salary *</label>
                                    <input type="number" className="form-input" value={formData.basicSalary} onChange={e => setFormData({ ...formData, basicSalary: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Effective Date *</label>
                                    <input type="date" className="form-input" value={formData.effectiveDate} onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--success)' }}>Allowances (+)</label>
                                    <input type="number" className="form-input" value={formData.allowances} onChange={e => setFormData({ ...formData, allowances: e.target.value })} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ color: 'var(--danger)' }}>Fixed Deductions (-)</label>
                                    <input type="number" className="form-input" value={formData.deductions} onChange={e => setFormData({ ...formData, deductions: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>

                            {/* LIVE CALCULATION BOX */}
                            <div style={{ marginTop: '10px', marginBottom: '15px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid var(--primary)', borderRadius: '6px', textAlign: 'center' }}>
                                <div style={{ textAlign:'left', fontSize: '14px', color: 'var(--primary-other)', fontWeight: 'bold' }}>Final Net Salary <span style={{textAlign:'right', fontSize: '14px', fontWeight: 'semibold', color: 'var(--primary-other)',marginLeft:'10%' }}> PKR {calculatedNet.toFixed(2)}</span> </div>

                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const thStyle = { padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' };
const tdStyle = { padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' };

export default ConfigureSalary;