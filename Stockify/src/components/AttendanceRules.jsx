import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faClock, faSlidersH } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const AttendanceRules = () => {
    const [rules, setRules] = useState({
        shiftStartTime: '09:00',
        shiftEndTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayMinHours: 4,
        fullDayMinHours: 8,
        latePenaltyEnabled: true,
        overtimeAllowed: false
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchRules();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance-rules`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success && data.rule) {
                setRules(data.rule);
            }
        } catch (error) {
            showMessage('Error fetching attendance rules.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRules(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/attendance-rules`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(rules)
            });

            const data = await res.json();
            if (res.ok) {
                showMessage('Attendance rules updated successfully!', 'success');
            } else {
                showMessage(data.message || 'Failed to update rules.', 'error');
            }
        } catch (error) {
            showMessage('Server error while saving rules.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
            {message.text && (
                <div style={{
                    padding: '12px 16px', marginBottom: '16px', borderRadius: 'var(--radius-sm)',
                    backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
                    color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <FontAwesomeIcon icon={faSlidersH} style={{ fontSize: '18px', color: 'var(--primary)' }} />
                    <h3 className="card-title" style={{ margin: 0 }}>Dynamic Attendance & Shift Rules</h3>
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Shift Start Time</label>
                            <input 
                                type="time" 
                                name="shiftStartTime" 
                                value={rules.shiftStartTime} 
                                onChange={handleChange} 
                                className="form-input" 
                                required 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Shift End Time</label>
                            <input 
                                type="time" 
                                name="shiftEndTime" 
                                value={rules.shiftEndTime} 
                                onChange={handleChange} 
                                className="form-input" 
                                required 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Grace Period (Minutes)</label>
                            <input 
                                type="number" 
                                name="gracePeriodMinutes" 
                                value={rules.gracePeriodMinutes} 
                                onChange={handleChange} 
                                className="form-input" 
                                min="0" 
                                required 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Half-Day Minimum Hours</label>
                            <input 
                                type="number" 
                                name="halfDayMinHours" 
                                value={rules.halfDayMinHours} 
                                onChange={handleChange} 
                                className="form-input" 
                                min="1" 
                                max="12" 
                                required 
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Full-Day Minimum Hours</label>
                            <input 
                                type="number" 
                                name="fullDayMinHours" 
                                value={rules.fullDayMinHours} 
                                onChange={handleChange} 
                                className="form-input" 
                                min="1" 
                                max="16" 
                                required 
                            />
                        </div>

                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px', backgroundColor: 'var(--bg-app)', padding: '16px', borderRadius: '8px' }}>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)' }}>
                            <input 
                                type="checkbox" 
                                name="latePenaltyEnabled" 
                                checked={rules.latePenaltyEnabled} 
                                onChange={handleChange} 
                                style={{ width: '16px', height: '16px' }}
                            />
                            Enable Late Coming Penalties / Status Automation
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)' }}>
                            <input 
                                type="checkbox" 
                                name="overtimeAllowed" 
                                checked={rules.overtimeAllowed} 
                                onChange={handleChange} 
                                style={{ width: '16px', height: '16px' }}
                            />
                            Allow Overtime Tracking after Shift End Time
                        </label>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '160px', height: '40px' }}>
                            <FontAwesomeIcon icon={faSave} style={{ marginRight: '6px' }} />
                            {loading ? 'Saving...' : 'Save Rules'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AttendanceRules;