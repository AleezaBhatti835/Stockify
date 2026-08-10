import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function RegisterReport() {
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= PAGINATION STATES =================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchRegisters();
  }, []);

  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cash-register/history`);
      const data = await res.json();
      // Sort ascending by createdAt (oldest first)
      const sortedData = data.success ? [...data.registers].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];
      setRegisters(sortedData);
    } catch (err) {
      console.error('Error fetching register history:', err);
      setRegisters([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-GB') : '—';

  // Live closing amount calc for still-open registers
  const computeClosingAmount = (r) => {
    if (r.closingDate && r.closingAmount != null) return r.closingAmount;
    return (r.openingAmount || 0)
      + (r.salesAmount || 0)
      + (r.purchaseReturnAmount || 0)
      - (r.totalReturn || 0)
      - (r.purchaseAmount || 0);
  };

  const totals = useMemo(() => registers.reduce((acc, r) => {
    acc.opening += r.openingAmount || 0;
    acc.sales += r.salesAmount || 0;
    acc.returns += r.totalReturn || 0;
    acc.purchases += r.purchaseAmount || 0;
    acc.purchaseReturns += r.purchaseReturnAmount || 0;
    acc.closing += computeClosingAmount(r);
    return acc;
  }, { opening: 0, sales: 0, returns: 0, purchases: 0, purchaseReturns: 0, closing: 0 }), [registers]);

  const columns = ['Sr#', 'Date Opened', 'Date Closed', 'Status', 'Opening', 'Sales', 'Sale Returns', 'Purchases', 'Purchase Returns', 'Closing'];

  const getRow = (r, idx) => [
    idx + 1,
    formatDateTime(r.createdAt),
    r.closingDate ? formatDateTime(r.closingDate) : '—',
    r.closingDate ? 'Closed' : 'Open',
    (r.openingAmount || 0).toFixed(2),
    (r.salesAmount || 0).toFixed(2),
    (r.totalReturn || 0).toFixed(2),
    (r.purchaseAmount || 0).toFixed(2),
    (r.purchaseReturnAmount || 0).toFixed(2),
    computeClosingAmount(r).toFixed(2),
  ];

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = registers.map((r, idx) => `
      <tr>
        <td style="text-align: center; width: 4%;">${idx + 1}</td>
        <td style="width: 12%;">${formatDateTime(r.createdAt)}</td>
        <td style="width: 12%;">${r.closingDate ? formatDateTime(r.closingDate) : '—'}</td>
        <td style="width: 6%;">${r.closingDate ? 'Closed' : 'Open'}</td>
        <td style="width: 9%; text-align: right;">${(r.openingAmount || 0).toFixed(2)}</td>
        <td style="width: 9%; text-align: right;">${(r.salesAmount || 0).toFixed(2)}</td>
        <td style="width: 10%; text-align: right;">${(r.totalReturn || 0).toFixed(2)}</td>
        <td style="width: 9%; text-align: right;">${(r.purchaseAmount || 0).toFixed(2)}</td>
        <td style="width: 11%; text-align: right;">${(r.purchaseReturnAmount || 0).toFixed(2)}</td>
        <td style="width: 10%; text-align: right; font-weight: bold;">${computeClosingAmount(r).toFixed(2)}</td>
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
            table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 6px; text-align: left; word-wrap: break-word; }
            th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 9px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
            tr:nth-child(even) { background-color: #f8fafc; }
            tfoot td { font-weight: bold; border-top: 2px solid #000; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>Cash Register Report</h2>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <p><strong>Total:</strong> ${registers.length} session(s)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 4%; text-align:center;">Sr#</th>
                <th style="width: 12%;">Date Opened</th>
                <th style="width: 12%;">Date Closed</th>
                <th style="width: 6%;">Status</th>
                <th style="width: 9%; text-align:right;">Opening</th>
                <th style="width: 9%; text-align:right;">Sales</th>
                <th style="width: 10%; text-align:right;">Sale Returns</th>
                <th style="width: 9%; text-align:right;">Purchases</th>
                <th style="width: 11%; text-align:right;">Purchase Returns</th>
                <th style="width: 10%; text-align:right;">Closing</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align:right;">Totals</td>
                <td style="text-align:right;">${totals.opening.toFixed(2)}</td>
                <td style="text-align:right;">${totals.sales.toFixed(2)}</td>
                <td style="text-align:right;">${totals.returns.toFixed(2)}</td>
                <td style="text-align:right;">${totals.purchases.toFixed(2)}</td>
                <td style="text-align:right;">${totals.purchaseReturns.toFixed(2)}</td>
                <td style="text-align:right;">${totals.closing.toFixed(2)}</td>
              </tr>
            </tfoot>
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
    doc.text('Cash Register Report', 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} — ${registers.length} session(s)`, 14, 18);

    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: registers.map((r, idx) => getRow(r, idx)),
      foot: [['', '', '', 'Totals', totals.opening.toFixed(2), totals.sales.toFixed(2), totals.returns.toFixed(2), totals.purchases.toFixed(2), totals.purchaseReturns.toFixed(2), totals.closing.toFixed(2)]],
      styles: { fontSize: 8, cellPadding: 4, lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`register-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const data = [];
    
    // Headers
    data.push(['Sr#', 'Date Opened', 'Date Closed', 'Status', 'Opening', 'Sales', 'Sale Returns', 'Purchases', 'Purchase Returns', 'Closing']);
    
    // Data rows
    registers.forEach((r, idx) => {
      data.push([
        (idx + 1).toString(),
        formatDateTime(r.createdAt),
        r.closingDate ? formatDateTime(r.closingDate) : '—',
        r.closingDate ? 'Closed' : 'Open',
        (r.openingAmount || 0).toFixed(2),
        (r.salesAmount || 0).toFixed(2),
        (r.totalReturn || 0).toFixed(2),
        (r.purchaseAmount || 0).toFixed(2),
        (r.purchaseReturnAmount || 0).toFixed(2),
        computeClosingAmount(r).toFixed(2),
      ]);
    });
    
    // Totals row
    data.push([
      '',
      '',
      '',
      'Totals',
      totals.opening.toFixed(2),
      totals.sales.toFixed(2),
      totals.returns.toFixed(2),
      totals.purchases.toFixed(2),
      totals.purchaseReturns.toFixed(2),
      totals.closing.toFixed(2),
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 },  // Sr#
      { wch: 22 }, // Date Opened
      { wch: 22 }, // Date Closed
      { wch: 10 }, // Status
      { wch: 12 }, // Opening
      { wch: 12 }, // Sales
      { wch: 15 }, // Sale Returns
      { wch: 12 }, // Purchases
      { wch: 18 }, // Purchase Returns
      { wch: 15 }, // Closing
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Register');
    XLSX.writeFile(wb, `register-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ================= PAGINATION LOGIC =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = registers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(registers.length / itemsPerPage);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={{ ...styles.actions, marginLeft: 'auto' }}>
          <button style={{ ...styles.actionBtn, backgroundColor: '#409fb0' }} onClick={handlePrint}><FontAwesomeIcon icon={faPrint} /> Print</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#d66336' }} onClick={handleExportPDF}><FontAwesomeIcon icon={faFilePdf} /> PDF</button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#296f3f' }} onClick={handleExportExcel}><FontAwesomeIcon icon={faFileExcel} /> Excel</button>
        </div>
      </div>

      {/* ==================== TABLE ==================== */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '5%', textAlign: 'center' }}>Sr#</th>
              <th style={{ ...styles.th, width: '13%' }}>Date Opened</th>
              <th style={{ ...styles.th, width: '13%' }}>Date Closed</th>
              <th style={{ ...styles.th, width: '8%' }}>Status</th>
              <th style={{ ...styles.th, width: '9%', textAlign: 'left' }}>Opening</th>
              <th style={{ ...styles.th, width: '9%', textAlign: 'left' }}>Sales</th>
              <th style={{ ...styles.th, width: '10%', textAlign: 'left' }}>Sale Returns</th>
              <th style={{ ...styles.th, width: '10%', textAlign: 'left' }}>Purchases</th>
              <th style={{ ...styles.th, width: '12%', textAlign: 'left' }}>Pur-Returns</th>
              <th style={{ ...styles.th, width: '11%', textAlign: 'left' }}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={styles.emptyCell}>Loading...</td></tr>
            ) : currentRows.length === 0 ? (
              <tr><td colSpan="10" style={styles.emptyCell}>No register sessions found.</td></tr>
            ) : (
              currentRows.map((r, idx) => {
                const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                const closing = computeClosingAmount(r);
                return (
                  <tr key={r._id} style={idx % 2 === 1 ? styles.altRow : null}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{serialNumber}</td>
                    <td style={styles.td} title={formatDateTime(r.createdAt)}>{formatDateTime(r.createdAt)}</td>
                    <td style={styles.td} title={r.closingDate ? formatDateTime(r.closingDate) : '—'}>{r.closingDate ? formatDateTime(r.closingDate) : '—'}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 500, border: '1px solid #dddedf',
                        background: r.closingDate ? '#f1f5f9' : '#ecfdf5',
                        color: r.closingDate ? '#475569' : '#10b981'
                      }}>
                        {r.closingDate ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'left' }}>{(r.openingAmount || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left', color: '#10b981', fontWeight: 600 }}>{(r.salesAmount || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left', color: '#ef4444' }}>{(r.totalReturn || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left', color: '#ef4444' }}>{(r.purchaseAmount || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left', color: '#10b981' }}>{(r.purchaseReturnAmount || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 700, color: closing < 0 ? '#ef4444' : '#0f172a' }}>
                      {closing.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== PAGINATION CONTROLS ==================== */}
      {registers.length > itemsPerPage && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentPage <= 1 ? '#e9ecef' : '#5aa7ef',
              color: currentPage <= 1 ? '#6c757d' : 'white',
              border: 'none', borderRadius: '4px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600'
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{
              padding: '8px 16px',
              backgroundColor: (currentPage >= totalPages || totalPages === 0) ? '#e9ecef' : '#5aa7ef',
              color: (currentPage >= totalPages || totalPages === 0) ? '#6c757d' : 'white',
              border: 'none', borderRadius: '4px',
              cursor: (currentPage >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', fontWeight: '600'
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: '24px 16px',
    width: '100%',
    boxSizing: 'border-box',
    background: '#f8fafc',
    minHeight: '100vh',
    marginBottom: '60px'
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' },
  actions: { display: 'flex', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },

  tableWrapper: {
    marginTop: '5px',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    overflowX: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    width: '100%'
  },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { textAlign: 'left', padding: '10px 10px', background: '#3c4e6b', fontSize: '11px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', borderRight: '1px solid #44576e', whiteSpace: 'nowrap' },
  td: { padding: '9px 10px', textAlign: 'left', fontSize: '12.5px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default RegisterReport;