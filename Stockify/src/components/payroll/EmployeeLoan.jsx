import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faPlus, faEye, faFilter } from '@fortawesome/free-solid-svg-icons';

// Ensure this path matches your project structure
import { usePrintSettings } from '../../context/PrintSettingsContext';

const API_BASE_URL = 'http://localhost:5000';

const getPaperConfig = (paperSize) => {
    switch (paperSize) {
        case 'Thermal58':
            return {
                maxWidth: '320px',
                bodyPadding: '14px',
                fontSize: '12px',
                mono: true,
                narrow: true,
                printCss: `@page { size: 58mm auto; margin: 4mm; }`
            };
        case 'A5':
            return {
                maxWidth: '460px',
                bodyPadding: '20px',
                fontSize: '13px',
                mono: false,
                narrow: false,
                printCss: `@page { size: A5; margin: 12mm; }`
            };
        case 'A4':
        default:
            return {
                maxWidth: '800px',
                bodyPadding: '24px',
                fontSize: '14px',
                mono: false,
                narrow: false,
                printCss: `@page { size: A4; margin: 20mm; }`
            };
    }
};

const EmployeeLoan = () => {
    const [loans, setLoans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewLoan, setViewLoan] = useState(null);
    const [employeeLedger, setEmployeeLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // Balance State for Add Modal
    const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState(null);
    const [isFetchingBalance, setIsFetchingBalance] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const { settings: printSettings } = usePrintSettings();

    const [newLoan, setNewLoan] = useState({
        employeeId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        fetchLoans();
        fetchEmployees();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-loans`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setLoans(data.data);
        } catch (error) {
            showMessage('Error fetching loans', 'error');
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

    const handleEmployeeChange = async (e) => {
        const empId = e.target.value;
        setNewLoan({ ...newLoan, employeeId: empId });
        setSelectedEmployeeBalance(null);

        if (!empId) return;

        setIsFetchingBalance(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-ledger?employeeId=${empId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedEmployeeBalance(data.closingBalance || 0);
            }
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
        } finally {
            setIsFetchingBalance(false);
        }
    };

    const handleSaveLoan = async () => {
        if (!newLoan.employeeId) return showMessage('Please select an employee', 'error');
        if (!newLoan.amount || Number(newLoan.amount) <= 0) return showMessage('Enter a valid amount', 'error');

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-loans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(newLoan)
            });
            const data = await res.json();

            if (res.ok) {
                showMessage('Loan issued successfully!', 'success');
                setIsAddModalOpen(false);
                setNewLoan({ employeeId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
                setSelectedEmployeeBalance(null);
                fetchLoans();
            } else {
                showMessage(data.message || 'Failed to issue loan', 'error');
            }
        } catch (error) {
            showMessage('Server error', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openViewModal = async (loan) => {
        setViewLoan(loan);
        setIsViewModalOpen(true);
        setLedgerLoading(true);
        setEmployeeLedger([]);

        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-ledger?employeeId=${loan.employee._id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setEmployeeLedger(data.rows || []);
            }
        } catch (error) {
            console.error("Error fetching ledger:", error);
        } finally {
            setLedgerLoading(false);
        }
    };

    const closeViewModal = () => {
        setViewLoan(null);
        setIsViewModalOpen(false);
        setEmployeeLedger([]);
    };

    const clearFilters = () => {
        setFilterEmployee('');
        setFilterFromDate('');
        setFilterToDate('');
    };

    const hasActiveFilters = filterEmployee || filterFromDate || filterToDate;

    const filteredLoans = loans.filter(loan => {
        let match = true;
        if (filterEmployee && loan.employee?._id !== filterEmployee) match = false;

        if (filterFromDate) {
            if (new Date(loan.date) < new Date(filterFromDate)) match = false;
        }
        if (filterToDate) {
            const toDate = new Date(filterToDate);
            toDate.setHours(23, 59, 59, 999);
            if (new Date(loan.date) > toDate) match = false;
        }
        return match;
    });

    const handlePrint = () => {
        const paperConfig = getPaperConfig(printSettings?.paperSize);
        const contentEl = document.getElementById('receipt-content');
        if (!contentEl || !viewLoan) return;

        let pageSizeCss;
        if (paperConfig.mono) {
            const THERMAL_BASE_MM = 100; // Increased base height to fit summary
            pageSizeCss = `@page { size: 58mm ${THERMAL_BASE_MM}mm; margin: 4mm; }`;
        } else if ((printSettings?.paperSize || 'A4') === 'A5') {
            pageSizeCss = `@page { size: 148mm 210mm; margin: 12mm; }`;
        } else {
            pageSizeCss = `@page { size: 210mm 297mm; margin: 20mm; }`;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = paperConfig.mono ? '58mm' : '210mm';
        iframe.style.height = '10px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <style>
                        * { box-sizing: border-box; }
                        ${pageSizeCss}
                        html, body { margin: 0; padding: 0; }
                        body {
                            padding: ${paperConfig.bodyPadding};
                            font-family: ${paperConfig.mono ? "'Courier New', monospace" : 'Arial, sans-serif'};
                            font-size: ${paperConfig.fontSize};
                            color: #000;
                            ${paperConfig.mono ? 'width: 58mm;' : ''}
                        }
                    </style>
                </head>
                <body>${contentEl.innerHTML}</body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 500);
        }, 300);
    };

    const totalAdded = employeeLedger.reduce((sum, row) => sum + (row.debit || 0), 0);
    const totalDeducted = employeeLedger.reduce((sum, row) => sum + (row.credit || 0), 0);
    const currentLoanAmount = viewLoan ? parseFloat(viewLoan.amount) : 0;
    const previousDeducted = Math.max(0, totalDeducted - currentLoanAmount); 
    const netBalance = totalAdded - totalDeducted;

    return (
        <div className="dashboard-wrapper">
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                    <label className="form-label required">Employee</label>
                    <select className="form-input" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                        <option value="">All Employees</option>
                        {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <label className="form-label required">Date From</label>
                    <input type="date" className="form-input" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <label className="form-label required">Date To</label>
                    <input type="date" className="form-input" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" onClick={clearFilters} style={{ height: '36px' }}>
                        Clear Filters
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ height: '36px' }}>
                        Issue New Loan
                    </button>
                </div>
            </div>

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
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Loan No.</th>
                                <th style={thStyle}>Employee Name</th>
                                <th style={thStyle}>Amount</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '40px',fontSize:'14px', textAlign: 'center' }}>Loading...</td></tr>
                            ) : filteredLoans.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '40px', fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {hasActiveFilters ? 'No loans match your filters.' : 'No loans issued yet.'}
                                </td></tr>
                            ) : (
                                filteredLoans.map((loan, idx) => (
                                    <tr key={loan._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={tdStyle}>{new Date(loan.date).toLocaleDateString('en-GB')}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--primary)' }}>{loan.loanNumber}</td>
                                        <td style={{ ...tdStyle, fontWeight: '500' }}>{loan.employee?.name || 'N/A'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--danger)' }}>{parseFloat(loan.amount).toFixed(2)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button  style={{ backgroundColor: 'var(--view)', color: 'var(--success)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => openViewModal(loan)} title="View Receipt">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
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
            </div>

            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ width: '450px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Issue Employee Loan</h3>
                            <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label required">Employee </label>
                                <select className="form-input" value={newLoan.employeeId} onChange={handleEmployeeChange}>
                                    <option value="">Select Employee</option>
                                    {employees.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.name}</option>
                                    ))}
                                </select>
                                {isFetchingBalance && <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--info)' }}>Calculating Balance...</div>}
                                {selectedEmployeeBalance !== null && !isFetchingBalance && (
                                    <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                                        <strong>Current Balance: </strong>
                                        <span style={{ color: selectedEmployeeBalance < 0 ? 'var(--danger)' : (selectedEmployeeBalance > 0 ? 'var(--success)' : 'var(--text-main)') }}>
                                            PKR {parseFloat(Math.abs(selectedEmployeeBalance)).toFixed(2)}
                                            {selectedEmployeeBalance < 0 ? ' (Advance given)' : (selectedEmployeeBalance > 0 ? ' (Payable to Employee)' : ' (Settled)')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Loan Amount </label>
                                <input type="number" className="form-input" value={newLoan.amount} onChange={e => setNewLoan({ ...newLoan, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Issue Date </label>
                                <input type="date" className="form-input" value={newLoan.date} onChange={e => setNewLoan({ ...newLoan, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes / Remarks</label>
                                <textarea className="form-input" value={newLoan.notes} onChange={e => setNewLoan({ ...newLoan, notes: e.target.value })} placeholder="Reason for loan..." rows="1"></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveLoan} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Issue Loan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isViewModalOpen && viewLoan && (
                <div className="modal-overlay" onClick={closeViewModal}>
                    <div className="modal-container" style={{ width: '70%', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                        
                        <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Stockify</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
                                <button className="btn btn-secondary" onClick={closeViewModal}>✕ Close</button>
                            </div>
                        </div>

                        <div className="modal-body" id="receipt-content" style={{ padding: getPaperConfig(printSettings?.paperSize).bodyPadding, fontSize: getPaperConfig(printSettings?.paperSize).fontSize, fontFamily: getPaperConfig(printSettings?.paperSize).mono ? "'Courier New', monospace" : 'inherit', overflowY: 'auto' }}>
                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: '4px 0', fontSize:'16px' }}>EMPLOYEE LOAN RECEIPT</h4>
                                <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Receipt #: <strong>{viewLoan.loanNumber || 'N/A'}</strong></p>
                                <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Date: <strong>{formatDate(viewLoan.date)}</strong></p>
                                <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Employee: <strong>{viewLoan.employee?.name || 'Unknown'}</strong></p>
                                <p style={{ margin: '4px 0', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>[ ISSUED ]</p>
                            </div>
                            
                            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

                            {getPaperConfig(printSettings?.paperSize).mono ? (
                                <div>
                                    <div style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000' }}>
                                            <span>Loan / Advance</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '4px' }}>
                                            <span>{viewLoan.notes || '—'}</span>
                                            <span style={{ fontWeight: 700 }}>{parseFloat(viewLoan.amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '50%' }}>Description</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '30%' }}>Notes</th>
                                            <th style={{ textAlign: 'right', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '20%' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px',textAlign:'left', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 500 }}>Employee Loan / Advance</td>
                                            <td style={{ padding: '8px',textAlign:'left', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' }}>{viewLoan.notes || '—'}</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 600, textAlign: 'right' }}>PKR {parseFloat(viewLoan.amount).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}

                            <div style={{ marginTop: '20px', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                <h5 style={{ margin: '0 0 10px 0', color: '#333', textAlign: 'center' }}>ACCOUNT SUMMARY</h5>
                                
                                {ledgerLoading ? (
                                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>Fetching account details...</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#000' }}>
                                            <span>Total Salary / Added (+)</span>
                                            <span>Rs. {totalAdded.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#000' }}>
                                            <span>Previous Loans / Deducted (-)</span>
                                            <span>Rs. {previousDeducted.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#000', fontWeight: 'bold' }}>
                                            <span>Current Loan Issued (-)</span>
                                            <span>Rs. {currentLoanAmount.toFixed(2)}</span>
                                        </div>
                                        
                                        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.15em', color: '#000', fontWeight: 700 }}>
                                            <span>Net Balance</span>
                                            <span>
                                                Rs. {Math.abs(netBalance).toFixed(2)} 
                                                <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '6px' }}>
                                                    {netBalance === 0 ? '(Settled)' : (netBalance < 0 ? '(Advance)' : '(Payable)')}
                                                </span>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div style={{ borderTop: '2px dashed #000', margin: '16px 0' }}></div>
                            <div style={{ textAlign: 'center', color: '#555', fontSize: '13px' }}>
                                <p>System Generated Receipt</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const thStyle = { padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' };
const tdStyle = { padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' };
const actionStyles = {
    iconBtnView: {
        backgroundColor: 'var(--success-bg)',
        color: 'var(--success)',
        border: 'none',
        padding: '6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    }
}
export default EmployeeLoan;