import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function EmployeeReport() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees`);
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : (data.employees || []));
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (e) => e.name || e.fullName || e.employeeName || '—';
  
  // Safe helper to extract designation whether it's a string or an object
  const getDesignation = (e) => {
    const desig = e.designation || e.role;
    if (!desig) return '—';
    if (typeof desig === 'object') {
      return desig.designation || desig.name || desig.title || JSON.stringify(desig);
    }
    return desig;
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(e =>
      getEmployeeName(e).toLowerCase().includes(term) ||
      getDesignation(e).toLowerCase().includes(term) ||
      (e.email || '').toLowerCase().includes(term) ||
      (e.contact || e.phone || '').toLowerCase().includes(term) ||
      (e.cnic || '').toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  const columns = ['Sr#', 'Employee Name', 'Designation', 'Email', 'Contact', 'CNIC', 'Address'];

  const getRow = (e, idx) => [
    idx + 1,
    getEmployeeName(e),
    getDesignation(e),
    e.email || '—',
    e.contact || e.phone || '—',
    e.cnic || '—',
    e.address || '—',
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((e, idx) => `
      <tr>
        <td style="text-align: center; width: 40px;">${idx + 1}</td>
        <td style="width: 120px;">${getEmployeeName(e)}</td>
        <td style="width: 110px;">${getDesignation(e)}</td>
        <td style="width: 130px;">${e.email || '—'}</td>
        <td style="width: 90px;">${e.contact || e.phone || '—'}</td>
        <td style="width: 100px;">${e.cnic || '—'}</td>
        <td style="width: 180px; word-break: break-word; white-space: normal;">${e.address || '—'}</td>
      </tr>
    `).join('');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '297mm';
    iframe.style.height = '10px';
    iframe.style.border = 'none';
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
            h2 { margin: 0; font-size: 18px; color: #0f172a; }
            p { margin: 0; color: #64748b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; overflow: hidden; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>Employee List Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${filtered.length} employee(s)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Sr#</th>
                <th style="width: 120px;">Employee Name</th>
                <th style="width: 110px;">Designation</th>
                <th style="width: 130px;">Email</th>
                <th style="width: 90px;">Contact</th>
                <th style="width: 100px;">CNIC</th>
                <th style="width: 180px;">Address</th>
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

  // ==================== PDF EXPORT ====================
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Employee List Report', 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} employee(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filtered.map((e, idx) => getRow(e, idx)),
      styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', lineWidth: 0.1, lineColor: [148, 163, 184] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 45 },
        4: { cellWidth: 30 },
        5: { cellWidth: 35 },
        6: { cellWidth: 65 }
      }
    });

    doc.save(`employee-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((e, idx) => ({
      'Sr#': idx + 1,
      'Employee Name': getEmployeeName(e),
      'Designation': getDesignation(e),
      'Email': e.email || '',
      'Contact': e.contact || e.phone || '',
      'CNIC': e.cnic || '',
      'Address': e.address || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `employee-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>👥 Employee List</h2>
        <div style={styles.actions}>
          <button style={{ ...styles.actionBtn, backgroundColor: '#409fb0' }} onClick={handlePrint}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#d66336' }} onClick={handleExportPDF}>
            <FontAwesomeIcon icon={faFilePdf} /> PDF
          </button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#296f3f' }} onClick={handleExportExcel}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name, designation, email, phone, or CNIC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.countLabel}>{filtered.length} of {employees.length} employee(s)</span>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '50px' }}>Sr#</th>
              <th style={{ ...styles.th, width: '140px' }}>Employee Name</th>
              <th style={{ ...styles.th, width: '130px' }}>Designation</th>
              <th style={{ ...styles.th, width: '170px' }}>Email</th>
              <th style={{ ...styles.th, width: '110px' }}>Contact</th>
              <th style={{ ...styles.th, width: '120px' }}>CNIC</th>
              <th style={{ ...styles.th, width: '220px' }}>Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>No employees found.</td></tr>
            ) : (
              filtered.map((e, idx) => (
                <tr key={e._id} style={idx % 2 === 1 ? styles.altRow : null}>
                  <td style={{ ...styles.td, textAlign: 'center', width: '50px' }}>{idx + 1}</td>
                  <td style={{ ...styles.td, width: '140px', fontWeight: 600 }}>{getEmployeeName(e)}</td>
                  <td style={{ ...styles.td, width: '130px' }}>{getDesignation(e)}</td>
                  <td style={{ ...styles.td, width: '170px' }}>{e.email || '—'}</td>
                  <td style={{ ...styles.td, width: '110px' }}>{e.contact || e.phone || '—'}</td>
                  <td style={{ ...styles.td, width: '120px' }}>{e.cnic || '—'}</td>
                  <td style={{ ...styles.td, width: '220px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {e.address || '—'}
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

const styles = {
  page: { padding: '24px', background: '#f8fafc', minHeight: '100%' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  actions: { display: 'flex', gap: '10px' },
  actionBtn: { color: '#ffffff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' },
  searchInput: { flex: '1', maxWidth: '360px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' },
  countLabel: { fontSize: '13px', color: '#64748b', fontWeight: 500 },
  tableWrapper: { background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#3c4e6b', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  td: { padding: '9px 14px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', color: '#334155', overflow: 'hidden' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }
};

export default EmployeeReport;