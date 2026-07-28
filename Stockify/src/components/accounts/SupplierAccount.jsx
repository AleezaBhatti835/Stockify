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
    setCurrentPage(1); // Reset to page 1 on filter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplierId, fromDate, toDate]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/suppliers`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchLedger = async () => {
    if (!selectedSupplierId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('supplierId', selectedSupplierId);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/supplier-ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRows(data.rows || []);
        setClosingBalance(data.closingBalance || 0);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.supplierId) return showMessage('Please select a supplier.', 'error');
    if (!paymentForm.type) return showMessage('Please select a Type (Debit or Credit).', 'error');
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      return showMessage('Please enter a valid amount.', 'error');
    }

    setPaymentLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/supplier-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const getSupplierName = (s) => s?.companyName || s?.contactPerson || 'Supplier';

  // ================= FORMAT BALANCE TEXT =================
  const formatBalanceText = (amount) => {
    if (amount > 0) return ` ${amount.toFixed(2)}`;
    if (amount < 0) return ` ${Math.abs(amount).toFixed(2)}`;
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
                    <th class="text-left">Balance</th>
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
                <td class="text-left">${(r.balance || 0).toFixed(2)}</td>
                <td class="text-left">${(r.previousBalance || 0).toFixed(2)}</td>
                <td class="text-left">${(r.net || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr style="background-color: #f5f5f5; font-weight: bold;">
                    <td></td>
                    <td>Total</td>
                    <td></td>
                    <td class="text-left">${totalDebit.toFixed(2)}</td>
                    <td class="text-left">${totalCredit.toFixed(2)}</td>
                    <td colspan="2"></td>
                    <td class="text-left">${formatBalanceText(closingBalance)}</td>
                </tr>
            </tfoot>
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

  // ================= PAGINATION LOGIC =================
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = rows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(rows.length / rowsPerPage);

  return (
    <div style={styles.wrapper}>
      {/* ==================== FILTER BAR ==================== */}
      <div style={styles.card}>
        <div style={styles.filterRow}>
          <div style={{ ...styles.filterField, flex: 1 }}>
            <label style={styles.label}>Supplier</label>
            <select
              style={styles.input}
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">Select a Supplier</option>
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>{getSupplierName(s)}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>From</label>
            <input type="date" style={styles.input} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>To</label>
            <input type="date" style={styles.input} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={{ ...styles.addBtn, background: '#334155' }} onClick={handlePrint}>
              🖨️ Print Ledger
            </button>
            <button style={styles.addBtn} onClick={() => setIsPaymentModalOpen(true)}>
              + Add Payment
            </button>
          </div>
        </div>
      </div>

      {/* ==================== LEDGER TABLE ==================== */}
      <div style={{ ...styles.card, padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sr#</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Invoice</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>Debit</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>Credit</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>Balance</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>Previous Balance</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={styles.emptyCell}>Loading...</td></tr>
              ) : !selectedSupplierId ? (
                <tr><td colSpan="8" style={styles.emptyCell}>Please select a supplier to view their ledger.</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan="8" style={styles.emptyCell}>No transactions found for the selected filters.</td></tr>
              ) : (
                currentRows.map(row => (
                  <tr key={row._id}>
                    <td style={styles.td}>{row.srNo}</td>
                    <td style={styles.td}>{new Date(row.date).toLocaleDateString()}</td>
                    <td style={styles.td}>{row.invoiceNumber || '-'}</td>
                    <td style={{ ...styles.td, textAlign: 'left', color: '#ef4444' }}>
                      {row.debit > 0 ? row.debit.toFixed(2) : '0'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'left', color: '#10b981' }}>
                      {row.credit > 0 ? row.credit.toFixed(2) : '0'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 600 }}>{(row.balance || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left' }}>{(row.previousBalance || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 700 }}>{(row.net || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>

            {/* ==================== IN-TABLE SUMMARY ==================== */}
            {rows.length > 0 && (
                <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                        <td></td> {/* Sr# */}
                        <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>Total</td> {/* Date */}
                        <td></td> {/* Invoice */}
                        <td style={{ ...styles.td, fontWeight: 700, color: '#ef4444' }}>{totalDebit.toFixed(2)}</td> {/* Debit */}
                        <td style={{ ...styles.td, fontWeight: 700, color: '#10b981' }}>{totalCredit.toFixed(2)}</td> {/* Credit */}
                        <td colSpan="2"></td> {/* Balance & Prev Balance */}
                        <td style={{ ...styles.td, fontWeight: 700, color: closingBalance > 0 ? '#2a9553' : (closingBalance < 0 ? '#ef4444' : '#334155') }}>
                        </td> {/* Net */}
                    </tr>
                </tfoot>
            )}
          </table>
        </div>

        {/* ==================== PAGINATION CONTROLS ==================== */}
        {rows.length > rowsPerPage && (
          <div style={{ 
            marginTop: '10px', 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '15px 0'
          }}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: currentPage === 1 ? '#e9ecef' : '#3c4e6b',
                color: currentPage === 1 ? '#6c757d' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              ← 
            </button>
            
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            
            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: currentPage >= totalPages ? '#e9ecef' : '#3c4e6b',
                color: currentPage >= totalPages ? '#6c757d' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
                →
            </button>
          </div>
        )}
      </div>

      {/* ==================== ADD PAYMENT MODAL ==================== */}
      {isPaymentModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsPaymentModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Add Payment</h3>
              <button style={styles.closeBtn} onClick={() => setIsPaymentModalOpen(false)}>×</button>
            </div>

            {message.text && (
              <div style={{
                margin: '12px 0', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                background: message.type === 'error' ? '#fef2f2' : '#ecfdf5',
                color: message.type === 'error' ? '#ef4444' : '#10b981'
              }}>
                {message.text}
              </div>
            )}

            <div style={{ textAlign:'left', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={styles.label}>Supplier</label>
                <select
                  style={styles.input}
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{getSupplierName(s)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '14px', textAlign:'left'}}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date" style={styles.input}
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Type</label>
                  <select
                    style={styles.input}
                    value={paymentForm.type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={styles.label}>Amount</label>
                <input
                  type="number" min="0" style={styles.input}
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={styles.cancelBtn} onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
              <button
                style={{ ...styles.saveBtn, opacity: paymentLoading ? 0.6 : 1 }}
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

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  filterRow: { display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterField: { display: 'flex', flexDirection: 'column', minWidth: '180px' },
  label: { fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textAlign: 'left' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', outline: 'none', width: '100%', boxSizing: 'border-box' },
  addBtn: {width: 'auto', padding: '10px 20px', color: 'white', backgroundColor: '#5aa7ef', whiteSpace: 'nowrap', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', background: ' #26384a', fontSize: '14px', color: '#fff', fontWeight: 600, letterSpacing: '0.5px' },
  td: { padding: '10px 16px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  emptyCell: { padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },
  
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 },
  modalContent: { background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer', lineHeight: 1 },
  cancelBtn: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '10px 20px', background: '#3c4e6b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
};

export default SupplierAccount;