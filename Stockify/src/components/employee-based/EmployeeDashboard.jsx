import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faHandHoldingDollar, faCalendarCheck, faBan, faClock, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_BASE_URL = 'http://localhost:5000';

function EmployeeDashboard() {
  const [closingBalance, setClosingBalance] = useState(0);
  const [outstandingLoan, setOutstandingLoan] = useState(0);
  const [presentDays, setPresentDays] = useState(0);
  const [absentDays, setAbsentDays] = useState(0);
  const [leaveDays, setLeaveDays] = useState(0);
  
  // Clock & Attendance States
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/my-attendance/today`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTodayRecord(data.record);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClockAction = async (action) => {
    setIsActionLoading(true);
    try {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/my-attendance/clock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, time: timeStr })
      });
      const data = await res.json();
      if (data.success) {
        setTodayRecord(data.record);
        fetchStats(); // Refresh stats
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error marking attendance.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const ledgerRes = await fetch(`${API_BASE_URL}/api/my-ledger`, { headers });
      const ledgerData = await ledgerRes.json();
      if (ledgerData.success) setClosingBalance(ledgerData.closingBalance);

      const loanRes = await fetch(`${API_BASE_URL}/api/my-loan-status`, { headers });
      const loanData = await loanRes.json();
      if (loanData.success) setOutstandingLoan(loanData.outstandingLoan);

      const d = new Date();
      const attRes = await fetch(`${API_BASE_URL}/api/my-attendance?month=${d.getMonth() + 1}&year=${d.getFullYear()}`, { headers });
      const attData = await attRes.json();
      
      if (attData.success) {
        const daysPassedThisMonth = d.getDate(); 
        
        const explicitAbsents = attData.records.filter(r => r.status === 'Absent').length;
        const explicitLeaves = attData.records.filter(r => r.status === 'Leave').length;
        const explicitHalfDays = attData.records.filter(r => r.status === 'Half-day').length;

        const penaltyDays = explicitAbsents + explicitLeaves + (explicitHalfDays * 0.5);
        const calculatedPresents = Math.max(0, daysPassedThisMonth - penaltyDays);

        setPresentDays(Math.round(calculatedPresents));
        setAbsentDays(explicitAbsents);
        setLeaveDays(explicitLeaves);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pieData = [
    { name: 'Present', value: presentDays || 1 },
    { name: 'Absent', value: absentDays },
    { name: 'Leave', value: leaveDays }
  ];
  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  const isAdminLocked = todayRecord && (todayRecord.status === 'Absent' || todayRecord.status === 'Leave');

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#fff', padding: '24px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px',textAlign:'left', fontWeight: '700', color: '#0f172a' }}>My Workspace</h2>
          <p style={{ margin: 0, color: '#64748b',textAlign:'left', fontSize: '12px' }}>Mark your attendance and review your monthly progress.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--primary)' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <div style={{ width: '1px', height: '40px', background: '#e2e8f0' }}></div>

          <div style={{ minWidth: '150px' }}>
            {isAdminLocked ? (
              <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', border: '1px solid #fca5a5' }}>
                <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '4px' }}>Locked by Admin</div>
                <span style={{ color: '#b91c1c' }}>Marked as {todayRecord.status}</span>
              </div>
            ) : !todayRecord?.clockIn ? (
              <button disabled={isActionLoading} onClick={() => handleClockAction('in')} 
                style={{ width: '70%', padding: '12px 1px',marginLeft:'40%', background: 'var(--header)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faUserCheck} /> Clock In 
              </button>
            ) : !todayRecord?.clockOut ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#10b981', textAlign: 'right', fontWeight: '600' }}>✓ Checked in at {todayRecord.clockIn}</div>
                <button disabled={isActionLoading} onClick={() => handleClockAction('out')} 
                  style={{ width: '70%', padding: '10px',marginLeft:'40%', background: '#b49764', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesomeIcon icon={faClock} /> Clock Out
                </button>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Shift Completed</div>
                <span style={{ color: '#10b981' }}>In: {todayRecord.clockIn}</span> <br/> 
                <span style={{ color: '#f59e0b' }}>Out: {todayRecord.clockOut}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={cardStyle}>
          <div style={{ ...iconWrapper, background: '#f0fdf4', color: '#16a34a' }}><FontAwesomeIcon icon={faWallet} /></div>
          <div><p style={cardLabel}>Net Balance</p><h4 style={cardValue}>Rs. {Math.abs(closingBalance).toLocaleString()}</h4></div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...iconWrapper, background: '#fef2f2', color: '#dc2626' }}><FontAwesomeIcon icon={faHandHoldingDollar} /></div>
          <div><p style={cardLabel}>Loan Due</p><h4 style={cardValue}>Rs. {outstandingLoan.toLocaleString()}</h4></div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...iconWrapper, background: '#e0f2fe', color: '#0284c7' }}><FontAwesomeIcon icon={faCalendarCheck} /></div>
          <div><p style={cardLabel}>Presents (Month)</p><h4 style={cardValue}>{presentDays} Days</h4></div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...iconWrapper, background: '#fff7ed', color: '#d97706' }}><FontAwesomeIcon icon={faBan} /></div>
          <div><p style={cardLabel}>Absents (Month)</p><h4 style={cardValue}>{absentDays} Days</h4></div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '700px', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '14px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>Attendance Overview</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={4} dataKey="value" stroke="none">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

const cardStyle = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' };
const iconWrapper = { width: '50px', height: '50px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' };
const cardLabel = { margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' };
const cardValue = { margin: '4px 0 0 0', color: '#0f172a', fontSize: '14px', fontWeight: 'bold' };

export default EmployeeDashboard;