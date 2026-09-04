import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faBuilding } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function SupplierCompanyLedger() {
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({
    companyId: '',
    fromDate: '',
    toDate: new Date().toISOString().split('T')[0] 
  });

  const [ledgerData, setLedgerData] = useState([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (filters.companyId) {
      fetchLedger();
    } else {
      setLedgerData([]);
      setClosingBalance(0);
      setSuppliersCount(0);
    }
  }, [filters.companyId, filters.fromDate, filters.toDate]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/supplier-companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchLedger = async () => {
    if (!filters.companyId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        companyId: filters.companyId,
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate })
      }).toString();

      const res = await fetch(`${API_BASE_URL}/api/supplier-company-ledger?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setLedgerData(data.rows || []);
        setClosingBalance(data.closingBalance || 0);
        setSuppliersCount(data.suppliersCount || 0);
      } else {
        showMessage(data.message || 'Failed to fetch ledger', 'error');
        setLedgerData([]);
      }
    } catch (error) {
      showMessage('Server error while fetching ledger', 'error');
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const formatCurrency = (amount) => {
    return Math.abs(Number(amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedCompanyName = companies.find(c => c._id === filters.companyId)?.name || 'Company';

  return (
    <div className="dashboard-wrapper">
      {message.text && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
          {message.text}
        </div>
      )}

      {/* HEADER & FILTERS */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flexGrow: 1 }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '220px', flex: 1 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Select Company *</label>
              <div style={{ position: 'relative' }}>
               
                <select 
                  className="form-input" 
                  name="companyId" 
                  value={filters.companyId} 
                  onChange={handleFilterChange}
                  style={{ fontWeight: 400}}
                >
                  <option value="">-- Choose a Company --</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0, minWidth: '250px' }}>
              <label className="form-label">Date From</label>
              <input type="date" className="form-input" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
            </div>

            <div className="form-group" style={{ marginBottom: 0, minWidth: '250px' }}>
              <label className="form-label">Date To</label>
              <input type="date" className="form-input" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handlePrint} disabled={ledgerData.length === 0} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <FontAwesomeIcon icon={faPrint} /> Print
            </button>
            <button className="btn btn-primary" disabled={ledgerData.length === 0} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#e11d48', borderColor: '#e11d48' }}>
              <FontAwesomeIcon icon={faFilePdf} /> PDF
            </button>
          </div>

        </div>
      </div>

   

      {/* LEDGER TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)', color: 'white' }}>
                <th style={tableStyles.th}>Date</th>
                <th style={tableStyles.th}> Invoice #</th>
                <th style={tableStyles.th}>Supplier Name</th>
                <th style={tableStyles.th}>Reference</th>
                <th style={tableStyles.th}>Debit </th>
                <th style={tableStyles.th}>Credit </th>
                <th style={tableStyles.th}>Net Balance </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>Loading combined ledger...</td></tr>
              ) : !filters.companyId ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>Please select a Supplier Company to view the combined ledger.</td></tr>
              ) : ledgerData.length === 0 ? (
                <tr><td colSpan="7" style={tableStyles.emptyCell}>No transactions found for {selectedCompanyName} in this date range.</td></tr>
              ) : (
                ledgerData.map((row) => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={tableStyles.td}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ ...tableStyles.td, fontWeight: 600 }}>{row.invoiceNumber || '-'}</td>
                    <td style={{ ...tableStyles.td, color: 'var(--primary)', fontWeight: 600 }}>
                      {row.supplier?.contactPerson || row.supplier?.name || 'Unknown'}
                    </td>
                    <td style={tableStyles.td}>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: '4px', 
                        fontSize: '11px', fontWeight: 600, marginRight: '8px' 
                      }}>
                        {row.transactionType}
                      </span>
                    </td>
                    <td style={{ ...tableStyles.td, color: 'var(--text-main)', fontWeight: row.debit > 0 ? 600 : 400 }}>
                      {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td style={{ ...tableStyles.td, color: 'var(--danger)', fontWeight: row.credit > 0 ? 600 : 400 }}>
                      {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                    <td style={{ ...tableStyles.td, fontWeight: 700, color: row.net < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatCurrency(row.net)} {row.net < 0 ? '(Cr)' : row.net > 0 ? '(Dr)' : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            
            {/* FOOTER */}
            {ledgerData.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan="6" style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'left' }}>
                    Final Closing Balance:
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '800', color: closingBalance < 0 ? 'var(--danger)' : 'var(--success)', textAlign: 'left' }}>
                    Rs. {formatCurrency(closingBalance)} {closingBalance < 0 ? '(Cr)' : closingBalance > 0 ? '(Dr)' : ''}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

const tableStyles = {
  th: { padding: '12px 16px', backgroundColor: 'var(--header)', color: '#ffffff', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '10px 16px', color: 'var(--text-main)', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' },
  emptyCell: { padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }
};

export default SupplierCompanyLedger;