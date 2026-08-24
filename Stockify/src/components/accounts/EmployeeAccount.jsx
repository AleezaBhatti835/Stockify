import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function EmployeeAccount() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const [rows, setRows] = useState([]);
  const [closingBalance, setClosingBalance] = useState(0);
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

  // Fetch ledger data whenever filters change
  useEffect(() => {
    if (selectedEmployeeId) {
      fetchLedger();
    } else {
      setRows([]);
      setClosingBalance(0);
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
      const params = new URLSearchParams();
      params.append('employeeId', selectedEmployeeId);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/employee-ledger?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        let fetchedRows = data.rows || [];
        
 // Smart Sorting Logic
        fetchedRows.sort((a, b) => {
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
        fetchedRows = fetchedRows.map((row, index) => {
          const rowDebit = Number(row.debit) || 0;
          const rowCredit = Number(row.credit) || 0;
          const prevBal = runningBal;
          
          runningBal = runningBal + rowDebit - rowCredit;
          
          return {
            ...row,
            srNo: index + 1,
            previousBalance: prevBal,
            net: runningBal,
            balance: runningBal
          };
        });
        
        setRows(fetchedRows);
        setClosingBalance(runningBal);
      } else {
        setRows([]);
        setClosingBalance(0);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setRows([]);
      setClosingBalance(0);
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
    if (!entryForm.category) return showMessage('Please select a Transaction Category.', 'error');
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      return showMessage('Please enter a valid amount.', 'error');
    }

    setEntryLoading(true);

    // Auto-map category to Debit/Credit for backend
    let backendType = 'Credit'; // Default Deduct
    if (entryForm.category === 'Salary' || entryForm.category === 'Loan Return') {
        backendType = 'Debit'; // Added to account
    }

    // Combine category and notes for clear record keeping
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
    if (amount > 0) return `${amount.toFixed(2)} (Payable)`;
    if (amount < 0) return `${Math.abs(amount).toFixed(2)} (Advance)`;
    return `Settled: Rs. 0.00`;
  };

// --- DETAILED SUMMARY CALCULATIONS ---
  let totalSalaryEarned = 0;
  let totalLoanRecovered = 0;
  let totalAdvanceGiven = 0;
  let totalSalaryPaid = 0;

  rows.forEach(r => {
      const desc = `${r.notes || ''} ${r.transactionType || ''} ${r.type || ''} ${r.invoiceNumber || ''}`.toLowerCase();
      const deb = Number(r.debit) || 0; // Added
      const cred = Number(r.credit) || 0; // Deducted

      if (deb > 0) {
          if (desc.includes('recover') || desc.includes('return') || desc.includes('receipt') || desc.includes('lr-')) {
              totalLoanRecovered += deb;
          } else {
              totalSalaryEarned += deb; // Default Added is Salary
          }
      }
      if (cred > 0) {
          if (desc.includes('advance') || desc.includes('loan') || desc.includes('ln-')) {
              totalAdvanceGiven += cred;
          } else {
              totalSalaryPaid += cred; 
          }
      }
  });

  const handlePrint = () => {
    if (rows.length === 0) return showMessage('No data to print.', 'error');

    const employeeInfo = employees.find(e => e._id === selectedEmployeeId);
    const employeeName = getEmployeeName(employeeInfo);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;

    let html = `
    <html>
    <head>
        <title>${employeeName} Account History</title>
        <style>
            body { font-family: 'Times New Roman', Times, serif, Arial; color: #000; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h2 { margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 0; font-size: 14px; }
            .summary-box { display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; font-size: 13px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>Employee Account Statement</h2>
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Period:</strong> ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}</p>
        </div>
        
        <div class="summary-box">
            <div>Salary Earned: ${totalSalaryEarned.toFixed(2)}</div>
            <div>Advance/Loan Given: ${totalAdvanceGiven.toFixed(2)}</div>
            <div>Loan Returned: ${totalLoanRecovered.toFixed(2)}</div>
            <div>Salary Paid: ${totalSalaryPaid.toFixed(2)}</div>
            <div>Net Balance: ${formatBalanceText(closingBalance)}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th class="text-center">Sr#</th>
                    <th>Date</th>
                    <th>Ref No.</th>
                    <th>Details</th>
                    <th class="text-right">Added (+)</th>
                    <th class="text-right">Deducted (-)</th>
                    <th class="text-right">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach((r) => {
        html += `
            <tr>
                <td class="text-center">${r.srNo || '-'}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${r.invoiceNumber || '-'}</td>
                <td>${r.notes || r.transactionType || r.type || '-'}</td>
                <td class="text-right">${r.debit > 0 ? '+ ' + r.debit.toFixed(2) : '-'}</td>
                <td class="text-right">${r.credit > 0 ? '- ' + r.credit.toFixed(2) : '-'}</td>
                <td class="text-right">${Math.abs(r.net || 0).toFixed(2)} ${r.net < 0 ? '(Adv)' : (r.net > 0 ? '(Pay)' : '')}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    </body>
    </html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 500);
    }, 500);
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
          <select
            className="form-input"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
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
          <button className="btn btn-secondary" onClick={handlePrint}>
            🖨️ Print Ledger
          </button>
          <button className="btn btn-primary" onClick={() => setIsEntryModalOpen(true)}>
            + Add New Entry
          </button>
        </div>
      </div>

      {/* DETAILED ACCOUNT SUMMARY BOX (Visible only when employee selected) */}
      {selectedEmployeeId && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Salary </span>
                <span style={{...summaryValueStyle, color: 'var(--success)'}}>+ {totalSalaryEarned.toFixed(2)}</span>
            </div>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Advance/Loan Given</span>
                <span style={{...summaryValueStyle, color: 'var(--danger)'}}>- {totalAdvanceGiven.toFixed(2)}</span>
            </div>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Loan Returned</span>
                <span style={{...summaryValueStyle, color: 'var(--success)'}}>+ {totalLoanRecovered.toFixed(2)}</span>
            </div>
            <div style={summaryCardStyle}>
                <span style={summaryTitleStyle}>Salary Paid</span>
                <span style={{...summaryValueStyle, color: 'var(--danger)'}}>- {totalSalaryPaid.toFixed(2)}</span>
            </div>
            <div style={{...summaryCardStyle, backgroundColor: closingBalance < 0 ? '#fef2f2' : '#f0fdf4', border: closingBalance < 0 ? '1px solid #fecaca' : '1px solid #bbf7d0'}}>
                <span style={{...summaryTitleStyle, color: closingBalance < 0 ? '#b91c1c' : '#15803d'}}>Net Balance</span>
                <span style={{...summaryValueStyle, color: closingBalance < 0 ? '#b91c1c' : '#15803d', fontSize: '14px'}}>
                    {formatBalanceText(closingBalance)}
                </span>
            </div>
        </div>
      )}

      {/* LEDGER TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Sr#</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Ref No.</th>
                <th style={thStyle}>Description / Notes</th>
                <th style={{...thStyle, width: '15%'}}>Added (+)</th>
                <th style={{...thStyle, width: '15%'}}>Deducted (-)</th>
                <th style={thStyle}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : !selectedEmployeeId ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize:'14px' }}>Please select an employee to view their account.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' ,fontSize:'14px'}}>No transactions found for the selected filters.</td></tr>
              ) : (
                currentRows.map(row => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tdStyle}>{row.srNo}</td>
                    <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ ...tdStyle, fontWeight: '500' }}>{row.invoiceNumber || '-'}</td>
                    {/* Notes combined with Category for crystal clear detail */}
                    <td style={tdStyle}>{row.notes || row.transactionType || row.type || '-'}</td>
                    
                    <td style={{ ...tdStyle, color: row.debit > 0 ? 'var(--success)' : 'inherit', fontWeight: row.debit > 0 ? '600' : 'normal' }}>
                      {row.debit > 0 ? `+ ${row.debit.toFixed(2)}` : '-'}
                    </td>
                    
                    <td style={{ ...tdStyle, color: row.credit > 0 ? 'var(--danger)' : 'inherit', fontWeight: row.credit > 0 ? '600' : 'normal' }}>
                      {row.credit > 0 ? `- ${row.credit.toFixed(2)}` : '-'}
                    </td>
                    
                    <td style={{ ...tdStyle }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{Math.abs(row.net || 0).toFixed(2)}</span>
                        <span style={{ 
                            fontSize: '11px', 
                            marginLeft: '6px',
                            fontWeight: '600', 
                            color: row.net < 0 ? 'var(--danger)' : (row.net > 0 ? 'var(--success)' : 'var(--text-muted)')
                        }}>
                            {row.net < 0 ? '(Advance)' : (row.net > 0 ? '(Payable)' : 'Settled')}
                        </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {rows.length > rowsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>←</button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>→</button>
          </div>
        )}
      </div>

      {/* NEW WIDER & SHORTER ADD ENTRY MODAL */}
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
                    <optgroup label="Add to Account (+)">
                        <option value="Salary">💰 Earned Salary (Bonus/Allowance)</option>
                        <option value="Loan Return">💵 Loan Returned (Cash Received)</option>
                    </optgroup>
                    <optgroup label="Deduct from Account (-)">
                        <option value="Advance">💸 Give Advance</option>
                        <option value="Loan">🏦 Give Loan</option>
                        <option value="Payment">💳 Pay Salary (Cash Given)</option>
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

const thStyle = { padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 16px', fontSize: '13px', textAlign: 'left', color: 'var(--text-main)' };

// Summary Cards Styling
const summaryCardStyle = { flex: '1', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const summaryTitleStyle = { fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' };
const summaryValueStyle = { fontSize: '16px', fontWeight: 'bold' };

export default EmployeeAccount;