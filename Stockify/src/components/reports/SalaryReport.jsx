import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faPrint, faEye } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function SalaryReport() {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [viewDetails, setViewDetails] = useState(null);

    const [reportData, setReportData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (selectedMonth) {
            fetchReportData();
        }
    }, [selectedMonth]);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/employees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/salary?month=${selectedMonth}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setReportData(data.data || []);
            } else {
                setReportData([]);
            }
        } catch (error) {
            console.error('Error fetching salary report:', error);
            showMessage('Failed to load salary report.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredData = reportData.filter(row =>
        selectedEmployee === '' || (row.employee && row.employee._id === selectedEmployee)
    );

    // Modal ke liye Net Position
    const viewEarned = viewDetails ? ((viewDetails.grossSalary || 0) - (viewDetails.attendanceDeduction || 0)) : 0;
    const viewOutstanding = viewDetails ? (viewDetails.totalLoanOutstanding || 0) : 0;
    const viewNetPosition = viewDetails && viewDetails.currentBalance !== undefined ? viewDetails.currentBalance : (viewEarned - viewOutstanding);

    return (
        <div className="dashboard-wrapper">
            {message.text && (
                <div style={{ padding: '10px 14px', marginBottom: '15px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, fontWeight: 500 }}>
                    {message.text}
                </div>
            )}

            {/* FILTER HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input
                        type="month"
                        className="form-input"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{ width: '180px', padding: '10px 12px', height: 'auto', fontSize: '13px', marginBottom: 0 }}
                    />
                    <select
                        className="form-input"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        style={{ width: '220px', padding: '10px 12px', height: 'auto', fontSize: '13px', marginBottom: 0 }}
                    >
                        <option value="">All Employees</option>
                        {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white' }}>
                        <FontAwesomeIcon icon={faPrint} /> Print
                    </button>
                    <button className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#e11d48', borderColor: '#e11d48' }}>
                        <FontAwesomeIcon icon={faFilePdf} /> Export PDF
                    </button>
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                    <thead>
                        <tr>
                            <th style={tableStyles.th}>Employee</th>
                            <th style={tableStyles.th}>Gross</th>
                            <th style={tableStyles.th}>A / L / Hd</th>
                            <th style={tableStyles.th}>Penalty</th>
                            <th style={tableStyles.th}>Loan Taken</th>
                            <th style={tableStyles.th}>Returned (Cash)</th>
                            <th style={tableStyles.th}>Remaining Loan</th>
                            <th style={tableStyles.th}>Payable</th>
                            <th style={tableStyles.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'left', padding: '40px', color: 'var(--text-muted)' }}>Loading payroll data...</td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'left', padding: '40px', color: 'var(--text-muted)' }}>No salary records found for {selectedMonth}.</td>
                            </tr>
                        ) : (
                            filteredData.map((row) => {
                                const remainingLoan = row.totalLoanOutstanding || 0;
                                
                                // 💡 THE FIX: Actual Live Balance from ledger!
                                const netPosition = row.currentBalance !== undefined ? row.currentBalance : ((row.grossSalary || 0) - (row.attendanceDeduction || 0) - remainingLoan);

                                // Dynamic Status Colors
                                let statusBg = '#fef3c7';
                                let statusColor = '#d97706';
                                let statusBorder = '#fcd34d';

                                if (row.status === 'Paid' || row.status === 'Settled') {
                                    statusBg = 'var(--success-bg)';
                                    statusColor = 'var(--success)';
                                    statusBorder = 'var(--success)';
                                } else if (row.status === 'Partial') {
                                    statusBg = '#e0f2fe';
                                    statusColor = '#0284c7';
                                    statusBorder = '#7dd3fc';
                                }

                                return (
                                    <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <td style={tableStyles.td}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>{row.employee?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.employee?.designation || 'Staff'}</div>
                                        </td>
                                        <td style={{ ...tableStyles.td, fontWeight: 600 }}>
                                            Rs. {(row.grossSalary || 0).toLocaleString()}
                                        </td>
                                        <td style={{ ...tableStyles.td, fontWeight: 600 }}>
                                            <span style={{ color: '#ef4444' }} title="Absents">{row.attendanceStats?.absent || 0}A</span> /&nbsp;
                                            <span style={{ color: '#3b82f6' }} title="Leaves">{row.attendanceStats?.leave || 0}L</span> /&nbsp;
                                            <span style={{ color: '#f59e0b' }} title="Half Days">{row.attendanceStats?.halfDay || 0}Hd</span>
                                        </td>
                                        <td style={tableStyles.td}>
                                            {(row.attendanceDeduction || 0) > 0 ? (
                                                <span style={{ color: '#ef4444', fontWeight: 500 }}>- Rs. {row.attendanceDeduction.toLocaleString()}</span>
                                            ) : <span style={{ color: 'var(--text-light)' }}>-</span>}
                                        </td>
                                        <td style={tableStyles.td}>
                                            {(row.totalLoanTakenThisMonth || 0) > 0 ? (
                                                <span style={{ color: '#3b82f6', fontWeight: 600 }}>+ Rs. {row.totalLoanTakenThisMonth.toLocaleString()}</span>
                                            ) : <span style={{ color: 'var(--text-light)' }}>-</span>}
                                        </td>
                                        <td style={tableStyles.td}>
                                            {(row.totalLoanReturnedThisMonth || 0) > 0 ? (
                                                <span style={{ color: '#10b981', fontWeight: 600 }}>
                                                    - Rs. {row.totalLoanReturnedThisMonth.toLocaleString()}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-light)' }}>-</span>}
                                        </td>
                                        <td style={{ ...tableStyles.td, fontWeight: 600, color: remainingLoan > 0 ? '#ef4444' : 'var(--success)' }}>
                                            Rs. {remainingLoan.toLocaleString()}
                                        </td>
                                        <td style={tableStyles.td}>
                                            {netPosition > 0 ? (
                                                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '14px' }}>Rs. {netPosition.toLocaleString()}</span>
                                            ) : netPosition < 0 ? (
                                                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '14px' }}>- Rs. {Math.abs(netPosition).toLocaleString()}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '14px' }}>Rs. 0</span>
                                            )}
                                        </td>
                                        <td style={tableStyles.td}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                                                backgroundColor: statusBg,
                                                color: statusColor,
                                                border: `1px solid ${statusBorder}`
                                            }}>
                                                {row.status || 'Pending'}
                                            </span>
                                        </td>
                                        
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

        
        </div>
    );
}

const tableStyles = {
    th: { padding: '12px 10px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: '600', fontSize: '12px', textAlign: 'left', letterSpacing: '0.2px', whiteSpace: 'nowrap' },
    td: { padding: '12px 10px', color: 'var(--text-main)', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap' }
};

export default SalaryReport;