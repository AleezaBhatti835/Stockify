import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPrint, faFilePdf, faFileExcel, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const AttendanceSummaryReport = () => {
  const defaultMonth = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth());
  const [employees, setEmployees] = useState([]);
  const [attendanceMatrix, setAttendanceMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Kept less because matrix rows are thick

  const getFormattedMonthName = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Get array of days for the selected month e.g., [1, 2, 3... 31]
  const daysInMonth = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    const days = new Date(year, parseInt(month), 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [selectedMonth]);

  const fetchMatrixData = async () => {
    if (!selectedMonth) {
      setMessage('Please select a month and year first.');
      return;
    }

    setLoading(true);
    setMessage('');
    setHasSearched(true);
    setCurrentPage(1);

    const [year, month] = selectedMonth.split('-');
    const dateFrom = `${year}-${month}-01`;
    const lastDay = new Date(year, parseInt(month), 0).getDate();
    const dateTo = `${year}-${month}-${lastDay}`;
    const token = localStorage.getItem('token');

    try {
      // Fetch Employees and Attendance simultaneously
      const [empRes, attRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/attendance/report?dateFrom=${dateFrom}&dateTo=${dateTo}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const empData = await empRes.json();
      const attData = await attRes.json();

      const employeeList = Array.isArray(empData) ? empData : (empData.employees || []);
      setEmployees(employeeList);

      // Create a Matrix Lookup Object: matrix[employeeId][day] = status
      const matrix = {};
      if (attData.success && attData.records) {
        attData.records.forEach(rec => {
          const empId = rec.employeeId._id || rec.employeeId;
          const day = parseInt(rec.date.split('-')[2], 10); // Extract day from YYYY-MM-DD
          
          if (!matrix[empId]) matrix[empId] = {};
          matrix[empId][day] = rec.status;
        });
      }
      
      setAttendanceMatrix(matrix);

    } catch (error) {
      setMessage('Server error while fetching matrix data.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusFormat = (status) => {
    switch (status) {
      case 'Present': return { label: 'P', color: 'var(--success)' };
      case 'Absent': return { label: 'A', color: 'var(--danger)' };
      case 'Late': return { label: 'L', color: 'var(--warning)' };
      case 'Half-day': return { label: 'HD', color: 'var(--info)' };
      case 'Leave': return { label: 'Lv', color: '#6c757d' };
      default: return { label: '-', color: 'var(--text-muted)' };
    }
  };

  const reportTitle = `Monthly Attendance Matrix - ${getFormattedMonthName(selectedMonth)}`;

  // ==================== EXPORT ENGINE ====================

  const handlePrint = () => {
    const rowsHtml = employees.map((emp, idx) => {
      const empData = `<strong>${emp.name}</strong><br/><span style="font-size:9px; color:#64748b;">${emp.contact || emp.phone || 'N/A'}</span>`;
      const daysHtml = daysInMonth.map(day => {
        const status = attendanceMatrix[emp._id]?.[day];
        const format = getStatusFormat(status);
        return `<td style="text-align:center; color:${format.color}; font-weight:bold;">${format.label}</td>`;
      }).join('');
      return `<tr><td style="text-align:center;">${idx + 1}</td><td>${empData}</td>${daysHtml}</tr>`;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; padding: 0; margin: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            h2 { margin: 0; font-size: 16px; color: #0f172a; }
            p { margin: 0; color: #64748b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th, td { border: 1px solid #cbd5e1; padding: 4px; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; font-size: 9px; font-weight: 700; text-align: center; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>${reportTitle}</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;">Sr#</th>
                <th style="width: 120px; text-align:left;">Employee Info</th>
                ${daysInMonth.map(d => `<th>${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 300);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(12);
    doc.text(reportTitle, 10, 10);
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 10, 15);

    const headers = ['Sr#', 'Employee Info', ...daysInMonth.map(String)];
    
    const body = employees.map((emp, idx) => {
      const row = [
        idx + 1, 
        `${emp.name}\n(${emp.contact || emp.phone || 'N/A'})`
      ];
      daysInMonth.forEach(day => {
        row.push(getStatusFormat(attendanceMatrix[emp._id]?.[day]).label);
      });
      return row;
    });

    autoTable(doc, {
      startY: 18,
      head: [headers],
      body: body,
      styles: { fontSize: 6, cellPadding: 1, halign: 'center', valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85] },
      columnStyles: { 
        0: { cellWidth: 8 }, 
        1: { cellWidth: 35, halign: 'left' } 
      },
      margin: { left: 5, right: 5 }
    });
    
    doc.save(`Attendance_Matrix_${getFormattedMonthName(selectedMonth)}.pdf`);
  };

const handleExportExcel = () => {
    const rows = employees.map((emp, idx) => {
      const obj = {
        'Sr#': idx + 1,
        'Employee Name': emp.name,
        'Contact': emp.contact || emp.phone || 'N/A'
      };
      daysInMonth.forEach(day => {
        // String mein convert kar ke store kar rahe hain
        obj[String(day)] = getStatusFormat(attendanceMatrix[emp._id]?.[day]).label;
      });
      return obj;
    });

    const headerOrder = ['Sr#', 'Employee Name', 'Contact', ...daysInMonth.map(String)];
    
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headerOrder });
    
    // Set column widths
    const cols = [{ wch: 5 }, { wch: 20 }, { wch: 15 }];
    daysInMonth.forEach(() => cols.push({ wch: 4 })); // narrow columns for days
    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Matrix");
    XLSX.writeFile(workbook, `Attendance_Matrix_${getFormattedMonthName(selectedMonth)}.xlsx`);
  };
  // ==================== PAGINATION ====================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  return (
    <div className="dashboard-wrapper">
      
      {/* HEADER BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: '20px', color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Monthly Attendance Matrix</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={!hasSearched || employees.length === 0}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button className="btn btn-secondary" onClick={handleExportPDF} disabled={!hasSearched || employees.length === 0}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={!hasSearched || employees.length === 0}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 300px' }}>
          <label className="form-label">Select Month & Year</label>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => { setSelectedMonth(e.target.value); setHasSearched(false); }} 
            className="form-input" 
            style={{ width: '100%', cursor: 'pointer' }} 
          />
        </div>
        <button className="btn btn-primary" onClick={fetchMatrixData} disabled={loading} style={{ height: '38px', padding: '0 24px' }}>
          <FontAwesomeIcon icon={faSearch} style={{ marginRight: '6px' }} /> 
          {loading ? 'Generating...' : 'Generate Matrix'}
        </button>
      </div>

      {message && <div style={{ padding: '12px 16px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', marginBottom: '16px' }}>{message}</div>}

      {/* MATRIX TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '300px' }}>
        {!hasSearched ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faCalendarAlt} style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }} />
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>No Matrix Generated</h4>
            <p style={{ margin: 0, fontSize: '14px' }}>Please select a month and click "Generate Matrix".</p>
          </div>
        ) : (
          <>
            {/* Table wrapper for horizontal scroll */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--header)' }}>
                    <th style={{ ...thStyle, width: '30px' }}>Sr#</th>
                    <th style={{ ...thStyle, width: '120px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: 'var(--header)', zIndex: 2 }}>
                      Employee Info
                    </th>
                    {daysInMonth.map(day => (
                      <th key={day} style={{ ...thStyle, width: '30px', textAlign: 'center'}}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={daysInMonth.length + 2} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Building Matrix...</td></tr>
                  ) : currentEmployees.length === 0 ? (
                    <tr><td colSpan={daysInMonth.length + 2} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</td></tr>
                  ) : (
                    currentEmployees.map((emp, idx) => {
                      return (
                        <tr key={emp._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{indexOfFirstItem + idx + 1}</td>
                          <td style={{ ...tdStyle, position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1}}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '13px',textAlign: 'left' }}>{emp.name}</strong><br/>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.contact || emp.phone || 'N/A'}</span>
                          </td>
                          {daysInMonth.map(day => {
                            const format = getStatusFormat(attendanceMatrix[emp._id]?.[day]);
                            return (
                              <td key={day} style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: format.color,borderRight:'1px solid #f6f6f6'  }}>
                                {format.label}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* STATUS LEGEND */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: '15px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', fontSize: '12px' }}>
              <span><strong style={{ color: 'var(--success)' }}>P</strong> = Present</span>
              <span><strong style={{ color: 'var(--danger)' }}>A</strong> = Absent</span>
              <span><strong style={{ color: 'var(--warning)' }}>L</strong> = Late</span>
              <span><strong style={{ color: 'var(--info)' }}>HD</strong> = Half-Day</span>
              <span><strong style={{ color: '#6c757d' }}>Lv</strong> = Leave</span>
              <span><strong style={{ color: 'var(--text-muted)' }}>-</strong> = Not Marked</span>
            </div>

            {/* PAGINATION */}
            {employees.length > itemsPerPage && (
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
                <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px' }}>←</button>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages || 1}</span>
                <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px' }}>→</button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

const thStyle = { padding: '12px 6px', color: 'white', fontSize: '12px', fontWeight: '600' };
const tdStyle = { padding: '8px 6px', fontSize: '12px' };

export default AttendanceSummaryReport;