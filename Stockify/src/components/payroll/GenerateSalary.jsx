import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCogs, faSearch, faCheckCircle, faPrint, faTimes, faEye } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const GenerateSalary = () => {
    const currentYear = new Date().getFullYear();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentMonth = monthNames[new Date().getMonth()];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Modals
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [generatedBatch, setGeneratedBatch] = useState({ month: '', year: '', items: [] });
    const [viewRecord, setViewRecord] = useState(null);

    const [selectedEmployees, setSelectedEmployees] = useState([]);

    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        years.push(i);
    }

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const handlePreview = async () => {
        setLoading(true);
        setSelectedEmployees([]);
        try {
            const res = await fetch(`${API_BASE_URL}/api/payroll/preview?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setPreviewData(data.data);
                const pendingIds = data.data.filter(emp => emp.status === 'Pending').map(emp => emp.employeeId);
                setSelectedEmployees(pendingIds);
            }
        } catch (error) {
            showMessage('Error fetching salary preview', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (empId) => {
        if (selectedEmployees.includes(empId)) {
            setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
        } else {
            setSelectedEmployees([...selectedEmployees, empId]);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const pendingIds = previewData.filter(emp => emp.status === 'Pending').map(emp => emp.employeeId);
            setSelectedEmployees(pendingIds);
        } else {
            setSelectedEmployees([]);
        }
    };

    const handleGenerateSalary = async () => {
        if (selectedEmployees.length === 0) {
            return showMessage('Please select at least one pending employee.', 'error');
        }

        const employeesToProcess = previewData.filter(emp => selectedEmployees.includes(emp.employeeId));

        setIsGenerating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/payroll/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    month: selectedMonth,
                    year: selectedYear,
                    employeesToProcess
                })
            });
            const data = await res.json();

            if (res.ok) {
                showMessage(`Success: ${data.message}`, 'success');
                setGeneratedBatch({
                    month: selectedMonth,
                    year: selectedYear,
                    items: employeesToProcess
                });
                setIsResultModalOpen(true);
                handlePreview();
            } else {
                showMessage(data.message || 'Failed to generate salary', 'error');
            }
        } catch (error) {
            showMessage('Server error', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrintSlip = () => {
        const contentEl = document.getElementById('salary-print-area');
        if (!contentEl) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '210mm';
        iframe.style.height = '10px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>Salary Sheet - ${generatedBatch.month} ${generatedBatch.year}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
                        h2, h4 { text-align: center; margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                        th, td { border: 1px solid #000; padding: 8px 12px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h2>CAPOBIZ ENTERPRISES</h2>
                    <h4>Final Salary Sheet for ${generatedBatch.month} ${generatedBatch.year}</h4>
                    ${contentEl.innerHTML}
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 500);
        }, 300);
    };

    const handleSinglePrint = () => {
        if (!viewRecord) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '210mm';
        iframe.style.height = '10px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>Salary Slip - ${viewRecord.employeeName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
                        h2, h4 { text-align: center; margin: 5px 0; }
                        .details-box { border: 1px solid #000; padding: 20px; margin-top: 20px; border-radius: 8px; }
                        .row { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding: 10px 0; font-size: 14px; }
                        .row.bold { font-weight: bold; }
                        .row.dashed-top { border-top: 2px dashed #000; border-bottom: none; margin-top: 10px; padding-top: 15px; }
                        .danger { color: #dc3545; }
                        .success { color: #28a745; }
                        .primary { color: #007bff; }
                    </style>
                </head>
                <body>
                    <h2>CAPOBIZ ENTERPRISES</h2>
                    <h4>Salary Slip for ${selectedMonth} ${selectedYear}</h4>
                    <div class="details-box">
                        <h3 style="margin-top: 0; color: #333;">Employee: ${viewRecord.employeeName}</h3>
                        <div class="row">
                            <span>Fixed Salary</span>
                            <span>PKR ${viewRecord.fixedSalary.toFixed(2)}</span>
                        </div>
                        <div class="row">
                            <span>Absents / Half-days</span>
                            <span class="danger">${viewRecord.absentCount || 0} A / ${viewRecord.halfDayCount || 0} HD</span>
                        </div>
                        <div class="row">
                            <span>Attendance Deductions</span>
                            <span class="danger">- PKR ${viewRecord.deductions.toFixed(2)}</span>
                        </div>
                        <div class="row bold success">
                            <span>Salary (This Month)</span>
                            <span>PKR ${viewRecord.earnedSalary.toFixed(2)}</span>
                        </div>
                        <div class="row dashed-top">
                            <span>Old Balance ${viewRecord.currentBalance < 0 ? '(Advance)' : ''}</span>
                            <span>PKR ${Math.abs(viewRecord.currentBalance).toFixed(2)}</span>
                        </div>
                        <div class="row bold primary" style="font-size: 16px;">
                            <span>Total Payable Now</span>
                            <span>PKR ${Math.abs(viewRecord.projectedBalance).toFixed(2)}</span>
                        </div>
                    </div>
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 500);
        }, 300);
    };

    return (
        <div className="dashboard-wrapper">
            {message.text && (
                <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}` }}>
                    {message.text}
                </div>
            )}

            {/* SELECTION FILTERS */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Select Month</label>
                    <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                        {monthNames.map(month => (
                            <option key={month} value={month}>{month}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Select Year</label>
                    <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <button className="btn btn-secondary" onClick={handlePreview} disabled={loading} style={{ height: '38px', minWidth: '140px' }}>
                    <FontAwesomeIcon icon={faSearch} style={{ marginRight: '6px' }} /> {loading ? 'Loading...' : 'Preview Salary'}
                </button>
            </div>

            {/* CLEAN & SIMPLE PREVIEW TABLE */}
            {previewData.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Payroll Calculation: {selectedMonth} {selectedYear}</h4>

                        <button className="btn btn-primary" onClick={handleGenerateSalary} disabled={isGenerating || selectedEmployees.length === 0} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '6px' }} />
                            {isGenerating ? 'Processing...' : `Generate Selected (${selectedEmployees.length})`}
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', whiteSpace: 'nowrap' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--header)' }}>
                                    <th style={{ ...thStyle, width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedEmployees.length === previewData.filter(e => e.status === 'Pending').length && previewData.filter(e => e.status === 'Pending').length > 0}
                                            disabled={previewData.filter(e => e.status === 'Pending').length === 0}
                                            style={checkboxStyle}
                                        />
                                    </th>
                                    <th style={thStyle}>Employee</th>
                                    <th style={thStyle}>Fixed Salary</th>
                                    <th style={thStyle}>Salary (This Month)</th>
                                    <th style={thStyle}>Old Balance</th>
                                    <th style={thStyle}>Total Payable Now</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((emp) => {
                                    const absentCount = emp.absentCount || 0;
                                    const halfDayCount = emp.halfDayCount || 0;
                                    const fixedSalary = parseFloat(emp.netFixedSalary) || 0;
                                    const deductions = parseFloat(emp.absentDeduction) || 0;
                                    const earnedSalary = parseFloat(emp.finalCalculatedSalary) || fixedSalary - deductions || 0;
                                    const currentBalance = parseFloat(emp.currentBalance) || 0;
                                    const projectedBalance = parseFloat(emp.projectedBalance) || currentBalance + earnedSalary || 0;

                                    return (
                                        <tr key={emp.employeeId} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: emp.status === 'Generated' ? '#fdfffe' : 'transparent', whiteSpace: 'nowrap' }}>
                                            <td style={{ ...tdStyle, width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEmployees.includes(emp.employeeId)}
                                                    onChange={() => handleCheckboxChange(emp.employeeId)}
                                                    disabled={emp.status === 'Generated'}
                                                    style={{ ...checkboxStyle, cursor: emp.status === 'Generated' ? 'not-allowed' : 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: '600' }}>{emp.employeeName}</td>

                                            <td style={tdStyle}>
                                                {fixedSalary.toFixed(2)}
                                            </td>

                                            <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--success)' }}>
                                                {earnedSalary.toFixed(2)}
                                            </td>

                                            <td style={{ ...tdStyle, color: currentBalance < 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                                                {Math.abs(currentBalance).toFixed(2)}
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                                    {currentBalance < 0 ? '(Advance)' : (currentBalance > 0 ? '(Payable)' : '')}
                                                </span>
                                            </td>

                                            <td style={{ ...tdStyle, color: projectedBalance > 0 ? 'var(--success)' : (projectedBalance < 0 ? 'var(--danger)' : 'var(--text-main)'), fontWeight: 'bold' }}>
                                                {Math.abs(projectedBalance).toFixed(2)}
                                                <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '6px' }}>
                                                    {projectedBalance < 0 ? '(Advance)' : (projectedBalance > 0 ? '(To Pay)' : '(Settled)')}
                                                </span>
                                            </td>

                                            <td style={tdStyle}>
                                                {emp.status === 'Generated' ? (
                                                    <span style={{ padding: '4px 8px', backgroundColor: 'var(--success-bg)', color: 'var(--primary-other)', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Generated</span>
                                                ) : (
                                                    <span style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', color: 'var(--text-muted)', borderRadius: '4px', fontSize: '12px', border: '1px solid #e2e8f0' }}>Pending</span>
                                                )}
                                            </td>

                                            <td style={tdStyle}>
                                                {/* Button left-aligned */}
                                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                    <button
                                                        style={actionStyles.iconBtnView}
                                                        onClick={() => setViewRecord({ ...emp, earnedSalary, deductions, fixedSalary, currentBalance, projectedBalance, absentCount, halfDayCount })}
                                                        title="View Details"
                                                    >
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                            <circle cx="12" cy="12" r="3"></circle>
                                                        </svg>                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* INDIVIDUAL VIEW MODAL */}
            {viewRecord && (
                <div className="modal-overlay" onClick={() => setViewRecord(null)}>
                    <div className="modal-container" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Calculation Details</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button
                                    onClick={handleSinglePrint}
                                    className='btn btn-primary'
                                    title="Print Single Slip"

                                >
                                    <FontAwesomeIcon icon={faPrint} />Print
                                </button>
                                <button className="modal-close" onClick={() => setViewRecord(null)}>×</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '15px' }}>
                                <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary)' }}>{viewRecord.employeeName}</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{selectedMonth} {selectedYear}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-main)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span>Fixed Salary</span>
                                    <span>PKR {viewRecord.fixedSalary.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span>Absents / Half-days</span>
                                    <span style={{ color: 'var(--danger)' }}>{viewRecord.absentCount || 0} A / {viewRecord.halfDayCount || 0} HD</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span>Attendance Deductions</span>
                                    <span style={{ color: 'var(--danger)' }}>- PKR {viewRecord.deductions.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', fontWeight: 'bold', color: 'var(--success)' }}>
                                    <span>Salary (This Month)</span>
                                    <span>PKR {viewRecord.earnedSalary.toFixed(2)}</span>
                                </div>

                                <div style={{ borderTop: '2px dashed var(--border-color)', margin: '5px 0' }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                                    <span>Old Balance {viewRecord.currentBalance < 0 ? '(Advance)' : ''}</span>
                                    <span>PKR {Math.abs(viewRecord.currentBalance).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', fontWeight: 'bold', fontSize: '16px', color: 'var(--primary)' }}>
                                    <span>Total Payable Now</span>
                                    <span>PKR {Math.abs(viewRecord.projectedBalance).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setViewRecord(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* GENERATED SALARY SUCCESS & PRINT MODAL */}
            {isResultModalOpen && (
                <div className="modal-overlay" onClick={() => setIsResultModalOpen(false)}>
                    <div className="modal-container" style={{ width: '800px', maxWidth: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)', padding: '16px 20px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Salary Generated Successfully</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-primary" onClick={handlePrintSlip}>
                                    <FontAwesomeIcon icon={faPrint} style={{ marginRight: '6px' }} /> Print
                                </button>
                                <button className="btn btn-secondary" onClick={() => setIsResultModalOpen(false)}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                        </div>

                        <div className="modal-body" style={{ padding: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
                            <div id="salary-print-area">
                                <p style={{ fontSize: '13px', color: '#555', marginBottom: '15px' }}>
                                    Salary has been successfully calculated and credited into the respective employee ledgers for <strong>{generatedBatch.month} {generatedBatch.year}</strong>.
                                </p>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--header)', color: '#fff' }}>
                                            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Sr#</th>
                                            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Employee Name</th>
                                            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Fixed Salary</th>
                                            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>Salary (This Month)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {generatedBatch.items.map((item, idx) => {
                                            const fixedSalary = parseFloat(item.netFixedSalary) || 0;
                                            const deductions = parseFloat(item.absentDeduction) || 0;
                                            const earnedSalary = parseFloat(item.finalCalculatedSalary) || fixedSalary - deductions || 0;

                                            return (
                                                <tr key={item.employeeId}>
                                                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>{idx + 1}</td>
                                                    <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: '500', textAlign: 'left' }}>{item.employeeName}</td>
                                                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>{fixedSalary.toFixed(2)}</td>
                                                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                                                        PKR {earnedSalary.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const thStyle = { padding: '12px 14px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', whiteSpace: 'nowrap' };

const checkboxStyle = {
    cursor: 'pointer',
    transform: 'scale(1.2)',
    accentColor: 'var(--primary)',
    backgroundColor: '#ffffff',
    colorScheme: 'light',
    WebkitAppearance: 'checkbox',
    border: '1px solid #d1d5db',
    margin: 0
};
const actionStyles = {
    iconBtnView: {
        backgroundColor: 'var(--view)',
        color: 'var(--success)',
        border: 'none',
        padding: '6px 10px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    }
};

export default GenerateSalary;