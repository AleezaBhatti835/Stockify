import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faArrowLeft, faUserCheck, faUsers, faSave, faTimes, faEye, faEdit, faTrash, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const EmployeeAttendance = () => {
    // ---- VIEW STATE: 'report' or 'add' ----
    const [activeView, setActiveView] = useState('report');

    // ---- SHARED STATES ----
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // ---- ATTENDANCE RULES STATE ----
    const [attendanceRules, setAttendanceRules] = useState({
        shiftStartTime: '09:00',
        shiftEndTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayMinHours: 4,
        fullDayMinHours: 8,
        latePenaltyEnabled: true,
        overtimeAllowed: false
    });

    // ---- REPORT VIEW STATES ----
    const [reportRecords, setReportRecords] = useState([]);
    const [filters, setFilters] = useState({
        dateFrom: new Date().toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
        employeeId: ''
    });

    // ---- PAGINATION STATES ----
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // ---- MODAL STATES ----
    const [viewRecord, setViewRecord] = useState(null);

    // ---- ADD / EDIT VIEW STATES ----
    const [entryMode, setEntryMode] = useState('all'); // 'all' or 'single'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSingleEmployee, setSelectedSingleEmployee] = useState('');
    const [attendanceData, setAttendanceData] = useState({});
    const [saving, setSaving] = useState(false);

    const todayDate = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchEmployees();
        fetchAttendanceRules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchReport();
        setCurrentPage(1); // Reset to page 1 on filter change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    // Fetch existing attendance when date changes in Add/Mark view
    useEffect(() => {
        if (activeView === 'add' && selectedDate) {
            fetchAttendanceForDate(selectedDate);
        }
    }, [selectedDate]);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    };

    const fetchAttendanceRules = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance-rules`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success && data.rule) {
                setAttendanceRules(data.rule);
            }
        } catch (error) {
            console.error("Error fetching attendance rules:", error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setEmployees(data);
                initializeAddData(data);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await fetch(`${API_BASE_URL}/api/attendance/report?${query}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                const sortedRecords = (data.records || []).sort((a, b) => {
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (dateA < dateB) return -1;
                    if (dateA > dateB) return 1;
                    const nameA = a.employeeId?.name?.toLowerCase() || '';
                    const nameB = b.employeeId?.name?.toLowerCase() || '';
                    return nameA.localeCompare(nameB);
                });
                setReportRecords(sortedRecords);
            }
        } catch (error) {
            showMessage('Error fetching attendance report.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch attendance for a specific date to pre-load form when editing/updating
    const fetchAttendanceForDate = async (dateStr) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/attendance/report?dateFrom=${dateStr}&dateTo=${dateStr}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();

            const initialData = {};
            employees.forEach(emp => {
                initialData[emp._id] = {
                    clockIn: attendanceRules.shiftStartTime || '09:00',
                    clockOut: attendanceRules.shiftEndTime || '18:00',
                    status: 'Present',
                    remarks: ''
                };
            });

            if (data.success && data.records && data.records.length > 0) {
                data.records.forEach(rec => {
                    const empId = rec.employeeId?._id || rec.employeeId;
                    if (empId) {
                        initialData[empId] = {
                            clockIn: rec.clockIn || attendanceRules.shiftStartTime || '09:00',
                            clockOut: rec.clockOut || attendanceRules.shiftEndTime || '18:00',
                            status: rec.status || 'Present',
                            remarks: rec.remarks || ''
                        };
                    }
                });
            }
            setAttendanceData(initialData);
        } catch (error) {
            console.error("Error fetching attendance for date:", error);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const clearFilters = () => {
        setFilters({
            dateFrom: todayDate,
            dateTo: todayDate,
            employeeId: ''
        });
    };

    const formatTimeDisplay = (timeStr) => {
        if (!timeStr || timeStr.trim() === '') return '--:--';
        if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
        const parts = timeStr.split(':');
        if (parts.length < 2) return timeStr;
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    };

    // ================== ADD / EDIT LOGIC ==================

    const initializeAddData = (empList) => {
        const initialData = {};
        empList.forEach(emp => {
            initialData[emp._id] = {
                clockIn: attendanceRules.shiftStartTime || '09:00',
                clockOut: attendanceRules.shiftEndTime || '18:00',
                status: 'Present',
                remarks: ''
            };
        });
        setAttendanceData(initialData);
    };

    const handleAddNew = () => {
        setSelectedDate(todayDate);
        fetchAttendanceForDate(todayDate);
        setEntryMode('all');
        setSelectedSingleEmployee('');
        setActiveView('add');
    };

    const handleEdit = (record) => {
        const empId = record.employeeId?._id;
        if (!empId) return;

        setSelectedDate(record.date);
        fetchAttendanceForDate(record.date);
        setEntryMode('single');
        setSelectedSingleEmployee(empId);
        setActiveView('add');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/attendance/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showMessage('Attendance deleted successfully!', 'success');
                fetchReport();
            } else {
                showMessage('Failed to delete attendance record.', 'error');
            }
        } catch (error) {
            showMessage('Server error while deleting.', 'error');
        }
    };

    // Dynamic Status Calculation based on fetched Attendance Rules
    const calculateStatus = (clockIn, clockOut, currentStatus) => {
        if (currentStatus === 'Absent' || currentStatus === 'Leave') return currentStatus;
        let status = 'Present';

        const shiftStart = attendanceRules.shiftStartTime || '09:00';
        const shiftEnd = attendanceRules.shiftEndTime || '18:00';
        const graceMinutes = attendanceRules.gracePeriodMinutes || 0;

        // Calculate grace time in minutes from shift start
        const [startH, startM] = shiftStart.split(':').map(Number);
        const shiftStartTotalMins = startH * 60 + startM + graceMinutes;

        if (clockIn) {
            const [inH, inM] = clockIn.split(':').map(Number);
            const inTotalMins = inH * 60 + inM;
            if (inTotalMins > shiftStartTotalMins) {
                status = 'Late';
            }
        }

        if (clockOut) {
            if (clockOut < shiftEnd) {
                status = 'Half-day';
            }
        }

        return status;
    };

    const handleAttendanceChange = (empId, field, value) => {
        const currentRow = attendanceData[empId] || { clockIn: attendanceRules.shiftStartTime || '09:00', clockOut: attendanceRules.shiftEndTime || '18:00', status: 'Present', remarks: '' };

        if (field === 'clockIn' && currentRow.clockOut && value > currentRow.clockOut && value !== '') {
            showMessage('Clock In time cannot be later than Clock Out time.', 'error');
            return;
        }
        if (field === 'clockOut' && currentRow.clockIn && value < currentRow.clockIn && value !== '') {
            showMessage('Clock Out time cannot be earlier than Clock In time.', 'error');
            return;
        }

        setAttendanceData(prev => {
            const rowData = { ...currentRow, [field]: value };

            if (field === 'clockIn' || field === 'clockOut') {
                rowData.status = calculateStatus(rowData.clockIn, rowData.clockOut, rowData.status);
            }

            if (field === 'status' && (value === 'Absent' || value === 'Leave')) {
                rowData.clockIn = '';
                rowData.clockOut = '';
                rowData.remarks = '';
            }
            if (field === 'status' && (value === 'Present' || value === 'Late' || value === 'Half-day')) {
                if (!rowData.clockIn) rowData.clockIn = attendanceRules.shiftStartTime || '09:00';
                if (!rowData.clockOut) rowData.clockOut = attendanceRules.shiftEndTime || '18:00';
                if (value === 'Present') rowData.remarks = '';
            }

            return { ...prev, [empId]: rowData };
        });
    };

    const handleSaveAttendance = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');

            let targetEmployees = [];
            if (entryMode === 'all') {
                targetEmployees = employees;
            } else {
                if (!selectedSingleEmployee) {
                    showMessage('Please select an employee first.', 'error');
                    setSaving(false);
                    return;
                }
                targetEmployees = employees.filter(e => e._id === selectedSingleEmployee);
            }

            const recordsToSave = targetEmployees.map(emp => {
                const row = attendanceData[emp._id] || {};
                const isOff = row.status === 'Absent' || row.status === 'Leave';
                return {
                    employeeId: emp._id,
                    clockIn: isOff ? '' : (row.clockIn || attendanceRules.shiftStartTime || '09:00'),
                    clockOut: isOff ? '' : (row.clockOut || attendanceRules.shiftEndTime || '18:00'),
                    status: row.status || 'Present',
                    remarks: row.status === 'Present' ? '' : (row.remarks || '')
                };
            });

            const res = await fetch(`${API_BASE_URL}/api/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: selectedDate, records: recordsToSave })
            });

            if (res.ok) {
                showMessage('Attendance saved successfully!', 'success');
                setTimeout(() => {
                    setActiveView('report');
                    fetchReport();
                }, 1000);
            } else {
                const errorData = await res.json();
                showMessage(errorData.message || 'Failed to save attendance.', 'error');
            }
        } catch (error) {
            showMessage('Server error while saving attendance.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ================== PAGINATION LOGIC ==================
    const indexOfLastRecord = currentPage * rowsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
    const currentRecords = reportRecords.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(reportRecords.length / rowsPerPage);

    // ================== RENDER VIEWS ==================

    const renderReportView = () => (
        <div className="card" style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
            {/* RESPONSIVE TOOLBAR */}
            <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                marginBottom: '20px'
            }}>
                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
                    <label className="form-label">Date From</label>
                    <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="form-input" style={{ width: '100%' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
                    <label className="form-label">Date To</label>
                    <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="form-input" style={{ width: '100%' }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0, flex: '2 1 200px' }}>
                    <label className="form-label">Employee</label>
                    <select name="employeeId" value={filters.employeeId} onChange={handleFilterChange} className="form-input" style={{ width: '100%' }}>
                        <option value="">All Employees</option>
                        {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={clearFilters} disabled={loading} style={{ height: '38px', padding: '0 16px' }}>
                        <FontAwesomeIcon icon={faTimes} style={{ marginRight: '6px' }} /> Clear Filters
                    </button>
                    <button className="btn btn-primary" onClick={handleAddNew} style={{ height: '38px', padding: '0 16px' }}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '6px' }} /> Add / Mark
                    </button>
                </div>
            </div>

            {/* RESPONSIVE SCROLLABLE TABLE */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '2px', width: '100%', marginTop: '2%' }}>
                <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ ...tableStyles.th, width: '12%' }}>Date</th>
                            <th style={{ ...tableStyles.th, width: '20%' }}>Employee Name</th>
                            <th style={{ ...tableStyles.th, width: '13%' }}>Clock In</th>
                            <th style={{ ...tableStyles.th, width: '13%' }}>Clock Out</th>
                            <th style={{ ...tableStyles.th, width: '12%' }}>Status</th>
                            <th style={{ ...tableStyles.th, width: '15%' }}>Remarks</th>
                            <th style={{ ...tableStyles.th, width: '15%', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.length > 0 ? currentRecords.map(record => (
                            <tr key={record._id} style={tableStyles.tr}>
                                <td style={tableStyles.td}>{record.date}</td>
                                <td style={tableStyles.td}>
                                    <strong>{record.employeeId?.name || 'Deleted Employee'}</strong>
                                    {record.employeeId?.designation?.designation && (
                                        <><br /><small style={{ color: 'var(--text-muted)' }}>{record.employeeId.designation.designation}</small></>
                                    )}
                                </td>
                                <td style={{ ...tableStyles.td, fontWeight: '500' }}>
                                    {formatTimeDisplay(record.clockIn)}
                                </td>
                                <td style={{ ...tableStyles.td, fontWeight: '500' }}>
                                    {formatTimeDisplay(record.clockOut)}
                                </td>
                                <td style={tableStyles.td}>
                                    <span style={{
                                        fontWeight: '500',
                                        color: record.status === 'Present' ? 'var(--success)' :
                                               record.status === 'Absent' ? 'var(--danger)' :
                                               record.status === 'Late' ? 'var(--warning)' : 'var(--info)'
                                    }}>
                                        {record.status}
                                    </span>
                                </td>
                                <td style={tableStyles.td}>
                                    {record.status === 'Present' ? '-' : (record.remarks || '-')}
                                </td>
                                <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                        <button style={actionStyles.iconBtnView} onClick={() => setViewRecord(record)} title="View Details">
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                        <button style={actionStyles.iconBtnEdit} onClick={() => handleEdit(record)} title="Edit Record">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </button>
                                        <button style={actionStyles.iconBtnDelete} onClick={() => handleDelete(record._id)} title="Delete Record">
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" style={tableStyles.emptyCell}>{loading ? 'Loading...' : 'No attendance records found.'}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {reportRecords.length > rowsPerPage && (
                 <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>
              →
            </button>
          </div>
            )}
        </div>
    );

    const renderAddView = () => {
        const displayEmployees = entryMode === 'all'
            ? employees
            : employees.filter(e => e._id === selectedSingleEmployee);

        return (
            <div className="card" style={{ padding: '20px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    marginBottom: '20px'
                }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: '1 1 160px', minWidth: '150px' }}>
                        <label className="form-label">Attendance Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            max={todayDate} // Restriction: Cannot select future dates
                            onChange={e => setSelectedDate(e.target.value)}
                            className="form-input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    {entryMode === 'single' && (
                        <div className="form-group" style={{ marginBottom: 0, flex: '2 1 200px', minWidth: '180px' }}>
                            <label className="form-label">Select Employee</label>
                            <select
                                value={selectedSingleEmployee}
                                onChange={(e) => setSelectedSingleEmployee(e.target.value)}
                                className="form-input"
                                style={{ width: '100%' }}
                            >
                                <option value="">-- Choose Employee --</option>
                                {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div style={{ flexGrow: 1 }}></div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            className={`btn ${entryMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setEntryMode('all')}
                            style={{ height: '38px', padding: '0 14px', fontWeight: '600' }}
                        >
                            <FontAwesomeIcon icon={faUsers} style={{ marginRight: '6px' }} /> All
                        </button>
                        <button
                            className={`btn ${entryMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setEntryMode('single')}
                            style={{ height: '38px', padding: '0 14px', fontWeight: '600' }}
                        >
                            <FontAwesomeIcon icon={faUserCheck} style={{ marginRight: '6px' }} /> Single
                        </button>
                        <button className="btn btn-secondary" onClick={() => setActiveView('report')} style={{ height: '38px', padding: '0 14px' }}>
                            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '6px' }} /> Back
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                    <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...tableStyles.th, width: '12%' }}>Date</th>
                                <th style={{ ...tableStyles.th, width: '18%' }}>Employee Name</th>
                                <th style={{ ...tableStyles.th, width: '16%' }}>Clock In ({attendanceRules.shiftStartTime || '09:00'})</th>
                                <th style={{ ...tableStyles.th, width: '16%' }}>Clock Out ({attendanceRules.shiftEndTime || '18:00'})</th>
                                <th style={{ ...tableStyles.th, width: '16%' }}>Status</th>
                                <th style={{ ...tableStyles.th, width: '22%' }}>Remarks (Optional)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayEmployees.length > 0 ? displayEmployees.map(emp => {
                                const rowData = attendanceData[emp._id] || { clockIn: attendanceRules.shiftStartTime || '09:00', clockOut: attendanceRules.shiftEndTime || '18:00', status: 'Present', remarks: '' };
                                const isOff = rowData.status === 'Absent' || rowData.status === 'Leave';
                                const isPresent = rowData.status === 'Present';

                                return (
                                    <tr key={emp._id} style={tableStyles.tr}>
                                        <td style={tableStyles.td}><strong>{selectedDate}</strong></td>
                                        <td style={tableStyles.td}>
                                            <strong>{emp.name}</strong>
                                            {emp.designation?.designation && (
                                                <><br /><small style={{ color: 'var(--text-muted)' }}>{emp.designation.designation}</small></>
                                            )}
                                        </td>
                                        <td style={tableStyles.td}>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={rowData.clockIn || ''}
                                                onChange={(e) => handleAttendanceChange(emp._id, 'clockIn', e.target.value)}
                                                disabled={isOff}
                                                style={{ width: '100%', minWidth: '110px', padding: '6px' }}
                                            />
                                        </td>
                                        <td style={tableStyles.td}>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={rowData.clockOut || ''}
                                                onChange={(e) => handleAttendanceChange(emp._id, 'clockOut', e.target.value)}
                                                disabled={isOff}
                                                style={{ width: '100%', minWidth: '110px', padding: '6px' }}
                                            />
                                        </td>
                                        <td style={tableStyles.td}>
                                            <select
                                                className="form-input"
                                                value={rowData.status || 'Present'}
                                                onChange={(e) => handleAttendanceChange(emp._id, 'status', e.target.value)}
                                                style={{
                                                    width: '100%', minWidth: '120px', padding: '6px',
                                                    backgroundColor: rowData.status === 'Absent' ? 'var(--danger-bg)' :
                                                        rowData.status === 'Late' ? 'var(--warning-bg)' :
                                                            rowData.status === 'Half-day' ? 'var(--info-bg)' : '#fff'
                                                }}
                                            >
                                                <option value="Present">Present</option>
                                                <option value="Late">Late</option>
                                                <option value="Half-day">Half-day</option>
                                                <option value="Absent">Absent</option>
                                                <option value="Leave">Leave</option>
                                            </select>
                                        </td>
                                        <td style={tableStyles.td}>
                                            {!isPresent ? (
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Reason (required/optional)"
                                                    value={rowData.remarks || ''}
                                                    onChange={(e) => handleAttendanceChange(emp._id, 'remarks', e.target.value)}
                                                    style={{ width: '100%', minWidth: '130px', padding: '6px' }}
                                                />
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not required</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" style={tableStyles.emptyCell}>
                                        {entryMode === 'single' && !selectedSingleEmployee ? 'Please select an employee.' : 'No active employees found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {displayEmployees.length > 0 && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleSaveAttendance} disabled={saving} style={{ minWidth: '160px', height: '40px' }}>
                            <FontAwesomeIcon icon={faSave} style={{ marginRight: '6px' }} />
                            {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                )}
            </div>
        );
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

            {activeView === 'report' ? renderReportView() : renderAddView()}

            {/* VIEW MODAL */}
            {viewRecord && (
                <div className="modal-overlay" onClick={() => setViewRecord(null)}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: 0, overflow: 'hidden' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Attendance Details</h3>
                            <button className="modal-close" onClick={() => setViewRecord(null)}>✕</button>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '24px', backgroundColor: 'var(--bg-app)' }}>
                            <div className="card" style={{ padding: '16px 20px', marginBottom: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Employee Name</span>
                                    <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{viewRecord.employeeId?.name || 'Unknown'}</strong>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Designation</span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '14px' }}>{viewRecord.employeeId?.designation?.designation || 'Staff'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Attendance Date</span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>{viewRecord.date}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Clock In Time</span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>{formatTimeDisplay(viewRecord.clockIn)}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Clock Out Time</span>
                                    <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>{formatTimeDisplay(viewRecord.clockOut)}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Attendance Status</span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                        color: viewRecord.status === 'Present' ? 'var(--success)' :
                                               viewRecord.status === 'Absent' ? 'var(--danger)' :
                                               viewRecord.status === 'Late' ? 'var(--warning)' : 'var(--info)'
                                    }}>
                                        {viewRecord.status}
                                    </span>
                                </div>

                                {viewRecord.status !== 'Present' && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>Remarks</span>
                                        <span style={{ color: 'var(--text-main)', fontSize: '14px' }}>
                                            {viewRecord.remarks || 'No remarks added'}
                                        </span>
                                    </div>
                                )}

                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '12px 20px' }}>
                            <button className="btn btn-secondary" onClick={() => setViewRecord(null)} style={{ width: '100%' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const tableStyles = {
    th: { padding: '10px 14px', backgroundColor: 'var(--header)', color: '#fff', fontWeight: '600', fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid var(--border-color)' },
    td: { padding: '10px 14px', color: 'var(--text-main)', fontSize: '13px', textAlign: 'left' },
    emptyCell: { padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }
};

const actionStyles = {
    iconBtnView: {
        backgroundColor: 'var(--view)',
        color: 'var(--success)',
        border: 'none',
        padding: '6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    },
    iconBtnEdit: {
        background: 'var(--edit)',
        color: 'var(--primary)',
        border: 'none',
        padding: '6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    },
    iconBtnDelete: {
        backgroundColor: 'var(--danger-bg)',
        color: 'var(--danger)',
        border: 'none',
        padding: '6px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center'
    }
};

export default EmployeeAttendance;