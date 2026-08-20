import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExcel } from '@fortawesome/free-solid-svg-icons';

const API_BASE_URL = 'http://localhost:5000';

const TABS = [
  { key: 'customer', label: 'Customers' },
  { key: 'supplier', label: 'Suppliers' },
  { key: 'employee', label: 'Employees' },
];

function PayableReceivable() {
  const [activeTab, setActiveTab] = useState('customer');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('All'); 

  useEffect(() => {
    fetchBalances();
  }, []);

  useEffect(() => {
    setFilterType('All');
  }, [activeTab]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/reports/balances`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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

  // CORE ARCHITECTURE: Aggregates and filters cross-entity financial balances for unified payable and receivable reporting.
  const filteredData = useMemo(() => {
    let filtered = data.filter(d => d.entityGroup.toLowerCase() === activeTab);
    
    if (filterType === 'Payable') {
      filtered = filtered.filter(d => d.payable > 0);
    } else if (filterType === 'Receivable') {
      filtered = filtered.filter(d => d.receivable > 0);
    }
    
    return filtered;
  }, [data, activeTab, filterType]);

  const totalPayable = filteredData.reduce((sum, row) => sum + row.payable, 0);
  const totalReceivable = filteredData.reduce((sum, row) => sum + row.receivable, 0);

  const getDesignationLabel = () => {
    if (activeTab === 'customer') return 'Customer Type';
    if (activeTab === 'supplier') return 'Company';
    return 'Designation';
  };

  const activeTabLabel = TABS.find(t => t.key === activeTab)?.label || '';

  // DATA EXPORT ENGINE: Dynamically generates structured Excel sheets and printable HTML documents based on the active tab and applied filters.
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

  const handleExportExcel = () => {
    const excelRows = filteredData.map((row, idx) => ({
      'Sr#': idx + 1,
      'Name': row.name,
      [getDesignationLabel()]: row.designation || '-',
      'Payable (We Owe)': row.payable || 0,
      'Receivable (They Owe)': row.receivable || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    
    worksheet['!cols'] = [
      { wch: 8 },  
      { wch: 30 }, 
      { wch: 25 }, 
      { wch: 20 }, 
      { wch: 20 }  
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balances');
    XLSX.writeFile(workbook, `${activeTab}-balances-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* TABS & HEADER ACTIONS */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handlePrint} disabled={loading || filteredData.length === 0}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} disabled={loading || filteredData.length === 0}>
            <FontAwesomeIcon icon={faFileExcel} /> Excel
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label className="form-label">Balance Type</label>
          <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="All">All Balances</option>
            <option value="Payable">Payables</option>
            <option value="Receivable">Receivables</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {filteredData.length} record(s)
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--header)' }}>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'center', fontSize: '13px', fontWeight: '600', width: '60px' }}>Sr#</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>Name</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '25%' }}>{getDesignationLabel()}</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '20%' }}>Payable (Rs)</th>
                <th style={{ padding: '12px 16px', color: 'white', textAlign: 'left', fontSize: '13px', fontWeight: '600', width: '20%' }}>Receivable (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Loading Balances...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No records found for the selected filters.</td></tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500', textAlign: 'left' }}>{row.name}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--text-main)', textAlign: 'left' }}>{row.designation || '-'}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--danger)', fontWeight: 'bold', textAlign: 'left' }}>
                      {row.payable > 0 ? formatCurrency(row.payable) : '0'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--success)', fontWeight: 'bold', textAlign: 'left' }}>
                      {row.receivable > 0 ? formatCurrency(row.receivable) : '0'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            
            {filteredData.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-app)', borderTop: '2px solid var(--border-color)' }}>
                  <td colSpan={3} style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'left' }}>
                    Grand Total:
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--danger)', textAlign: 'left' }}>
                    {formatCurrency(totalPayable)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: 'var(--success)', textAlign: 'left' }}>
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

export default PayableReceivable;