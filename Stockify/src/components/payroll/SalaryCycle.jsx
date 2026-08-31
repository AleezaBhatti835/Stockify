import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faBalanceScale, faMoneyBill, faMoneyCheck, faMoneyCheckDollar } from '@fortawesome/free-solid-svg-icons';
import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const SalaryCycle = () => {
  const [cycles, setCycles] = useState([]);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [yearToGenerate, setYearToGenerate] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const topRef = useRef(null);

  useEffect(() => { fetchCycles(); }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchCycles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary-calendar`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) setCycles(data.data || []);
    } catch (error) {
      console.error('Error fetching salary cycles:', error);
    }
  };

  const handleAddYear = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ year: yearToGenerate })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage(data.message, 'success');
        setIsAddYearModalOpen(false);
        setYearToGenerate('');
        fetchCycles();
      } else showMessage(data.message, 'error');
    } catch (error) { showMessage('Server error', 'error'); } 
    finally { setLoading(false); }
  };

  const handleRunCycle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary-calendar/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth })
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.message, 'success');
        setIsRunModalOpen(false);
        setSelectedYear('');
        setSelectedMonth('');
        fetchCycles(); 
      } else showMessage(data.message, 'error');
    } catch (error) { showMessage('Server error', 'error'); } 
    finally { setLoading(false); }
  };

  // 💡 NAYA FUNCTION: PAY ALL SALARIES
  const handlePayAll = async (year, month) => {
    if (!window.confirm(`Are you sure you want to disburse salaries for ${month} ${year}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary-calendar/pay-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ year, month })
      });
      const data = await res.json();
      if (data.success) {
        showMessage(data.message, 'success');
        fetchCycles(); 
      } else showMessage(data.message, 'error');
    } catch (error) { showMessage('Server error while paying.', 'error'); }
  };

  const filteredCycles = cycles.filter(c => c.year?.toString().includes(searchTerm) || c.month?.toLowerCase().includes(searchTerm.toLowerCase()) || c.status?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalEntries = filteredCycles.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredCycles.slice(indexOfFirstEntry, indexOfLastEntry);

  return (
    <div className="dashboard-wrapper" ref={topRef}>
      {message.text && (
        <div style={{ padding: '10px 14px', marginBottom: '15px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`, fontWeight: 500 }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Show</span>
             <select className="form-input" style={{ width: '70px', padding: '6px 8px', marginBottom: 0, height: '36px' }} value={entriesPerPage} onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}>
               <option value="10">10</option>
               <option value="25">25</option>
               <option value="50">50</option>
             </select>
             <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>entries</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Search:</span>
            <input type="text" className="form-input" style={{ width: '200px', marginBottom: 0, height: '36px' }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="e.g. 2026 or January" />
            <button className="btn btn-secondary" onClick={() => setIsAddYearModalOpen(true)} style={{ height: '36px', padding: '0 16px', borderRadius: '4px', color: 'var(--primary)', backgroundColor: 'var(--primary-light)' }}>+ Add Year</button>
            <button className="btn btn-primary" onClick={() => setIsRunModalOpen(true)} style={{ height: '36px', padding: '0 16px', borderRadius: '4px' }}> Run Cycle</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '6px', overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Sr#</th>
                <th style={tableStyles.th}>Year</th>
                <th style={{...tableStyles.th,width:'20%'}}>Month</th>
                <th style={tableStyles.th}>Status</th>
                <th style={{ ...tableStyles.th, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentEntries.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center',fontSize:'14px', padding: '40px', color: 'var(--text-muted)' }}>No records found. Click "+ Add Year" to generate calendar months.</td></tr>
              ) : (
                currentEntries.map((c, index) => {
                  const isProcessed = c.status === 'Processed';
                  const isPaid = c.status === 'Paid';
                  return (
                    <tr key={c._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={tableStyles.td}>{indexOfFirstEntry + index + 1}</td>
                      <td style={tableStyles.td}>{c.year}</td>
                      <td style={tableStyles.td}>{c.month}</td>
                      <td style={tableStyles.td}>
                        <span style={{
                          backgroundColor: isPaid ? 'var(--info-bg)' : isProcessed ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: isPaid ? 'var(--info)' : isProcessed ? 'var(--success)' : 'var(--danger)',
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                          border: `1px solid ${isPaid ? 'var(--info)' : isProcessed ? 'var(--success)' : 'var(--danger)'}`,
                          display: 'inline-block'
                        }}>
                          {c.status || 'In Active'}
                        </span>
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        {isProcessed && (
                          <button 
                            onClick={() => handlePayAll(c.year, c.month)}
                            className="btn btn-primary" 
                            style={{ padding: '8px 12px', fontSize: '12px', backgroundColor: '#10b981', border: 'none' }}>
                           <FontAwesomeIcon icon={faMoneyCheckDollar} style={{ fontSize: '15px', color: '#fff' }} /> Pay All
                          </button>
                        )}
                        {isPaid && <span style={{ color: 'var(--info)', fontSize: '12px', fontWeight: 'bold' }}>All Paid ✔️</span>}
                        {c.status === 'In Active' && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Run the cycle to pay</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Showing {totalEntries === 0 ? 0 : indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, totalEntries)} of {totalEntries} entries</span>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }} disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} className={currentPage === page ? "btn btn-primary" : "btn btn-secondary"} style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '4px', backgroundColor: currentPage === page ? 'var(--primary)' : '#fff', color: currentPage === page ? '#fff' : 'var(--text-main)', border: currentPage === page ? '1px solid var(--primary)' : '1px solid #cbd5e1' }} onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }} disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* 1. ADD YEAR MODAL */}
      {isAddYearModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddYearModalOpen(false)}>
          <div className="modal-container" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Generate Calendar Year</h3>
              <button className="modal-close" onClick={() => setIsAddYearModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddYear}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Year *</label>
                  <input type="number" className="form-input" value={yearToGenerate} onChange={e => setYearToGenerate(e.target.value)} placeholder="e.g. 2026" min="2000" required autoFocus />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddYearModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Generating...' : 'Add Year'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RUN CYCLE MODAL */}
      {isRunModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRunModalOpen(false)}>
          <div className="modal-container" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Run Salary Cycle</h3>
              <button className="modal-close" onClick={() => setIsRunModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRunCycle}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Year *</label>
                    <input type="number" className="form-input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} placeholder="e.g. 2026" min="2000" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Month *</label>
                    <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} required>
                      <option value="">Select</option>
                      <option value="January">January</option><option value="February">February</option><option value="March">March</option>
                      <option value="April">April</option><option value="May">May</option><option value="June">June</option>
                      <option value="July">July</option><option value="August">August</option><option value="September">September</option>
                      <option value="October">October</option><option value="November">November</option><option value="December">December</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRunModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Processing...' : 'Run Cycle'}</button>
              </div>
            </form>
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

export default SalaryCycle;