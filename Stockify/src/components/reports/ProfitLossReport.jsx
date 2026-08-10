import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import XLSX from 'xlsx-js-style';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFilePdf, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

function ProfitLossReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // ================= FILTER STATES =================
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const fetchReport = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/reports/profit-loss?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();

      if (json.success) {
        setReportData(json.data);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      console.error('Error fetching P&L report:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '';

  const formatCurrency = (val) => {
    const n = Number(val || 0);
    const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${formatted})` : formatted;
  };

  // ================= CALCULATIONS & UI ROWS =================
  const getTableRows = () => {
    if (!reportData) return { rows: [], netProfit: 0, netRevenue: 0, totalExpenses: 0 };

    const { revenue, expenses } = reportData;

    // 1. REVENUE
    const TotalSales = revenue?.TotalSales || 0;
    const saleReturns = revenue?.totalSaleReturns || 0;
    const netRevenue = TotalSales - saleReturns;

    // 2. EXPENSES
    const totalExpenses = expenses?.totalExpenses || 0;

    // 3. NET PROFIT / LOSS
    const netProfit = netRevenue - totalExpenses;

    // ================= TABLE UI STRUCTURE =================
    const rows = [
      { type: 'item', title: 'Total Sales', amount: TotalSales },
      { type: 'item', title: 'Less: Sales Returns', amount: -saleReturns },
      { type: 'subtotal', title: 'Net Sales', amount: netRevenue },
      
      { type: 'item', title: 'Less: Total Expenses', amount: -totalExpenses },
      
      { 
        type: 'finalSummary', 
        title: netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', 
        amount: netProfit 
      },
    ];

    return { rows, netProfit, netRevenue, totalExpenses };
  };

  const { rows: rowsData, netProfit, netRevenue, totalExpenses } = getTableRows();
  const periodLabel = (fromDate && toDate)
    ? `For the period ${formatDate(fromDate)} to ${formatDate(toDate)}`
    : `As of ${new Date().toLocaleDateString('en-GB')}`;

  // ==================== PRINT ====================
  const handlePrint = () => {
    const rowsHtml = rowsData.map(r => {
      if (r.type === 'subtotal') {
        const valColor = r.amount < 0 ? 'color: #dc2626;' : 'color: #1e293b;'; // Red if negative balance
        return `<tr>
          <td style="padding: 12px 16px 12px 32px; font-weight: 700; font-size: 14px; color: #1e293b; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">${r.title}</td>
          <td style="padding: 12px 16px; font-weight: 700; font-size: 14px; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc; ${valColor}">${formatCurrency(r.amount)}</td>
        </tr>`;
      }
      if (r.type === 'finalSummary') {
        const isProfit = r.amount >= 0;
        const bgColor = isProfit ? '#dcfce7' : '#fee2e2';
        const fontWeight = '400';
        const fontSize = '12px';
        const textColor = isProfit ? '#14532d' : '#de9999';
        const borderColor = isProfit ? '#adf4c7' : '#fb9e9e';
        return `<tr>
          <td style="padding: 20px 24px; font-weight: 900; font-size: 16px; background-color: ${bgColor}; color: ${textColor}; border-top: 3px solid ${borderColor}; border-bottom: 3px solid ${borderColor}; text-transform: uppercase;">${r.title}</td>
          <td style="padding: 20px 24px; font-weight: 900; font-size: 18px; text-align: left; background-color: ${bgColor}; color: ${textColor}; border-top: 3px solid ${borderColor}; border-bottom: 3px solid ${borderColor};">Rs. ${formatCurrency(r.amount)}</td>
        </tr>`;
      }
      // Standard items use neutral gray, no red color here
      return `<tr>
        <td style="padding: 10px 16px 10px 24px; color: #475569; font-size: 13px;">${r.title}</td>
        <td style="padding: 10px 16px; text-align: left; color: #475569; font-size: 13px;">${formatCurrency(r.amount)}</td>
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
          </style>
        </head>
        <body>
          <div class="header-container">
            <h2>Profit & Loss Statement</h2>
            <p>${periodLabel}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th style="text-align: left; width: 200px;">Amount (Rs.)</th>
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
    doc.setFontSize(15);
    doc.text('Profit & Loss Statement', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(periodLabel, 14, 21);

    autoTable(doc, {
      startY: 27,
      head: [[{ content: 'Particulars', styles: { halign: 'left' } }, { content: 'Amount (Rs.)', styles: { halign: 'left' } }]],
      body: rowsData.map(r => {
        if (r.type === 'subtotal') {
          const isNegative = r.amount < 0; 
          return [
            { content: r.title, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, 
            { content: formatCurrency(r.amount), styles: { fontStyle: 'bold', halign: 'left', fillColor: [241, 245, 249], textColor: isNegative ? [220, 38, 38] : [15, 23, 42] } }
          ];
        }
        if (r.type === 'finalSummary') {
          const isProfit = r.amount >= 0;
          return [
            { content: r.title, styles: { fontStyle: 'bold',fontSize: 12, fillColor: isProfit ? [220, 252, 231] : [254, 226, 226], textColor: isProfit ? [20, 83, 45] : [127, 29, 29] } }, 
            { content: `Rs. ${formatCurrency(r.amount)}`, styles: { fontStyle: 'bold', halign: 'left', fillColor: isProfit ? [220, 252, 231] : [254, 226, 226], textColor: isProfit ? [20, 83, 45] : [127, 29, 29] } }
          ];
        }
        // Standard items use neutral gray
        return [{ content: `   ${r.title}` }, { content: formatCurrency(r.amount), styles: { halign: 'left', textColor: [71, 85, 105] } }];
      }),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
    });
    doc.save(`P&L-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = () => {
    const excelRows = rowsData.map(r => {
      return { 'Particulars': r.type === 'item' ? `    ${r.title}` : r.title, 'Amount': Number(r.amount) };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    Object.keys(worksheet).forEach((key) => {
      if (key !== '!ref' && key !== '!cols') {
        if (!worksheet[key].s) worksheet[key].s = {};
        if (key.startsWith('B') && key !== 'B1') {
          worksheet[key].s.alignment = { horizontal: "left" };
          worksheet[key].z = '#,##0.00';
        } else {
          worksheet[key].s.alignment = { horizontal: "left" };
        }
      }
    });

    worksheet['!cols'] = [{ wch: 40 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'P&L Statement');
    XLSX.writeFile(workbook, `P&L-Report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      {/* ==================== FILTERS ==================== */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>From Date</label>
          <input type="date" style={styles.filterInput} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>To Date</label>
          <input type="date" style={styles.filterInput} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button style={styles.clearFilterBtn} onClick={clearFilters}>Clear Filters</button>

        <button style={{ ...styles.actionBtn, backgroundColor: '#0891b2', marginLeft: 'auto' }} onClick={handlePrint} disabled={loading || !reportData}>
          <FontAwesomeIcon icon={faPrint} /> Print
        </button>
        <button style={{ ...styles.actionBtn, backgroundColor: '#ea580c' }} onClick={handleExportPDF} disabled={loading || !reportData}>
          <FontAwesomeIcon icon={faFilePdf} /> PDF
        </button>
       
      </div>

      {/* ==================== DETAILED STATEMENT ==================== */}
      <div style={styles.tableWrapper}>
        <div style={styles.tableHeader}>Profit & Loss Statement</div>
        <table style={styles.table}>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={styles.emptyCell}>Calculating Profit &amp; Loss...</td></tr>
            ) : fetchError || !reportData ? (
              <tr><td colSpan={2} style={styles.emptyCell}>Failed to generate report. Check backend connection.</td></tr>
            ) : (
              rowsData.map((row, idx) => {
                if (row.type === 'subtotal') {
                  const isNegative = row.amount < 0; // Check if value is negative
                  return (
                    <tr key={idx}>
                      <td style={styles.subtotalLabelCell}>{row.title}</td>
                      <td style={{ ...styles.subtotalValueCell, color: isNegative ? '#dc2626' : '#0f172a' }}>
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                }

                if (row.type === 'finalSummary') {
                  const isProfit = row.amount >= 0;
                  const bgColor = isProfit ? '#dcfce7' : '#f5ebeb'; 
                  const textColor = isProfit ? '#14532d' : '#7f1d1d'; 
                  const borderColor = isProfit ? '#d7efe0' : '#ef9292'; 

                  return (
                    <tr key={idx}>
                      <td style={{ 
                        padding: '10px 14px', 
                        fontSize: '15px',     
                        fontWeight: 800,      
                        backgroundColor: bgColor, 
                        color: textColor, 
                        borderTop: `2px solid ${borderColor}`,    
                        borderBottom: `2px solid ${borderColor}`, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                        {row.title}
                      </td>
                      <td style={{ 
                        padding: '13px 24px', 
                        fontSize: '17px',     
                        fontWeight: 900, 
                        textAlign: 'center', 
                        backgroundColor: bgColor, 
                        color: textColor, 
                        borderTop: `2px solid ${borderColor}`,
                        borderBottom: `2px solid ${borderColor}`,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        Rs. {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                }

                // Normal items (No red color here anymore)
                return (
                  <tr key={idx}>
                    <td style={styles.itemLabelCell}>{row.title}</td>
                    <td style={{ ...styles.itemValueCell, color: '#475569' }}>
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

const styles = {
  page: { padding: '8px 20px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', minHeight: '100vh', marginBottom: '60px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  filterRow: { display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '30px',  padding: '6px 18px', borderRadius: '10px' },
  filterGroup: { display: 'flex', flexDirection: 'column', minWidth: '170px' },
  filterLabel: { fontSize: '11px', fontWeight: 600, color: '#64748b', textAlign: 'left', letterSpacing: '0.4px' },
  filterInput: { color: '#0f172a', padding: '7.5px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#ffffff', outline: 'none' },
  clearFilterBtn: { padding: '9px 18px', background: '#919596', color: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' },
  
  tableWrapper: { background: '#fff', borderRadius: '5px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', width: '100%', maxWidth: '700px', margin: '5% auto' },
  tableHeader: { backgroundColor: '#2d394e', padding: '16px 24px', fontSize: '16px', fontWeight: 700, color: '#ffffff', borderBottom: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  
  itemLabelCell: { textAlign: 'left', padding: '7px 24px 14px 24px', fontSize: '14px', color: '#334155', fontWeight: '500' },
  itemValueCell: { padding: '5px 24px', fontSize: '14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: '500' },
  
  subtotalLabelCell: { textAlign: 'left', padding: '12px 4px 14px 24px', fontSize: '15px', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  subtotalValueCell: { padding: '14px 14px', fontSize: '15px', fontWeight: 700, textAlign: 'right', color: '#0f172a', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontVariantNumeric: 'tabular-nums' },
  
  emptyCell: { textAlign: 'center', padding: '10px 0', color: '#94a3b8', fontSize: '15px' },
};

export default ProfitLossReport;