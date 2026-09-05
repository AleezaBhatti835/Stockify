import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { usePrintSettings } from '../../context/PrintSettingsContext';

const API_BASE_URL = 'http://localhost:5000';

const getPaperConfig = (paperSize) => {
    switch (paperSize) {
        case 'Thermal58':
            return {
                maxWidth: '320px', bodyPadding: '14px', fontSize: '12px',
                mono: true, narrow: true, printCss: `@page { size: 58mm auto; margin: 4mm; }`
            };
        case 'A5':
            return {
                maxWidth: '460px', bodyPadding: '20px', fontSize: '13px',
                mono: false, narrow: false, printCss: `@page { size: A5; margin: 12mm; }`
            };
        case 'A4':
        default:
            return {
                maxWidth: '800px', bodyPadding: '24px', fontSize: '14px',
                mono: false, narrow: false, printCss: `@page { size: A4; margin: 20mm; }`
            };
    }
};

const EmployeeLoanRecovery = () => {
    const [recoveries, setRecoveries] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter States
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewRecovery, setViewRecovery] = useState(null);
    const [employeeLedger, setEmployeeLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // Smart Dropdown States
    const [employeesWithLoans, setEmployeesWithLoans] = useState([]);
    const [isLoadingLoans, setIsLoadingLoans] = useState(false);
    const [selectedEmployeeBalance, setSelectedEmployeeBalance] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const { settings: printSettings } = usePrintSettings();

    const [newRecovery, setNewRecovery] = useState({
        employeeId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: ''
    });

    useEffect(() => {
        fetchRecoveries();
        fetchEmployees();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000); // 5 seconds timer
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const fetchRecoveries = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-loan-recoveries`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setRecoveries(data.data);
        } catch (error) {
            showMessage('Error fetching recovery records', 'error');
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

    const handleOpenAddModal = async () => {
        setIsAddModalOpen(true);
        setIsLoadingLoans(true);
        setNewRecovery({ employeeId: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
        setSelectedEmployeeBalance(null);

        try {
            const balancePromises = employees.map(async (emp) => {
                const res = await fetch(`${API_BASE_URL}/api/employee-ledger?employeeId=${emp._id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                return { ...emp, balance: data.closingBalance || 0 };
            });

            const employeesWithBalances = await Promise.all(balancePromises);
            const debtors = employeesWithBalances.filter(emp => emp.balance < 0);
            setEmployeesWithLoans(debtors);
        } catch (error) {
            showMessage("Failed to load employee balances.", "error");
        } finally {
            setIsLoadingLoans(false);
        }
    };

    const handleEmployeeChange = (e) => {
        const empId = e.target.value;
        setNewRecovery({ ...newRecovery, employeeId: empId });
        const selectedEmp = employeesWithLoans.find(emp => emp._id === empId);
        if (selectedEmp) {
            setSelectedEmployeeBalance(selectedEmp.balance);
        } else {
            setSelectedEmployeeBalance(null);
        }
    };
