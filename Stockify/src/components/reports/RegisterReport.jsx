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

  // ================= FETCH REGISTERS (WITH TOKEN) =================
  const fetchRegisters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cash-register/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
            th { background: #0c514b; color: #ffffff; text-transform: uppercase; font-size: 9px; font-weight: 700; border-bottom: 2px solid #94a3b8; }
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
      headStyles: { fillColor: [12, 81, 75], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [204, 251, 241], textColor: [12, 81, 75], fontStyle: 'bold' },
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
      { wch: 5 },  
      { wch: 22 }, 
      { wch: 22 }, 
      { wch: 10 }, 
      { wch: 12 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 12 }, 
      { wch: 18 }, 
      { wch: 15 }, 
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
    <div className="dashboard-wrapper">
      
      {/* HEADER & ACTIONS */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px' }}>Register Report</h4>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
          <button className="btn btn-secondary"  onClick={handleExportPDF}>
            <FontAwesomeIcon icon={faFilePdf} /> PDF
          </button>
          <button className="btn btn-secondary"  onClick={handleExportExcel}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </button>
        </div>
      </div>

      {/* ==================== TABLE SECTION ==================== */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        
        <div style={{ padding: 'var(--space-sm) var(--space-md)', textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
          Showing {currentRows.length} of {registers.length} record(s)
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ ...tableStyles.th, width: '1%', textAlign: 'center' }}>Sr#</th>
                <th style={{ ...tableStyles.th, width: '8%' }}>Opened</th>
                <th style={{ ...tableStyles.th, width: '8%' }}> Closed</th>
                <th style={{ ...tableStyles.th, width: '10%', textAlign: 'center' }}>Status</th>
                <th style={{ ...tableStyles.th, width: '5%', textAlign: 'left' }}>Opening</th>
                <th style={{ ...tableStyles.th, width: '5%', textAlign: 'left' }}>Sales</th>
                <th style={{ ...tableStyles.th, width: '12%', textAlign: 'left' }}>Sale Returns</th>
                <th style={{ ...tableStyles.th, width: '10%', textAlign: 'left' }}>Purchases</th>
                <th style={{ ...tableStyles.th, width: '12%', textAlign: 'left' }}>Pur-Returns</th>
                <th style={{ ...tableStyles.th, width: '5%', textAlign: 'left' }}>Closing</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={tableStyles.emptyCell}>Loading...</td></tr>
              ) : currentRows.length === 0 ? (
                <tr><td colSpan="10" style={tableStyles.emptyCell}>No register sessions found.</td></tr>
              ) : (
                currentRows.map((r, idx) => {
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const closing = computeClosingAmount(r);
                  return (
                    <tr 
                      key={r._id} 
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ ...tableStyles.td, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{serialNumber}</td>
                      <td style={tableStyles.td} title={formatDateTime(r.createdAt)}>{formatDateTime(r.createdAt)}</td>
                      <td style={tableStyles.td} title={r.closingDate ? formatDateTime(r.closingDate) : '—'}>{r.closingDate ? formatDateTime(r.closingDate) : '—'}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: r.closingDate ? 'var(--bg-app)' : 'var(--success-bg)',
                          color: r.closingDate ? 'var(--text-muted)' : 'var(--success)',
                          border: `1px solid ${r.closingDate ? 'var(--border-color)' : 'var(--success)'}`
                        }}>
                          {r.closingDate ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'left' }}>{(r.openingAmount || 0).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--success)', fontWeight: 600 }}>{(r.salesAmount || 0).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--danger)' }}>{(r.totalReturn || 0).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--danger)' }}>{(r.purchaseAmount || 0).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', color: 'var(--success)' }}>{(r.purchaseReturnAmount || 0).toFixed(2)}</td>
                      <td style={{ ...tableStyles.td, textAlign: 'left', fontWeight: 700, color: closing < 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                        {closing.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            
            {/* Totals Footer */}
            {currentRows.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--primary-light)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan="4" style={{ ...tableStyles.td, textAlign: 'right', fontWeight: 700 }}>Totals</td>
                  <td style={{ ...tableStyles.td, fontWeight: 700 }}>{totals.opening.toFixed(2)}</td>
                  <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--success)' }}>{totals.sales.toFixed(2)}</td>
                  <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--danger)' }}>{totals.returns.toFixed(2)}</td>
                  <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--danger)' }}>{totals.purchases.toFixed(2)}</td>
                  <td style={{ ...tableStyles.td, fontWeight: 700, color: 'var(--success)' }}>{totals.purchaseReturns.toFixed(2)}</td>
                  <td style={{ ...tableStyles.td, fontWeight: 800 }}>{totals.closing.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ==================== PAGINATION CONTROLS ==================== */}
        {registers.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-md)' }}>
            <button
              className="btn btn-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '6px 12px' }}
            >
              ←
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage >= totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '6px 12px' }}
            >
              →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// Strict Table Styles Rule
const tableStyles = {
  th: {
    padding: '12px 16px',
    backgroundColor: 'var(--header)',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '13px',
    textAlign: 'left'
  },
  td: {
    padding: '8px 16px',
    color: 'var(--text-main)',
    fontSize: '13px',
    textAlign: 'left'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px'
  }
};

export default RegisterReport;