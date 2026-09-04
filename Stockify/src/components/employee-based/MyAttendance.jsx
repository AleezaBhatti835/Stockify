import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function MyAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [joiningDate, setJoiningDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const [year, month] = selectedMonth.split('-');
        
        const res = await fetch(`${API_BASE_URL}/api/my-attendance?month=${parseInt(month, 10)}&year=${year}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        const data = await res.json();
        
        if (data.success) {
          setAttendanceRecords(data.records || []);
          if (data.joiningDate) {
            setJoiningDate(new Date(data.joiningDate));
          }
        }
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedMonth) {
      fetchAttendance();
    }
  }, [selectedMonth]);

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return '--:--';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; 
    return `${String(hour).padStart(2, '0')}:${minuteStr} ${ampm}`;
  };

  const generateFullMonthAttendance = () => {
    if (!selectedMonth || !joiningDate) return [];

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; 

    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    
    const joinYear = joiningDate.getFullYear();
    const joinMonth = joiningDate.getMonth();
    const joinDay = joiningDate.getDate();

    // Block months before joining date
    if (year < joinYear || (year === joinYear && month < joinMonth)) {
      return { isBlocked: true };
    }

    // Determine start day for this specific month
    let startDay = 1;
    if (year === joinYear && month === joinMonth) {
      startDay = joinDay;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // If it's current month, loop up to today. If it's a past month, loop up to the last day of that month!
    const endDay = isCurrentMonth ? now.getDate() : daysInMonth;

    const fullList = [];
    for (let i = startDay; i <= endDay; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const existingRecord = attendanceRecords.find(r => {
        // Match strictly by exact year, month, and day to prevent timezone discrepancies
        const recDate = new Date(r.date);
        return recDate.getUTCFullYear() === year && recDate.getUTCMonth() === month && recDate.getUTCDate() === i;
      });

      if (existingRecord) {
        fullList.push({
          _id: existingRecord._id,
          displayDate: dateStr,
          status: existingRecord.status,
          clockIn: existingRecord.clockIn || '--:--',
          clockOut: existingRecord.clockOut || '--:--',
          isAuto: false
        });
      } else {
        fullList.push({
          _id: `auto-${i}`,
          displayDate: dateStr,
          status: 'Present',
          clockIn: '--:--',
          clockOut: '--:--',
          isAuto: true
        });
      }
    }
    return { isBlocked: false, records: fullList };
  };

  const attendanceData = generateFullMonthAttendance();
  const displayRecords = attendanceData.records || [];
  const isBlocked = attendanceData.isBlocked;

  const minMonth = joiningDate ? `${joiningDate.getFullYear()}-${String(joiningDate.getMonth() + 1).padStart(2, '0')}` : undefined;
  const maxMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div style={{ padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faCalendarDays} /> My Attendance History
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Filter Month:</label>
          <input 
            type="month" 
            value={selectedMonth} 
            min={minMonth}
            max={maxMonth}
            onChange={(e) => setSelectedMonth(e.target.value)} 
            style={{ 
              padding: '6px 12px', border: '1px solid var(--border-color)', 
              borderRadius: '6px', outline: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontWeight: 'bold', background: '#f8fafc'
            }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Date</th>
              <th style={tableStyles.th}>Status</th>
              <th style={tableStyles.th}>Clock In</th>
              <th style={tableStyles.th}>Clock Out</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading attendance records...</td></tr>
            ) : isBlocked ? (
              <tr>
                <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--danger)', fontWeight: 'bold' }}>
                  🚫 You were not part of the company during this month.
                </td>
              </tr>
            ) : displayRecords.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No records available for the selected month.</td></tr>
            ) : (
              displayRecords.map(att => (
                <tr key={att._id} style={{ borderBottom: '1px solid var(--border-color)', background: att.isAuto ? '#f8fafc' : 'transparent' }}>
                  <td style={tableStyles.td}>
                    <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>
                      {new Date(att.displayDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={{ 
                      padding: '1px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600px', 
                      backgroundColor: att.status === 'Present' ? 'var(--success-bg)' : att.status === 'Absent' ? 'var(--danger-bg)' : '#fef3c7', 
                      color: att.status === 'Present' ? 'var(--primary-other)' : att.status === 'Absent' ? 'var(--danger)' : '#d97706',
                      display: 'inline-block'
                    }}>
                      {att.status}
                      {att.isAuto && <span style={{ opacity: 0.6, fontSize: '10px', marginLeft: '4px' }}>(Auto)</span>}
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={{ fontWeight: '600', color: att.clockIn === '--:--' ? 'var(--text-muted)' : 'var(--primary)' }}>
                      {formatTime(att.clockIn)}
                    </span>
                  </td>
                  <td style={tableStyles.td}>
                    <span style={{ fontWeight: '600', color: att.clockOut === '--:--' ? 'var(--text-muted)' : '#f59e0b' }}>
                      {formatTime(att.clockOut)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableStyles = {
  th: { padding: '14px 20px', backgroundColor: 'var(--header)', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600' },
  td: { padding: '4px 20px', fontSize: '13px', color: 'var(--text-main)' , textAlign: 'left'}
};

export default MyAttendance;