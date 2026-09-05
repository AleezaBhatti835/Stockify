import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTasks, faCheck, faTimes, faClock, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [modalState, setModalState] = useState({
    isOpen: false,
    leaveId: null,
    actionType: '', 
    remarks: ''
  });

  const fetchAdminLeaves = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/leaves`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves);
      }
    } catch (error) {
      console.error("Error fetching admin leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminLeaves();
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const openActionModal = (leaveId, type) => {
    setModalState({
      isOpen: true,
      leaveId: leaveId,
      actionType: type,
      remarks: ''
    });
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/leaves/${modalState.leaveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: modalState.actionType,
          adminRemarks: modalState.remarks 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        showMessage(`Leave ${modalState.actionType.toLowerCase()} successfully!`, 'success');
        setModalState({ isOpen: false, leaveId: null, actionType: '', remarks: '' });
        fetchAdminLeaves(); // Refresh list
      } else {
        showMessage(data.message || 'Failed to update leave.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
    }
  };

  return (
    <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>


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

      {/* LEAVES TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Employee Name</th>
                <th style={tableStyles.th}>Leave Details</th>
                <th style={tableStyles.th}>Duration</th>
                <th style={tableStyles.th}>Status</th>
                <th style={{...tableStyles.th,textAlign: 'center'}} >Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={tableStyles.emptyCell}>Loading leave requests...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan="5" style={tableStyles.emptyCell}>No leave requests found.</td></tr>
              ) : (
                leaves.map(leave => (
                  <tr key={leave._id} style={tableStyles.tr}>
                    <td style={{ ...tableStyles.td, fontWeight: '600', color: 'var(--primary)' }}>
                      {leave.employee?.name || 'Unknown'}
                      <br/>
                      <small style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>
                        {leave.employee?.phone || 'No Contact'}
                      </small>
                    </td>
                    <td style={tableStyles.td}>
                      <span style={{ fontWeight: '600' }}>{leave.leaveType}</span>
                      <br/>
                      <small style={{ color: 'var(--text-muted)' }}>{leave.reason}</small>
                    </td>
                    <td style={tableStyles.td}>
                      {new Date(leave.startDate).toLocaleDateString('en-GB')} 
                      <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>to</span> 
                      {new Date(leave.endDate).toLocaleDateString('en-GB')}
                    </td>
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
                    <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                      {leave.status === 'Pending' ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button 
                            style={{ ...btnStyle, backgroundColor: 'var(--success)', color: 'white' }}
                            onClick={() => openActionModal(leave._id, 'Approved')}
                            title="Approve"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                          <button 
                            style={{ ...btnStyle, backgroundColor: 'var(--danger)', color: 'white' }}
                            onClick={() => openActionModal(leave._id, 'Rejected')}
                            title="Reject"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {leave.adminRemarks ? `Remarks: ${leave.adminRemarks}` : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTION MODAL (APPROVE / REJECT) */}
      {modalState.isOpen && (
        <div className="modal-overlay" onClick={() => setModalState({ isOpen: false, leaveId: null, actionType: '', remarks: '' })}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '450px', 
            padding: 0,
            borderTop: `6px solid ${modalState.actionType === 'Approved' ? 'var(--success)' : 'var(--danger)'}`
          }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-title" style={{ 
                fontSize: '18px', 
                color: modalState.actionType === 'Approved' ? 'var(--success)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', gap: '8px' 
              }}>
                <FontAwesomeIcon icon={modalState.actionType === 'Approved' ? faCheckCircle : faTimesCircle} />
                {modalState.actionType === 'Approved' ? 'Approve Leave' : 'Reject Leave'}
              </h3>
              <button className="modal-close" onClick={() => setModalState({ isOpen: false, leaveId: null, actionType: '', remarks: '' })}>✕</button>
            </div>

            <form onSubmit={handleActionSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '16px' }}>
                  Are you sure you want to <strong>{modalState.actionType.toLowerCase()}</strong> this leave request?
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Admin Remarks (Optional)</label>
                  <textarea 
                    className="form-input" 
                    rows="3" 
                    placeholder="Enter reason or note for the employee..." 
                    value={modalState.remarks} 
                    onChange={(e) => setModalState({ ...modalState, remarks: e.target.value })}
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: 'none', backgroundColor: 'transparent' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalState({ isOpen: false, leaveId: null, actionType: '', remarks: '' })}>Cancel</button>
                <button type="submit" className="btn" style={{ 
                  backgroundColor: modalState.actionType === 'Approved' ? 'var(--success)' : 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}>
                  Confirm {modalState.actionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Styles
const tableStyles = {
  th: { padding: '14px 20px', backgroundColor: 'var(--header)', color: '#ffffff', textAlign: 'left', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
  td: { padding: '12px 20px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid var(--border-color)' },
  tr: { transition: 'background-color 0.2s',padding: '2px 0' },
  emptyCell: { padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }
};

const btnStyle = {
  border: 'none',
  width: '25px',
  height: '25px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  fontSize: '13px',
  transition: 'opacity 0.2s'
};

export default AdminLeaves;