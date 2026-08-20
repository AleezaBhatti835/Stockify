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

  // ================= FETCH REPORT (WITH TOKEN) =================
  const fetchReport = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/reports/business-capital`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
            th { text-align: left; padding: 12px 16px; background-color: #0c514b; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
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
            { content: r.title, styles: { fontStyle: 'bold', fillColor: [204, 251, 241], textColor: [12, 81, 75] } }, 
            { content: `Rs. ${formatCurrency(r.amount)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [204, 251, 241], textColor: [12, 81, 75] } }
          ];
        }
        
        // Format Standard Items
        const isNegative = r.amount < 0;
        return [
          { content: `   ${r.title}`, styles: { textColor: [34, 78, 67] } }, 
          { content: formatCurrency(r.amount), styles: { halign: 'right', textColor: isNegative ? [225, 29, 72] : [34, 78, 67] } }
        ];
      }),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [12, 81, 75], textColor: [255, 255, 255] }
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
    XLS.utils.book_append_sheet(workbook, worksheet, 'Capital Report');
    XLSX.writeFile(workbook, `Business-Capital-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* Top Header & Actions Area */}
      <div className="card" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
        <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || !reportData}>
          <FontAwesomeIcon icon={faPrint} /> Print
        </button>
        <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || !reportData}>
          <FontAwesomeIcon icon={faFilePdf} /> PDF
        </button>
        <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || !reportData}>
          <FontAwesomeIcon icon={faFileExcel} /> Excel
        </button>
      </div>

      {/* Main Report Table Area */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: '820px', margin: '0 auto', width: '100%' }}>
        
        {/* Header Ribbon */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--header)',
          padding: '16px 24px',
          color: '#ffffff',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>Business Capital Statement</span>
          <span style={{ fontSize: '13px', fontWeight: 400 }}>{currentDateLabel}</span>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)', fontSize: '15px' }}>
                    Calculating Business Capital...
                  </td>
                </tr>
              ) : fetchError || !reportData ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '50px 0', color: 'var(--danger)', fontSize: '15px' }}>
                    Failed to generate report. Check backend connection.
                  </td>
                </tr>
              ) : (
                rowsData.map((row, idx) => {
                  
                  // Render Grand Total Row
                  if (row.type === 'grandTotal') {
                    return (
                      <tr key={idx}>
                        <td style={{ 
                          backgroundColor: 'var(--primary-light)', 
                          padding: '20px 24px', 
                          fontSize: '18px', 
                          fontWeight: 700, 
                          color: 'var(--text-main)', 
                          borderTop: '2px solid var(--border-color)' 
                        }}>
                          {row.title}
                        </td>
                        <td style={{ 
                          backgroundColor: 'var(--primary-light)', 
                          padding: '20px 24px', 
                          fontSize: '18px', 
                          fontWeight: 700, 
                          textAlign: 'right', 
                          color: 'var(--text-main)', 
                          borderTop: '2px solid var(--border-color)', 
                          fontVariantNumeric: 'tabular-nums' 
                        }}>
                          Rs. {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    );
                  }

                  // Render Standard Item Rows
                  const isNegative = row.amount < 0;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ 
                        textAlign: 'left', 
                        padding: '12px 24px', 
                        fontSize: '14px', 
                        color: 'var(--text-main)', 
                        fontWeight: 500 
                      }}>
                        {row.title}
                      </td>
                      <td style={{ 
                        padding: '12px 24px', 
                        fontSize: '14px', 
                        textAlign: 'right', 
                        fontVariantNumeric: 'tabular-nums', 
                        fontWeight: 600, 
                        color: isNegative ? 'var(--danger)' : 'var(--text-main)' 
                      }}>
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
    </div>
  );
}

export default BusinessCapitalReport;