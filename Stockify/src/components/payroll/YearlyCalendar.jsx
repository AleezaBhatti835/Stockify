import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const YearlyCalendar = () => {
  const [calendars, setCalendars] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [yearInput, setYearInput] = useState('');
  
  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCalendars();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const fetchCalendars = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary-calendar`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setCalendars(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
    }
  };

  const handleAddCalendar = async (e) => {
    e.preventDefault();
    if (!yearInput) {
      return showMessage('Please enter a year.', 'error');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ year: yearInput })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage(data.message, 'success');
        setIsModalOpen(false);
        setYearInput('');
        fetchCalendars();
      } else {
        showMessage(data.message || 'Failed to generate calendar', 'error');
      }
    } catch (error) {
      showMessage('Server error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 1. Filter the records first
  const filteredCalendars = calendars.filter(c =>
    c.year.toString().includes(searchTerm) ||
    c.month.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Pagination Math
  const totalEntries = filteredCalendars.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  
  const currentEntries = filteredCalendars.slice(indexOfFirstEntry, indexOfLastEntry);

  return (
    <div className="dashboard-wrapper">
      
      {message.text && (
        <div style={{ padding: '10px 14px', marginBottom: '15px', borderRadius: '6px', backgroundColor: message.type === 'error' ? '#fee2e2' : '#d1fae5', color: message.type === 'error' ? '#dc2626' : '#065f46', fontWeight: 500 }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ padding: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Show</span>
             <select 
               className="form-input" 
               style={{ width: '70px', padding: '4px 8px', marginBottom: 0 }}
               value={entriesPerPage}
               onChange={(e) => {
                 setEntriesPerPage(Number(e.target.value));
                 setCurrentPage(1); 
               }}
             >
               <option value="10">10</option>
               <option value="25">25</option>
               <option value="50">50</option>
             </select>
             <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>entries</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Search:</span>
            <input
              type="text"
              className="form-input"
              style={{ width: '200px', marginBottom: 0 }}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); 
              }}
              placeholder="e.g. 2026 or January"
            />
              <button 
          className="btn btn-primary" 
          onClick={() => setIsModalOpen(true)}
        >
          Add Calendar
        </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Sr#</th>
                <th style={tableStyles.th}>Year</th>
                <th style={tableStyles.th}>Month</th>
              </tr>
            </thead>
            <tbody>
              {currentEntries.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center',fontSize:'14px', padding: '30px', color: 'var(--text-muted)' }}>
                    No calendar records found. Click "Add Calendar" to generate a year.
                  </td>
                </tr>
              ) : (
                currentEntries.map((c, index) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={tableStyles.td}>{indexOfFirstEntry + index + 1}</td>
                    <td style={tableStyles.td}>{c.year}</td>
                    <td style={tableStyles.td}>{c.month}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {totalEntries === 0 ? 0 : indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, totalEntries)} of {totalEntries} entries
            {calendars.length !== totalEntries ? ` (filtered from ${calendars.length} total entries)` : ''}
          </span>

          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '20px' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={currentPage === page ? "btn btn-primary" : "btn btn-secondary"}
                style={{ 
                  padding: '4px 12px', 
                  fontSize: '13px', 
                  borderRadius: '20px',
                  backgroundColor: currentPage === page ? 'var(--primary)' : 'transparent',
                  color: currentPage === page ? '#fff' : 'var(--text-main)',
                  border: currentPage === page ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                }}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '13px', borderRadius: '20px' }}
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Calendar</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddCalendar}>
              <div className="modal-body">
                <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Make sure you fill them all
                </p>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Year </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={yearInput} 
                    onChange={e => setYearInput(e.target.value)} 
                    placeholder="e.g. 2026"
                    min="2000"
                    max="2100"
                    required
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const tableStyles = {
  th: {
    padding: '10px 16px',
    backgroundColor: 'var(--header)',
    color: '#fdfdfd',
    fontWeight: 'bold',
    fontSize: '13px',
    textAlign: 'left',
    borderBottom: '2px solid #cbd5e1',
  },
  td: {
    padding: '10px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left',
    borderRight: '1px solid var(--border-color)'
  }
};

export default YearlyCalendar;