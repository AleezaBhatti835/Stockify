import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function CategoryReport() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`); 
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = ['Sr#', 'Category Name', 'Date Added'];

  const getRow = (c, idx) => [
    idx + 1,
    c.name || '—',
    c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—',
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = categories.map((c, idx) => `
      <tr>
        <td style="text-align: center; width: 60px;">${idx + 1}</td>
        <td style="width: auto; font-weight: bold;">${c.name || '—'}</td>
        <td style="width: 200px;">${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('');

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
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #000; padding: 0; margin: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            h2 { margin: 0; font-size: 18px; color: #0f172a; }
            p { margin: 0; color: #64748b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 10px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>Category Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${categories.length} category(s)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Sr#</th>
                <th style="width: auto;">Category Name</th>
                <th style="width: 200px;">Date Added</th>
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
    const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Category Report', 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${categories.length} category(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: categories.map((c, idx) => getRow(c, idx)),
      styles: { fontSize: 9, cellPadding: 5, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 110 },
        2: { cellWidth: 50 },
      }
    });
    doc.save(`category-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const rows = categories.map((c, idx) => ({
      'Sr#': idx + 1,
      'Category Name': c.name || '',
      'Date Added': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories');
    XLSX.writeFile(workbook, `category-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>📋 Category Report</h2>
        <div style={styles.actions}>
          <button style={{ ...styles.actionBtn, backgroundColor: '#409fb0' }} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#d66336' }} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#296f3f' }} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== SUMMARY & TABLE ==================== */}
      <div style={{ marginBottom: '10px', textAlign: 'right' }}>
        <span style={styles.countLabel}>Total: {categories.length} category(s)</span>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Sr#</th>
              <th style={{ ...styles.th, width: 'auto' }}>Category Name</th>
              <th style={{ ...styles.th, width: '250px' }}>Date Added</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={styles.emptyCell}>Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan="3" style={styles.emptyCell}>No categories found.</td></tr>
            ) : (
              categories.map((c, idx) => (
                <tr key={c._id} style={idx % 2 === 1 ? styles.altRow : null}>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{c.name || '—'}</td>
                  <td style={styles.td}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
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
  page: { padding: '24px', background: '#f8fafc', minHeight: '100%', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  actions: { display: 'flex', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  
  countLabel: { fontSize: '13px', color: '#64748b', fontWeight: 500 },
  tableWrapper: { background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { textAlign: 'left', padding: '12px 14px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e' },
  td: { padding: '10px 14px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default CategoryReport;