import { useState, useEffect } from 'react';

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
    type: '', amount: ''
  });
  const [entryLoading, setEntryLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  // CORE ARCHITECTURE: Auto-fetch ledger data whenever filters change, resetting pagination.
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
        
        fetchedRows.sort((a, b) => {
          const dateA = new Date(a.date).setHours(0, 0, 0, 0);
          const dateB = new Date(b.date).setHours(0, 0, 0, 0);
          if (dateA !== dateB) return dateA - dateB;
          if (a._id && b._id) return a._id.localeCompare(b._id);
          return 0;
        });
        
        // CORE ARCHITECTURE: Recalculate running balance dynamically on the frontend to ensure chronological accuracy.
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
    if (!entryForm.type) return showMessage('Please select a Type (Debit or Credit).', 'error');
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      return showMessage('Please enter a valid amount.', 'error');
    }

    setEntryLoading(true);
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
          type: entryForm.type,
          amount: Number(entryForm.amount)
        })
      });
      const data = await res.json();

      if (data.success) {
        showMessage('Entry recorded successfully!', 'success');
        setIsEntryModalOpen(false);
        setEntryForm({ employeeId: '', date: todayStr(), type: '', amount: '' });
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
    if (amount > 0) return `${amount.toFixed(2)}`;
    if (amount < 0) return `${Math.abs(amount).toFixed(2)}`;
    return `Settled: Rs. 0.00`;
  };

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);

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
        <title>${employeeName} Ledger</title>
        <style>
            body { font-family: 'Times New Roman', Times, serif, Arial; color: #000; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h2 { margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .print-summary { display: flex; justify-content: space-between; align-items: center; border: 2px solid #000; padding: 15px; background-color: #f5f5f5; font-size: 14px; font-weight: bold; }
            .totals-group span { margin-right: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>Employee Ledger</h2>
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Period:</strong> ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th class="text-center">Sr#</th>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Type</th>
                    <th class="text-left">Debit</th>
                    <th class="text-left">Credit</th>
                    <th class="text-left">Previous Balance</th>
                    <th class="text-left">Net</th>
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
                <td>${r.type || r.transactionType || '-'}</td>
                <td class="text-left">${r.debit > 0 ? r.debit.toFixed(2) : '0'}</td>
                <td class="text-left">${r.credit > 0 ? r.credit.toFixed(2) : '0'}</td>
                <td class="text-left">${(r.previousBalance || 0).toFixed(2)}</td>
                <td class="text-left">${(r.net || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        <div class="print-summary">
            <div class="totals-group">
                <span>Total Debit: ${totalDebit.toFixed(2)}</span>
                <span>Total Credit: ${totalCredit.toFixed(2)}</span>
            </div>
            <div>
                ${formatBalanceText(closingBalance)}
            </div>
        </div>
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
            + Add Entry
          </button>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Sr#</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Invoice</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Type</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Debit</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Credit</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Previous Balance</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : !selectedEmployeeId ? (
                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)',fontSize:'14px' }}>Please select an employee to view their ledger.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' ,fontSize:'14px'}}>No transactions found for the selected filters.</td></tr>
              ) : (
                currentRows.map(row => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.srNo}</td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{new Date(row.date).toLocaleDateString()}</td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.invoiceNumber || '-'}</td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{row.type || row.transactionType || '-'}</td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--danger)', fontWeight: '500' }}>
                      {row.debit > 0 ? row.debit.toFixed(2) : '0'}
                    </td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--success)', fontWeight: '500' }}>
                      {row.credit > 0 ? row.credit.toFixed(2) : '0'}
                    </td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-main)' }}>{(row.previousBalance || 0).toFixed(2)}</td>
                    <td style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '700' }}>{(row.net || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
                <tfoot>
                    <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                        <td></td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Total</td>
                        <td></td>
                        <td></td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>{totalDebit.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{totalCredit.toFixed(2)}</td>
                        <td></td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: closingBalance > 0 ? 'var(--success)' : (closingBalance < 0 ? 'var(--danger)' : 'var(--text-main)') }}>
                          {formatBalanceText(closingBalance)}
                        </td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {rows.length > rowsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px' }}>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '6px 12px' }}
            >
              ← 
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '6px 12px' }}
            >
                →
            </button>
          </div>
        )}
      </div>

      {/* ADD ENTRY MODAL */}
      {isEntryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEntryModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Entry</h2>
              <button className="modal-close" onClick={() => setIsEntryModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              {message.text && (
                <div style={{
                  marginBottom: '16px', padding: '12px', borderRadius: '8px', fontSize: '13px',
                  backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: message.type === 'error' ? 'var(--danger)' : 'var(--success)'
                }}>
                  {message.text}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Employee</label>
                <select
                  className="form-input"
                  value={entryForm.employeeId}
                  onChange={(e) => setEntryForm({ ...entryForm, employeeId: e.target.value })}
                >
                  <option value="">Select Employee</option>
                  {employees.map(e => (
                    <option key={e._id} value={e._id}>{getEmployeeName(e)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Date</label>
                  <input
                    type="date" className="form-input"
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={entryForm.type}
                    onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Amount</label>
                <input
                  type="number" min="0" className="form-input"
                  placeholder="0"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsEntryModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveEntry}
                disabled={entryLoading}
              >
                {entryLoading ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeAccount;