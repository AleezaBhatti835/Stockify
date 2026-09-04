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

  const [viewMode, setViewMode] = useState('simple'); 

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
            loanReturned = rowDebit; 
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
          else if (row.transactionType === 'Commission (Sale)') {
            desc = 'Commission Earned';
          } else if (row.transactionType === 'Commission Payout') {
            desc = 'Commission Paid';
          }

          let penalty = 0;
          let attStats = row.attendanceStats || { absent: 0, leave: 0, halfDay: 0 }; 

          if (row.transactionType === 'Salary' && row.notes) {
            const match = row.notes.match(/Deducted Rs\.\s*(\d+)/i);
            if (match) penalty = Number(match[1]);
          }

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
    const absVal = Math.abs(safeAmt).toFixed(2);
    if (safeAmt > 0) return `Rs. ${absVal} (Dr) — Payable`;
    if (safeAmt < 0) return `Rs. ${absVal} (Cr) — Advance`;
    return `Settled: Rs. 0.00`;
  };

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);

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

      {/* TABLE SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-app)' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>Ledger Details</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: viewMode === 'simple' ? 'var(--primary)' : 'var(--text-muted)' }}>
              <input 
                type="radio" 
                checked={viewMode === 'simple'} 
                onChange={() => setViewMode('simple')} 
                style={{ appearance: 'none', WebkitAppearance: 'none', width: '12px', height: '12px', borderRadius: '50%', margin: 0, cursor: 'pointer', backgroundColor: viewMode === 'simple' ? 'var(--primary)' : '#fff', border: viewMode === 'simple' ? '2px solid #fff' : '1px solid #ccc', boxShadow: viewMode === 'simple' ? '0 0 0 1px var(--primary)' : 'none' }} 
              /> 
              Simple View
            </label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: viewMode === 'detailed' ? 'var(--primary)' : 'var(--text-muted)' }}>
              <input 
                type="radio" 
                checked={viewMode === 'detailed'} 
                onChange={() => setViewMode('detailed')} 
                style={{ appearance: 'none', WebkitAppearance: 'none', width: '12px', height: '12px', borderRadius: '50%', margin: 0, cursor: 'pointer', backgroundColor: viewMode === 'detailed' ? 'var(--primary)' : '#fff', border: viewMode === 'detailed' ? '2px solid #fff' : '1px solid #ccc', boxShadow: viewMode === 'detailed' ? '0 0 0 1px var(--primary)' : 'none' }} 
              /> 
              Detailed Breakdown
            </label>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: viewMode === 'detailed' ? '900px' : '600px' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Sr#</th>
                <th style={tableStyles.th}>Date</th>
                {viewMode === 'detailed' && <th style={tableStyles.th}>Ref#</th>}
                <th style={tableStyles.th}>Description</th>
                
                {viewMode === 'detailed' && (
                  <>
                    <th style={tableStyles.th}>Attendance</th>
                    <th style={tableStyles.th}>Penalty</th>
                    <th style={tableStyles.th}>Loan Taken</th>
                    <th style={tableStyles.th}>Loan Return</th>
                    <th style={tableStyles.th}>Remaining Loan</th>
                  </>
                )}

                {viewMode === 'simple' && (
                  <>
                    <th style={tableStyles.th}>Debit</th>
                    <th style={tableStyles.th}>Credit</th>
                  </>
                )}

                <th style={tableStyles.th}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={viewMode === 'detailed' ? 10 : 6} style={{ ...tableStyles.td, padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : !selectedEmployeeId ? (
                <tr><td colSpan={viewMode === 'detailed' ? 10 : 6} style={{ ...tableStyles.td, padding: '40px', textAlign: 'center', color: 'var(--text-muted)'}}>Please select an employee.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan={viewMode === 'detailed' ? 10 : 6} style={{ ...tableStyles.td, padding: '40px', textAlign: 'center', color: 'var(--text-muted)'}}>No transactions found.</td></tr>
              ) : (
                currentRows.map(row => {
                  const netVal = row.net || 0;
                  const netColor = netVal > 0 ? 'var(--success)' : (netVal < 0 ? 'var(--danger)' : 'var(--text-main)');
                  const netTag = netVal > 0 ? ' (Dr)' : (netVal < 0 ? ' (Cr)' : '');

                  return (
                    <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={tableStyles.td}>{row.srNo}</td>
                      <td style={tableStyles.td}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                      {viewMode === 'detailed' && <td style={{ ...tableStyles.td, fontWeight: '500' }}>{row.invoiceNumber || '-'}</td>}
                      
                      <td style={{ ...tableStyles.td, fontWeight: 600 }}>
                        {row.cleanDescription || '-'}
                      </td>
                      
                      {viewMode === 'detailed' && (
                        <>
                          <td style={tableStyles.td}>
                            {row.transactionType === 'Salary' && row.attendanceStats ? (
                              <span>
                                <span style={{ color: '#ef4444' }} title="Absents">{row.attendanceStats.absent}A</span> /&nbsp;
                                <span style={{ color: '#3b82f6' }} title="Leaves">{row.attendanceStats.leave}L</span> /&nbsp;
                                <span style={{ color: '#f59e0b' }} title="Half Days">{row.attendanceStats.halfDay}Hd</span>
                              </span>
                            ) : <span style={{ color: 'var(--text-light)' }}>-</span>}
                          </td>
                          <td style={{ ...tableStyles.td, color: (row.absencePenalty || 0) > 0 ? '#ef4444' : 'inherit' }}>
                            {(row.absencePenalty || 0) > 0 ? `- Rs. ${(row.absencePenalty || 0).toLocaleString()}` : '0'}
                          </td>
                          <td style={{ ...tableStyles.td, color: (row.loanTaken || 0) > 0 ? '#3b82f6' : 'inherit', fontWeight: (row.loanTaken || 0) > 0 ? '600' : 'normal' }}>
                            {(row.loanTaken || 0) > 0 ? `+ Rs. ${(row.loanTaken || 0).toLocaleString()}` : '0'}
                          </td>
                          <td style={{ ...tableStyles.td, color: (row.loanReturned || 0) > 0 ? '#10b981' : 'inherit', fontWeight: (row.loanReturned || 0) > 0 ? '600' : 'normal' }}>
                            {(row.loanReturned || 0) > 0 ? `- Rs. ${(row.loanReturned || 0).toLocaleString()}` : '0'}
                          </td>
                          <td style={{ ...tableStyles.td, fontWeight: 600, color: (row.remainingLoan || 0) > 0 ? '#ef4444' : 'var(--success)' }}>
                            Rs. {(row.remainingLoan || 0).toLocaleString()}
                          </td>
                        </>
                      )}

                      {viewMode === 'simple' && (
                        <>
                          <td style={{ ...tableStyles.td, color: 'var(--success)', fontWeight: '600' }}>
                            {(row.debit || 0) > 0 ? `+ Rs. ${row.debit.toLocaleString()}` : '0'}
                          </td>
                          <td style={{ ...tableStyles.td, color: 'var(--danger)', fontWeight: '600' }}>
                            {(row.credit || 0) > 0 ? `- Rs. ${row.credit.toLocaleString()}` : '0'}
                          </td>
                        </>
                      )}
                      
                      <td style={{ ...tableStyles.td, color: netColor, fontWeight: '700' }}>
                          <span style={{ fontSize: '13px' }}>Rs. {Math.abs(netVal).toLocaleString()}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600' }}>
                              {netTag}
                          </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan={viewMode === 'detailed' ? 3 : 1} style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Total</td>
                  <td style={{ padding: '12px 10px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}></td>
                  {viewMode === 'detailed' && (
                    <>
                      <td colSpan="5"></td>
                    </>
                  )}
                  {viewMode === 'simple' && (
                    
                    <>
                                          <td colSpan="1"></td>

                      <td style={{ padding: '12px 10px',textAlign:'left', fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{totalDebit.toFixed(2)}</td>
                      <td style={{ padding: '12px 10px', textAlign:'left', fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>{totalCredit.toFixed(2)}</td>
                    </>
                  )}
                  <td style={{ padding: '8px 1px', textAlign:'left', fontSize: '13px', fontWeight: '700', color: closingBalance > 0 ? 'var(--success)' : (closingBalance < 0 ? 'var(--danger)' : 'var(--text-main)') }}>
                    {formatBalanceText(closingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

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
                        <option value="Payment">Pay Salary</option>
                        <option value="Commission Payout">Pay Commission</option>
                        <option value="Advance">Give Advance</option>
                        <option value="Loan">Give Loan</option>
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

const tableStyles = {
  th: { padding: '12px 10px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: '600', fontSize: '12px', textAlign: 'left', letterSpacing: '0.2px', whiteSpace: 'nowrap' },
  td: { padding: '8px 10px', color: 'var(--text-main)', fontSize: '12px', textAlign: 'left', whiteSpace: 'nowrap' }
};

export default EmployeeAccount;