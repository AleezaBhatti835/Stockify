import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faFilter, faCheckCircle, faStar } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const YearlyCalendar = () => {
    const currentYear = new Date().getFullYear();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const currentMonthName = monthNames[new Date().getMonth()];

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Modal for marking holiday reason
    const [selectedDateObj, setSelectedDateObj] = useState(null);
    const [holidayTitle, setHolidayTitle] = useState('');

    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
        years.push(i);
    }

    useEffect(() => {
        fetchHolidays();
    }, []);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const fetchHolidays = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/holidays`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setHolidays(data.holidays || []);
            }
        } catch (error) {
            console.error('Error fetching holidays:', error);
        }
    };

    const monthIndex = monthNames.indexOf(selectedMonth);
    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
    const firstDayIndex = new Date(selectedYear, monthIndex, 1).getDay(); // 0 = Sunday

    const calendarDays = [];
    for (let i = 0; i < firstDayIndex; i++) {
        calendarDays.push({ blank: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const formattedMonth = String(monthIndex + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        const dateStr = `${selectedYear}-${formattedMonth}-${formattedDay}`;
        
        const dayOfWeek = new Date(selectedYear, monthIndex, day).getDay();
        const isSunday = dayOfWeek === 0;
        
        const holidayObj = holidays.find(h => h.date === dateStr);
        const isHoliday = !!holidayObj;

        calendarDays.push({
            blank: false,
            day,
            dateStr,
            isSunday,
            isHoliday,
            title: holidayObj ? holidayObj.title : ''
        });
    }

    const handleDayClick = (calDay) => {
        if (calDay.blank) return;
        if (calDay.isSunday) {
            return showMessage('Sundays are automatic weekly off days.', 'error');
        }

        if (calDay.isHoliday) {
            handleSaveHoliday(calDay.dateStr, '');
        } else {
            setSelectedDateObj(calDay);
            setHolidayTitle('Public Holiday');
        }
    };

    const handleSaveHoliday = async (dateStr, title) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/holidays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ date: dateStr, title })
            });
            const data = await res.json();
            if (res.ok) {
                showMessage(data.message, 'success');
                setSelectedDateObj(null);
                fetchHolidays();
            } else {
                showMessage(data.message || 'Failed to update holiday', 'error');
            }
        } catch (error) {
            showMessage('Server error', 'error');
        } finally {
            setLoading(false);
        }
    };

    let totalSundays = 0;
    let totalHolidaysInMonth = 0;
    calendarDays.forEach(d => {
        if (!d.blank) {
            if (d.isSunday) totalSundays++;
            else if (d.isHoliday) totalHolidaysInMonth++;
        }
    });
    const totalWorkingDays = daysInMonth - totalSundays - totalHolidaysInMonth;

    return (
        <div className="dashboard-wrapper">
            {message.text && (
                <div style={{ padding: '32px', borderRadius: '4px', backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}` }}>
                    {message.text}
                </div>
            )}

            {/* FILTER SECTION */}
            <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '180px', flex: '1' }}>
                    <select className="form-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                        {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                    <select className="form-input" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                {/* MONTH SUMMARY BADGES */}
                <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <div style={badgeStyle}>Total: <strong>{daysInMonth}</strong></div>
                    <div style={badgeStyle}>Off (Sun): <strong style={{color: '#dc2626'}}>{totalSundays}</strong></div>
                    <div style={badgeStyle}>Holidays: <strong style={{color: '#d97706'}}>{totalHolidaysInMonth}</strong></div>
                    <div style={{...badgeStyle, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}>Working Days: <strong style={{color: '#16a34a'}}>{totalWorkingDays}</strong></div>
                </div>
            </div>

            {/* COLORFUL COMPACT CALENDAR CARD */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px' }}>
                    {/* WEEKDAYS HEADER */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
                        <div style={{color: '#dc2626', padding: '6px', backgroundColor: '#fee2e2', borderRadius: '4px'}}>Sun</div>
                        <div style={{padding: '6px', backgroundColor: '#eaf3f1',border:'1px solid #cbdeda', borderRadius: '4px', color: 'var(--text-main)'}}>Mon</div>
                        <div style={{padding: '6px', backgroundColor: '#eaf3f1',border:'1px solid #cbdeda', borderRadius: '4px', color: 'var(--text-main)'}}>Tue</div>
                        <div style={{padding: '6px', backgroundColor: '#eaf3f1',border:'1px solid #cbdeda', borderRadius: '4px', color: 'var(--text-main)'}}>Wed</div>
                        <div style={{padding: '6px', backgroundColor: '#eaf3f1',border:'1px solid #cbdeda', borderRadius: '4px', color: 'var(--text-main)'}}>Thu</div>
                        <div style={{padding: '6px', backgroundColor: '#eaf3f1',border:'1px solid #cbdeda', borderRadius: '4px', color: 'var(--text-main)'}}>Fri</div>
                        <div style={{padding: '6px', backgroundColor: '#eaf3f1',border:'1px solid #cbdeda', borderRadius: '4px', color: 'var(--text-main)'}}>Sat</div>
                    </div>

                    {/* COMPACT & COLORFUL DAYS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                        {calendarDays.map((calDay, idx) => {
                            if (calDay.blank) {
                                return <div key={idx} style={{  backgroundColor: 'transparent' }} />;
                            }

                            let bgColor = '#fcffff';
                            let borderColor = '#cfe3d7';
                            let textColor = 'var(--text-main)';
                            let badgeBg = '#eaf3f1';
                            let badgeColor = '#64748b';

                            if (calDay.isSunday) {
                                bgColor = '#fff5f5';
                                borderColor = '#fecaca';
                                textColor = '#b91c1c';
                                badgeBg = '#fee2e2';
                                badgeColor = '#dc2626';
                            } else if (calDay.isHoliday) {
                                bgColor = '#fffbeb';
                                borderColor = '#fde68a';
                                textColor = '#b45309';
                                badgeBg = '#fef3c7';
                                badgeColor = '#d97706';
                            }

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => handleDayClick(calDay)}
                                    style={{
                                        height: '58px',
                                        border: `1px solid ${borderColor}`,
                                        backgroundColor: bgColor,
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        cursor: calDay.isSunday ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        boxShadow: '0 1px 2px rgba(198, 235, 223, 0.94)',
                                        transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!calDay.isSunday) e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: textColor }}>{calDay.day}</span>
                                        {calDay.isSunday && <span style={{ fontSize: '9px', backgroundColor: badgeBg, color: badgeColor, padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>OFF</span>}
                                        {calDay.isHoliday && <span style={{ fontSize: '9px', backgroundColor: badgeBg, color: badgeColor, padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>HOLIDAY</span>}
                                    </div>
                                    <div>
                                        {calDay.isHoliday && (
                                            <div style={{ fontSize: '8px', fontWeight: '600', color: '#b45309', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {calDay.title}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* HOLIDAY REASON MODAL */}
            {selectedDateObj && (
                <div className="modal-overlay" onClick={() => setSelectedDateObj(null)}>
                    <div className="modal-container" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Mark Public Holiday</h3>
                            <button className="modal-close" onClick={() => setSelectedDateObj(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
                                Date Selected: <strong>{selectedDateObj.dateStr}</strong>
                            </p>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Holiday Title / Reason *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={holidayTitle} 
                                    onChange={e => setHolidayTitle(e.target.value)} 
                                    placeholder="e.g., Eid-ul-Fitr, Iqbal Day..."
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedDateObj(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => handleSaveHoliday(selectedDateObj.dateStr, holidayTitle)} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Holiday'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const badgeStyle = { padding: '6px 10px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' };

export default YearlyCalendar;