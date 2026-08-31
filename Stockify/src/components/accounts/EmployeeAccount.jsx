import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function EmployeeAccount() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const [rows, setRows] = useState([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [globalOutstandingLoan, setGlobalOutstandingLoan] = useState(0);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    employeeId: '', date: todayStr(),
    category: '', amount: '', notes: ''
  });
  const [entryLoading, setEntryLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchLedger();
    } else {
      setRows([]);
      setClosingBalance(0);
      setGlobalOutstandingLoan(0);
    }
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId, fromDate, toDate]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchLedger = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/employee-ledger?employeeId=${selectedEmployeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        let allRows = data.rows || [];
        
        allRows.sort((a, b) => {
          const dateA = new Date(a.date).setHours(0, 0, 0, 0);
          const dateB = new Date(b.date).setHours(0, 0, 0, 0);
          if (dateA !== dateB) return dateA - dateB;

          const isSalaryA = a.transactionType === 'Salary' || (a.invoiceNumber && a.invoiceNumber.startsWith('SAL'));
          const isSalaryB = b.transactionType === 'Salary' || (b.invoiceNumber && b.invoiceNumber.startsWith('SAL'));
          if (isSalaryA && !isSalaryB) return -1;
          if (!isSalaryA && isSalaryB) return 1;

          if (a._id && b._id) return a._id.localeCompare(b._id);
          return 0;
        });
        
        let runningBal = 0;

        allRows = allRows.map((row) => {
          const rowDebit = Number(row.debit) || 0;
          const rowCredit = Number(row.credit) || 0;
          const prevBal = runningBal;
          
          runningBal = runningBal + rowDebit - rowCredit;

          let desc = row.transactionType || 'Transaction';
          const rawNotes = (row.notes || '').toLowerCase();
          
          let loanTaken = 0;
          let loanReturned = 0;

          if (rawNotes.includes('loan recovery') || rawNotes.includes('return')) {
            desc = 'Loan Return';
            loanReturned = rowDebit; // Sirf manual cash return aaye gi yahan
          } else if (rawNotes.includes('loan') || rawNotes.includes('ln-')) {
            desc = 'Loan Issued';
            loanTaken = rowCredit;
          } else if (rawNotes.includes('advance')) {
            desc = 'Advance Given';
            loanTaken = rowCredit;
          } else if (row.transactionType === 'Salary') {
            desc = 'Salary Generated';
          } else if (row.transactionType === 'Payment') {
            desc = 'Salary Paid';
          }

          let penalty = 0;
          let attStats = row.attendanceStats || { absent: 0, leave: 0, halfDay: 0 }; 

          if (row.transactionType === 'Salary' && row.notes) {
            const match = row.notes.match(/Deducted Rs\.\s*(\d+)/i);
            if (match) penalty = Number(match[1]);
          }

          // Ledger mein Remaining Loan hamesha net negative balance hota hai
          const remainingLoan = runningBal < 0 ? Math.abs(runningBal) : 0;
          
          return {
            ...row,
            cleanDescription: desc,
            attendanceStats: attStats,
            absencePenalty: penalty,
            loanTaken: loanTaken,
            loanReturned: loanReturned,
            remainingLoan: remainingLoan,
            previousBalance: prevBal,
            net: runningBal,
            balance: runningBal
          };
        });
        
        setClosingBalance(runningBal);
        setGlobalOutstandingLoan(allRows.length > 0 ? allRows[allRows.length - 1].remainingLoan : 0);

        const fDate = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
        const tDate = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
        
        const filtered = allRows.filter(r => {
            const rDate = new Date(r.date).getTime();
            if (fDate && rDate < fDate) return false;
            if (tDate && rDate > tDate) return false;
            return true;
        });

        filtered.forEach((r, idx) => r.srNo = idx + 1);
        setRows(filtered);

      } else {
        setRows([]);
        setClosingBalance(0);
        setGlobalOutstandingLoan(0);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setRows([]);
      setClosingBalance(0);
      setGlobalOutstandingLoan(0);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  let totalSalaryEarned = 0;
  let totalLoanRecovered = 0;
  let totalAdvanceGiven = 0;
  let totalSalaryPaid = 0;

  rows.forEach(r => {
      totalAdvanceGiven += r.loanTaken;
      totalLoanRecovered += r.loanReturned; 
      
      if (r.cleanDescription === 'Salary Generated') {
          totalSalaryEarned += (Number(r.debit) || 0);
      } else if (r.cleanDescription === 'Salary Paid') {
          totalSalaryPaid += (Number(r.credit) || 0);
      }
  });

  const handleSaveEntry = async () => {
    if (!entryForm.employeeId) return showMessage('Please select an employee.', 'error');
    if (!entryForm.date) return showMessage('Please select a date.', 'error');
    if (!entryForm.category) return showMessage('Please select a Transaction Category.', 'error');
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      return showMessage('Amount must be greater than zero.', 'error');
    }

    if (entryForm.category === 'Loan Return') {
      if (globalOutstandingLoan <= 0) {
         return showMessage('This employee has no outstanding loan/advance.', 'error');
      }
      if (Number(entryForm.amount) > globalOutstandingLoan) {
         return showMessage(`You can only return up to PKR ${globalOutstandingLoan.toFixed(2)}.`, 'error');
      }
    }

    setEntryLoading(true);

    let backendType = 'Credit'; 
    let customTransactionType = entryForm.category; 
    
    if (entryForm.category === 'Salary' || entryForm.category === 'Loan Return') {
        backendType = 'Debit'; 
    }

    const finalNotes = entryForm.notes ? `[${entryForm.category}] ${entryForm.notes}` : `[${entryForm.category}]`;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/employee-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeId: entryForm.employeeId,
          date: entryForm.date,
          type: backendType, 
          transactionType: customTransactionType,
          amount: Number(entryForm.amount),
          notes: finalNotes
        })
      });
      const data = await res.json();

      if (data.success) {
        showMessage('Entry recorded successfully!', 'success');
        setIsEntryModalOpen(false);
        setEntryForm({ employeeId: '', date: todayStr(), category: '', amount: '', notes: '' });
        fetchLedger();
      } else {
        showMessage(data.message || 'Failed to record entry.', 'error');
      }
    } catch (err) {
      showMessage('Server error while saving entry.', 'error');
    } finally {
      setEntryLoading(false);
    }
  };

  const getEmployeeName = (e) => e?.name || 'Employee';

  const formatBalanceText = (amount) => {
    const safeAmt = Number(amount) || 0;
    if (safeAmt > 0) return `Rs. ${safeAmt.toLocaleString()} (Payable)`;
    if (safeAmt < 0) return `Rs. ${Math.abs(safeAmt).toLocaleString()} (Advance)`;
    return `Settled: Rs. 0.00`;
  };

  const handlePrint = () => {
    window.print();
  };

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = rows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(rows.length / rowsPerPage);

  return (
    <div className="dashboard-wrapper">
      
      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">Employee</label>
          <select className="form-input" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
            <option value="">Select an Employee</option>
            {employees.map(e => (
              <option key={e._id} value={e._id}>{getEmployeeName(e)}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print Ledger</button>
          <button className="btn btn-primary" onClick={() => setIsEntryModalOpen(true)}>+ Add New Entry</button>
        </div>
      </div>

      {/* SUMMARY BOX */}
      {selectedEmployeeId && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Salary</span>
                <span style={{...summaryValueStyle, color: 'var(--success)'}}>+ {(totalSalaryEarned || 0).toLocaleString()}</span>
            </div>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Advance/Loan Given</span>
                <span style={{...summaryValueStyle, color: 'var(--danger)'}}>- {(totalAdvanceGiven || 0).toLocaleString()}</span>
            </div>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Loan Returned</span>
                <span style={{...summaryValueStyle, color: 'var(--success)'}}>+ {(totalLoanRecovered || 0).toLocaleString()}</span>
            </div>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Salary Paid</span>
                <span style={{...summaryValueStyle, color: 'var(--danger)'}}>- {(totalSalaryPaid || 0).toLocaleString()}</span>
            </div>
            <div style={{...summaryCardStyle, backgroundColor: closingBalance < 0 ? '#fef2f2' : '#f0fdf4', border: closingBalance < 0 ? '1px solid #fecaca' : '1px solid #bbf7d0'}}>
                <span style={{...summaryTitleStyle, color: closingBalance < 0 ? '#b91c1c' : '#15803d'}}>Net Balance</span>
                <span style={{...summaryValueStyle, color: closingBalance < 0 ? '#b91c1c' : '#15803d', fontSize: '14px'}}>
                    {formatBalanceText(closingBalance)}
                </span>
            </div>
        </div>
      )}

      {/* CLEAN STRUCTURED LEDGER TABLE (No scroll, single line, left aligned) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Sr#</th>
              <th style={tableStyles.th}>Date</th>
              <th style={tableStyles.th}>Ref#</th>
              <th style={tableStyles.th}>Description</th>
              <th style={tableStyles.th}>Attendance</th>
              <th style={tableStyles.th}>Penalty</th>
              <th style={tableStyles.th}>Loan Taken</th>
              <th style={tableStyles.th}>Loan Return</th>
              <th style={tableStyles.th}>Remaining</th>
              <th style={tableStyles.th}>Net Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ ...tableStyles.td, padding: '40px',textAlign:'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : !selectedEmployeeId ? (
              <tr><td colSpan="10" style={{ ...tableStyles.td, padding: '40px',textAlign:'center', color: 'var(--text-muted)'}}>Please select an employee.</td></tr>
            ) : currentRows.length === 0 ? (
              <tr><td colSpan="10" style={{ ...tableStyles.td, padding: '40px',textAlign:'center', color: 'var(--text-muted)'}}>No transactions found.</td></tr>
            ) : (
              currentRows.map(row => (
                <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={tableStyles.td}>{row.srNo}</td>
                  <td style={tableStyles.td}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ ...tableStyles.td, fontWeight: '500' }}>{row.invoiceNumber || '-'}</td>
                  
                  <td style={{ ...tableStyles.td, fontWeight: 600 }}>{row.cleanDescription || '-'}</td>
                  
                  <td style={tableStyles.td}>
                    {row.transactionType === 'Salary' && row.attendanceStats ? (
                      <span>
                        <span style={{ color: '#ef4444' }} title="Absents">{row.attendanceStats.absent}A</span> /&nbsp;
                        <span style={{ color: '#3b82f6' }} title="Leaves">{row.attendanceStats.leave}L</span> /&nbsp;
                        <span style={{ color: '#f59e0b' }} title="Half Days">{row.attendanceStats.halfDay}Hd</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>-</span>
                    )}
                  </td>

                  <td style={{ ...tableStyles.td, color: (row.absencePenalty || 0) > 0 ? '#ef4444' : 'inherit' }}>
                    {(row.absencePenalty || 0) > 0 ? `- Rs. ${(row.absencePenalty || 0).toLocaleString()}` : '-'}
                  </td>

                  <td style={{ ...tableStyles.td, color: (row.loanTaken || 0) > 0 ? '#3b82f6' : 'inherit', fontWeight: (row.loanTaken || 0) > 0 ? '600' : 'normal' }}>
                    {(row.loanTaken || 0) > 0 ? `+ Rs. ${(row.loanTaken || 0).toLocaleString()}` : '-'}
                  </td>

                  <td style={{ ...tableStyles.td, color: (row.loanReturned || 0) > 0 ? '#10b981' : 'inherit', fontWeight: (row.loanReturned || 0) > 0 ? '600' : 'normal' }}>
                    {(row.loanReturned || 0) > 0 ? `- Rs. ${(row.loanReturned || 0).toLocaleString()}` : '-'}
                  </td>

                  <td style={{ ...tableStyles.td, fontWeight: 600, color: (row.remainingLoan || 0) > 0 ? '#ef4444' : 'var(--success)' }}>
                    Rs. {(row.remainingLoan || 0).toLocaleString()}
                  </td>
                  
                  <td style={tableStyles.td}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Rs. {Math.abs(row.net || 0).toLocaleString()}</span>
                      <span style={{ fontSize: '11px', marginLeft: '6px', fontWeight: '600', color: row.net < 0 ? 'var(--danger)' : (row.net > 0 ? 'var(--success)' : 'var(--text-muted)') }}>
                          {row.net < 0 ? '(Adv)' : (row.net > 0 ? '(Pay)' : 'Settled')}
                      </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {rows.length > rowsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>←</button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>→</button>
          </div>
        )}
      </div>

      {/* ADD ENTRY MODAL */}
      {isEntryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEntryModalOpen(false)}>
          <div className="modal-container" style={{ width: '650px', maxWidth: '95vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Record New Transaction</h2>
              <button className="modal-close" onClick={() => setIsEntryModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              {message.text && (
                <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', fontSize: '13px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
                  {message.text}
                </div>
              )}

              {entryForm.category === 'Loan Return' && entryForm.employeeId === selectedEmployeeId && (
                 <div style={{ marginBottom: '16px', padding: '10px 15px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: '600' }}>
                   ⚠️ Outstanding Advance / Loan: PKR {globalOutstandingLoan.toFixed(2)}
                 </div>
              )}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 45%' }}>
                  <label className="form-label">Employee *</label>
                  <select className="form-input" value={entryForm.employeeId} onChange={(e) => setEntryForm({ ...entryForm, employeeId: e.target.value })}>
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e._id} value={e._id}>{getEmployeeName(e)}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 45%' }}>
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 45%' }}>
                  <label className="form-label">Action / Category *</label>
                  <select className="form-input" value={entryForm.category} onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}>
                    <option value="">Select Action...</option>
                    <optgroup style={{fontSize:'12px'}} label="Add to Account (+)">
                        <option value="Salary">Earned Salary (Bonus/Allowance)</option>
                        <option value="Loan Return">Loan Return</option>
                    </optgroup>
                    <optgroup style={{fontSize:'12px'}} label="Deduct from Account (-)">
                        <option value="Advance">Give Advance</option>
                        <option value="Loan">Give Loan</option>
                        <option value="Payment">Pay Salary</option>
                    </optgroup>
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 45%' }}>
                  <label className="form-label">Amount (PKR) *</label>
                  <input type="number" min="0" className="form-input" placeholder="0.00" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Additional Notes</label>
                <textarea className="form-input" rows="2" placeholder="e.g. Eid Bonus, Bike Repair Advance..." value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsEntryModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEntry} disabled={entryLoading}>
                {entryLoading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 💡 THE FIX: Sab Left-Align hai aur single line (nowrap) mein fix ho gaya hai.
const tableStyles = {
  th: { padding: '12px 10px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: '600', fontSize: '12px', textAlign: 'left', letterSpacing: '0.2px', whiteSpace: 'nowrap' },
  td: { padding: '12px 10px', color: 'var(--text-main)', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap' }
};

const summaryCardStyle = { flex: '1', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const summaryTitleStyle = { fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' };
const summaryValueStyle = { fontSize: '16px', fontWeight: 'bold' };

export default EmployeeAccount;