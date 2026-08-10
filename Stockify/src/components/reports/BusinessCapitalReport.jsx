import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function BusinessCapitalReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Fetch report data on component mount
  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/business-capital`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();

      if (json.success) {
        setReportData(json.data);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      console.error('Error fetching Business Capital report:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  // Format numbers to standard currency layout with 2 decimal places
  const formatCurrency = (val) => {
    const n = Number(val || 0);
    const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${formatted})` : formatted;
  };

  // Construct UI Rows based on fetched reporting data (Grouped logically)
  const getTableRows = () => {
    if (!reportData) return [];

    return [
      // Assets
      { type: 'item', title: 'Current Stock Value', amount: reportData.currentStockValue },
      { type: 'item', title: 'Customer Receivables', amount: reportData.customerReceivables },
      { type: 'item', title: 'Supplier Receivables (Advances)', amount: reportData.supplierReceivables }, 
      { type: 'item', title: 'Employee Receivables (Advances)', amount: reportData.employeeReceivables },
      
      // Liabilities (Rendered as negative values)
      { type: 'item', title: 'Less: Customer Payables', amount: -Math.abs(reportData.customerPayables) },
      { type: 'item', title: 'Less: Supplier Payables', amount: -Math.abs(reportData.supplierPayables) },
      { type: 'item', title: 'Less: Employee Payables (Pending Salaries)', amount: -Math.abs(reportData.employeePayables) },
      
      // Final Result
      { type: 'grandTotal', title: 'Total Business Capital', amount: reportData.businessCapital }
    ];
  };

  const rowsData = getTableRows();
  const currentDateLabel = `As of ${new Date().toLocaleDateString('en-GB')}`;

  // ==================== PRINT CONFIGURATION ====================
  const handlePrint = () => {
    const rowsHtml = rowsData.map(r => {
      // Highlight Grand Total row
      if (r.type === 'grandTotal') {
        return `<tr>
          <td style="padding: 20px 24px; font-weight: 900; font-size: 16px; background-color: #f1f5f9; color: #0f172a; border-top: 3px solid #cbd5e1; border-bottom: 3px solid #cbd5e1; text-transform: uppercase;">${r.title}</td>
          <td style="padding: 20px 24px; font-weight: 900; font-size: 18px; text-align: right; background-color: #f1f5f9; color: #0f172a; border-top: 3px solid #cbd5e1; border-bottom: 3px solid #cbd5e1;">Rs. ${formatCurrency(r.amount)}</td>
        </tr>`;
      }
      
      // Highlight negative liabilities in red
      const valColor = r.amount < 0 ? 'color: #dc2626;' : 'color: #475569;';
      return `<tr>
        <td style="padding: 12px 16px 12px 24px; color: #334155; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${r.title}</td>
        <td style="padding: 12px 16px 12px 24px; text-align: right; ${valColor} font-size: 14px; border-bottom: 1px solid #f1f5f9;">${formatCurrency(r.amount)}</td>
      </tr>`;
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
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; }
            .header-container { text-align: center; margin-bottom: 28px; }
            h2 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
            p { margin: 6px 0 0 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
            th { text-align: left; padding: 12px 16px; background-color: #1e293b; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            th.right-align { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h2>Business Capital Report</h2>
            <p>${currentDateLabel}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="right-align" style="width: 200px;">Amount (Rs.)</th>
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

  // ==================== PDF EXPORT CONFIGURATION ====================
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    doc.setFontSize(15);
    doc.text('Business Capital Report', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(currentDateLabel, 14, 21);

    autoTable(doc, {
      startY: 27,
      head: [[{ content: 'Particulars', styles: { halign: 'left' } }, { content: 'Amount (Rs.)', styles: { halign: 'right' } }]],
      body: rowsData.map(r => {
        // Format Grand Total row
        if (r.type === 'grandTotal') {
          return [
            { content: r.title, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }, 
            { content: `Rs. ${formatCurrency(r.amount)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
          ];
        }
        
        // Format Standard Items
        const isNegative = r.amount < 0;
        return [
          { content: `   ${r.title}`, styles: { textColor: [51, 65, 85] } }, 
          { content: formatCurrency(r.amount), styles: { halign: 'right', textColor: isNegative ? [220, 38, 38] : [71, 85, 105] } }
        ];
      }),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
    });
    doc.save(`Business-Capital-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT CONFIGURATION ====================
  const handleExportExcel = () => {
    const excelRows = rowsData.map(r => ({
      'Particulars': r.type === 'item' ? `    ${r.title}` : r.title,
      'Amount': Number(r.amount)
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Apply alignment formatting to Excel cells
    Object.keys(worksheet).forEach((key) => {
      if (key !== '!ref' && key !== '!cols') {
        if (!worksheet[key].s) worksheet[key].s = {};
        if (key.startsWith('B') && key !== 'B1') {
          worksheet[key].s.alignment = { horizontal: "right" }; // Right align amounts
          worksheet[key].z = '#,##0.00';
        } else {
          worksheet[key].s.alignment = { horizontal: "left" };
        }
      }
    });

    worksheet['!cols'] = [{ wch: 40 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Capital Report');
    XLSX.writeFile(workbook, `Business-Capital-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      
      {/* Top Header & Actions Area */}
      <div style={styles.headerRow}>
        <div style={styles.actionGroup}>
          <button style={{ ...styles.actionBtn, backgroundColor: '#0891b2' }} onClick={handlePrint} disabled={loading || !reportData}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#ea580c' }} onClick={handleExportPDF} disabled={loading || !reportData}>
            <FontAwesomeIcon icon={faFilePdf} /> PDF
          </button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#15803d' }} onClick={handleExportExcel} disabled={loading || !reportData}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </button>
        </div>
      </div>

      {/* Main Report Table Area */}
      <div style={styles.tableWrapper}>
        <div style={styles.tableHeader}>
          Business Capital Statement
          <span style={styles.dateLabel}>{currentDateLabel}</span>
        </div>
        <table style={styles.table}>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={styles.emptyCell}>Calculating Business Capital...</td></tr>
            ) : fetchError || !reportData ? (
              <tr><td colSpan={2} style={styles.emptyCell}>Failed to generate report. Check backend connection.</td></tr>
            ) : (
              rowsData.map((row, idx) => {
                
                // Render Grand Total Row
                if (row.type === 'grandTotal') {
                  return (
                    <tr key={idx}>
                      <td style={styles.grandTotalLabelCell}>{row.title}</td>
                      <td style={styles.grandTotalValueCell}>
                        Rs. {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                }

                // Render Standard Item Rows (Liabilities shown in Red)
                const isNegative = row.amount < 0;
                return (
                  <tr key={idx}>
                    <td style={styles.itemLabelCell}>{row.title}</td>
                    <td style={{ ...styles.itemValueCell, color: isNegative ? '#dc2626' : '#475569' }}>
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline component styles matching the system theme
const styles = {
  page: { padding: '28px 20px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', minHeight: '100vh', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  actionGroup: { display: 'flex', gap: '8px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  
  tableWrapper: { background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', width: '100%', maxWidth: '820px', margin: '0 auto' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#303e56', padding: '16px 24px', fontSize: '16px', fontWeight: 700, color: '#ffffff', borderBottom: '1px solid #e2e8f0' },
  dateLabel: { fontSize: '13px', fontWeight: 400, color: '#fcfdfe' },
  
  table: { width: '100%', borderCollapse: 'collapse' },
  
  itemLabelCell: { textAlign: 'left', padding: '7px 24px', fontSize: '13px', color: '#334155', fontWeight: '400', borderBottom: '1px solid #f1f5f9' },
  itemValueCell: { padding: '7px 24px', fontSize: '14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: '500', borderBottom: '1px solid #f1f5f9' },
  
  grandTotalLabelCell: { backgroundColor: '#f1f5f9', padding: '20px 4px', fontSize: '18px', fontWeight: 700, color: '#263558', borderTop: '2px solid #cbd5e1'},
  grandTotalValueCell: { backgroundColor: '#f1f5f9', padding: '20px 74px', fontSize: '18px', fontWeight: 700, textAlign: 'center', color: '#283657', borderTop: '2px solid #cbd5e1', fontVariantNumeric: 'tabular-nums' },
  
  emptyCell: { textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontSize: '15px' },
};

export default BusinessCapitalReport;