import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faPlus, faCheckCircle, faClock, faTimesCircle, faSync } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function MyLeaves() {
    const [leaves, setLeaves] = useState([]);
    const [quota, setQuota] = useState({ total: 15, used: 0, remaining: 15 });
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [leaveType, setLeaveType] = useState('Sick');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => {
            setMessage({ text: '', type: '' });
        }, 4000);
    };

    const fetchLeaves = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        else setIsRefreshing(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/my-leaves`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await res.json();
            if (data.success) {
                setLeaves(data.leaves);
                setQuota(data.quota);
            }
        } catch (error) {
            console.error("Error fetching leaves:", error);
        } finally {
            if (showLoading) setLoading(false);
            else setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeaves(true);

        const intervalId = setInterval(() => {
            fetchLeaves(false);
        }, 15000);

        return () => clearInterval(intervalId);
    }, []);

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason) {
            showMessage('Please fill in all fields.', 'error');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showMessage('Start date cannot be after the end date.', 'error');
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
                setIsModalOpen(false);
                showMessage('Leave application submitted successfully!', 'success');
                setStartDate('');
                setEndDate('');
                setReason('');
                fetchLeaves(false);
            } else {
                showMessage(data.message || 'Failed to apply leave.', 'error');
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>

            {/* PAGE HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: '8px',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>Total Quota</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{quota.total} <span style={{ fontSize: '13px', fontWeight: '500' }}>Days</span></span>
                    </div>

                    <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-color)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>Leaves Used</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>{quota.used} <span style={{ fontSize: '13px', fontWeight: '500' }}>Days</span></span>
                    </div>

                    <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-color)' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>Remaining</span>
                        <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--success)' }}>{quota.remaining} <span style={{ fontSize: '13px', fontWeight: '500' }}>Days</span></span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchLeaves(false)}
                        disabled={isRefreshing}
                    >
                        <FontAwesomeIcon icon={faSync} spin={isRefreshing} /> {isRefreshing ? 'Updating...' : 'Refresh'}
                    </button>
                    <button className="btn btn-primary" onClick={() => { setMessage({ text: '', type: '' }); setIsModalOpen(true); }}>
                        <FontAwesomeIcon icon={faPlus} /> Apply For Leave
                    </button>
                </div>

            </div>

            {!isModalOpen && message.text && (
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
                                <th style={tableStyles.th}>Admin Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={tableStyles.emptyCell}>Loading your leaves...</td></tr>
                            ) : leaves.length === 0 ? (
                                <tr><td colSpan="6" style={tableStyles.emptyCell}>No leave applications found.</td></tr>
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
                                        <td style={{ ...tableStyles.td, color: 'var(--text-muted)' }}>
                                            {leave.adminRemarks || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: 0 }}>
                        <div className="modal-header" style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="modal-title" style={{ fontSize: '18px', color: 'var(--text-main)' }}>Apply For Leave</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>

                        <form onSubmit={handleApplyLeave}>
                            <div className="modal-body">

                                {message.text && (
                                    <div style={{
                                        padding: '10px 14px',
                                        marginBottom: '16px',
                                        borderRadius: '6px',
                                        backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                        color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                                        border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        textAlign: 'center'
                                    }}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label required">Leave Type </label>
                                    <select className="form-input" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Casual">Casual Leave</option>
                                        <option value="Annual">Annual Leave</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label required">Start Date </label>
                                        <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label required">End Date </label>
                                        <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label required">Reason </label>
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