import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartShopping, faCirclePause, faCreditCard, faPrint, faTrash, faClipboardList, faFileLines, faCashRegister, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function CustomerReport() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c =>
      (c.name || c.customerName || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.cnic || '').toLowerCase().includes(term) ||
      (c.contact || '').toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const columns = ['Sr#', 'Customer Name', 'Email', 'CNIC', 'Contact', 'Address'];

  const getRow = (c, idx) => [
    idx + 1,
    c.name || c.customerName || '—',
    c.email || '—',
    c.cnic || '—',
    c.contact || '—',
    c.address || '—',
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = filtered.map((c, idx) => `
      <tr>
        <td style="text-align: center; width: 40px;">${idx + 1}</td>
        <td style="width: 120px;">${c.name || c.customerName || '—'}</td>
        <td style="width: 130px;">${c.email || '—'}</td>
        <td style="width: 100px;">${c.cnic || '—'}</td>
        <td style="width: 90px;">${c.contact || '—'}</td>
        <td style="width: 220px; word-break: break-word; white-space: normal;">${c.address || '—'}</td>
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
              <h2>Customer Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${filtered.length} customer(s)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Sr#</th>
                <th style="width: 120px;">Customer Name</th>
                <th style="width: 130px;">Email</th>
                <th style="width: 100px;">CNIC</th>
                <th style="width: 90px;">Contact</th>
                <th style="width: 220px;">Address</th>
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
    doc.text('Customer Report', 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${filtered.length} customer(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: filtered.map((c, idx) => getRow(c, idx)),
      styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', lineWidth: 0.1, lineColor: [148, 163, 184] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      // Fixing column widths explicitly, especially setting fixed width for Address column (index 5)
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 40 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 40 },
        5: { cellWidth: 80 }, // Fixed width for Address column, auto wraps text
      }
    });

    doc.save(`customer-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = filtered.map((c, idx) => ({
      'Sr#': idx + 1,
      'Customer Name': c.name || c.customerName || '',
      'Email': c.email || '',
      'CNIC': c.cnic || '',
      'Contact': c.contact || '',
      'Address': c.address || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, `customer-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>📋 Customer Report</h2>
        <div style={styles.actions}>
          <button style={{backgroundColor:'#409fb0'}} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{backgroundColor:'#d66336'}} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{backgroundColor:'#296f3f'}} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} />  Excel</button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name, email, CNIC, or contact..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.countLabel}>{filtered.length} of {customers.length} customer(s)</span>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '50px' }}>Sr#</th>
              <th style={{ ...styles.th, width: '150px' }}>Customer Name</th>
              <th style={{ ...styles.th, width: '180px' }}>Email</th>
              <th style={{ ...styles.th, width: '150px' }}>CNIC</th>
              <th style={{ ...styles.th, width: '150px' }}>Contact</th>
              <th style={{ ...styles.th, width: '200px' }}>Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={columns.length} style={styles.emptyCell}>No customers found.</td></tr>
            ) : (
              filtered.map((c, idx) => (
                <tr key={c._id} style={idx % 2 === 1 ? styles.altRow : null}>
                  <td style={{ ...styles.td, textAlign: 'center', width: '50px' }}>{idx + 1}</td>
                  <td style={{ ...styles.td, width: '150px', fontWeight: 600 }}>{c.name || c.customerName || '—'}</td>
                  <td style={{ ...styles.td, width: '180px' }}>{c.email || '—'}</td>
                  <td style={{ ...styles.td, width: '120px' }}>{c.cnic || '—'}</td>
                  <td style={{ ...styles.td, width: '110px' }}>{c.contact || '—'}</td>
                  <td style={{ ...styles.td, width: '280px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {c.address || '—'}
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
  actionBtn: { background: '#3c4e6b', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' },
  searchInput: { flex: '1', maxWidth: '360px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' },
  countLabel: { fontSize: '13px', color: '#64748b', fontWeight: 500 },
  tableWrapper: { background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  td: { padding: '9px 14px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', color: '#334155', overflow: 'hidden' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }
};

export default CustomerReport;