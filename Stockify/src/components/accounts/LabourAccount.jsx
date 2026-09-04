import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faCheckDouble, faCheckCircle, faPrint } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';
const todayStr = () => new Date().toISOString().slice(0, 10);

function LabourAccount() {
  const [labours, setLabours] = useState([]);
  const [selectedLabourId, setSelectedLabourId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [closingBalance, setClosingBalance] = useState(0);

  // Payment Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({ date: todayStr(), amount: '', notes: '', refSaleNumber: '' });
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    fetchLabours();
  }, []);

  useEffect(() => {
    if (selectedLabourId) {
      fetchLedger();
    } else {
      setRows([]);
      setClosingBalance(0);
    }
  }, [selectedLabourId]);

  const fetchLabours = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/labour`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setLabours(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Error fetching labour:', err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/labour-ledger?labourId=${selectedLabourId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        let allRows = data.rows || [];
        
        let totalDebits = allRows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
        let runningBal = 0;

        const processedRows = allRows.map((row, idx) => {
          const rowDebit = Number(row.debit) || 0;
          const rowCredit = Number(row.credit) || 0;
          const prevBal = runningBal; 
          
          // 💡 Labour is a Liability (Payable): Balance = Credit - Debit
          runningBal = runningBal + rowCredit - rowDebit; 

          let remainingPayable = 0;
          let paymentStatus = '';

          if (rowCredit > 0) {
            if (totalDebits >= rowCredit) {
              remainingPayable = 0;
              totalDebits -= rowCredit;
              paymentStatus = 'Paid';
            } else if (totalDebits > 0) {
              remainingPayable = rowCredit - totalDebits;
              totalDebits = 0;
              paymentStatus = 'Partial';
            } else {
              remainingPayable = rowCredit;
              paymentStatus = 'Unpaid';
            }
          }

          return { 
            ...row, 
            srNo: idx + 1, 
            previousBalance: prevBal,
            netBalance: runningBal,
            remainingPayable,
            paymentStatus
          };
        });

        setRows(processedRows); 
        setClosingBalance(runningBal);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleOpenPayModal = (row) => {
    setPayForm({
      date: todayStr(),
      amount: row.remainingPayable, 
      notes: `Payment for Sale: ${row.invoiceNumber || row.refSaleNumber || 'N/A'}`,
      refSaleNumber: row.invoiceNumber || row.refSaleNumber || ''
    });
    setIsPayModalOpen(true);
  };

  const handleOpenPayAllModal = () => {
    setPayForm({
      date: todayStr(),
      amount: closingBalance > 0 ? closingBalance : 0, 
      notes: 'Bulk Payment for all pending labour charges',
      refSaleNumber: 'Multiple'
    });
    setIsPayModalOpen(true);
  };

  const handleMakePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) {
      return showMessage('Amount must be greater than zero.', 'error');
    }

    setPayLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/labour-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          labourId: selectedLabourId,
          date: payForm.date,
          amount: payForm.amount,
          notes: payForm.notes,
          refSaleNumber: payForm.refSaleNumber
        })
      });

      const data = await res.json();
      if (data.success) {
        showMessage('Payment recorded & Cash Register updated!', 'success');
        setIsPayModalOpen(false);
        fetchLedger(); 
      } else {
        showMessage(data.message || 'Payment failed.', 'error');
      }
    } catch (err) {
      showMessage('Server error during payment.', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  // 💡 FORMAT BALANCE WITH DR/CR & PAYABLE/ADVANCE TAGS
  const formatBalanceText = (amount) => {
    const safeAmt = Number(amount) || 0;
    const absVal = Math.abs(safeAmt).toFixed(2);
    if (safeAmt > 0) return `Rs. ${absVal} (Cr) — Payable`;
    if (safeAmt < 0) return `Rs. ${absVal} (Dr) — Advance`;
    return `Settled: Rs. 0.00`;
  };

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dashboard-wrapper">
      
      <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 250px' }}>
          <label className="form-label">Select Labour / Loader</label>
          <select className="form-input" value={selectedLabourId} onChange={(e) => setSelectedLabourId(e.target.value)}>
            <option value="">-- Choose Labour --</option>
            {labours.map(l => (
              <option key={l._id} value={l._id}>{l.name} {l.phone ? `(${l.phone})` : ''}</option>
            ))}
          </select>
        </div>
        
        {closingBalance > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#f7fbfa', border: '1px solid #d3ece7', padding: '10px 16px', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>Total Payable </span>
              <div style={{ fontSize: '12px', textAlign: 'left', color: '#b91c1c', fontWeight: 700 }}>Rs. {closingBalance.toLocaleString()}</div>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ padding: '8px 16px', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              onClick={handleOpenPayAllModal}
            >
              <FontAwesomeIcon icon={faCheckDouble} /> Pay All
            </button>
          </div>
        )}
      </div>

      {message.text && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Date</th>
                <th style={tableStyles.th}>Description / Ref</th>
                <th style={tableStyles.th}>Prev Bal</th>
                <th style={tableStyles.th}>Labour Charged (Cr)</th>
                <th style={tableStyles.th}>Amount Paid (Dr)</th>
                <th style={tableStyles.th}>Remaining</th>
                <th style={tableStyles.th}>Net Balance</th>
                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '40px', fontSize: '13px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</td></tr>
              ) : !selectedLabourId ? (
                <tr><td colSpan="8" style={{ padding: '40px', fontSize: '13px', textAlign: 'center', color: 'var(--text-muted)' }}>Please select labour to view ledger.</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '40px', fontSize: '13px', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found.</td></tr>
              ) : (
                rows.map(row => {
                  const netVal = row.netBalance || 0;
                  const netColor = netVal > 0 ? 'var(--danger)' : (netVal < 0 ? 'var(--success)' : 'var(--text-main)');
                  const netTag = netVal > 0 ? ' (Cr)' : (netVal < 0 ? ' (Dr)' : '');

                  return (
                    <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: row.credit > 0 && row.paymentStatus === 'Paid' ? '#fdfcf9' : 'transparent' }}>
                      
                      <td style={tableStyles.td}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                      
                      <td style={{ ...tableStyles.td, fontWeight: 500 }}>
                        {row.transactionType || 'Service'} 
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.notes}</div>
                      </td>
                      
                      <td style={{ ...tableStyles.td, color: 'var(--text-muted)' }}>Rs. {row.previousBalance.toLocaleString()}</td>
                      
                      <td style={{ ...tableStyles.td, color: 'var(--danger)', fontWeight: row.credit > 0 ? 600 : 500 }}>
                        {row.credit > 0 ? `+ Rs. ${row.credit.toLocaleString()}` : '-'}
                      </td>
                      
                      <td style={{ ...tableStyles.td, color: 'var(--success)', fontWeight: row.debit > 0 ? 600 : 500 }}>
                        {row.debit > 0 ? `- Rs. ${row.debit.toLocaleString()}` : '-'}
                      </td>

                      <td style={{ ...tableStyles.td, fontWeight: 600, color: row.credit > 0 && row.remainingPayable > 0 ? '#d97706' : 'var(--text-muted)' }}>
                        {row.credit > 0 ? `Rs. ${row.remainingPayable.toLocaleString()}` : '-'}
                      </td>

                      <td style={{ ...tableStyles.td, fontWeight: 600, fontSize: '14px', color: netColor }}>
                        Rs. {Math.abs(netVal).toLocaleString()}
                        <span style={{ fontSize: '11px', marginLeft: '6px', fontWeight: '600' }}>{netTag}</span>
                      </td>
                      
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        {row.credit > 0 && (
                          <>
                            {row.paymentStatus === 'Paid' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #c0e9db', gap: '4px', color: '#48695e', fontWeight: 700, fontSize: '13px', padding: '3px 8px', backgroundColor: '#fbfcfc', borderRadius: '4px' }}>
                                <FontAwesomeIcon icon={faCheckCircle} /> Paid
                              </span>
                            ) : (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '8px 2px', fontSize: '12px', backgroundColor: '#10b981', borderColor: '#10b981', width: '65px' }}
                                onClick={() => handleOpenPayModal(row)}
                              >
                                <FontAwesomeIcon icon={faMoneyBillWave} /> Pay
                              </button>
                            )}
                          </>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan="3" style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>Total</td>
                  <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: 'var(--danger)' }}>{totalCredit.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{totalDebit.toFixed(2)}</td>
                  <td colSpan="1"></td>
                  <td colSpan="2" style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '700', color: closingBalance > 0 ? 'var(--danger)' : (closingBalance < 0 ? 'var(--success)' : 'var(--text-main)') }}>
                    {formatBalanceText(closingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isPayModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPayModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Pay Labour</h3>
              <button className="modal-close" onClick={() => setIsPayModalOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                ⚠️ This will deduct cash directly from your open Cash Register.
              </div>

              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input type="date" className="form-input" value={payForm.date} onChange={(e) => setPayForm({...payForm, date: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Amount (PKR)</label>
                <input type="number" className="form-input" value={payForm.amount} onChange={(e) => setPayForm({...payForm, amount: e.target.value})} style={{ fontWeight: 'bold' }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes / Reference</label>
                <input type="text" className="form-input" value={payForm.notes} onChange={(e) => setPayForm({...payForm, notes: e.target.value})} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMakePayment} disabled={payLoading}>
                {payLoading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const tableStyles = {
  th: { padding: '12px 14px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', color: 'var(--text-main)', fontSize: '13px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }
};

export default LabourAccount;