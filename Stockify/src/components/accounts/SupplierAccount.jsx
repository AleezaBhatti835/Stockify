import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function SupplierAccount() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const [rows, setRows] = useState([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // ================= PAGINATION STATES =================
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    supplierId: '', date: todayStr(), type: '', amount: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      fetchLedger();
    } else {
      setRows([]);
      setClosingBalance(0);
    }
    setCurrentPage(1); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplierId, fromDate, toDate]);

  // ================= FETCH SUPPLIERS (WITH TOKEN) =================
  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  // ================= FETCH LEDGER (WITH TOKEN) =================
  const fetchLedger = async () => {
    if (!selectedSupplierId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('supplierId', selectedSupplierId);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/supplier-ledger?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        let fetchedRows = data.rows || [];
        
        // 1. PERFECT SORTING LOGIC: Date first, then Exact Insertion Time
        fetchedRows.sort((a, b) => {
          const dateA = new Date(a.date).setHours(0, 0, 0, 0);
          const dateB = new Date(b.date).setHours(0, 0, 0, 0);
          
          if (dateA !== dateB) {
            return dateA - dateB; 
          }
          
          if (a._id && b._id) {
            return a._id.localeCompare(b._id);
          }
          
          return 0;
        });

        let runningBal = 0;
        fetchedRows = fetchedRows.map((row, index) => {
          const rowDebit = Number(row.debit) || 0;
          const rowCredit = Number(row.credit) || 0;
          const prevBal = runningBal;
          
          // 💡 Supplier is a Liability (Payable): Balance = Credit - Debit
          runningBal = runningBal + rowCredit - rowDebit;
          
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

  // ================= HANDLE SAVE PAYMENT (WITH TOKEN) =================
  const handleSavePayment = async () => {
    if (!paymentForm.supplierId) return showMessage('Please select a supplier.', 'error');
    if (!paymentForm.type) return showMessage('Please select a Type (Debit or Credit).', 'error');
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      return showMessage('Please enter a valid amount.', 'error');
    }

    setPaymentLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/supplier-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          supplierId: paymentForm.supplierId,
          date: paymentForm.date,
          type: paymentForm.type,
          amount: Number(paymentForm.amount)
        })
      });
      const data = await res.json();

      if (data.success) {
        showMessage('Payment recorded successfully!', 'success');
        setIsPaymentModalOpen(false);
        setPaymentForm({ supplierId: '', date: todayStr(), type: '', amount: '' });
        fetchLedger();
      } else {
        showMessage(data.message || 'Failed to record payment.', 'error');
      }
    } catch (err) {
      showMessage('Server error while saving payment.', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getSupplierName = (s) => s?.name || s?.contactPerson || s?.companyName || 'Supplier';
  
  // ================= FORMAT BALANCE TEXT =================
  const formatBalanceText = (amount) => {
    const safeAmt = Number(amount) || 0;
    const absVal = Math.abs(safeAmt).toFixed(2);
    if (safeAmt > 0) return `Rs. ${absVal} (Cr) — Payable`;
    if (safeAmt < 0) return `Rs. ${absVal} (Dr) — Advance`;
    return `Settled: Rs. 0.00`;
  };

  // ================= CALCULATE TOTALS =================
  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);

  // ================= PROFESSIONAL B&W PRINT =================
  const handlePrint = () => {
    if (rows.length === 0) return showMessage('No data to print.', 'error');

    const supplierInfo = suppliers.find(s => s._id === selectedSupplierId);
    const supplierName = getSupplierName(supplierInfo);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;

    let html = `
    <html>
    <head>
        <title>${supplierName} Ledger</title>
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
            .print-summary {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 2px solid #000;
                padding: 15px;
                background-color: #f5f5f5;
                font-size: 14px;
                font-weight: bold;
            }
            .totals-group span { margin-right: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>Supplier Ledger</h2>
            <p><strong>Supplier:</strong> ${supplierName}</p>
            <p><strong>Period:</strong> ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th class="text-center">Sr#</th>
                    <th>Date</th>
                    <th>Invoice</th>
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

        <!-- Custom Summary Section -->
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

  // ================= PAGINATION LOGIC =================
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = rows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(rows.length / rowsPerPage);

  return (
    <div className="dashboard-wrapper">
      {/* ==================== FILTER BAR ==================== */}
      <div className="card">
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0, width: '20%' }}>
            <label className="form-label">Supplier</label>
            <select
              className="form-input"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">Select a Supplier</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{getSupplierName(s)}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, width: '21%' }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0, width: '21%' }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handlePrint}>
              🖨️ Print Ledger
            </button>
            <button className="btn btn-primary" onClick={() => setIsPaymentModalOpen(true)}>
              + Add Payment
            </button>
          </div>
        </div>
      </div>

      {/* ==================== LEDGER TABLE ==================== */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Sr#</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Invoice</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Debit</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Credit</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' }}>Previous Balance</th>
                <th style={{ padding: '12px 16px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '15%' }}>Net (Cr / Dr)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>Loading...</td></tr>
              ) : !selectedSupplierId ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>Please select a supplier to view their ledger.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>No transactions found for the selected filters.</td></tr>
              ) : (
                currentRows.map(row => {
                  const netVal = row.net || 0;
                  const netColor = netVal > 0 ? 'var(--danger)' : (netVal < 0 ? 'var(--success)' : 'var(--text-main)');
                  const netTag = netVal > 0 ? ' (Cr)' : (netVal < 0 ? ' (Dr)' : '');

                  return (
                    <tr key={row._id || Math.random()}>
                      <td style={tableStyles.td}>{row.srNo}</td>
                      <td style={tableStyles.td}>{new Date(row.date).toLocaleDateString()}</td>
                      <td style={tableStyles.td}>{row.invoiceNumber || '-'}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--danger)' }}>
                        {row.debit > 0 ? row.debit.toFixed(2) : '0'}
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--success)' }}>
                        {row.credit > 0 ? row.credit.toFixed(2) : '0'}
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'left' }}>{(row.previousBalance || 0).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: netColor, fontWeight: 700 }}>
                        {Math.abs(netVal).toFixed(2)}{netTag}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ==================== IN-TABLE SUMMARY ==================== */}
            {rows.length > 0 && (
                <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                        <td style={tableStyles.td}></td>
                        <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--text-main)', background: 'none' }}>Total</td>
                        <td style={tableStyles.td}></td>
                        <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--danger)' }}>{totalDebit.toFixed(2)}</td>
                        <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--success)' }}>{totalCredit.toFixed(2)}</td>
                        <td style={tableStyles.td}></td>
                        <td style={{ ...tableStyles.td, fontWeight: 700, color: closingBalance > 0 ? 'var(--danger)' : (closingBalance < 0 ? 'var(--success)' : 'var(--text-main)') }}>
                          {formatBalanceText(closingBalance)}
                        </td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>

        {/* ==================== PAGINATION CONTROLS ==================== */}
        {rows.length > rowsPerPage && (
          <div style={{ 
            display: 'flex', 
            gap: 'var(--space-md)', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: 'var(--space-md)'
          }}>
            <button 
              className="btn btn-secondary"
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
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
            >
                →
            </button>
          </div>
        )}
      </div>

      {/* ==================== ADD PAYMENT MODAL ==================== */}
      {isPaymentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3 className="modal-title">Add Payment</h3>
              <button className="modal-close" onClick={() => setIsPaymentModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-body">
              {message.text && (
                <div style={{
                  marginBottom: 'var(--space-md)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px',
                  background: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: message.type === 'error' ? 'var(--danger)' : 'var(--success)'
                }}>
                  {message.text}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select
                  className="form-input"
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{getSupplierName(s)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Date</label>
                  <input
                    type="date" className="form-input"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={paymentForm.type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number" min="0" className="form-input"
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSavePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

const tableStyles = {
  th: { 
    textAlign: 'left', 
    padding: '12px 16px', 
    backgroundColor: 'var(--primary)', 
    fontSize: '14px', 
    color: '#ffffff', 
    fontWeight: 600, 
    letterSpacing: '0.5px' 
  },
  td: { 
    padding: '7px 16px', 
    textAlign: 'left', 
    fontSize: '13px', 
    borderBottom: '1px solid var(--border-color)', 
    color: 'var(--text-main)' 
  },
  emptyCell: { 
    padding: '40px 0', 
    textAlign: 'center', 
    color: 'var(--text-muted)', 
    fontSize: '14px' 
  }
};

export default SupplierAccount;