import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faExclamationCircle, faCheckCircle, faWallet } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const SalaryPayments = () => {
    const [payableEmployees, setPayableEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Payment Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        fetchPayableBalances();
    }, []);

    // Global Centered Toast Message
    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    // Smart Function: Fetch all employees and filter those who have balance > 0 (Payable)
    const fetchPayableBalances = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const empRes = await fetch(`${API_BASE_URL}/api/employees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const employees = await empRes.json();

            if (!Array.isArray(employees)) throw new Error("Failed to load employees");

            // Fetch ledger balance for each employee
            const balancePromises = employees.map(async (emp) => {
                const ledgerRes = await fetch(`${API_BASE_URL}/api/employee-ledger?employeeId=${emp._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const ledgerData = await ledgerRes.json();
                return { ...emp, payableBalance: ledgerData.closingBalance || 0 };
            });

            const allEmployeesWithBalances = await Promise.all(balancePromises);

            // Keep ONLY those who have a positive balance (Company owes them money)
            const dueList = allEmployeesWithBalances.filter(e => e.payableBalance > 0);

            // Sort by highest payable amount first
            dueList.sort((a, b) => b.payableBalance - a.payableBalance);

            setPayableEmployees(dueList);

        } catch (error) {
            console.error('Error:', error);
            showMessage('Error fetching payable balances', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openPayModal = (emp) => {
        setSelectedEmp(emp);
        setPaymentForm({
            amount: emp.payableBalance, // Auto-fill full payable amount
            date: new Date().toISOString().split('T')[0],
            notes: 'Salary Paid (Cash/Bank)'
        });
        setIsModalOpen(true);
    };

    const handleProcessPayment = async () => {
        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
            return showMessage('Please enter a valid amount.', 'error');
        }
        if (Number(paymentForm.amount) > selectedEmp.payableBalance) {
            return showMessage(`Amount cannot exceed the total payable of PKR ${selectedEmp.payableBalance}`, 'error');
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/employee-payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    employeeId: selectedEmp._id,
                    date: paymentForm.date,
                    type: 'Credit', // Credit means Deducting from account (Paying off)
                    amount: Number(paymentForm.amount),
                    notes: `[Payment] ${paymentForm.notes}`
                })
            });

            const data = await res.json();

            if (data.success) {
                showMessage(`Payment of PKR ${paymentForm.amount} processed for ${selectedEmp.name}!`, 'success');
                setIsModalOpen(false);
                // Refresh the list to remove or update this employee
                fetchPayableBalances();
            } else {
                showMessage(data.message || 'Failed to process payment.', 'error');
            }
        } catch (error) {
            showMessage('Server error while processing payment.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalCompanyDues = payableEmployees.reduce((sum, emp) => sum + emp.payableBalance, 0);

    return (
        <div className="dashboard-wrapper">

            {/* GLOBAL CENTERED TOAST MESSAGE */}
            {message.text && (
                <div style={{
                    position: 'fixed', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 2147483647,
                    padding: '16px 24px', borderRadius: '8px',
                    backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: message.type === 'error' ? '#b91c1c' : '#15803d',
                    border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s ease'
                }}>
                    <FontAwesomeIcon icon={message.type === 'error' ? faExclamationCircle : faCheckCircle} />
                    {message.text}
                </div>
            )}

            {/* HEADER & SUMMARY CARD */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', padding: '20px' }}>
                <div>
                    <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-main)' }}>Outstanding Salary Payments</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Employees whose generated salaries are pending to be paid.</p>
                </div>
                <div style={{ padding: '12px 20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Company Payables</span>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>
                        PKR {totalCompanyDues.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* PAYABLE EMPLOYEES TABLE */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '16px' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--header)' }}>
                                <th style={thStyle}>Sr#</th>
                                <th style={thStyle}>Employee Name</th>
                                <th style={thStyle}>Designation</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Total Payable (PKR)</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Action</th>
                            </tr>
                        </thead>
                       <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'left', color: 'var(--text-muted)' }}>Calculating pending balances...</td></tr>
                            ) : payableEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '50px', textAlign: 'left' }}>
                                        <div style={{ fontSize: '18px', color: 'var(--success)', fontWeight: 'bold' }}>All Clear! 🎉</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>There are no outstanding salaries to be paid right now.</div>
                                    </td>
                                </tr>
                            ) : (
                                payableEmployees.map((emp, idx) => (
                                    <tr key={emp._id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff' }}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{emp.name}</td>
                                        
                                        {/* SAFE DESIGNATION RENDERING */}
                                    {/* EXACT DESIGNATION RENDERING */}
                                        <td style={tdStyle}>
                                            {typeof emp.designation === 'object' && emp.designation !== null 
                                                ? (emp.designation.designation || 'N/A') 
                                                : (emp.designation || 'N/A')}
                                        </td>
                                        
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold', color: '#dc2626', fontSize: '15px' }}>
                                            {emp.payableBalance.toFixed(2)}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                                            <button 
                                                onClick={() => openPayModal(emp)}
                                                style={{ backgroundColor: 'var(--header)', color: 'white', border: 'none', padding: '8px 6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
                                            >
                                                <FontAwesomeIcon icon={faWallet} /> Pay 
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAYMENT PROCESSING MODAL */}
            {isModalOpen && selectedEmp && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container" style={{ width: '450px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 className="modal-title" style={{ color: '#0f172a' }}>Process Salary Payment</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 'bold' }}>PAYING TO:</div>
                                    <div style={{ fontSize: '15px', color: '#7f1d1d', fontWeight: 'bold' }}>{selectedEmp.name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 'bold' }}>TOTAL DUE:</div>
                                    <div style={{ fontSize: '18px', color: '#dc2626', fontWeight: 'bold' }}>PKR {selectedEmp.payableBalance.toFixed(2)}</div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Amount (PKR) *</label>
                                <input type="number" className="form-input" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>You can pay partial or full amount.</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Date *</label>
                                <input type="date" className="form-input" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Notes / Payment Method</label>
                                <textarea className="form-input" rows="2" value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="E.g., Transferred via Bank, Paid in Cash..."></textarea>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleProcessPayment} disabled={isSubmitting} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                                {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const thStyle = { padding: '14px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', textAlign: 'left', color: 'var(--text-main)' };

export default SalaryPayments;