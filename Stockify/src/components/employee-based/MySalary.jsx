import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function MySalary() {
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalary = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/my-salary-slips`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setSalarySlips(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch salary slips:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, []);

  return (
    <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faFileInvoiceDollar} /> My Salary Slips
        </h2>
      </div>

      {/* TABLE CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Salary Month</th>
                <th style={tableStyles.th}>Invoice #</th>
                <th style={tableStyles.th}>Net Salary Generated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" style={tableStyles.emptyCell}>Loading salary slips...</td>
                </tr>
              ) : salarySlips.length === 0 ? (
                <tr>
                  <td colSpan="3" style={tableStyles.emptyCell}>No salary slips generated yet.</td>
                </tr>
              ) : (
                salarySlips.map(slip => (
                  <tr key={slip._id} style={tableStyles.tr}>
                    <td style={{ ...tableStyles.td, fontWeight: '600', color: 'var(--primary)' }}>
                      {slip.notes}
                    </td>
                    <td style={tableStyles.td}>
                      {slip.invoiceNumber}
                    </td>
                    <td style={{ ...tableStyles.td, color: 'var(--success)', fontWeight: 'bold' }}>
                      Rs. {slip.debit.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// 💡 Global Theme Styles & Left Alignment
const tableStyles = {
  th: { 
    padding: '14px 20px', 
    backgroundColor: 'var(--header)', 
    color: '#ffffff', 
    textAlign: 'left',     // <-- Left Aligned
    fontSize: '13px', 
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  td: { 
    padding: '14px 20px', 
    fontSize: '13px', 
    color: 'var(--text-main)',
    textAlign: 'left',     // <-- Left Aligned
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

export default MySalary;