import React, { useState, useEffect, useRef } from 'react';

function ConfigureSalary() {
    const [configs, setConfigs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        employeeId: '',
        employeeType: '',
        monthlySalary: '',
        allowanceAmount: '',
        salaryWithAttendance: 'Yes',
        wefDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [message, setMessage] = useState({ text: '', type: '' });
    const topRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [configRes, empRes, desigRes] = await Promise.all([
                fetch('http://localhost:5000/api/salary-config', { headers }),
                fetch('http://localhost:5000/api/employees', { headers }),
                fetch('http://localhost:5000/api/designations', { headers })
            ]);

            const configData = await configRes.json();
            const empData = await empRes.json();
            const desigData = await desigRes.json();

            if (configData.success) setConfigs(configData.data);
            if (Array.isArray(empData)) setEmployees(empData);
            if (Array.isArray(desigData)) setDesignations(desigData);
        } catch (error) {
            showMessage('Failed to load payroll records.', 'error');
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    // Auto-fill employee type when employee is selected
    const handleEmployeeSelect = (e) => {
        const empId = e.target.value;
        const selectedEmp = employees.find(emp => emp._id === empId);

        let typeStr = 'Staff';
        if (selectedEmp && selectedEmp.designation) {
            const desigObj = designations.find(d => d._id === (selectedEmp.designation._id || selectedEmp.designation));
            if (desigObj) typeStr = desigObj.designation;
        }

        // 💡 Agar selected employee ki joining date mojood hai aur current wefDate us se pehle ki hai, toh wefDate ko update karke joining date par set kar dein
        let newWefDate = formData.wefDate;
        if (selectedEmp) {
            const empJoin = (selectedEmp.joiningDate || selectedEmp.createdAt || '').split('T')[0];
            if (empJoin && newWefDate < empJoin) {
                newWefDate = empJoin;
            }
        }

        setFormData(prev => ({
            ...prev,
            employeeId: empId,
            employeeType: typeStr,
            wefDate: newWefDate
        }));
    };

    // Selected employee ki joining date find karne ke liye helper
    const selectedEmployeeObj = employees.find(emp => emp._id === formData.employeeId);
    const employeeJoinDate = selectedEmployeeObj 
        ? (selectedEmployeeObj.joiningDate || selectedEmployeeObj.createdAt || '').split('T')[0] 
        : '';

    // Calculate Total Amount dynamically
    const monthly = Number(formData.monthlySalary) || 0;
    const allowance = Number(formData.allowanceAmount) || 0;
    const totalAmount = monthly + allowance;

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        if (!formData.employeeId) return showMessage('Please select an employee.', 'error');
        if (monthly <= 0) return showMessage('Monthly salary must be greater than zero.', 'error');

        // 💡 Validation: WEF Date joining date se pehle nahi ho sakti
        if (employeeJoinDate && formData.wefDate < employeeJoinDate) {
            return showMessage(`WEF Date cannot be earlier than the employee's joining date (${employeeJoinDate}).`, 'error');
        }

        try {
            const token = localStorage.getItem('token');
            const url = isEditing 
                ? `http://localhost:5000/api/salary-config/${editId}` 
                : 'http://localhost:5000/api/salary-config';
            
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    monthlySalary: monthly,
                    allowanceAmount: allowance,
                    totalAmount: totalAmount 
                })
            });

            const result = await response.json();
            if (result.success) {
                showMessage(isEditing ? 'Salary configuration updated successfully!' : 'Salary configured successfully!', 'success');
                setIsModalOpen(false);
                resetForm();
                fetchData();
            } else {
                showMessage(result.message || 'Failed to save configuration.', 'error');
            }
        } catch (error) {
            showMessage('Server error while saving.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this salary configuration?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/salary-config/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                showMessage('Configuration deleted.', 'success');
                fetchData();
            } else {
                showMessage(data.message, 'error');
            }
        } catch (error) {
            showMessage('Error deleting configuration.', 'error');
        }
    };

    const handleEdit = (config) => {
        setIsEditing(true);
        setEditId(config._id);
        setFormData({
            employeeId: config.employee?._id || config.employee,
            employeeType: config.employeeType || 'Staff',
            monthlySalary: config.monthlySalary || config.netSalary || '',
            allowanceAmount: config.allowanceAmount || '',
            salaryWithAttendance: config.salaryWithAttendance || 'Yes',
            wefDate: config.wefDate ? config.wefDate.split('T')[0] : (config.effectiveDate ? config.effectiveDate.split('T')[0] : new Date().toISOString().split('T')[0]),
            notes: config.notes || ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            employeeId: '',
            employeeType: '',
            monthlySalary: '',
            allowanceAmount: '',
            salaryWithAttendance: 'Yes',
            wefDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setIsEditing(false);
        setEditId(null);
    };

    const filteredConfigs = configs.filter(c =>
        c.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.employeeType?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboard-wrapper" ref={topRef}>

            {message.text && (
                <div style={{ padding: '10px 14px', marginBottom: '15px', borderRadius: '6px', backgroundColor: message.type === 'error' ? '#fee2e2' : '#d1fae5', color: message.type === 'error' ? '#dc2626' : '#065f46', fontWeight: 500 }}>
                    {message.text}
                </div>
            )}

            {/* PAGE HEADER & CONFIGURE BUTTON */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px' }}>Salary Configuration</h4>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '220px' }}
                    />
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                    >
                        Configure Salary
                    </button>
                </div>
            </div>

            {/* CONFIGURE SALARY MODAL */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container" style={{ width: '650px', maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{isEditing ? 'Edit Salary Configuration' : 'Configure Salary'}</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleSaveConfig}>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

                                    {/* Employee Name */}
                                    <div className="form-group">
                                        <label className="form-label">Employee Name *</label>
                                        <select
                                            className="form-input"
                                            value={formData.employeeId}
                                            onChange={handleEmployeeSelect}
                                            disabled={isEditing}
                                            required
                                        >
                                            <option value="">Please select</option>
                                            {employees.map(emp => (
                                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Employee Type */}
                                    <div className="form-group">
                                        <label className="form-label">Employee Type *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.employeeType}
                                            onChange={e => setFormData({ ...formData, employeeType: e.target.value })}
                                            placeholder="e.g. Worker, Staff"
                                            required
                                        />
                                    </div>

                                    {/* Monthly Salary */}
                                    <div className="form-group">
                                        <label className="form-label">Monthly Salary *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.monthlySalary}
                                            onChange={e => setFormData({ ...formData, monthlySalary: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                            required
                                        />
                                    </div>

                                    {/* Allowance Amount */}
                                    <div className="form-group">
                                        <label className="form-label">Allowance Amount *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.allowanceAmount}
                                            onChange={e => setFormData({ ...formData, allowanceAmount: e.target.value })}
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>

                                    {/* Total Amount (Auto Calculated) */}
                                    <div className="form-group">
                                        <label className="form-label">Total Amount</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={totalAmount.toFixed(2)}
                                            disabled
                                            style={{ backgroundColor: 'var(--bg-app)', fontWeight: 'bold', color: 'var(--primary)' }}
                                        />
                                    </div>

                                    {/* WEF Date with Minimum Joining Date constraint */}
                                    <div className="form-group">
                                        <label className="form-label">WEF Date *</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.wefDate}
                                            min={employeeJoinDate || undefined}
                                            onChange={e => setFormData({ ...formData, wefDate: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {/* Salary With Attendance */}
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Salary With Attendance *</label>
                                        <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="salaryWithAttendance"
                                                    value="Yes"
                                                    checked={formData.salaryWithAttendance === 'Yes'}
                                                    onChange={e => setFormData({ ...formData, salaryWithAttendance: e.target.value })}
                                                /> Yes
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="salaryWithAttendance"
                                                    value="No"
                                                    checked={formData.salaryWithAttendance === 'No'}
                                                    onChange={e => setFormData({ ...formData, salaryWithAttendance: e.target.value })}
                                                /> No
                                            </label>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{isEditing ? 'Update Configuration' : 'Configure Salary'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableStyles.th}>Employee Name</th>
                                <th style={tableStyles.th}>Employee Type</th>
                                <th style={{ ...tableStyles.th, textAlign: 'left' }}>Monthly Salary</th>
                                <th style={{ ...tableStyles.th, textAlign: 'left' }}>Allowance Amount</th>
                                <th style={{ ...tableStyles.th, textAlign: 'left' }}>Total Amount</th>
                                <th style={tableStyles.th}>WEF Date</th>
                                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredConfigs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', fontSize:'14px', padding: '40px', color: 'var(--text-muted)' }}>
                                        No salary configurations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredConfigs.map((c) => (
                                    <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ ...tableStyles.td, fontWeight: 600 }}>{c.employee?.name || 'Unknown'}</td>
                                        <td style={tableStyles.td}>{c.employeeType || 'Staff'}</td>
                                        <td style={{ ...tableStyles.td, textAlign: 'left' }}>
                                            {parseFloat(c.monthlySalary !== undefined ? c.monthlySalary : (c.netSalary || 0)).toFixed(2)}
                                        </td>
                                        <td style={{ ...tableStyles.td, textAlign: 'left' }}>
                                            {parseFloat(c.allowanceAmount || 0).toFixed(2)}
                                        </td>
                                        <td style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            {parseFloat(c.totalAmount !== undefined ? c.totalAmount : (c.netSalary || 0)).toFixed(2)}
                                        </td>
                                        <td style={tableStyles.td}>
                                            {c.wefDate ? new Date(c.wefDate).toLocaleDateString('en-GB') : (c.effectiveDate ? new Date(c.effectiveDate).toLocaleDateString('en-GB') : '-')}
                                        </td>
                                        <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    type="button"
                                                    style={actionStyles.iconBtnEdit}
                                                    onClick={() => handleEdit(c)}
                                                >
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    style={actionStyles.iconBtnDelete}                                     onClick={() => handleDelete(c._id)}
                                                >
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

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
        padding: '12px 16px',
        color: 'var(--text-main)',
        fontSize: '13px',
        textAlign: 'left',
        verticalAlign: 'middle'
    }
};

const actionStyles = {
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

export default ConfigureSalary;