const handleSaveRecovery = async () => {
    if (!newRecovery.employeeId) return showMessage('Please select an employee', 'error');
    if (!newRecovery.amount || Number(newRecovery.amount) <= 0) return showMessage('Enter a valid amount', 'error');

    if (selectedEmployeeBalance !== null) {
        const outstanding = Math.abs(selectedEmployeeBalance);
        if (Number(newRecovery.amount) > outstanding) {
            return showMessage(`Amount cannot exceed the outstanding loan of PKR ${outstanding.toFixed(2)}`, 'error');
        }
    }

    setIsSubmitting(true);
    try {
        const res = await fetch('http://localhost:5000/api/employee-loan-recoveries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                employeeId: newRecovery.employeeId,
                amount: newRecovery.amount,
                recoveryDate: newRecovery.date,
                notes: newRecovery.notes
            })
        });
        const data = await res.json();

        if (res.ok) {
            showMessage('Loan recovery recorded successfully!', 'success');
            setIsAddModalOpen(false);
            fetchRecoveries();
        } else {
            showMessage(data.message || 'Failed to record recovery', 'error');
        }
    } catch (error) {
        showMessage('Server error', 'error');
    } finally {
        setIsSubmitting(false);
    }
};

    const openViewModal = async (recovery) => {
        setViewRecovery(recovery);
        setIsViewModalOpen(true);
        setLedgerLoading(true);
        setEmployeeLedger([]);

        try {
            const res = await fetch(`${API_BASE_URL}/api/employee-ledger?employeeId=${recovery.employee._id}`, {
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
        setViewRecovery(null);
        setIsViewModalOpen(false);
        setEmployeeLedger([]);
    };

    const clearFilters = () => {
        setFilterEmployee(''); setFilterFromDate(''); setFilterToDate('');
    };

    const hasActiveFilters = filterEmployee || filterFromDate || filterToDate;

    const filteredRecoveries = recoveries.filter(rec => {
        let match = true;
        if (filterEmployee && rec.employee?._id !== filterEmployee) match = false;

        if (filterFromDate && new Date(rec.date) < new Date(filterFromDate)) match = false;
        if (filterToDate) {
            const toDate = new Date(filterToDate);
            toDate.setHours(23, 59, 59, 999);
            if (new Date(rec.date) > toDate) match = false;
        }
        return match;
    });

    const handlePrint = () => {
        const paperConfig = getPaperConfig(printSettings?.paperSize);
        const contentEl = document.getElementById('receipt-content');
        if (!contentEl || !viewRecovery) return;

        let pageSizeCss;
        if (paperConfig.mono) {
            pageSizeCss = `@page { size: 58mm 100mm; margin: 4mm; }`;
        } else if ((printSettings?.paperSize || 'A4') === 'A5') {
            pageSizeCss = `@page { size: 148mm 210mm; margin: 12mm; }`;
        } else {
            pageSizeCss = `@page { size: 210mm 297mm; margin: 20mm; }`;
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed'; iframe.style.top = '-10000px'; iframe.style.left = '-10000px';
        iframe.style.width = paperConfig.mono ? '58mm' : '210mm'; iframe.style.border = 'none';
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
                            font-size: ${paperConfig.fontSize}; color: #000;
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
    const currentRecoveryAmount = viewRecovery ? parseFloat(viewRecovery.debit || 0) : 0;
    const previousAdded = Math.max(0, totalAdded - currentRecoveryAmount);
    const netBalance = totalAdded - totalDeducted;

    return (
        <div className="dashboard-wrapper">

            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
                    <label className="form-label">Employee</label>
                    <select className="form-input" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                        <option value="">All Employees</option>
                        {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Date From</label>
                    <input type="date" className="form-input" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Date To</label>
                    <input type="date" className="form-input" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-secondary" onClick={clearFilters} style={{ height: '36px' }}>Clear Filters</button>
                    <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)', height: '36px' }}>
                        Receive Payment
                    </button>
                </div>
            </div>

            {/* MAIN TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={thStyle}>Sr#</th><th style={thStyle}>Date</th><th style={thStyle}>Receipt No.</th>
                                <th style={thStyle}>Employee Name</th><th style={{ ...thStyle, textAlign: 'left' }}>Amount Recovered</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}> View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>Loading records...</td></tr>
                            ) : filteredRecoveries.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '40px', fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {hasActiveFilters ? 'No recoveries match your filters.' : 'No loan recoveries recorded yet.'}
                                </td></tr>
                            ) : (
                                filteredRecoveries.map((rec, idx) => (
                                    <tr key={rec._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={tdStyle}>{new Date(rec.date).toLocaleDateString('en-GB')}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--success)' }}>{rec.invoiceNumber}</td>
                                        <td style={{ ...tdStyle, fontWeight: '500' }}>{rec.employee?.name || 'N/A'}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold', color: 'var(--success)' }}>
                                            PKR {parseFloat(rec.debit).toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button style={{ backgroundColor: 'var(--view)', color: 'var(--viewtext)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => openViewModal(rec)}>
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

            {/* ADD RECOVERY MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-container" style={{ width: '450px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Receive Loan Repayment</h3>
                            <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {isLoadingLoans ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--info)', fontWeight: 'bold' }}>Checking pending loans...</div>
                            ) : employeesWithLoans.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                    No employee has an outstanding loan right now.
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label className="form-label required">Select Employee </label>
                                        <select className="form-input" value={newRecovery.employeeId} onChange={handleEmployeeChange}>
                                            <option value="">-- Choose Employee --</option>
                                            {employeesWithLoans.map(emp => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.name} (Owes: PKR {Math.abs(emp.balance).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                        {selectedEmployeeBalance !== null && (
                                            <div style={{ marginTop: '10px', padding: '3px 12px', backgroundColor: '#fef2f2', borderRadius: '4px', fontSize: '13px', border: '1px solid #fecaca', color: 'var(--danger)' }}>
                                                <strong>Outstanding Loan: </strong>PKR {parseFloat(Math.abs(selectedEmployeeBalance)).toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Amount Received (PKR) </label>
                                        <input type="number" className="form-input" value={newRecovery.amount} onChange={e => setNewRecovery({ ...newRecovery, amount: e.target.value })} placeholder="0.00" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Date </label>
                                        <input type="date" className="form-input" value={newRecovery.date} onChange={e => setNewRecovery({ ...newRecovery, date: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Notes / Remarks</label>
                                        <textarea className="form-input" value={newRecovery.notes} onChange={e => setNewRecovery({ ...newRecovery, notes: e.target.value })} placeholder="E.g., Cash received directly..." rows="3"></textarea>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                            {employeesWithLoans.length > 0 && !isLoadingLoans && (
                                <button className="btn btn-primary" onClick={handleSaveRecovery} disabled={isSubmitting} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                                    {isSubmitting ? 'Saving...' : 'Save Receipt'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICE VIEW MODAL */}
            {isViewModalOpen && viewRecovery && (
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
                                <h4 style={{ margin: '4px 0', fontSize: '16px' }}>LOAN RECOVERY RECEIPT</h4>
                                <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Receipt #: <strong>{viewRecovery.invoiceNumber || 'N/A'}</strong></p>
                                <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Date: <strong>{formatDate(viewRecovery.date)}</strong></p>
                                <p style={{ textAlign: 'left', margin: '4px 0', color: '#333' }}>Employee: <strong>{viewRecovery.employee?.name || 'Unknown'}</strong></p>
                                <p style={{ margin: '4px 0', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>[ PAYMENT RECEIVED ]</p>
                            </div>
                            <div style={{ borderTop: '2px dashed #000', margin: '14px 0' }}></div>

                            {getPaperConfig(printSettings?.paperSize).mono ? (
                                <div>
                                    <div style={{ borderBottom: '1px dashed #000', padding: '6px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#000' }}><span>Loan Repayment</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#000', marginTop: '4px' }}>
                                            <span>{viewRecovery.notes || '—'}</span><span style={{ fontWeight: 700 }}>{parseFloat(viewRecovery.debit || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '12px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '30%' }}>Description</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '30%' }}>Additional Notes</th>
                                            <th style={{ textAlign: 'right', padding: '6px 8px', backgroundColor: 'var(--header)', fontSize: '12px', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', width: '20%' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 500 }}>Loan Repayment / Recovery</td>
                                            <td style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000' }}>{viewRecovery.notes || '—'}</td>
                                            <td style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc', fontSize: '13px', color: '#000', fontWeight: 600, textAlign: 'right' }}>PKR {parseFloat(viewRecovery.debit || 0).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}

                            <div style={{ marginTop: '20px', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                <h5 style={{ margin: '0 0 10px 0', color: '#333', textAlign: 'center', textDecoration: 'underline' }}>ACCOUNT SUMMARY</h5>
                                {ledgerLoading ? (
                                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>Fetching account details...</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#000' }}>
                                            <span>Previous Salary & Recoveries (+)</span><span>Rs. {previousAdded.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#000', fontWeight: 'bold' }}>
                                            <span>Current Repayment Added (+)</span><span>Rs. {currentRecoveryAmount.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#000' }}>
                                            <span>Total Loans / Deducted (-)</span><span>Rs. {totalDeducted.toFixed(2)}</span>
                                        </div>
                                        <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.15em', color: '#000', fontWeight: 700 }}>
                                            <span>Net Balance</span>
                                            <span>Rs. {Math.abs(netBalance).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '6px' }}>{netBalance === 0 ? '(Settled)' : (netBalance < 0 ? '(Advance)' : '(Payable)')}</span></span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ borderTop: '2px dashed #000', margin: '16px 0' }}></div>
                            <div style={{ textAlign: 'center', color: '#555', fontSize: '13px' }}><p>System Generated Receipt</p></div>
                        </div>
                    </div>
                </div>
            )}

            {message.text && (
                <div style={{
                    position: 'fixed',
                    top: '30px',          
                    left: '50%',          
                    transform: 'translateX(-50%)', 
                    zIndex: 2147483647,
                    padding: '16px 24px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: message.type === 'error' ? '#b91c1c' : '#15803d',
                    border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease'
                }}>
                    <FontAwesomeIcon icon={message.type === 'error' ? faExclamationCircle : faCheckCircle} />
                    {message.text}
                </div>
            )}

        </div>
    );
};

const thStyle = { padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' };
const tdStyle = { padding: '10px 16px', fontSize: '13px', textAlign: 'left', color: 'var(--text-main)' };

export default EmployeeLoanRecovery;