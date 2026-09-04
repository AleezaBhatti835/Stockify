import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faPlus, faCheckCircle, faClock, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function MyLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [quota, setQuota] = useState({ total: 15, used: 0, remaining: 15 });
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('Sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/my-leaves`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves);
        setQuota(data.quota);
      }
    } catch (error) {
      console.error("Error fetching leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      setMessage({ text: 'Please fill in all fields.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leaveType, startDate, endDate, reason })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Leave application submitted successfully!', type: 'success' });
        setIsModalOpen(false);
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      } else {
        setMessage({ text: data.message || 'Failed to apply leave.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faCalendarDays} /> Leave Management
        </h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <FontAwesomeIcon icon={faPlus} /> Apply For Leave
        </button>
      </div>

      {/* NOTIFICATION MESSAGE */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '6px',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {message.text}
        </div>
      )}

      {/* QUOTA SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '5px solid var(--primary)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>Total Quota</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--text-main)' }}>{quota.total} Days</h3>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '5px solid var(--warning, #f59e0b)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>Leaves Used</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--text-main)' }}>{quota.used} Days</h3>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '5px solid var(--success)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>Remaining Quota</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', color: 'var(--success)' }}>{quota.remaining} Days</h3>
        </div>
      </div>

      {/* LEAVES HISTORY TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Leave Type</th>
                <th style={tableStyles.th}>From</th>
                <th style={tableStyles.th}>To</th>
                <th style={tableStyles.th}>Reason</th>
                <th style={tableStyles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={tableStyles.emptyCell}>Loading your leaves...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan="5" style={tableStyles.emptyCell}>No leave applications found.</td></tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave._id} style={tableStyles.tr}>
                    <td style={{ ...tableStyles.td, fontWeight: '600' }}>{leave.leaveType}</td>
                    <td style={tableStyles.td}>{new Date(leave.startDate).toLocaleDateString('en-GB')}</td>
                    <td style={tableStyles.td}>{new Date(leave.endDate).toLocaleDateString('en-GB')}</td>
                    <td style={tableStyles.td}>{leave.reason}</td>
                    <td style={tableStyles.td}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 
                          leave.status === 'Approved' ? 'rgba(34, 197, 94, 0.1)' :
                          leave.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: 
                          leave.status === 'Approved' ? 'var(--success)' :
                          leave.status === 'Rejected' ? 'var(--danger)' : '#d97706'
                      }}>
                        <FontAwesomeIcon icon={
                          leave.status === 'Approved' ? faCheckCircle :
                          leave.status === 'Rejected' ? faTimesCircle : faClock
                        } />
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPLY LEAVE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0 }}>
            <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)' }}>Apply For Leave</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleApplyLeave}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Leave Type *</label>
                  <select className="form-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Annual">Annual Leave</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">End Date *</label>
                    <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Reason *</label>
                  <textarea className="form-input" rows="3" placeholder="Enter reason for leave..." value={reason} onChange={(e) => setReason(e.target.value)} required style={{ resize: 'vertical' }}></textarea>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const tableStyles = {
  th: { padding: '14px 20px', backgroundColor: 'var(--header)', color: '#ffffff', textAlign: 'left', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
  td: { padding: '12px 20px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', verticalAlign: 'middle' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  emptyCell: { padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }
};

export default MyLeaves;