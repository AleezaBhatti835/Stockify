import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel, faFilter } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

// Define the tabs for navigation
const TABS = [
  { key: 'customer', label: 'Customers' },
  { key: 'supplier', label: 'Suppliers' },
  { key: 'employee', label: 'Employees' },
];

function PayableReceivable() {
  const [activeTab, setActiveTab] = useState('customer');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Balance type filter (All, Payable, Receivable)
  const [filterType, setFilterType] = useState('All'); 

  // Fetch balances on component mount
  useEffect(() => {
    fetchBalances();
  }, []);

  // Reset the balance type filter when the tab changes
  useEffect(() => {
    setFilterType('All');
  }, [activeTab]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/balances`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const n = Number(val || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ================= FILTERS LOGIC =================
  const filteredData = useMemo(() => {
    // 1. Filter by Active Tab (Customer, Supplier, or Employee)
    let filtered = data.filter(d => d.entityGroup.toLowerCase() === activeTab);
    
    // 2. Filter by Balance Type (Payable or Receivable)
    if (filterType === 'Payable') {
      filtered = filtered.filter(d => d.payable > 0);
    } else if (filterType === 'Receivable') {
      filtered = filtered.filter(d => d.receivable > 0);
    }
    
    return filtered;
  }, [data, activeTab, filterType]);

  // ================= TOTALS =================
  const totalPayable = filteredData.reduce((sum, row) => sum + row.payable, 0);
  const totalReceivable = filteredData.reduce((sum, row) => sum + row.receivable, 0);

  // Dynamic column header based on the active tab
  const getDesignationLabel = () => {
    if (activeTab === 'customer') return 'Customer Type';
    if (activeTab === 'supplier') return 'Company';
    return 'Designation';
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';

  // ================= PRINT =================
  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;

    let rowsHtml = '';
    filteredData.forEach((row, idx) => {
      rowsHtml += `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${row.name}</td>
          <td>${row.designation || '-'}</td>
          <td class="text-right" style="color: #dc2626; font-weight: bold;">${row.payable > 0 ? formatCurrency(row.payable) : '-'}</td>
          <td class="text-right" style="color: #15803d; font-weight: bold;">${row.receivable > 0 ? formatCurrency(row.receivable) : '-'}</td>
        </tr>
      `;
    });

    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
            h2 { margin: 0; font-size: 20px; text-transform: uppercase; }
            p { margin: 0; font-size: 12px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
            th { background-color: #1e293b; color: #fff; text-align: left; text-transform: uppercase; font-size: 11px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h2>${activeTabLabel} - Outstanding Balances</h2>
              <p>Filter: ${filterType === 'All' ? 'All Balances' : filterType}</p>
            </div>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">Sr#</th>
                <th>Name</th>
                <th>${getDesignationLabel()}</th>
                <th class="text-right">Payable (We Owe)</th>
                <th class="text-right">Receivable (They Owe)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr>
                <th colspan="3" class="text-right" style="background-color: #f1f5f9; color: #0f172a; font-size: 13px;">GRAND TOTAL</th>
                <th class="text-right" style="background-color: #fef2f2; color: #dc2626; font-size: 14px;">${formatCurrency(totalPayable)}</th>
                <th class="text-right" style="background-color: #f0fdf4; color: #15803d; font-size: 14px;">${formatCurrency(totalReceivable)}</th>
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

  // ================= EXCEL EXPORT =================
  const handleExportExcel = () => {
    const excelRows = filteredData.map((row, idx) => ({
      'Sr#': idx + 1,
      'Name': row.name,
      [getDesignationLabel()]: row.designation || '-',
      'Payable (We Owe)': row.payable || 0,
      'Receivable (They Owe)': row.receivable || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    
    // Setting optimal column widths
    worksheet['!cols'] = [
      { wch: 8 },  // Sr#
      { wch: 30 }, // Name
      { wch: 25 }, // Designation/Type
      { wch: 20 }, // Payable
      { wch: 20 }  // Receivable
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balances');
    XLSX.writeFile(workbook, `${activeTab}-balances-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div style={styles.page}>
      
      {/* ==================== TABS & HEADER ACTIONS ==================== */}
      <div style={styles.headerRow}>
        <div style={styles.tabContainer}>
          {TABS.map(t => (
            <button
              key={t.key}
              style={activeTab === t.key ? styles.activeTab : styles.tab}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}

          <button style={{ ...styles.actionBtn, backgroundColor: '#334155', marginLeft: 'auto' }} onClick={handlePrint} disabled={loading || filteredData.length === 0}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
          <button style={{ ...styles.actionBtn, backgroundColor: '#15803d' }} onClick={handleExportExcel} disabled={loading || filteredData.length === 0}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </button>
        </div>
      </div>

      {/* ==================== FILTERS ==================== */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}> Balance Type</label>
          <select style={styles.filterInput} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All Balances</option>
            <option value="Payable">Payables  </option>
            <option value="Receivable">Receivables  </option>
          </select>
        </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 400, textAlign: 'right',marginLeft:'60%' }}>
        Showing {filteredData.length} record(s)
      </div>
      </div>

    

      {/* ==================== DATA TABLE ==================== */}
      <div style={styles.tableWrapper}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: 'left', width: '60px' }}>Sr#</th>
                <th style={{ ...styles.th, textAlign: 'left', width: '25%' }}>Name</th>
                <th style={{ ...styles.th, textAlign: 'left', width: '25%' }}>{getDesignationLabel()}</th>
                <th style={{ ...styles.th, textAlign: 'left', width: '20%'  }}>Payable (Rs)</th>
                <th style={{ ...styles.th, textAlign: 'left', width: '20%'  }}>Receivable (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={styles.emptyCell}>Loading Balances...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} style={styles.emptyCell}>No records found for the selected filters.</td></tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id} style={idx % 2 === 1 ? styles.altRow : null}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{row.name}</td>
                    <td style={styles.td}>{row.designation || '-'}</td>
                    
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold', color: '#dc2626' }}>
                      {row.payable > 0 ? formatCurrency(row.payable) : '0'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold', color: '#15803d' }}>
                      {row.receivable > 0 ? formatCurrency(row.receivable) : '0'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            
            {/* TOTALS FOOTER */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #94a3b8' }}>
                  <td colSpan={3} style={{ ...styles.td, textAlign: 'left', fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                    Grand Total:
                  </td>
                  <td style={{ ...styles.td, textAlign: 'left', fontWeight: 700, color: '#dc2626', fontSize: '15px' }}>
                    {formatCurrency(totalPayable)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'left', fontWeight: 700, color: '#15803d', fontSize: '15px' }}>
                    {formatCurrency(totalReceivable)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// Styling matches the AccountReport structure
const styles = {
  page: { padding: '24px 16px', width: '100%', boxSizing: 'border-box', background: '#f8fafc', minHeight: '100vh', marginBottom: '60px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
  actionBtn: { color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },

  tabContainer: { display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', alignItems: 'center' },
  tab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },
  activeTab: { padding: '10px 18px', borderRadius: '6px', border: '1px solid #3c4e6b', backgroundColor: '#3c4e6b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease-in-out' },

  filterRow: { marginTop: '15px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', minWidth: '70px', maxWidth: '220px', flex: 1 },
  filterLabel: { fontSize: '11px', fontWeight: 500, color: '#475569', textAlign: 'left' },
  filterInput: { color: '#343a42', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },

  tableWrapper: { marginTop: '25px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { padding: '12px 14px', background: '#303d52', fontSize: '12px', color: '#fefefe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #94a3b8', whiteSpace: 'nowrap' },
  td: { padding: '7px 14px', fontSize: '13.5px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap',textAlign:'left' },
  altRow: { backgroundColor: '#f8fafc' },
  emptyCell: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' },
};

export default PayableReceivable;