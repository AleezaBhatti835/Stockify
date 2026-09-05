import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const SalaryPayments = () => {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, empId: null, amount: 0 });

  useEffect(() => { fetchBalances(); }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/balances`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await res.json();
      if (result.success) {
        // Sirf un employees ko filter karein jin ki amount "Payable" hai
        const emps = result.data.filter(b => b.entityGroup === 'Employee' && b.payable > 0);
        setPayables(emps);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Open Custom Modal instead of window.confirm
  const handlePayClick = (empId, amount) => {
    setConfirmModal({ isOpen: true, empId, amount });
  };

  // Step 2: Execute Payment when user clicks "Confirm" in custom modal
  const executePayment = async () => {
    const { empId, amount } = confirmModal;
    setConfirmModal({ isOpen: false, empId: null, amount: 0 }); // Modal close karein

    try {
      const res = await fetch(`${API_BASE_URL}/api/employee-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          employeeId: empId,
          amount: amount,
          type: 'Credit', // Credit means Payment in our ledger
          transactionType: 'Payment',
          notes: 'Individual Salary Payment'
        })
      });
      const data = await res.json();
      if (data.success) {
        showMessage('Payment successful!', 'success');
        fetchBalances(); // Refresh list to remove paid employee
      } else {
        showMessage(data.message, 'error');
      }
    } catch (error) {
      showMessage('Error processing payment', 'error');
    }
  };

  const filteredPayables = payables.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="dashboard-wrapper">
      {message.text && (
        <div style={{ padding: '10px 14px', marginBottom: '15px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, fontWeight: 500 }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '18px' }}>Individual Salary Payments</h4>
          </div>
          <input type="text" className="form-input" style={{ width: '250px', marginBottom: 0 }} placeholder="Search employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '6px', overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Employee Name</th>
                <th style={tableStyles.th}>Designation</th>
                <th style={{ ...tableStyles.th, textAlign: 'left' }}>Outstanding Payable</th>
                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center',fontSize:'14px', padding: '40px' }}>Loading balances...</td></tr>
              ) : filteredPayables.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center',fontSize:'14px', padding: '40px', color: 'var(--text-muted)' }}>All salaries are clear! No payables found.</td></tr>
              ) : (
                filteredPayables.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ ...tableStyles.td, fontWeight: 600 }}>{p.name}</td>
                    <td style={tableStyles.td}>{p.designation}</td>
                    <td style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 'bold', color: 'var(--danger)' }}>PKR {p.payable.toFixed(2)}</td>
                    <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 16px', fontSize: '12px' }}
                        onClick={() => handlePayClick(p.id, p.payable)}
                      >
                        Pay Now
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ isOpen: false, empId: null, amount: 0 })}>
          <div className="modal-container" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Payment</h3>
              <button className="modal-close" onClick={() => setConfirmModal({ isOpen: false, empId: null, amount: 0 })}>×</button>
            </div>
            
            <div className="modal-body">
              <p style={{ margin: '0', fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                Are you sure you want to process the salary payment of <strong style={{ color: 'var(--primary)' }}>PKR {confirmModal.amount.toFixed(2)}</strong> for this employee?
              </p>
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmModal({ isOpen: false, empId: null, amount: 0 })}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={executePayment}>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const tableStyles = {
  th: { padding: '14px 16px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', textAlign: 'left' },
  td: { padding: '14px 16px', color: 'var(--text-main)', fontSize: '14px', textAlign: 'left', verticalAlign: 'middle' }
};

export default SalaryPayments;