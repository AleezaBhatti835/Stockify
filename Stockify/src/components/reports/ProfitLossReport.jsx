import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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

  // ================= FETCH REPORT (WITH TOKEN) =================
  const fetchReport = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`${API_BASE_URL}/api/reports/profit-loss?${params.toString()}`, {
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
        const valColor = r.amount < 0 ? 'color: #e11d48;' : 'color: #224e43;';
        return `<tr>
          <td style="padding: 12px 16px 12px 32px; font-weight: 700; font-size: 14px; color: #224e43; border-top: 1px solid #e2f0ec; border-bottom: 1px solid #e2f0ec; background-color: #f8fafc;">${r.title}</td>
          <td style="padding: 12px 16px; font-weight: 700; font-size: 14px; text-align: left; border-top: 1px solid #e2f0ec; border-bottom: 1px solid #e2f0ec; background-color: #f8fafc; ${valColor}">${formatCurrency(r.amount)}</td>
        </tr>`;
      }
      if (r.type === 'finalSummary') {
        const isProfit = r.amount >= 0;
        const bgColor = isProfit ? '#d1fae5' : '#ffe4e6';
        const textColor = isProfit ? '#10b981' : '#e11d48';
        const borderColor = isProfit ? '#10b981' : '#e11d48';
        return `<tr>
          <td style="padding: 20px 24px; font-weight: 900; font-size: 16px; background-color: ${bgColor}; color: ${textColor}; border-top: 3px solid ${borderColor}; border-bottom: 3px solid ${borderColor}; text-transform: uppercase;">${r.title}</td>
          <td style="padding: 20px 24px; font-weight: 900; font-size: 18px; text-align: left; background-color: ${bgColor}; color: ${textColor}; border-top: 3px solid ${borderColor}; border-bottom: 3px solid ${borderColor};">Rs. ${formatCurrency(r.amount)}</td>
        </tr>`;
      }
      return `<tr>
        <td style="padding: 10px 16px 10px 24px; color: #64748b; font-size: 13px;">${r.title}</td>
        <td style="padding: 10px 16px; text-align: left; color: #64748b; font-size: 13px;">${formatCurrency(r.amount)}</td>
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
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #224e43; margin: 0; }
            .header-container { text-align: center; margin-bottom: 28px; }
            h2 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
            p { margin: 6px 0 0 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
            th { text-align: left; padding: 12px 16px; background-color: #0c514b; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
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
            { content: r.title, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [34, 78, 67] } }, 
            { content: formatCurrency(r.amount), styles: { fontStyle: 'bold', halign: 'left', fillColor: [248, 250, 252], textColor: isNegative ? [225, 29, 72] : [34, 78, 67] } }
          ];
        }
        if (r.type === 'finalSummary') {
          const isProfit = r.amount >= 0;
          return [
            { content: r.title, styles: { fontStyle: 'bold', fontSize: 12, fillColor: isProfit ? [209, 250, 229] : [255, 228, 230], textColor: isProfit ? [16, 185, 129] : [225, 29, 72] } }, 
            { content: `Rs. ${formatCurrency(r.amount)}`, styles: { fontStyle: 'bold', halign: 'left', fillColor: isProfit ? [209, 250, 229] : [255, 228, 230], textColor: isProfit ? [16, 185, 129] : [225, 29, 72] } }
          ];
        }
        return [{ content: `   ${r.title}` }, { content: formatCurrency(r.amount), styles: { halign: 'left', textColor: [100, 116, 139] } }];
      }),
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [12, 81, 75], textColor: [255, 255, 255] }
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
    <div className="dashboard-wrapper">
      
      {/* ==================== FILTERS & ACTIONS ==================== */}
      <div className="card" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '170px' }}>
          <label className="form-label">From Date</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '170px' }}>
          <label className="form-label">To Date</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        
        <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary"  onClick={handlePrint} disabled={loading || !reportData}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
          <button className="btn btn-secondary" onClick={handleExportPDF} disabled={loading || !reportData}>
            <FontAwesomeIcon icon={faFilePdf} /> PDF
          </button>
          <button className="btn btn-secondary"  onClick={handleExportExcel} disabled={loading || !reportData}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </button>
        </div>
      </div>

      {/* ==================== DETAILED STATEMENT TABLE ==================== */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: '700px', margin: 'var(--space-xl) auto', width: '100%' }}>
        <div style={{ backgroundColor: 'var(--header)', padding: '16px 24px', fontSize: '16px', fontWeight: 700, color: '#ffffff', borderBottom: '1px solid var(--border-color)' }}>
          Profit & Loss Statement
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Calculating Profit &amp; Loss...</td></tr>
            ) : fetchError || !reportData ? (
              <tr><td colSpan={2} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--danger)' }}>Failed to generate report. Check backend connection.</td></tr>
            ) : (
              rowsData.map((row, idx) => {
                
                if (row.type === 'subtotal') {
                  const isNegative = row.amount < 0;
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left', padding: '6px 24px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                        {row.title}
                      </td>
                      <td style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, textAlign: 'right', color: isNegative ? 'var(--danger)' : 'var(--text-main)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                }

                if (row.type === 'finalSummary') {
                  const isProfit = row.amount >= 0;
                  return (
                    <tr key={idx}>
                      <td style={{ 
                        padding: '6px 24px', fontSize: '16px', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px',
                        backgroundColor: isProfit ? 'var(--success-bg)' : 'var(--danger-bg)', 
                        color: isProfit ? 'var(--success)' : 'var(--danger)', 
                        borderTop: `2px solid ${isProfit ? 'var(--success)' : 'var(--danger)'}`, 
                        borderBottom: `2px solid ${isProfit ? 'var(--success)' : 'var(--danger)'}`
                      }}>
                        {row.title}
                      </td>
                      <td style={{ 
                        padding: '10px 24px', fontSize: '16px', fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                        backgroundColor: isProfit ? 'var(--success-bg)' : 'var(--danger-bg)', 
                        color: isProfit ? 'var(--success)' : 'var(--danger)', 
                        borderTop: `2px solid ${isProfit ? 'var(--success)' : 'var(--danger)'}`,
                        borderBottom: `2px solid ${isProfit ? 'var(--success)' : 'var(--danger)'}`
                      }}>
                        Rs. {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'left', padding: '10px 24px', fontSize: '13px', color: 'var(--text-main)' }}>
                      {row.title}
                    </td>
                    <td style={{ padding: '10px 24px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
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

export default ProfitLossReport;