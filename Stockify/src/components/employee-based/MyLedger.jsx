import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function MyLedger() {
  const [ledgerRows, setLedgerRows] = useState([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/my-ledger`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setLedgerRows(data.rows);
          setClosingBalance(data.closingBalance);
        }
      } catch (error) {
        console.error("Failed to fetch ledger:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  return (
    <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faWallet} /> My Account Ledger
        </h2>
      </div>

      {/* TABLE CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Date</th>
                <th style={tableStyles.th}>Description</th>
                <th style={tableStyles.th}>Credit (Received)</th>
                <th style={tableStyles.th}>Debit (Deducted)</th>
                <th style={tableStyles.th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={tableStyles.emptyCell}>Loading ledger records...</td>
                </tr>
              ) : ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={tableStyles.emptyCell}>No transactions found in your ledger.</td>
                </tr>
              ) : (
                ledgerRows.map(row => (
                  <tr key={row._id} style={tableStyles.tr}>
                    <td style={tableStyles.td}>
                      {new Date(row.date).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ ...tableStyles.td, fontWeight: '600' }}>
                      {row.cleanDescription} <br/>
                      <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>{row.notes}</small>
                    </td>
                    <td style={{ ...tableStyles.td, color: 'var(--success)', fontWeight: 'bold' }}>
                      {row.credit > 0 ? `Rs. ${row.credit.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ ...tableStyles.td, color: 'var(--danger)', fontWeight: 'bold' }}>
                      {row.debit > 0 ? `Rs. ${row.debit.toLocaleString()}` : '-'}
                    </td>
                    <td style={{ ...tableStyles.td, fontWeight: 'bold', color: 'var(--text-main)' }}>
                      Rs. {row.net.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CURRENT BALANCE FOOTER WITH STATUS */}
      {!loading && (
        <div style={{ 
          marginTop: '16px', 
          padding: '16px 20px', 
          background: 'var(--bg-app)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          display: 'inline-block',
          fontWeight: '700', 
          fontSize: '16px',
          color: closingBalance < 0 ? 'var(--danger)' : 'var(--success)'
        }}>
          <span style={{ color: 'var(--text-main)', marginRight: '10px' }}>Current Balance:</span> 
          PKR {Math.abs(closingBalance).toLocaleString()} 
          <span style={{ 
            marginLeft: '12px', 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '13px', 
            color: closingBalance < 0 ? 'var(--danger)' : 'var(--success)'
          }}>
            {closingBalance > 0 ? 'Receivable from Company' : closingBalance < 0 ? '(Payable by You)' : '(Settled)'}
          </span>
        </div>
      )}

    </div>
  );
}

// Global Theme Styles & Left Alignment
const tableStyles = {
  th: { 
    padding: '14px 20px', 
    backgroundColor: 'var(--header)', 
    color: '#ffffff', 
    textAlign: 'left', 
    fontSize: '13px', 
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  td: { 
    padding: '5px 20px', 
    fontSize: '13px', 
    color: 'var(--text-main)',
    textAlign: 'left', 
    verticalAlign: 'middle'
  },
  tr: { 
    borderBottom: '1px solid var(--border-color)' 
  },
  emptyCell: { 
    padding: '36px', 
    textAlign: 'center', 
    color: 'var(--text-muted)', 
    fontSize: '14px' 
  }
};

export default MyLedger;